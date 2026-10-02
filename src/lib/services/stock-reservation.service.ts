import { Prisma, type CajasPreparationLine, type CajasStockScopeReference, type StockReservation } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import { cajasId, cajasTransaction, lockCajasAssignment, acceptCajasCommand, replayCajasCommand, type CajasDb } from "./cajas-command.service";
import { calculateMovementDelta } from "./stock-ledger.service";
import { stockPositionKey } from "./cajas-component-selection.service";

export async function releaseCajasReservation(tx: Prisma.TransactionClient, reservation: StockReservation, cause: string, actorUserId: string) {
  if (reservation.dispatchedQuantity.gt(0)) throw conflict("Hay contenido despachado pendiente", "cajas_dispatched_reservation");
  const result = await tx.stockReservation.update({ where: { id: reservation.id }, data: { activeSlot: null, status: "RELEASED", remainingQuantity: 0, releasedAt: new Date(), releasedById: actorUserId, releaseCause: cause } });
  await createAuditEvent({ prisma: tx, companyId: reservation.companyId, userId: actorUserId, entityType: "StockReservation", entityId: reservation.id, action: "cajas.reservation_released", module: "stock", newValue: { cause } });
  return result;
}

export async function reserveCajasComponent(tx: Prisma.TransactionClient, companyId: string, assignmentId: string,
  line: Pick<CajasPreparationLine, "id" | "quantity" | "unit" | "dispatchedQuantity"> | null,
  scope: CajasStockScopeReference, actorUserId: string, key: string, location: string | null = null) {
  const ref = await tx.cajasArticleReference.findFirstOrThrow({ where: { id: scope.articleReferenceId, companyId } });
  await tx.$queryRaw`SELECT id FROM article WHERE id = ${ref.sourceArticleId} FOR UPDATE`;
  const article = await tx.article.findFirst({ where: { id: ref.sourceArticleId, isActive: true, stockEligibilities: { some: { companyId } } } });
  if (!article) throw notFound("Artículo no habilitado", "article_not_found");
  const quantity = line ? line.quantity.minus(line.dispatchedQuantity) : new Prisma.Decimal(1);
  if (quantity.lte(0)) return null;
  const physicalUnitId = scope.kind === "identifiedUnit" ? scope.sourceStockScopeId : null;
  if (physicalUnitId) {
    if (!quantity.eq(1)) throw badRequest("Cantidad identificada inválida", "identified_quantity_invalid");
    const unit = await tx.stockPhysicalUnit.findFirst({ where: { id: physicalUnitId, companyId, articleId: article.id, status: "ACTIVE" } });
    if (!unit) throw notFound("Unidad no disponible", "physical_unit_not_found");
    if (await tx.stockReservation.findFirst({ where: { companyId, physicalUnitId, activeSlot: 1 } })) throw conflict("Unidad ya reservada", "physical_unit_already_reserved");
  } else {
    const movements = await tx.stockMovement.findMany({ where: { companyId, articleId: article.id } });
    const physical = movements.filter((m) => stockPositionKey(m) === scope.sourceStockScopeId).reduce((n, m) => n.plus(calculateMovementDelta(m.movementType, m.quantity)), new Prisma.Decimal(0));
    const reserved = await tx.stockReservation.aggregate({ where: { companyId, stockScopeReferenceId: scope.id, status: "ACTIVE" }, _sum: { remainingQuantity: true } });
    const drafts = await tx.remitoItem.findMany({ where: { companyId, itemId: article.id, remito: { state: { in: ["Borrador", "Pendiente"] } } }, include: { remito: { select: { metadata: true } } } });
    const legacyReserved = drafts.filter((d) => !(d.remito.metadata as Record<string, unknown> | null)?.cajas).reduce((n, d) => n.plus(d.quantity), new Prisma.Decimal(0));
    if (physical.minus(reserved._sum.remainingQuantity ?? 0).minus(legacyReserved).lt(quantity)) throw conflict("Stock insuficiente para reservar", "cajas_insufficient_stock");
    if (scope.expirationDateSnapshot && scope.expirationDateSnapshot < new Date(new Date().toISOString().slice(0, 10))) throw conflict("Lote vencido", "stock_expired");
  }
  const semanticKey = `${key}:${line?.id ?? "box"}`;
  const reservation = await tx.stockReservation.create({ data: { companyId, articleId: article.id, physicalUnitId, assignmentId, preparationLineId: line?.id, stockScopeReferenceId: scope.id, quantity, remainingQuantity: quantity, semanticKey, createdById: actorUserId } });
  const record = await tx.cajasStockRecordReference.create({ data: { companyId, kind: "reservation", sourceStockRecordId: reservation.id, sourceCheckpoint: "preparation_confirmation", verifiedAt: new Date(), verifiedById: actorUserId } });
  await tx.cajasReservationCorrelation.create({ data: { companyId, assignmentId, preparationLineId: line?.id, stockScopeReferenceId: scope.id, stockReservationReferenceId: record.id, sourceCheckpoint: "preparation_confirmation", semanticKey, quantity, unit: line?.unit ?? "u" } });
  await createAuditEvent({ prisma: tx, companyId, userId: actorUserId, entityType: "StockReservation", entityId: reservation.id, action: "cajas.reserved", module: "stock", newValue: { assignmentId, preparationLineId: line?.id, quantity: quantity.toString(), location } });
  return reservation;
}

export async function reserveAssignedBox(db: CajasDb, companyId: string, assignmentId: string, actorUserId: string, input?: { idempotencyKey: string; expectedVersion: number; cause: string }) {
  return cajasTransaction(db, async (tx) => {
    await lockCajasAssignment(tx, companyId, assignmentId);
    const assignment = await tx.cajasAssignment.findFirst({ where: { id: assignmentId, companyId }, include: { boxStockScopeReference: true, preparation: { include: { lines: { where: { isActive: true }, include: { stockScopeReference: true } } } } } });
    if (!assignment?.preparation) throw notFound("Asignación activa no encontrada", "active_assignment_not_found");
    const prep = assignment.preparation;
    const key = input?.idempotencyKey ?? `incorporation:${prep.version}`;
    const payload = { assignmentId, expectedVersion: input?.expectedVersion ?? prep.version, cause: input?.cause ?? "Incorporación confirmada" };
    const replay = await replayCajasCommand(tx, companyId, assignmentId, "preparationChange", key, payload);
    if (replay) {
      const audit = await tx.auditEvent.findFirstOrThrow({ where: { id: replay.auditEventId, companyId }, select: { metadata: true } });
      const snapshot = (audit.metadata as { acceptedResult?: unknown } | null)?.acceptedResult;
      if (snapshot !== undefined) return snapshot;
      return tx.stockReservation.findMany({ where: { companyId, semanticKey: { startsWith: `incorporation:${replay.id}:` } } });
    }
    if (assignment.activeSlot !== 1) throw conflict("Asignación inactiva", "assignment_inactive");
    if (payload.expectedVersion !== prep.version) throw conflict("Preparación modificada", "cajas_stale_preparation");
    if (!prep.lines.length || prep.lines.some((l) => !l.stockScopeReference)) throw badRequest("Selección de componentes incompleta", "preparation_components_incomplete");
    const batchId = cajasId();
    const existing = await tx.stockReservation.findMany({ where: { companyId, assignmentId, status: "ACTIVE" } });
    const results = [...existing];
    if (!existing.some((r) => !r.preparationLineId)) {
      const box = await reserveCajasComponent(tx, companyId, assignmentId, null, assignment.boxStockScopeReference, actorUserId, `incorporation:${batchId}`);
      if (box) results.push(box);
    }
    for (const line of prep.lines) {
      if (existing.some((r) => r.preparationLineId === line.id)) continue;
      const location = (line.traceabilitySnapshot as { location?: string } | null)?.location ?? null;
      const reservation = await reserveCajasComponent(tx, companyId, assignmentId, line, line.stockScopeReference!, actorUserId, `incorporation:${batchId}`, location);
      if (reservation) results.push(reservation);
    }
    const snapshot = JSON.parse(JSON.stringify(results));
    await acceptCajasCommand(tx, { companyId, sourceOperationId: assignmentId, checkpoint: "preparationChange", semanticKey: key, payload, actorUserId, entityType: "CajasReservationCorrelation", entityId: assignmentId, acceptedResult: snapshot });
    return snapshot;
  });
}

export async function releaseAssignedBoxReservation(db: CajasDb, companyId: string, assignmentId: string, cause: string, actorUserId: string) {
  if (!cause.trim()) throw badRequest("El motivo es obligatorio", "release_cause_required");
  return cajasTransaction(db, async (tx) => {
    await lockCajasAssignment(tx, companyId, assignmentId);
    const assignment = await tx.cajasAssignment.findFirst({ where: { id: assignmentId, companyId, activeSlot: 1 }, include: { preparation: true } });
    if (!assignment?.preparation) throw notFound("Asignación activa no encontrada", "active_assignment_not_found");
    const reservations = await tx.stockReservation.findMany({ where: { companyId, assignmentId, status: "ACTIVE" } });
    if (reservations.some((r) => r.dispatchedQuantity.gt(0))) throw conflict("No puede liberar contenido despachado pendiente", "cajas_dispatched_reservation");
    for (const r of reservations) await releaseCajasReservation(tx, r, cause.trim(), actorUserId);
    await tx.cajasPreparation.update({ where: { id: assignment.preparation.id }, data: { version: { increment: 1 }, requiresRecontrol: true } });
    return { released: reservations.map((r) => r.id) };
  });
}

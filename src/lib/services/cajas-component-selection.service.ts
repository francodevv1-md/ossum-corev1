import { Prisma, type CajasStockScopeReference } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { ensureStockScopeReferenceForUnit } from "./cajas-assignment.service";
import { acceptCajasCommand, cajasId, cajasIntent, cajasTransaction, lockCajasAssignment, replayCajasCommand, type CajasDb } from "./cajas-command.service";
import { reserveCajasComponent, releaseCajasReservation } from "./stock-reservation.service";
import { calculateMovementDelta } from "./stock-ledger.service";
import { cajasComponentSelectionSchema, type CajasComponentSelectionInput } from "../validators/cajas-assignment";

export async function eligibleCajasComponents(db: CajasDb, companyId: string, lineId: string) {
  const line = await db.cajasPreparationLine.findFirst({ where: { id: lineId, companyId, isActive: true, preparation: { assignment: { activeSlot: 1 } } }, include: { articleReference: true } });
  if (!line) throw notFound("Línea activa no encontrada", "preparation_line_not_found");
  const articleId = line.articleReference.sourceArticleId;
  const units = await db.stockPhysicalUnit.findMany({ where: { companyId, articleId, status: "ACTIVE", reservations: { none: { activeSlot: 1 } } }, orderBy: { unitCode: "asc" } });
  const movements = await db.stockMovement.findMany({ where: { companyId, articleId }, orderBy: { createdAt: "asc" } });
  const positions = new Map<string, { sourceMovementId: string; lot: string | null; serial: string | null; expiry: Date | null; location: string | null; physical: number }>();
  for (const m of movements) {
    const key = stockPositionKey(m);
    const position = positions.get(key) ?? { sourceMovementId: m.id, lot: m.lotCode, serial: m.serialNumber, expiry: m.expirationDate, location: m.location, physical: 0 };
    position.physical += calculateMovementDelta(m.movementType, m.quantity);
    positions.set(key, position);
  }
  const reservations = await db.stockReservation.findMany({ where: { companyId, articleId, status: "ACTIVE" }, include: { stockScopeReference: true } });
  return { units, positions: [...positions.entries()].map(([key, position]) => ({ ...position,
    available: Math.max(0, position.physical - reservations.filter((r) => r.stockScopeReference?.sourceStockScopeId === key).reduce((n, r) => n + Number(r.remainingQuantity), 0)),
  })).filter((p) => p.available > 0 && !p.serial && (!p.expiry || p.expiry >= new Date(new Date().toISOString().slice(0, 10)))) };
}

export function stockPositionKey(m: { articleId: string; lotCode: string | null; serialNumber: string | null; expirationDate: Date | null; location: string | null }) {
  return `position:${cajasIntent([m.articleId, m.lotCode, m.serialNumber, m.expirationDate?.toISOString().slice(0, 10) ?? null, m.location])}`;
}

export async function selectCajasComponent(db: CajasDb, companyId: string, lineId: string, raw: CajasComponentSelectionInput, actorUserId: string) {
  const input = cajasComponentSelectionSchema.parse(raw);
  return cajasTransaction(db, async (tx) => {
    let line = await tx.cajasPreparationLine.findFirst({ where: { id: lineId, companyId }, include: { articleReference: true, preparation: { include: { assignment: true } } } });
    if (!line) throw notFound("Línea de preparación no encontrada", "preparation_line_not_found");
    await lockCajasAssignment(tx, companyId, line.preparation.assignmentId);
    line = await tx.cajasPreparationLine.findFirstOrThrow({ where: { id: lineId, companyId }, include: { articleReference: true, preparation: { include: { assignment: true } } } });
    const prep = line.preparation;
    const payload = { lineId, ...input };
    const replay = await replayCajasCommand(tx, companyId, prep.assignmentId, "preparationChange", input.idempotencyKey, payload);
    if (replay) return tx.cajasCompositionChange.findUniqueOrThrow({ where: { id: replay.resultEntityId }, include: { lines: true } });
    if (prep.assignment.activeSlot !== 1 || (!line.isActive && (input.remove || input.append))) throw conflict("Preparación inactiva", "preparation_inactive");
    if (prep.version !== input.expectedVersion) throw conflict("La preparación cambió; actualice la vista", "cajas_stale_preparation");
    if (line.dispatchedQuantity.gt(0)) throw conflict("No se puede cambiar contenido ya despachado", "cajas_component_dispatched");
    const article = await tx.article.findFirst({ where: { id: line.articleReference.sourceArticleId, isActive: true, stockEligibilities: { some: { companyId } } }, include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } });
    if (!article) throw notFound("Artículo no habilitado", "article_not_found");
    const quantity = new Prisma.Decimal(input.quantity ?? line.quantity);
    if (input.append && !line.expectedFormulaLineId) throw badRequest("La asignación adicional requiere línea de fórmula", "cajas_formula_line_required");
    const targetLineId = input.append ? cajasId() : line.id;
    let scope: CajasStockScopeReference | null = null;
    let location: string | null = null;
    if (!input.remove) {
      if (input.physicalUnitId) {
        const unit = await tx.stockPhysicalUnit.findFirst({ where: { id: input.physicalUnitId, companyId, status: "ACTIVE", articleId: article.id } });
        if (!unit) throw notFound("Unidad física no disponible", "physical_unit_not_found");
        if (!quantity.eq(1)) throw badRequest("Una unidad identificada requiere cantidad 1", "identified_quantity_invalid");
        const reserved = await tx.stockReservation.findFirst({ where: { companyId, physicalUnitId: unit.id, activeSlot: 1 } });
        if (reserved && reserved.preparationLineId !== targetLineId) throw conflict("Unidad ya reservada", "physical_unit_already_reserved");
        scope = await ensureStockScopeReferenceForUnit(tx, companyId, line.articleReferenceId, unit, actorUserId);
        const duplicate = await tx.cajasPreparationLine.findMany({ where: { companyId, preparationId: prep.id, isActive: true, stockScopeReferenceId: scope.id, id: { not: targetLineId } } });
        if (duplicate.length) throw conflict("Unidad ya seleccionada", "physical_unit_already_selected");
        location = unit.location;
      } else {
        const movement = await tx.stockMovement.findFirst({ where: { id: input.sourceMovementId, companyId, articleId: article.id } });
        if (!movement || movement.serialNumber) throw notFound("Posición de stock no disponible", "stock_position_not_found");
        const policy = article.tracePolicies[0]?.policy ?? "NONE";
        if (policy.includes("SERIAL") || (policy.includes("LOT") && !movement.lotCode) || (policy.includes("EXPIRY") && !movement.expirationDate)) throw badRequest("Trazabilidad incompleta", "cajas_traceability_required");
        if (movement.expirationDate && movement.expirationDate < new Date(new Date().toISOString().slice(0, 10))) throw conflict("Lote vencido", "stock_expired");
        const key = stockPositionKey(movement);
        const movements = await tx.stockMovement.findMany({ where: { companyId, articleId: article.id } });
        const physical = movements.filter((m) => stockPositionKey(m) === key).reduce((n, m) => n.plus(calculateMovementDelta(m.movementType, m.quantity)), new Prisma.Decimal(0));
        const reservations = await tx.stockReservation.findMany({ where: { companyId, articleId: article.id, status: "ACTIVE", preparationLineId: { not: targetLineId } }, include: { stockScopeReference: true } });
        const reserved = reservations.filter((r) => r.stockScopeReference?.sourceStockScopeId === key).reduce((n, r) => n.plus(r.remainingQuantity), new Prisma.Decimal(0));
        if (physical.minus(reserved).lt(quantity)) throw conflict("Stock insuficiente para seleccionar", "cajas_insufficient_stock");
        scope = await tx.cajasStockScopeReference.upsert({ where: { companyId_sourceStockScopeId: { companyId, sourceStockScopeId: key } }, update: {}, create: {
          companyId, articleReferenceId: line.articleReferenceId, sourceStockScopeId: key, kind: movement.lotCode ? "lot" : "fungiblePosition",
          lotNumberSnapshot: movement.lotCode, expirationDateSnapshot: movement.expirationDate, verifiedAt: new Date(), verifiedById: actorUserId,
        } });
        const siblings = await tx.cajasPreparationLine.findMany({ where: { companyId, preparationId: prep.id, isActive: true, stockScopeReferenceId: scope.id, id: { not: targetLineId } } });
        const unreserved = siblings.reduce((n, l) => n.plus(Prisma.Decimal.max(0, l.quantity.minus(reservations.filter((r) => r.preparationLineId === l.id).reduce((q, r) => q.plus(r.remainingQuantity), new Prisma.Decimal(0))))), new Prisma.Decimal(0));
        if (physical.minus(reserved).minus(unreserved).lt(quantity)) throw conflict("Stock insuficiente para seleccionar", "cajas_insufficient_stock");
        location = movement.location;
      }
    }
    const oldReservations = await tx.stockReservation.findMany({ where: { companyId, preparationLineId: targetLineId, status: "ACTIVE" } });
    for (const reservation of oldReservations) {
      if (reservation.dispatchedQuantity.gt(0)) throw conflict("Componente con saldo despachado", "cajas_component_dispatched");
      await releaseCajasReservation(tx, reservation, input.cause, actorUserId);
    }
    const id = cajasId();
    const command = await acceptCajasCommand(tx, { companyId, sourceOperationId: prep.assignmentId, checkpoint: "preparationChange", semanticKey: input.idempotencyKey, payload, actorUserId, entityType: "CajasCompositionChange", entityId: id });
    const trace = { location, selectionCommandId: command.id };
    const allocationData = { stockScopeReferenceId: scope?.id ?? null, quantity, isActive: !input.remove, lotNumberSnapshot: scope?.lotNumberSnapshot ?? null, serialNumberSnapshot: scope?.serialNumberSnapshot ?? null, expirationDateSnapshot: scope?.expirationDateSnapshot ?? null, traceabilitySnapshot: trace };
    const appended = input.append
      ? await tx.cajasPreparationLine.create({ data: { id: targetLineId, companyId, preparationId: prep.id, lineKey: `${line.lineKey}:${targetLineId}`, expectedFormulaLineId: line.expectedFormulaLineId, role: line.role, articleReferenceId: line.articleReferenceId, unit: line.unit, ...allocationData } })
      : null;
    const change = await tx.cajasCompositionChange.create({ data: { id, companyId, assignmentId: prep.assignmentId, priorPreparationVersion: prep.version, resultingPreparationVersion: prep.version + 1, acceptedAt: new Date(), acceptedById: actorUserId, cause: input.cause, commandAcceptanceId: command.id,
      lines: { create: { lineNumber: 1, kind: input.remove ? "remove" : input.append ? "add" : line.stockScopeReferenceId ? "replace" : "add", priorPreparationLineId: input.append ? null : line.id, resultingPreparationLineId: targetLineId, priorArticleReferenceId: input.append ? null : line.articleReferenceId, resultingArticleReferenceId: line.articleReferenceId, priorStockScopeReferenceId: input.append ? null : line.stockScopeReferenceId, resultingStockScopeReferenceId: scope?.id, priorQuantity: input.append ? null : line.quantity, resultingQuantity: input.remove ? 0 : quantity, unit: line.unit, priorTraceabilitySnapshot: input.append ? Prisma.JsonNull : line.traceabilitySnapshot ?? Prisma.JsonNull, resultingTraceabilitySnapshot: trace } },
    }, include: { lines: true } });
    const updated = appended ?? await tx.cajasPreparationLine.update({ where: { id: line.id }, data: { ...allocationData, version: { increment: 1 } } });
    const reservationActive = oldReservations.length || (input.append && await tx.stockReservation.findFirst({ where: { companyId, assignmentId: prep.assignmentId, status: "ACTIVE" } }));
    if (reservationActive && scope) await reserveCajasComponent(tx, companyId, prep.assignmentId, updated, scope, actorUserId, `change:${command.id}`, location);
    await tx.cajasPreparation.update({ where: { id: prep.id }, data: { version: { increment: 1 }, requiresRecontrol: true, lastAcceptedChangeId: change.id, evidenceWatermark: command.id } });
    return change;
  });
}

export async function selectPhysicalComponentForPreparationLine(db: CajasDb, companyId: string, lineId: string, physicalUnitId: string, actorUserId: string) {
  const line = await db.cajasPreparationLine.findFirst({ where: { id: lineId, companyId }, include: { preparation: true } });
  if (!line) throw notFound("Línea de preparación no encontrada", "preparation_line_not_found");
  return selectCajasComponent(db, companyId, lineId, { physicalUnitId, quantity: 1, expectedVersion: line.preparation.version, idempotencyKey: `physical:${lineId}:${line.preparation.version}:${physicalUnitId}`, cause: "Selección de unidad identificada" }, actorUserId);
}

import { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { cajasDispatchSchema } from "../validators/cajas-assignment";
import { acceptCajasCommand, cajasId, lockCajasAssignment, openCajasDifferences, replayCajasCommand } from "./cajas-command.service";
import { calculateMovementDelta, recordStockMovement } from "./stock-ledger.service";
import { stockPositionKey } from "./cajas-component-selection.service";

// Called only by the owning Remito issuance transaction, after it accepts Emitido.
export async function acceptCajasDispatch(tx: Prisma.TransactionClient, companyId: string, remitoId: string, raw: unknown, actorUserId: string) {
  const input = cajasDispatchSchema.parse(raw);
  input.lines.sort((a, b) => a.preparationLineId.localeCompare(b.preparationLineId));
  const payload = { remitoId, ...input };
  await lockCajasAssignment(tx, companyId, input.assignmentId);
  const replay = await replayCajasCommand(tx, companyId, input.assignmentId, "dispatch", input.idempotencyKey, payload);
  if (replay) return tx.cajasDispatch.findFirstOrThrow({ where: { id: replay.resultEntityId, companyId, remitoId, assignmentId: input.assignmentId } });
  if (await tx.cajasDispatch.findFirst({ where: { companyId, remitoId } })) throw conflict("Remito already has an accepted dispatch", "cajas_remito_already_dispatched");
  const assignment = await tx.cajasAssignment.findFirst({ where: { id: input.assignmentId, companyId, activeSlot: 1 }, include: { preparation: { include: { latestControl: { include: { lines: true } }, lines: { include: { articleReference: true } } } } } });
  const remito = await tx.remito.findFirst({ where: { id: remitoId, companyId }, include: { items: true } });
  if (!assignment?.preparation || !remito || remito.surgeryId !== assignment.surgeryId) throw notFound("Operación no encontrada", "cajas_dispatch_operation_not_found");
  if (remito.state !== "Emitido" || remito.salidaReason !== "cirugia") throw conflict("Remito no válido para despacho", "cajas_remito_not_issued");
  const prep = assignment.preparation;
  const control = prep.latestControl;
  if (input.expectedVersion !== prep.version || !control || control.sourcePreparationVersion !== prep.version || prep.requiresRecontrol || control.result !== "clean") throw conflict("Control vigente obligatorio", "cajas_dispatch_control_required");
  if ((await openCajasDifferences(tx, companyId, assignment.id)).length) throw conflict("Hay diferencias abiertas", "cajas_open_differences");
  const reservations = await tx.stockReservation.findMany({ where: { companyId, assignmentId: assignment.id, status: "ACTIVE" } });
   if (!reservations.some((r) => !r.preparationLineId && r.activeSlot === 1 && r.stockScopeReferenceId === assignment.boxStockScopeReferenceId && r.remainingQuantity.eq(1))) throw conflict("Caja no reservada", "cajas_box_reservation_required");
  if (new Set(input.lines.map((l) => l.preparationLineId)).size !== input.lines.length) throw badRequest("Líneas duplicadas", "cajas_duplicate_dispatch_line");
  const byItem = new Map<string, Prisma.Decimal>();
  const sources = input.lines.map((requested) => {
    const line = prep.lines.find((l) => l.id === requested.preparationLineId && l.isActive);
    const evidence = control.lines.find((l) => l.sourcePreparationLineId === requested.preparationLineId);
    const item = remito.items.find((i) => i.id === requested.remitoItemId);
    const reservation = reservations.find((r) => r.preparationLineId === requested.preparationLineId && r.stockScopeReferenceId === line?.stockScopeReferenceId);
    const quantity = new Prisma.Decimal(requested.quantity);
    if (!line || !evidence || !item || !reservation || reservation.activeSlot !== 1 || reservation.articleId !== line.articleReference.sourceArticleId || evidence.articleReferenceId !== line.articleReferenceId || evidence.stockScopeReferenceId !== line.stockScopeReferenceId || !evidence.quantity.eq(line.quantity) || evidence.unit !== line.unit || evidence.lotNumberSnapshot !== line.lotNumberSnapshot || evidence.serialNumberSnapshot !== line.serialNumberSnapshot || (evidence.expirationDateSnapshot?.getTime() ?? null) !== (line.expirationDateSnapshot?.getTime() ?? null) || JSON.stringify(evidence.traceabilitySnapshot) !== JSON.stringify(line.traceabilitySnapshot) || item.itemId !== line.articleReference.sourceArticleId || (item.unit && item.unit !== line.unit) || (item.lotNumber ?? null) !== evidence.lotNumberSnapshot || (item.serialNumber ?? null) !== evidence.serialNumberSnapshot || (item.expirationDate?.getTime() ?? null) !== (evidence.expirationDateSnapshot?.getTime() ?? null)) throw badRequest("Línea fuera del contenido controlado/reservado", "cajas_dispatch_line_invalid");
    if (quantity.decimalPlaces() > 4 || quantity.gt(reservation.remainingQuantity) || quantity.gt(line.quantity.minus(line.dispatchedQuantity))) throw conflict("Cantidad excede el saldo reservado", "cajas_dispatch_quantity_exceeded");
    byItem.set(item.id, (byItem.get(item.id) ?? new Prisma.Decimal(0)).plus(quantity));
    return { requested, line, evidence, item, reservation, quantity };
  });
  if (remito.items.some((item) => !byItem.get(item.id)?.eq(item.quantity))) throw badRequest("El Remito debe coincidir con su despacho declarado", "cajas_dispatch_remito_quantity_mismatch");
  const requestedByPosition = new Map<string, Prisma.Decimal>();
  for (const { line, evidence, quantity } of sources) {
    const articleId = line.articleReference.sourceArticleId;
    await tx.$queryRaw`SELECT id FROM article WHERE id = ${articleId} FOR UPDATE`;
    const key = stockPositionKey({ articleId, lotCode: evidence.lotNumberSnapshot, serialNumber: evidence.serialNumberSnapshot, expirationDate: evidence.expirationDateSnapshot, location: (evidence.traceabilitySnapshot as { location?: string } | null)?.location ?? null });
    const requested = (requestedByPosition.get(key) ?? new Prisma.Decimal(0)).plus(quantity);
    requestedByPosition.set(key, requested);
    const movements = await tx.stockMovement.findMany({ where: { companyId, articleId } });
    const physical = movements.filter((m) => stockPositionKey(m) === key).reduce((n, m) => n.plus(calculateMovementDelta(m.movementType, m.quantity)), new Prisma.Decimal(0));
    if (physical.lt(requested)) throw conflict("Insufficient physical stock for dispatch", "cajas_dispatch_insufficient_stock");
  }
  const id = cajasId();
  const command = await acceptCajasCommand(tx, { companyId, sourceOperationId: assignment.id, checkpoint: "dispatch", semanticKey: input.idempotencyKey, payload, actorUserId, entityType: "CajasDispatch", entityId: id });
  const prior = await tx.cajasDispatch.findFirst({ where: { companyId, assignmentId: assignment.id }, orderBy: { sequence: "desc" } });
  const dispatch = await tx.cajasDispatch.create({ data: { id, companyId, assignmentId: assignment.id, remitoId, sourceControlId: control.id, sequence: (prior?.sequence ?? 0) + 1, acceptedAt: new Date(), acceptedById: actorUserId, commandAcceptanceId: command.id } });
  const accounting = await tx.cajasDispatchAccounting.create({ data: { companyId, dispatchId: id, evidenceWatermark: command.id } });
  for (const [i, source] of sources.entries()) {
    const { line, evidence, item, reservation, quantity } = source;
    const dispatchLineId = cajasId();
    const movement = await recordStockMovement(tx, { companyId, articleId: line.articleReference.sourceArticleId, movementType: "DISPATCH_OUT", quantity, lotCode: evidence.lotNumberSnapshot, serialNumber: evidence.serialNumberSnapshot, expirationDate: evidence.expirationDateSnapshot, location: (evidence.traceabilitySnapshot as { location?: string } | null)?.location, remitoId, remitoItemId: item.id, surgeryId: assignment.surgeryId, idempotencyKey: `cajas-dispatch:${dispatchLineId}`, createdById: actorUserId });
    const stockRef = await tx.cajasStockRecordReference.create({ data: { companyId, kind: "effect", sourceStockRecordId: movement.id, sourceCheckpoint: "dispatch", verifiedAt: new Date(), verifiedById: actorUserId } });
    await tx.cajasDispatchLine.create({ data: { id: dispatchLineId, companyId, dispatchId: id, remitoId, remitoItemId: item.id, lineNumber: i + 1, sourceControlLineId: evidence.id, sourcePreparationLineId: line.id, articleReferenceId: evidence.articleReferenceId, stockScopeReferenceId: evidence.stockScopeReferenceId, quantity, unit: evidence.unit, skuSnapshot: evidence.skuSnapshot, descriptionSnapshot: evidence.descriptionSnapshot ?? item.description, lotNumberSnapshot: evidence.lotNumberSnapshot, serialNumberSnapshot: evidence.serialNumberSnapshot, expirationDateSnapshot: evidence.expirationDateSnapshot, traceabilitySnapshot: { ...(evidence.traceabilitySnapshot as object ?? {}), reservationId: reservation.id }, stockEffectReferenceId: stockRef.id } });
    await tx.cajasDispatchLineAccounting.create({ data: { companyId, accountingId: accounting.id, dispatchLineId, dispatchedQuantity: quantity, pendingQuantity: quantity, unit: evidence.unit } });
    await tx.stockReservation.update({ where: { id: reservation.id }, data: { remainingQuantity: { decrement: quantity }, dispatchedQuantity: { increment: quantity } } });
    await tx.cajasPreparationLine.update({ where: { id: line.id }, data: { dispatchedQuantity: { increment: quantity } } });
    await tx.cajasCommandEffect.create({ data: { companyId, commandAcceptanceId: command.id, effectKey: dispatchLineId, effectType: "stock.dispatch", resultEntityType: "StockMovement", resultEntityId: movement.id, stockRecordReferenceId: stockRef.id } });
  }
  return dispatch;
}

import { Prisma, type CajasDispositionKind } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { cajasAccountingSchema } from "../validators/cajas-assignment";
import { acceptCajasCommand, cajasId, lockCajasAssignment, replayCajasCommand } from "./cajas-command.service";
import { recordStockMovement } from "./stock-ledger.service";

// Both document owners use this one guarded balance; this function never confirms a document.
export async function acceptCajasAccounting(tx: Prisma.TransactionClient, companyId: string, sourceId: string, owner: "return" | "consumption", raw: unknown, actorUserId: string) {
  const input = cajasAccountingSchema.parse(raw);
  input.lines.sort((a, b) => a.dispatchLineId.localeCompare(b.dispatchLineId) || a.sourceItemId.localeCompare(b.sourceItemId) || a.kind.localeCompare(b.kind));
  const dispatch = await tx.cajasDispatch.findFirst({ where: { id: input.dispatchId, companyId }, include: { accounting: true, lines: { include: { accounting: true, articleReference: true } } } });
  if (!dispatch?.accounting) throw notFound("Despacho no encontrado", "cajas_dispatch_not_found");
  await lockCajasAssignment(tx, companyId, dispatch.assignmentId);
  const checkpoint = owner === "return" ? "returnConfirmation" : "consumptionConfirmation";
  const payload = { sourceId, ...input };
  const replay = await replayCajasCommand(tx, companyId, dispatch.assignmentId, checkpoint, input.idempotencyKey, payload);
  if (replay) return { replay: true, confirmationId: replay.resultEntityId };
  const source = owner === "return"
    ? await tx.devolucion.findFirst({ where: { id: sourceId, companyId, remitoId: dispatch.remitoId, state: "Confirmada" }, include: { items: true } })
    : await tx.consumo.findFirst({ where: { id: sourceId, companyId, remitoId: dispatch.remitoId, state: "Validado" }, include: { items: true } });
  if (!source) throw notFound("Documento confirmado no encontrado", "cajas_accounting_source_not_found");
  const totals = new Map<string, Prisma.Decimal>();
  for (const requested of input.lines) totals.set(requested.sourceItemId, (totals.get(requested.sourceItemId) ?? new Prisma.Decimal(0)).plus(requested.quantity));
  for (const item of source.items) {
    const qty = "returnedQuantity" in item ? item.returnedQuantity : item.consumedQuantity;
    if (!qty.eq(totals.get(item.id) ?? 0)) throw badRequest("Cantidades no coinciden con el documento", "cajas_accounting_source_quantity_mismatch");
  }
  if (input.lines.some((l) => !source.items.some((i) => i.id === l.sourceItemId))) throw badRequest("Línea ajena al documento", "cajas_accounting_source_item_invalid");
  const id = cajasId();
  const command = await acceptCajasCommand(tx, { companyId, sourceOperationId: dispatch.assignmentId, checkpoint, semanticKey: input.idempotencyKey, payload, actorUserId, entityType: owner === "return" ? "CajasReturnConfirmation" : "CajasConsumptionConfirmation", entityId: id });
  const common = { id, companyId, dispatchId: dispatch.id, remitoId: dispatch.remitoId, sequence: 1, observedAccountingVersion: dispatch.accounting.version, acceptedAt: new Date(), acceptedById: actorUserId, commandAcceptanceId: command.id };
  if (owner === "return") await tx.cajasReturnConfirmation.create({ data: { ...common, devolucionId: sourceId, result: input.lines.some((l) => ["missing", "damaged", "underReview"].includes(l.kind)) ? "withDifferences" : "clean" } });
  else await tx.cajasConsumptionConfirmation.create({ data: { ...common, consumoId: sourceId } });
  for (const [index, requested] of input.lines.entries()) {
    const line = dispatch.lines.find((l) => l.id === requested.dispatchLineId);
    const sourceItem = source.items.find((i) => i.id === requested.sourceItemId)!;
    const quantity = new Prisma.Decimal(requested.quantity);
    if (!line || !line.accounting || sourceItem.remitoItemId !== line.remitoItemId || quantity.decimalPlaces() > 4 || (sourceItem.unit && sourceItem.unit !== line.unit)) throw badRequest("Contenido ajeno al despacho", "cajas_accounting_dispatch_line_invalid");
    if (owner === "consumption" && requested.kind !== "consumed") throw badRequest("Consumo requiere clasificación consumido", "cajas_consumption_kind_invalid");
    const commonLine = { companyId, dispatchId: dispatch.id, dispatchLineId: line.id, lineNumber: index + 1, articleReferenceId: line.articleReferenceId, stockScopeReferenceId: line.stockScopeReferenceId, quantity, unit: line.unit, lotNumberSnapshot: line.lotNumberSnapshot, serialNumberSnapshot: line.serialNumberSnapshot, expirationDateSnapshot: line.expirationDateSnapshot, traceabilitySnapshot: line.traceabilitySnapshot ?? Prisma.JsonNull };
    if (requested.recognizedReturnDispositionId) {
      if (owner !== "consumption") throw badRequest("Reconocimiento exclusivo de Consumo", "cajas_recognition_owner_invalid");
      const disposition = await tx.cajasDisposition.findFirst({ where: { id: requested.recognizedReturnDispositionId, companyId, dispatchLineId: line.id, kind: "consumed", returnConfirmationId: { not: null }, recognizedByConsumptionLine: null } });
      if (!disposition || !disposition.quantity.eq(quantity)) throw conflict("Consumo ya imputado o reconocimiento inválido", "cajas_consumption_recognition_conflict");
      await tx.cajasConsumptionLine.create({ data: { ...commonLine, consumptionConfirmationId: id, consumoId: sourceId, consumoItemId: sourceItem.id, recognizedReturnDispositionId: disposition.id } });
      continue;
    }
    const claim = await tx.cajasDispatchLineAccounting.updateMany({ where: { companyId, dispatchLineId: line.id, pendingQuantity: { gte: quantity } }, data: { pendingQuantity: { decrement: quantity }, disposedQuantity: { increment: quantity }, version: { increment: 1 } } });
    if (claim.count !== 1) throw conflict("La imputación excede el saldo pendiente", "cajas_accounting_quantity_exceeded");
    const evidenceLine = owner === "return"
      ? await tx.cajasReturnLine.create({ data: { ...commonLine, returnConfirmationId: id, devolucionId: sourceId, devolucionItemId: sourceItem.id, kind: requested.kind, skuSnapshot: line.skuSnapshot, descriptionSnapshot: line.descriptionSnapshot, humanValidated: true } })
      : await tx.cajasConsumptionLine.create({ data: { ...commonLine, consumptionConfirmationId: id, consumoId: sourceId, consumoItemId: sourceItem.id } });
    const dispositionId = cajasId();
    const dispositionKind: CajasDispositionKind = requested.kind === "unchanged" ? "returned" : requested.kind;
    const returned = dispositionKind === "returned";
    // Dispatch already removed physical stock. Consumption/holds are zero-delta disposition effects, not a second physical exit.
    const movement = await recordStockMovement(tx, { companyId, articleId: line.articleReference.sourceArticleId, movementType: returned ? "RETURN_IN" : "ADJUSTMENT", quantity: returned ? quantity : 0, lotCode: line.lotNumberSnapshot, serialNumber: line.serialNumberSnapshot, expirationDate: line.expirationDateSnapshot, location: (line.traceabilitySnapshot as { location?: string } | null)?.location, remitoId: dispatch.remitoId, remitoItemId: line.remitoItemId, devolucionId: owner === "return" ? sourceId : null, devolucionItemId: owner === "return" ? sourceItem.id : null, consumoId: owner === "consumption" ? sourceId : null, consumoItemId: owner === "consumption" ? sourceItem.id : null, idempotencyKey: `cajas-disposition:${dispositionId}`, metadata: { dispositionKind: requested.kind, disposedQuantity: quantity.toString() }, createdById: actorUserId });
    const stockRef = await tx.cajasStockRecordReference.create({ data: { companyId, kind: "effect", sourceStockRecordId: movement.id, sourceCheckpoint: checkpoint, verifiedAt: new Date(), verifiedById: actorUserId } });
    await tx.cajasDisposition.create({ data: { id: dispositionId, companyId, dispatchLineId: line.id, sliceKey: `${command.id}:${index}`, kind: dispositionKind, quantity, unit: line.unit, stockScopeReferenceId: line.stockScopeReferenceId, returnConfirmationId: owner === "return" ? id : null, consumptionConfirmationId: owner === "consumption" ? id : null, returnLineId: owner === "return" ? evidenceLine.id : null, consumptionLineId: owner === "consumption" ? evidenceLine.id : null, stockEffectReferenceId: stockRef.id, acceptedAt: new Date(), commandAcceptanceId: command.id } });
    const reservationId = (line.traceabilitySnapshot as { reservationId?: string } | null)?.reservationId;
    const reservation = await tx.stockReservation.findFirst({ where: { id: reservationId ?? "", companyId, assignmentId: dispatch.assignmentId, preparationLineId: line.sourcePreparationLineId, stockScopeReferenceId: line.stockScopeReferenceId } });
    if (!reservation || reservation.dispatchedQuantity.lt(quantity)) throw conflict("Reserva y despacho incoherentes", "cajas_accounting_reservation_mismatch");
    const outstanding = reservation.dispatchedQuantity.minus(quantity);
    const unavailable = ["missing", "damaged", "underReview"].includes(requested.kind);
    await tx.stockReservation.update({ where: { id: reservation.id }, data: { dispatchedQuantity: outstanding, ...(outstanding.isZero() && reservation.remainingQuantity.isZero() && !unavailable ? { status: "RELEASED", activeSlot: null, releasedAt: new Date(), releasedById: actorUserId, releaseCause: `Disposition ${dispositionId}` } : {}) } });
    if (["missing", "damaged", "underReview"].includes(requested.kind)) {
      await tx.cajasDifference.create({ data: { companyId, assignmentId: dispatch.assignmentId, dispatchLineId: line.id, returnLineId: owner === "return" ? evidenceLine.id : null, kind: requested.kind, observedFacts: `Confirmed ${quantity.toString()} ${line.unit} as ${requested.kind}`, openedAt: new Date(), openedById: actorUserId } });
      await tx.cajasPreparation.updateMany({ where: { companyId, assignmentId: dispatch.assignmentId }, data: { requiresRecontrol: true, version: { increment: 1 } } });
    }
    await tx.cajasCommandEffect.create({ data: { companyId, commandAcceptanceId: command.id, effectKey: dispositionId, effectType: `stock.${returned ? "returned" : requested.kind}`, resultEntityType: "StockMovement", resultEntityId: movement.id, stockRecordReferenceId: stockRef.id } });
  }
  await tx.cajasDispatchAccounting.update({ where: { id: dispatch.accounting.id }, data: { version: { increment: 1 }, evidenceWatermark: command.id } });
  return { replay: false, confirmationId: id };
}

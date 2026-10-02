import { Prisma } from "@prisma/client";
import { conflict, notFound } from "../api/errors";
import { acceptCajasCommand, cajasId, cajasTransaction, lockCajasAssignment, openCajasDifferences, replayCajasCommand, type CajasDb } from "./cajas-command.service";
import { cajasControlSchema } from "../validators/cajas-assignment";
import type { z } from "zod";

export async function confirmCajasControl(db: CajasDb, companyId: string, assignmentId: string, cause: string | undefined, actorUserId: string, input?: z.infer<typeof cajasControlSchema>) {
  return cajasTransaction(db, async (tx) => {
    await lockCajasAssignment(tx, companyId, assignmentId);
    const assignment = await tx.cajasAssignment.findFirst({ where: { id: assignmentId, companyId }, include: { preparation: { include: { formulaVersion: { include: { lines: true } }, latestControl: true, lines: { orderBy: { lineKey: "asc" }, include: { articleReference: true, stockScopeReference: true } } } } } });
    if (!assignment?.preparation) throw notFound("Preparación activa no encontrada", "preparation_not_found");
    const prep = assignment.preparation;
    const commandInput = input ?? { kind: "control" as const, cause: cause?.trim() || "Control de preparación", expectedVersion: prep.version, idempotencyKey: `control:${prep.version}` };
    const payload = cajasControlSchema.parse(commandInput);
    const replay = await replayCajasCommand(tx, companyId, assignmentId, payload.kind, payload.idempotencyKey, payload);
    if (replay) return tx.cajasControl.findUniqueOrThrow({ where: { id: replay.resultEntityId }, include: { lines: true } });
    if (assignment.activeSlot !== 1) throw conflict("Asignación inactiva", "assignment_inactive");
    if (payload.expectedVersion !== prep.version) throw conflict("La preparación cambió", "cajas_stale_preparation");
    const differences = await openCajasDifferences(tx, companyId, assignmentId);
    if (payload.kind === "recontrol" && differences.length) throw conflict("Cierre cada diferencia antes de recontrolar", "cajas_open_differences");
    if (prep.latestControlId && payload.kind !== "recontrol" && prep.requiresRecontrol) throw conflict("Se requiere Recontrolar caja", "cajas_explicit_recontrol_required");
    if (prep.lines.some((l) => l.dispatchedQuantity.gt(0))) throw conflict("Control de retorno requiere conciliación de consumo y devolución", "cajas_return_control_not_supported");
    const mismatches: Array<{ kind: string; facts: object }> = [];
    for (const expected of prep.formulaVersion.lines) {
      const allocations = prep.lines.filter((l) => l.expectedFormulaLineId === expected.id && l.isActive);
      const selected = allocations.filter((l) => l.stockScopeReferenceId && l.articleReferenceId === expected.articleReferenceId && l.unit === expected.unit);
      const actual = selected.reduce((n, l) => n.plus(l.quantity), new Prisma.Decimal(0));
      if (!actual.eq(expected.expectedQuantity) || selected.length !== allocations.length) mismatches.push({ kind: "formulaComposition", facts: { formulaLineId: expected.id, articleReferenceId: expected.articleReferenceId, unit: expected.unit, expectedQuantity: expected.expectedQuantity.toString(), selectedQuantity: actual.toString(), preparationLineIds: allocations.map((l) => l.id) } });
    }
    for (const line of prep.lines.filter((l) => l.isActive)) {
      if (!prep.formulaVersion.lines.some((f) => f.id === line.expectedFormulaLineId && f.articleReferenceId === line.articleReferenceId && f.unit === line.unit) || !line.stockScopeReferenceId || (line.stockScopeReference?.kind === "identifiedUnit" && !line.quantity.eq(1))) mismatches.push({ kind: "invalidAllocation", facts: { preparationLineId: line.id, quantity: line.quantity.toString(), stockScopeReferenceId: line.stockScopeReferenceId } });
    }
    const selectedScopes = prep.lines.filter((l) => l.isActive && l.stockScopeReference?.kind === "identifiedUnit").map((l) => l.stockScopeReferenceId);
    if (new Set(selectedScopes).size !== selectedScopes.length) mismatches.push({ kind: "duplicatePhysicalUnit", facts: { stockScopeReferenceIds: selectedScopes } });
    const result = differences.length || mismatches.length ? "withDifferences" : "clean";
    const sequence = (await tx.cajasControl.findFirst({ where: { companyId, assignmentId }, orderBy: { sequence: "desc" }, select: { sequence: true } }))?.sequence ?? 0;
    const id = cajasId();
    const command = await acceptCajasCommand(tx, { companyId, sourceOperationId: assignmentId, checkpoint: payload.kind, semanticKey: payload.idempotencyKey, payload, actorUserId, entityType: "CajasControl", entityId: id });
    const control = await tx.cajasControl.create({ data: { id, companyId, assignmentId, formulaVersionId: prep.formulaVersionId, kind: payload.kind, sequence: sequence + 1, sourcePreparationVersion: prep.version, result, priorControlId: prep.latestControlId, acceptedAt: new Date(), acceptedById: actorUserId, cause: payload.cause, commandAcceptanceId: command.id,
      lines: { create: prep.lines.map((l, i) => ({ lineNumber: i + 1, sourcePreparationLineId: l.id, expectedFormulaLineId: l.expectedFormulaLineId, role: l.role, articleReferenceId: l.articleReferenceId, stockScopeReferenceId: l.stockScopeReferenceId, quantity: l.isActive && l.stockScopeReferenceId ? l.quantity : new Prisma.Decimal(0), unit: l.unit, skuSnapshot: l.articleReference.skuSnapshot, descriptionSnapshot: l.articleReference.descriptionSnapshot, lotNumberSnapshot: l.lotNumberSnapshot, serialNumberSnapshot: l.serialNumberSnapshot, expirationDateSnapshot: l.expirationDateSnapshot, traceabilitySnapshot: l.traceabilitySnapshot ?? Prisma.JsonNull, differenceAcknowledged: l.differenceAcknowledged })) },
    }, include: { lines: true } });
    for (const mismatch of mismatches) await tx.cajasDifference.create({ data: { companyId, assignmentId, kind: mismatch.kind, observedFacts: JSON.stringify({ controlId: id, formulaVersionId: prep.formulaVersionId, preparationVersion: prep.version, ...mismatch.facts }), openedAt: new Date(), openedById: actorUserId } });
    await tx.cajasPreparation.update({ where: { id: prep.id }, data: { latestControlId: id, requiresRecontrol: result !== "clean", evidenceWatermark: command.id } });
    return control;
  });
}

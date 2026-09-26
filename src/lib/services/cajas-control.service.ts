import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { conflict, notFound } from "../api/errors";
import type { CajasControlInput, CajasDifferenceResolutionInput } from "../validators/cajas";

type Db = PrismaClient | Prisma.TransactionClient;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const controlCheckpoint = "cajas-control";
const resolutionCheckpoint = "cajas-difference-resolution";

export async function invalidateCajasControlForComposition(tx: Prisma.TransactionClient, companyId: string, assignmentId: string, actorUserId: string, commandAcceptanceId: string, cause: string) {
  if (!(tx as unknown as { cajasPreparation?: unknown }).cajasPreparation) return;
  const preparation = await tx.cajasPreparation.findFirst({ where: { companyId, assignmentId }, select: { id: true, version: true, latestControlId: true, formulaVersionId: true } });
  if (!preparation?.latestControlId) return;
  const changeId = randomUUID(), acceptedAt = new Date();
  await tx.cajasCompositionChange.create({ data: { id: changeId, companyId, assignmentId, priorPreparationVersion: preparation.version, resultingPreparationVersion: preparation.version + 1, acceptedAt, acceptedById: actorUserId, cause, commandAcceptanceId } });
  await tx.cajasPreparation.update({ where: { id: preparation.id }, data: { version: { increment: 1 }, requiresRecontrol: true, lastAcceptedChangeId: changeId, evidenceWatermark: commandAcceptanceId } });
}

export async function getCajasDispatchEligibility(db: Db, companyId: string, surgeryId: string, assignmentId: string) {
  const assignment = await db.cajasAssignment.findFirst({ where: { companyId, surgeryId, id: assignmentId, activeSlot: 1, endedAt: null }, include: { preparations: { include: { latestControl: true, lines: { where: { isActive: true }, include: { reservationCorrelations: { include: { stockReservation: { include: { projection: true } }, followingCorrelations: { select: { id: true } } } } } } }, take: 1, orderBy: { version: "desc" } }, differences: { include: { resolutions: { orderBy: { sequence: "desc" }, take: 1 } } }, dispatches: { select: { id: true } } } });
  if (!assignment || assignment.preparations.length !== 1) return { eligible: false, reason: "assignment_invalid" };
  const preparation = assignment.preparations[0], control = preparation.latestControl;
  if (assignment.dispatches.length) return { eligible: false, reason: "already_dispatched" };
  if (preparation.requiresRecontrol || !control || control.sourcePreparationVersion !== preparation.version) return { eligible: false, reason: "control_stale" };
  const complete = preparation.lines.every(line => line.reservationCorrelations.filter(row => row.followingCorrelations.length === 0 && row.stockReservation.projection?.status === "ACTIVE").reduce((sum, row) => sum.plus(row.quantity ?? 0), new Prisma.Decimal(0)).gte(line.quantity));
  if (!complete) return { eligible: false, reason: "preparation_incomplete" };
  if (assignment.differences.some(difference => !difference.resolutions[0]?.closesDifference)) return { eligible: false, reason: "difference_open" };
  return { eligible: true, reason: null, controlId: control.id, preparationId: preparation.id, preparationVersion: preparation.version };
}

async function replay(db: Db, companyId: string, checkpoint: string, key: string, intent: string) {
  const accepted = await db.operationalCommandAcceptance.findFirst({ where: { companyId, domain: "cajas", checkpoint, sourceOperationId: key } });
  if (!accepted) return null;
  if (accepted.intentHash !== intent) throw conflict("Idempotency key was already used for a different intent", "idempotency_key_reused");
  return accepted;
}

export async function acceptCajasControl(db: PrismaClient, companyId: string, surgeryId: string, assignmentId: string, actorUserId: string, input: CajasControlInput) {
  const intent = hash({ assignmentId, reason: input.reason ?? null, action: "accept-control" });
  const existing = await replay(db, companyId, controlCheckpoint, input.idempotencyKey, intent);
  if (existing) return { replayed: true, controlId: existing.resultEntityId };
  return db.$transaction(async (tx) => {
    const repeated = await replay(tx, companyId, controlCheckpoint, input.idempotencyKey, intent);
    if (repeated) return { replayed: true, controlId: repeated.resultEntityId };
    const assignment = await tx.cajasAssignment.findFirst({
      where: { companyId, id: assignmentId, surgeryId, activeSlot: 1, endedAt: null },
      include: { preparations: { include: { lines: { where: { isActive: true }, include: { reservationCorrelations: { include: { stockReservation: { include: { projection: true } }, stockPosition: true, followingCorrelations: { select: { id: true } } } } } }, latestControl: true }, take: 1, orderBy: { version: "desc" } }, controls: { select: { id: true } } },
    });
    if (!assignment || assignment.preparations.length !== 1) throw notFound("Active Caja preparation not found", "cajas_preparation_not_found");
    const preparation = assignment.preparations[0];
    const allocations = preparation.lines.flatMap(line => line.reservationCorrelations.filter(row => row.followingCorrelations.length === 0 && row.stockReservation.projection?.status === "ACTIVE").map(row => ({ line, row })));
    if (!allocations.length || preparation.lines.some(line => allocations.filter(value => value.line.id === line.id).reduce((sum, value) => sum.plus(value.row.quantity ?? 0), new Prisma.Decimal(0)).lt(line.quantity))) {
      throw conflict("Caja preparation is not complete", "cajas_control_preparation_incomplete");
    }
    if (allocations.some(({ row }) => !row.allocationTraceSnapshot || !row.quantity || !row.stockUnit || row.scaleSnapshot == null)) throw conflict("Caja allocation trace is incomplete", "cajas_control_trace_incomplete");
    const controlId = randomUUID(), commandId = randomUUID(), acceptedAt = new Date();
    const differences = allocations.filter(({ line, row }) => row.stockPosition.articleId !== line.articleId || row.stockUnit !== line.stockUnit || row.scaleSnapshot !== line.scaleSnapshot);
    const audit = await tx.auditEvent.create({ data: { companyId, userId: actorUserId, entityType: "CajasControl", entityId: controlId, action: "cajas_control_accepted", module: "cajas", newValue: { assignmentId, preparationId: preparation.id, result: differences.length ? "WITH_DIFFERENCES" : "CLEAN" } } });
    await tx.operationalCommandAcceptance.create({ data: { id: commandId, companyId, domain: "cajas", sourceOperationId: input.idempotencyKey, checkpoint: controlCheckpoint, scopeKey: assignmentId, intentHash: intent, acceptedAt, acceptedById: actorUserId, resultEntityType: "CajasControl", resultEntityId: controlId, auditEventId: audit.id } });
    await tx.cajasControl.create({ data: { id: controlId, companyId, assignmentId, boxArticleId: assignment.boxArticleId, formulaVersionId: preparation.formulaVersionId, kind: preparation.latestControlId ? "RECONTROL" : "CONTROL", sequence: assignment.controls.length + 1, sourcePreparationVersion: preparation.version, result: differences.length ? "WITH_DIFFERENCES" : "CLEAN", priorControlId: preparation.latestControlId, acknowledgementSummary: null, acceptedAt, acceptedById: actorUserId, cause: input.reason ?? null, commandAcceptanceId: commandId } });
    const controlLines = allocations.map(({ line, row }, index) => ({ id: randomUUID(), companyId, assignmentId, controlId, lineNumber: index + 1, sourcePreparationId: preparation.id, sourcePreparationLineId: line.id, expectedFormulaLineId: line.expectedFormulaLineId, role: line.role, articleId: row.stockPosition.articleId, stockPositionId: row.stockPositionId, quantity: row.quantity!, stockUnit: row.stockUnit!, scaleSnapshot: row.scaleSnapshot!, skuSnapshot: null, descriptionSnapshot: null, traceCapture: row.allocationTraceSnapshot ?? Prisma.JsonNull, differenceAcknowledged: false }));
    await tx.cajasControlLine.createMany({ data: controlLines });
    for (const difference of differences) {
      const controlLine = controlLines.find(value => value.sourcePreparationLineId === difference.line.id && value.stockPositionId === difference.row.stockPositionId);
      await tx.cajasDifference.create({ data: { id: randomUUID(), companyId, assignmentId, controlLineId: controlLine!.id, originDispatchId: null, originRemitoId: null, dispatchLineId: null, returnConfirmationId: null, returnLineId: null, kind: "PREPARATION_DIFFERENCE", observedFacts: JSON.stringify({ expectedArticleId: difference.line.articleId, expectedQuantity: difference.line.quantity.toString(), actualArticleId: difference.row.stockPosition.articleId, actualQuantity: difference.row.quantity!.toString() }), openedAt: acceptedAt, openedById: actorUserId } });
    }
    await tx.cajasPreparation.update({ where: { id: preparation.id }, data: { latestControlId: controlId, requiresRecontrol: false, evidenceWatermark: commandId } });
    return { replayed: false, controlId };
  });
}

export async function resolveCajasDifference(db: PrismaClient, companyId: string, surgeryId: string, assignmentId: string, differenceId: string, actorUserId: string, input: CajasDifferenceResolutionInput) {
  const intent = hash({ assignmentId, differenceId, decision: input.decision, reason: input.reason, evidenceReference: input.evidenceReference });
  const existing = await replay(db, companyId, resolutionCheckpoint, input.idempotencyKey, intent);
  if (existing) return { replayed: true, resolutionId: existing.resultEntityId };
  return db.$transaction(async (tx) => {
    const repeated = await replay(tx, companyId, resolutionCheckpoint, input.idempotencyKey, intent);
    if (repeated) return { replayed: true, resolutionId: repeated.resultEntityId };
    const difference = await tx.cajasDifference.findFirst({ where: { companyId, id: differenceId, assignmentId, assignment: { surgeryId, activeSlot: 1, endedAt: null } }, include: { resolutions: { orderBy: { sequence: "desc" }, take: 1 } } });
    if (!difference) throw notFound("Caja difference not found", "cajas_difference_not_found");
    if (difference.resolutions[0]?.closesDifference) throw conflict("Caja difference is already resolved", "cajas_difference_already_resolved");
    const resolutionId = randomUUID(), commandId = randomUUID(), acceptedAt = new Date(), closesDifference = input.decision === "accept";
    const audit = await tx.auditEvent.create({ data: { companyId, userId: actorUserId, entityType: "CajasDifference", entityId: differenceId, action: "cajas_difference_resolved", module: "cajas", newValue: { decision: input.decision, reason: input.reason, evidenceReference: input.evidenceReference, closesDifference } } });
    await tx.operationalCommandAcceptance.create({ data: { id: commandId, companyId, domain: "cajas", sourceOperationId: input.idempotencyKey, checkpoint: resolutionCheckpoint, scopeKey: differenceId, intentHash: intent, acceptedAt, acceptedById: actorUserId, resultEntityType: "CajasDifferenceResolution", resultEntityId: resolutionId, auditEventId: audit.id } });
    await tx.cajasDifferenceResolution.create({ data: { id: resolutionId, companyId, differenceId, sequence: (difference.resolutions[0]?.sequence ?? 0) + 1, closesDifference, explanation: input.reason, supportingReference: input.evidenceReference, acceptedAt, acceptedById: actorUserId, cause: input.decision, commandAcceptanceId: commandId } });
    return { replayed: false, resolutionId };
  });
}

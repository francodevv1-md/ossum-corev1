/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { conflict, notFound } from "@/lib/api/errors"
import { requirePhaseDAction, requirePhaseDAdmin, type PhaseDAction } from "@/lib/permissions/phase-d-logistics"
import { validateOperation } from "@/lib/validators/phase-d-logistics"
import { assertIdentifiedWhole, assertPhysicalCeiling, reconciliationTotals } from "@/lib/services/phase-d-logistics.rules"
import { execute as wcb07 } from "@/lib/services/c14/bundles/wcb-07"
import { execute as wcb08 } from "@/lib/services/c14/bundles/wcb-08"

type Db = any
type CommandContext = Readonly<{ companyId: string; actorId: string; role: string; surgeryId: string; prisma: Db }>
const canonical = (value: unknown) => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex")
const valueOf = (value: unknown) => new Prisma.Decimal(value as string | number)
const zero = new Prisma.Decimal(0)

function sameIntent(existing: { commandIntentHash: string }, intent: unknown) {
  if (existing.commandIntentHash !== hash(intent)) throw conflict("Idempotency key was reused with a different command", "phase_d_idempotency_conflict")
  return existing
}

async function dispatchLine(tx: Db, ctx: CommandContext, dispatchId: string, dispatchLineId: string) {
  await tx.$queryRawUnsafe('SELECT "id" FROM "cajas_dispatch_line" WHERE "company_id"=$1 AND "dispatch_id"=$2 AND "id"=$3 FOR UPDATE', ctx.companyId, dispatchId, dispatchLineId)
  const line = await tx.cajasDispatchLine.findFirst({ where: { id: dispatchLineId, companyId: ctx.companyId, dispatchId }, include: { dispatch: true } })
  if (!line || line.dispatch.remitoId === undefined) throw notFound("Physical dispatch allocation not found", "phase_d_dispatch_line_not_found")
  if (line.dispatch.remitoId == null) throw conflict("Physical dispatch lineage is incomplete", "phase_d_dispatch_line_invalid")
  const remito = await tx.remito.findFirst({ where: { id: line.dispatch.remitoId, companyId: ctx.companyId }, select: { surgeryId: true } })
  if (!remito || remito.surgeryId !== ctx.surgeryId) throw notFound("Dispatch does not belong to surgery", "phase_d_dispatch_surgery_not_found")
  return { line, remitoId: line.dispatch.remitoId }
}

async function replay(tx: Db, companyId: string, commandKey: string, intent: unknown) {
  const existing = await tx.cajasPhaseDOperation.findFirst({ where: { companyId, commandKey } })
  return existing ? sameIntent(existing, intent) : null
}

async function writeControlledEvidence(tx: Db, ctx: CommandContext, operation: any, kind: "CONSUMPTION" | "REVIEW_HOLD" | "RETURN", checkpoint: string, toPositionId: string | null = null) {
  const audit = await tx.auditEvent.create({ data: { companyId: ctx.companyId, userId: ctx.actorId, entityType: "CAJAS_PHASE_D_OPERATION", entityId: operation.id, action: `phase_d.${checkpoint}`, module: "STOCK_CAJAS_C14", oldValue: Prisma.JsonNull, newValue: { bundleId: operation.bundleId, operationId: operation.id, checkpoint }, metadata: Prisma.JsonNull } })
  const acceptance = await tx.operationalCommandAcceptance.create({ data: { companyId: ctx.companyId, domain: "STOCK_CAJAS_C14", sourceOperationId: `phase-d:${operation.id}:${checkpoint}`, checkpoint, scopeKey: operation.dispatchLineId ?? operation.dispatchId, intentHash: operation.commandIntentHash, acceptedAt: operation.acceptedAt, acceptedById: ctx.actorId, resultEntityType: "CAJAS_PHASE_D_OPERATION", resultEntityId: operation.id, auditEventId: audit.id } })
  const evidence = await tx.stockEvidence.create({ data: { companyId: ctx.companyId, kind, recordKind: "ORIGINAL", sourceDomain: "CAJAS", sourceEntityType: "CAJAS_PHASE_D_OPERATION", sourceEntityId: operation.id, sourceCheckpoint: checkpoint, activationBoundaryId: null, correctsEvidenceId: null, reversesEvidenceId: null, acceptedAt: operation.acceptedAt, acceptedById: ctx.actorId, cause: operation.reason, commandAcceptanceId: acceptance.id, auditEventId: audit.id } })
  if (operation.articleId && operation.stockUnit && operation.scaleSnapshot !== null) await tx.stockEvidenceLine.create({ data: { companyId: ctx.companyId, evidenceId: evidence.id, lineNumber: 1, articleId: operation.articleId, fromPositionId: kind === "RETURN" ? null : operation.stockPositionId, toPositionId, reservationId: null, quantity: operation.quantity, stockUnit: operation.stockUnit, scaleSnapshot: operation.scaleSnapshot, lotCodeSnapshot: operation.lotCodeSnapshot, expirationDateSnapshot: operation.expirationDateSnapshot, serialNumberSnapshot: operation.serialNumberSnapshot, identifiedCodeSnapshot: operation.identifiedCodeSnapshot, sourceLineId: operation.dispatchLineId } })
  return evidence
}

async function enforceCeiling(tx: Db, companyId: string, dispatchLineId: string, requested: Prisma.Decimal, quantity: Prisma.Decimal) {
  const operations = await tx.cajasPhaseDOperation.findMany({ where: { companyId, dispatchLineId, kind: { in: ["CONSUMPTION", "RETURN"] }, returnState: { not: "RECEIVED" } }, select: { quantity: true } })
  assertPhysicalCeiling(quantity, operations.map((item: { quantity: Prisma.Decimal }) => item.quantity), requested)
}

function assertWholeIdentified(line: any, requested: Prisma.Decimal) {
  assertIdentifiedWhole(line.serialNumberSnapshot, line.identifiedCodeSnapshot, line.quantity, requested)
}

async function record(ctx: CommandContext, action: PhaseDAction, kind: "CONSUMPTION" | "RETURN", raw: unknown, options: { unidentified?: boolean } = {}) {
  const input = validateOperation(raw); await requirePhaseDAction(ctx.prisma, ctx.companyId, ctx.actorId, action)
  if (options.unidentified && input.dispatchLineId) throw conflict("Unidentified returns cannot claim a physical dispatch line", "phase_d_unidentified_has_line")
  if (!options.unidentified && !input.dispatchLineId) throw conflict("Physical dispatch line is required", "phase_d_dispatch_line_required")
  const intent = { kind, input, unidentified: !!options.unidentified }
  try { return await ctx.prisma.$transaction(async (tx: Db) => {
    const prior = await replay(tx, ctx.companyId, input.commandKey, intent); if (prior) return { operation: prior, replayed: true as const }
    let lineage: any
    if (input.dispatchLineId) lineage = await dispatchLine(tx, ctx, input.dispatchId, input.dispatchLineId)
    else {
      const dispatch = await tx.cajasDispatch.findFirst({ where: { id: input.dispatchId, companyId: ctx.companyId, remito: { surgeryId: ctx.surgeryId } }, select: { remitoId: true } })
      if (!dispatch) throw notFound("Dispatch does not belong to surgery", "phase_d_dispatch_surgery_not_found")
      lineage = { line: null, remitoId: dispatch.remitoId }
    }
    const quantity = valueOf(input.quantity)
    if (lineage.line) { assertWholeIdentified(lineage.line, quantity); await enforceCeiling(tx, ctx.companyId, input.dispatchLineId!, quantity, valueOf(lineage.line.quantity)) }
    const now = new Date()
    const operation = await tx.cajasPhaseDOperation.create({ data: {
      companyId: ctx.companyId, dispatchId: input.dispatchId, dispatchLineId: input.dispatchLineId ?? null, remitoId: lineage.remitoId, surgeryId: ctx.surgeryId,
      kind, returnState: kind === "RETURN" ? options.unidentified ? "PENDING_IDENTIFICATION" : "IDENTIFIED" : null,
      receiptOutcome: options.unidentified ? "UNIDENTIFIABLE" : null, articleId: lineage.line?.articleId ?? null, stockPositionId: lineage.line?.stockPositionId ?? null,
      quantity, stockUnit: lineage.line?.stockUnit ?? null, scaleSnapshot: lineage.line?.scaleSnapshot ?? null, lotCodeSnapshot: lineage.line?.lotCodeSnapshot ?? null,
      serialNumberSnapshot: lineage.line?.serialNumberSnapshot ?? null, identifiedCodeSnapshot: lineage.line?.identifiedCodeSnapshot ?? null, expirationDateSnapshot: lineage.line?.expirationDateSnapshot ?? null,
      evidence: input.evidence ?? Prisma.JsonNull, reason: input.reason ?? null, observations: input.observations ?? null, sourceOperationId: input.sourceOperationId ?? null,
      commandKey: input.commandKey, commandIntentHash: hash(intent), bundleId: kind === "RETURN" ? "WCB-07" : "WCB-08", acceptedById: ctx.actorId, acceptedAt: now,
    } })
    await writeControlledEvidence(tx, ctx, operation, kind === "CONSUMPTION" ? "CONSUMPTION" : "REVIEW_HOLD", kind === "CONSUMPTION" ? wcb08.bundleId : wcb07.bundleId)
    return { operation, replayed: false as const }
  }) } catch (error: any) {
    if (error?.code !== "P2002") throw error
    const winner = await ctx.prisma.cajasPhaseDOperation.findFirst({ where: { companyId: ctx.companyId, commandKey: input.commandKey } })
    if (!winner) throw error
    return { operation: sameIntent(winner, intent), replayed: true as const }
  }
}

export const recordConsumption = (ctx: CommandContext, input: unknown) => record(ctx, "CONSUME", "CONSUMPTION", input)
export const registerReturn = (ctx: CommandContext, input: unknown) => record(ctx, "REGISTER_RETURN", "RETURN", input)
export const registerUnidentifiedReturn = (ctx: CommandContext, input: unknown) => record(ctx, "REGISTER_RETURN", "RETURN", input, { unidentified: true })

export async function resolveUnidentifiedReturn(ctx: CommandContext, input: Record<string, unknown>) {
  const command = validateOperation(input); const outcome = input.receiptOutcome
  if (typeof outcome !== "string" || !["OBSERVED", "DAMAGED", "NOT_FIT"].includes(outcome)) throw conflict("Incident resolution outcome is required", "phase_d_incident_outcome_required")
  await requirePhaseDAction(ctx.prisma, ctx.companyId, ctx.actorId, "RECEIVE_CONTROL")
  const intent = { operation: command, outcome, action: "RESOLVE_UNIDENTIFIED" }
  return ctx.prisma.$transaction(async (tx: Db) => {
    const prior = await replay(tx, ctx.companyId, command.commandKey, intent); if (prior) return { operation: prior, replayed: true as const }
    const source = await tx.cajasPhaseDOperation.findFirst({ where: { id: command.sourceOperationId, companyId: ctx.companyId, kind: "RETURN", returnState: "PENDING_IDENTIFICATION", surgeryId: ctx.surgeryId } })
    if (!source) throw conflict("Unidentified return is not pending resolution", "phase_d_unidentified_not_pending")
    const now = new Date()
    const operation = await tx.cajasPhaseDOperation.create({ data: { ...source, id: undefined, quantity: zero, returnState: "RECEIVED", receiptOutcome: outcome, sourceOperationId: source.id, commandKey: command.commandKey, commandIntentHash: hash(intent), acceptedById: ctx.actorId, acceptedAt: now, receivedById: ctx.actorId, receivedAt: now, reason: command.reason ?? source.reason, observations: command.observations ?? source.observations, evidence: command.evidence ?? source.evidence } })
    await writeControlledEvidence(tx, ctx, operation, "REVIEW_HOLD", "WCB-07-UNIDENTIFIED-INCIDENT")
    return { operation, replayed: false as const, availableStockChanged: false as const }
  })
}

export async function receiveReturn(ctx: CommandContext, input: Record<string, unknown>) {
  const command = validateOperation(input); if (typeof input.receiptOutcome !== "string" || !["FIT", "OBSERVED", "DAMAGED", "NOT_FIT", "UNIDENTIFIABLE"].includes(input.receiptOutcome)) throw conflict("Receipt outcome is required", "phase_d_receipt_outcome_required")
  await requirePhaseDAction(ctx.prisma, ctx.companyId, ctx.actorId, "RECEIVE_CONTROL")
  const receiptOutcome = input.receiptOutcome as "FIT" | "OBSERVED" | "DAMAGED" | "NOT_FIT" | "UNIDENTIFIABLE"
  const intent = { operation: command, receiptOutcome }
  return ctx.prisma.$transaction(async (tx: Db) => {
    const prior = await replay(tx, ctx.companyId, command.commandKey, intent); if (prior) return { operation: prior, replayed: true as const }
    const source = await tx.cajasPhaseDOperation.findFirst({ where: { id: command.sourceOperationId, companyId: ctx.companyId, kind: "RETURN", surgeryId: ctx.surgeryId } })
    if (!source || source.returnState === "RECEIVED") throw conflict("Return is not awaiting receipt control", "phase_d_return_not_receivable")
    const outcome = source.returnState === "PENDING_IDENTIFICATION" ? "UNIDENTIFIABLE" : receiptOutcome
    const now = new Date()
    const operation = await tx.cajasPhaseDOperation.create({ data: { ...source, id: undefined, quantity: zero, returnState: "RECEIVED", receiptOutcome: outcome, sourceOperationId: source.id, commandKey: command.commandKey, commandIntentHash: hash(intent), acceptedById: ctx.actorId, acceptedAt: now, receivedById: ctx.actorId, receivedAt: now, evidence: command.evidence ?? source.evidence, reason: command.reason ?? source.reason, observations: command.observations ?? source.observations } })
    if (outcome !== "FIT") return { operation, replayed: false as const, availableStockChanged: false as const }
    if (!source.dispatchLineId || !source.stockPositionId || !source.articleId || !source.stockUnit || source.scaleSnapshot === null) throw conflict("FIT return lacks immutable physical lineage", "phase_d_fit_lineage_invalid")
    await writeControlledEvidence(tx, ctx, { ...source, id: operation.id, acceptedAt: now, reason: command.reason ?? source.reason }, "RETURN", "WCB-07-FIT-REENTRY", source.stockPositionId)
    const updated = await tx.stockPositionProjection.updateMany({ where: { companyId: ctx.companyId, positionId: source.stockPositionId }, data: { physicalQuantity: { increment: source.quantity }, availableQuantity: { increment: source.quantity }, version: { increment: 1 } } })
    if (updated.count !== 1) throw conflict("FIT return stock position is unavailable", "phase_d_fit_position_invalid")
    return { operation, replayed: false as const, availableStockChanged: true as const }
  })
}

async function reconciliationSnapshot(tx: Db, ctx: CommandContext, dispatchId: string) {
  const lines = await tx.cajasDispatchLine.findMany({ where: { companyId: ctx.companyId, dispatchId }, select: { id: true, quantity: true } })
  if (!lines.length) throw notFound("Dispatch not found", "phase_d_dispatch_not_found")
  const operations = await tx.cajasPhaseDOperation.findMany({ where: { companyId: ctx.companyId, dispatchId }, select: { id: true, sourceOperationId: true, dispatchLineId: true, quantity: true, kind: true, returnState: true } })
  return { dispatchId, ...reconciliationTotals(lines, operations) }
}

async function reconciliationDispatch(tx: Db, ctx: CommandContext, dispatchId: string) {
  const dispatch = await tx.cajasDispatch.findFirst({ where: { id: dispatchId, companyId: ctx.companyId }, select: { remito: { select: { surgeryId: true } } } })
  if (!dispatch || dispatch.remito?.surgeryId !== ctx.surgeryId) throw notFound("Dispatch does not belong to surgery", "phase_d_dispatch_surgery_not_found")
}

async function reconciliationAcceptance(tx: Db, ctx: CommandContext, dispatchId: string, commandKey: string, intent: unknown, kind: string) {
  const audit = await tx.auditEvent.create({ data: { companyId: ctx.companyId, userId: ctx.actorId, entityType: "CAJAS_PHASE_D_RECONCILIATION", entityId: dispatchId, action: `phase_d.reconciliation.${kind.toLowerCase()}`, module: "STOCK_CAJAS_C14", oldValue: Prisma.JsonNull, newValue: { dispatchId, commandKey, kind }, metadata: Prisma.JsonNull } })
  const acceptance = await tx.operationalCommandAcceptance.create({ data: { companyId: ctx.companyId, domain: "STOCK_CAJAS_C14", sourceOperationId: `phase-d:reconciliation:${commandKey}`, checkpoint: `RECONCILIATION_${kind}`, scopeKey: dispatchId, intentHash: hash(intent), acceptedAt: new Date(), acceptedById: ctx.actorId, resultEntityType: "CAJAS_PHASE_D_RECONCILIATION", resultEntityId: dispatchId, auditEventId: audit.id } })
  return { auditEventId: audit.id, commandAcceptanceId: acceptance.id }
}

export async function closeReconciliation(ctx: CommandContext, input: { dispatchId: string; commandKey: string; reason?: string }) {
  await requirePhaseDAction(ctx.prisma, ctx.companyId, ctx.actorId, "CLOSE_RECONCILIATION")
  const intent = { ...input, action: "CLOSE" }
  return ctx.prisma.$transaction(async (tx: Db) => {
    await reconciliationDispatch(tx, ctx, input.dispatchId)
    const prior = await tx.cajasPhaseDReconciliationEvent.findFirst({ where: { companyId: ctx.companyId, commandKey: input.commandKey } }); if (prior) return { event: sameIntent(prior, intent), replayed: true as const }
    const snapshot = await reconciliationSnapshot(tx, ctx, input.dispatchId)
    if (!snapshot.closeEligible) throw conflict("Qualified quantities do not automatically close reconciliation", "phase_d_reconciliation_not_closeable")
    const last = await tx.cajasPhaseDReconciliationEvent.findFirst({ where: { companyId: ctx.companyId, dispatchId: input.dispatchId }, orderBy: { acceptedAt: "desc" } }); if (last?.kind === "CLOSED") throw conflict("Reconciliation is already closed", "phase_d_reconciliation_closed")
    const acceptance = await reconciliationAcceptance(tx, ctx, input.dispatchId, input.commandKey, intent, "CLOSED")
    const event = await tx.cajasPhaseDReconciliationEvent.create({ data: { companyId: ctx.companyId, dispatchId: input.dispatchId, kind: "CLOSED", snapshot, reason: input.reason ?? null, commandKey: input.commandKey, commandIntentHash: hash(intent), ...acceptance, acceptedById: ctx.actorId, acceptedAt: new Date() } })
    return { event, snapshot, replayed: false as const }
  })
}

export async function reopenReconciliation(ctx: CommandContext, input: { dispatchId: string; commandKey: string; reason: string }) {
  requirePhaseDAdmin(ctx.role); if (!input.reason?.trim()) throw conflict("Audited reopen reason is required", "phase_d_reopen_reason_required")
  const intent = { ...input, action: "REOPEN" }
  return ctx.prisma.$transaction(async (tx: Db) => {
    await reconciliationDispatch(tx, ctx, input.dispatchId)
    const prior = await tx.cajasPhaseDReconciliationEvent.findFirst({ where: { companyId: ctx.companyId, commandKey: input.commandKey } }); if (prior) return { event: sameIntent(prior, intent), replayed: true as const }
    const last = await tx.cajasPhaseDReconciliationEvent.findFirst({ where: { companyId: ctx.companyId, dispatchId: input.dispatchId }, orderBy: { acceptedAt: "desc" } }); if (!last || last.kind !== "CLOSED") throw conflict("Only a closed reconciliation can be reopened", "phase_d_reconciliation_not_closed")
    const acceptance = await reconciliationAcceptance(tx, ctx, input.dispatchId, input.commandKey, intent, "REOPENED")
    const event = await tx.cajasPhaseDReconciliationEvent.create({ data: { companyId: ctx.companyId, dispatchId: input.dispatchId, kind: "REOPENED", snapshot: last.snapshot, reason: input.reason, commandKey: input.commandKey, commandIntentHash: hash(intent), ...acceptance, acceptedById: ctx.actorId, acceptedAt: new Date() } })
    return { event, replayed: false as const }
  })
}

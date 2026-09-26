import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { assertCurrentC14Access, isApprovedAuthorizationProof } from "@/lib/permissions/c14/authorize-insert-writer"
import { C14RuntimeError, type Wcb06Command } from "@/lib/services/c14/bundles/private-writer-runtime"
import { validate } from "@/lib/validators/c14/bundles/wcb-06"

export const definition = Object.freeze({ bundleId: "WCB-06", contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], payloadSectionIds: ["stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "dispatchHeader", "dispatchLines", "reservationEffect", "stockEffect"], bundleRowSha256: "28f17b8991ca4391b5ee1c49aefc93635f28c142df19ac3fadae90904488abd6", productState: "ACTIVATION_CANDIDATE" } as const)

export type Wcb06Attempt = Readonly<{ attemptId: string; semanticKeySha256: string }>
const CONTRACTS = definition.contractIds
const LOCKS = [["StockIdentifiedUnit", "companyId", "id"], ["StockPosition", "companyId", "id"], ["StockReservation", "companyId", "id"], ["cajas_assignment", "company_id", "id"], ["Remito", "companyId", "id"]] as const
const cj1 = (value: unknown): string => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
const sha = (domain: string, value: unknown) => createHash("sha256").update(domain).update("\0").update(cj1(value)).digest("hex")
const b64 = (domain: string, value: unknown) => Buffer.from(`${domain}\0${cj1(value)}`).toString("base64url")
const same = (a: unknown, b: unknown) => {
  if (Prisma.Decimal.isDecimal(a) || Prisma.Decimal.isDecimal(b)) {
    try { return new Prisma.Decimal(String(a)).equals(new Prisma.Decimal(String(b))) } catch { return false }
  }
  return cj1(a) === cj1(b)
}
const denied = () => new C14RuntimeError("C14_COMPANY_DENIED", 403, 0)

type CapabilityBinding = Readonly<{ tx: Prisma.TransactionClient; attempt: Wcb06Attempt; payload: string; semanticKey: string; authorizationProof: object; anchorProof: string }>
const capabilities = new WeakMap<object, CapabilityBinding>()
function mintCapability(tx: Prisma.TransactionClient, command: Readonly<Wcb06Command>, attempt: Wcb06Attempt, frozen: readonly (readonly string[])[]) {
  if (!isApprovedAuthorizationProof(command.authorizationProof)) throw denied()
  const capability = Object.freeze({})
  capabilities.set(capability, Object.freeze({ tx, attempt, payload: command.completePayloadSha256, semanticKey: attempt.semanticKeySha256,
    authorizationProof: command.authorizationProof, anchorProof: sha("C14-WCB06-FROZEN-ANCHORS-V1", frozen) }))
  return capability
}
function consumeCapability(capability: object, tx: Prisma.TransactionClient, command: Readonly<Wcb06Command>, attempt: Wcb06Attempt, frozen: readonly (readonly string[])[]) {
  const binding = capabilities.get(capability)
  capabilities.delete(capability)
  if (!binding || binding.tx !== tx || binding.attempt !== attempt || binding.payload !== command.completePayloadSha256
    || binding.semanticKey !== attempt.semanticKeySha256 || binding.authorizationProof !== command.authorizationProof
    || binding.anchorProof !== sha("C14-WCB06-FROZEN-ANCHORS-V1", frozen)) throw denied()
}
async function lockAnchors(tx: Prisma.TransactionClient, command: Wcb06Command) {
  const reservations = command.reservationEvidences?.length ? command.reservationEvidences : [command.reservationEvidence]
  const assignments = await tx.$queryRawUnsafe<{ identifiedUnitId: string }[]>(`SELECT "box_identified_unit_id" AS "identifiedUnitId" FROM "cajas_assignment" WHERE "company_id"=$1 AND "id"=$2`, command.companyId, command.dispatchHeader.assignmentId)
  const identifiedUnitIds = [...new Set(command.anchorIdentifiedUnitIds)]
  if (assignments.length !== 1 || identifiedUnitIds.length !== 1 || identifiedUnitIds[0] !== (assignments[0].identifiedUnitId ?? identifiedUnitIds[0])) throw new C14RuntimeError("C14_CX08_ANCHOR_INVALID", 422, 1)
  const ids = [identifiedUnitIds, command.stockEvidenceLines.map(row => String(row.fromPositionId)), reservations.map(row => String(row.reservationId)), [String(command.dispatchHeader.assignmentId)], [String(command.dispatchHeader.remitoId)]]
  const frozen = Object.freeze(ids.map(group => Object.freeze([...new Set(group)].sort())))
  for (let index = 0; index < LOCKS.length; index++) { const [table, companyColumn, column] = LOCKS[index]; for (const id of frozen[index]) await tx.$queryRawUnsafe(`SELECT "${companyColumn}" FROM "${table}" WHERE "${companyColumn}"=$1 AND "${column}"=$2 FOR UPDATE NOWAIT`, command.companyId, id) }
  return frozen
}
async function rereadAnchors(tx: Prisma.TransactionClient, companyId: string, frozen: readonly (readonly string[])[]) {
  for (let index = 0; index < LOCKS.length; index++) { const [table, companyColumn, column] = LOCKS[index]; for (const id of frozen[index]) { const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT "${column}" FROM "${table}" WHERE "${companyColumn}"=$1 AND "${column}"=$2`, companyId, id); if (rows.length !== 1) throw new C14RuntimeError("C14_CX08_ANCHOR_INVALID", 422, 1) } }
}
async function forceDeferredChecks(tx: Prisma.TransactionClient) {
  await tx.$executeRawUnsafe('SET CONSTRAINTS "ctrg_cajas_dispatch_min_line_on_dispatch", "ctrg_cajas_dispatch_min_line_on_line" IMMEDIATE')
  await tx.$executeRawUnsafe('SET CONSTRAINTS "ctrg_cajas_dispatch_min_line_on_dispatch", "ctrg_cajas_dispatch_min_line_on_line" DEFERRED')
}
function system(command: Wcb06Command, acceptedAt: Date) {
  const commandAcceptanceId = `oca1.${b64("C14-OCA-ID-V1", { schemaVersion: "C14-OCA-ID-V1", companyId: command.companyId, commandId: command.commandId })}`
  const auditEventId = `oca-audit1.${b64("C14-OCA-AUDIT-ID-V1", { schemaVersion: "C14-OCA-AUDIT-ID-V1", companyId: command.companyId, commandAcceptanceId })}`
  const intentHash = sha("C14-OCA-INTENT-CX08-CCT1", { schemaVersion: "C14-OCA-INTENT-CX08-CCT1", bundleId: "WCB-06", companyId: command.companyId, commandAcceptanceId, completePayloadSha256: command.completePayloadSha256, resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId })
  return { commandAcceptanceId, auditEventId, intentHash, acceptedAt }
}
const includes = (actual: unknown, expected: Record<string, unknown>) => !!actual && Object.entries(expected).every(([key, value]) => same((actual as Record<string, unknown>)[key], value))
const exactRows = (actual: readonly unknown[], expected: readonly Record<string, unknown>[]) => {
  const matched = new Set<number>()
  return actual.length === expected.length && expected.every(row => {
    const index = actual.findIndex((candidate, candidateIndex) => !matched.has(candidateIndex) && includes(candidate, row))
    if (index < 0) return false
    matched.add(index)
    return true
  })
}
function auditValue(command: Wcb06Command, s: ReturnType<typeof system>) {
  return { schemaVersion: "C14-CX08-CCT1-ACCEPTED-AUDIT-VALUE-V1", bundleId: "WCB-06", contractIds: CONTRACTS, commandAcceptanceId: s.commandAcceptanceId, completePayloadSha256: command.completePayloadSha256, resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId }
}
function acceptanceValue(command: Wcb06Command, s: ReturnType<typeof system>) {
  return { id: s.commandAcceptanceId, companyId: command.companyId, domain: "STOCK_CAJAS_C14", sourceOperationId: command.commandId, checkpoint: "DISPATCH_ACCEPTANCE_WITH_RESERVATION_APPLICATION", scopeKey: `DISPATCH:${command.resultEntityId}`, intentHash: s.intentHash, acceptedAt: s.acceptedAt, acceptedById: command.actorId, resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, auditEventId: s.auditEventId, createdAt: s.acceptedAt }
}
function stockEvidenceData(command: Wcb06Command, s: ReturnType<typeof system>) {
  const row = command.stockEvidenceHeader
  return { id: row.id, companyId: command.companyId, kind: row.kind, recordKind: row.recordKind, sourceDomain: row.sourceDomain, sourceEntityType: row.sourceEntityType, sourceEntityId: row.sourceEntityId, sourceCheckpoint: row.sourceCheckpoint, activationBoundaryId: row.activationBoundaryId, correctsEvidenceId: row.correctsEvidenceId, reversesEvidenceId: row.reversesEvidenceId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, cause: row.cause, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt }
}
function stockEvidenceLineData(command: Wcb06Command, row: Wcb06Command["stockEvidenceLines"][number], s: ReturnType<typeof system>) {
  return { id: row.id, companyId: command.companyId, evidenceId: row.evidenceId, lineNumber: row.lineNumber, articleId: row.articleId, fromPositionId: row.fromPositionId, toPositionId: row.toPositionId, reservationId: row.reservationId, quantity: row.quantity, stockUnit: row.stockUnit, scaleSnapshot: row.scaleSnapshot, lotCodeSnapshot: row.lotCodeSnapshot, expirationDateSnapshot: row.expirationDateSnapshot, serialNumberSnapshot: row.serialNumberSnapshot, identifiedCodeSnapshot: row.identifiedCodeSnapshot, sourceLineId: row.sourceLineId, createdAt: s.acceptedAt }
}
function reservationEvidenceData(command: Wcb06Command, row: Wcb06Command["reservationEvidence"], s: ReturnType<typeof system>) {
  return { id: row.id, companyId: command.companyId, reservationId: row.reservationId, sequence: row.sequence, kind: row.kind, quantity: row.quantity, stockUnit: row.stockUnit, scaleSnapshot: row.scaleSnapshot, replacesEvidenceId: row.replacesEvidenceId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, cause: row.cause, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt }
}
function dispatchData(command: Wcb06Command, s: ReturnType<typeof system>) {
  const row = command.dispatchHeader
  return { id: row.id, companyId: command.companyId, assignmentId: row.assignmentId, remitoId: row.remitoId, sourceControlId: row.sourceControlId, sequence: row.sequence, recordKind: row.recordKind, correctsDispatchId: row.correctsDispatchId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, cause: row.cause, commandAcceptanceId: s.commandAcceptanceId, createdAt: s.acceptedAt }
}
function dispatchLineData(command: Wcb06Command, row: Wcb06Command["dispatchLines"][number], s: ReturnType<typeof system>) {
  return { id: row.id, companyId: command.companyId, dispatchId: row.dispatchId, assignmentId: row.assignmentId, remitoId: row.remitoId, lineNumber: row.lineNumber, recordKind: row.recordKind, accountingSign: row.accountingSign, neutralizesDispatchLineId: row.neutralizesDispatchLineId, remitoItemId: row.remitoItemId, sourceControlLineId: row.sourceControlLineId, sourcePreparationId: row.sourcePreparationId, sourcePreparationLineId: row.sourcePreparationLineId, articleId: row.articleId, stockPositionId: row.stockPositionId, quantity: row.quantity, stockUnit: row.stockUnit, scaleSnapshot: row.scaleSnapshot, skuSnapshot: row.skuSnapshot, descriptionSnapshot: row.descriptionSnapshot, lotCodeSnapshot: row.lotCodeSnapshot, expirationDateSnapshot: row.expirationDateSnapshot, serialNumberSnapshot: row.serialNumberSnapshot, identifiedCodeSnapshot: row.identifiedCodeSnapshot, traceabilitySnapshot: row.traceabilitySnapshot, stockEvidenceLineId: row.stockEvidenceLineId, createdAt: s.acceptedAt }
}
async function readValidResult(tx: Prisma.TransactionClient, command: Wcb06Command, acceptedAt: Date) {
  const s = system(command, acceptedAt)
  const reservations = command.reservationEvidences?.length ? command.reservationEvidences : [command.reservationEvidence]
  const reservationEffects = command.reservationEffects?.length ? command.reservationEffects : [command.reservationEffect]
  const [audit, acceptance, evidence, persistedReservations, dispatch, effects] = await Promise.all([
    tx.auditEvent.findUnique({ where: { id: s.auditEventId } }), tx.operationalCommandAcceptance.findUnique({ where: { id: s.commandAcceptanceId } }), tx.stockEvidence.findUnique({ where: { id: command.stockEvidenceHeader.id }, include: { lines: true } }), Promise.all(reservations.map(row => tx.stockReservationEvidence.findUnique({ where: { id: row.id } }))), tx.cajasDispatch.findUnique({ where: { id: command.resultEntityId }, include: { lines: true } }), tx.operationalCommandEffect.findMany({ where: { companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId }, orderBy: { effectKey: "asc" } }),
  ])
  const stockLines = command.stockEvidenceLines.map(({ traceSnapshot: _trace, ...line }) => ({ ...line, companyId: command.companyId, createdAt: s.acceptedAt })), dispatchLines = command.dispatchLines.map(line => ({ ...line, companyId: command.companyId, createdAt: s.acceptedAt }))
  const expectedEffects = [...reservationEffects.map((effect, index) => ({ id: effect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: reservationEffects.length === 1 ? "reservation-application" : `reservation-application:${index + 1}`, effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_RESERVATION_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: null, stockReservationEvidenceId: effect.stockReservationEvidenceId, createdAt: s.acceptedAt })), { id: command.stockEffect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: "dispatch-stock", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: command.stockEffect.stockEvidenceId, stockReservationEvidenceId: null, createdAt: s.acceptedAt }]
  if (!includes(audit, { id: s.auditEventId, companyId: command.companyId, userId: command.actorId, entityType: "CAJAS_DISPATCH", entityId: command.resultEntityId, action: "C14_COMMAND_ACCEPTED", detail: null, oldValue: null, newValue: auditValue(command, s), module: "STOCK_CAJAS_C14", metadata: { authorizationProofSha256: String(command.authorizationProof.authorizationProofSha256) }, createdAt: s.acceptedAt }) || !includes(acceptance, acceptanceValue(command, s)) || !includes(evidence, { ...command.stockEvidenceHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt }) || persistedReservations.some((reservation, index) => !includes(reservation, { ...reservations[index], companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt })) || !includes(dispatch, { ...command.dispatchHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, createdAt: s.acceptedAt }) || !exactRows(evidence?.lines ?? [], stockLines) || !exactRows(dispatch?.lines ?? [], dispatchLines) || !exactRows(effects, expectedEffects)) return null
  return dispatch
}
export async function execute(tx: Prisma.TransactionClient, input: Wcb06Command, attempt: Wcb06Attempt) {
  const command = validate(input)
  if (!attempt.attemptId || !/^[0-9a-f]{64}$/.test(attempt.semanticKeySha256)) throw denied()
  await assertCurrentC14Access(tx, command.actorId, command.companyId)
  const accepted = await tx.operationalCommandAcceptance.findUnique({ where: { id: system(command, new Date(0)).commandAcceptanceId } }), expectedIntent = system(command, new Date(0)).intentHash
  if (accepted) { if (!isApprovedAuthorizationProof(command.authorizationProof) || accepted.intentHash !== expectedIntent || accepted.resultEntityId !== command.resultEntityId) throw new C14RuntimeError("C14_INSERT_CONFLICT", 409, 1); const dispatch = await readValidResult(tx, command, accepted.acceptedAt); if (!dispatch) throw new C14RuntimeError("C14_CX08_FINAL_STATE_INVALID", 422, 1); return { commandAcceptanceId: accepted.id, dispatch, replayed: true as const } }
  const frozen = await lockAnchors(tx, command), capability = mintCapability(tx, command, attempt, frozen)
  consumeCapability(capability, tx, command, attempt, frozen); await rereadAnchors(tx, command.companyId, frozen)
  const [{ now }] = await tx.$queryRawUnsafe<{ now: Date }[]>("SELECT transaction_timestamp() AS now"), s = system(command, now instanceof Date ? now : new Date(String(now)))
  await tx.auditEvent.create({ data: { id: s.auditEventId, companyId: command.companyId, userId: command.actorId, entityType: "CAJAS_DISPATCH", entityId: command.resultEntityId, action: "C14_COMMAND_ACCEPTED", detail: null, oldValue: Prisma.JsonNull, newValue: auditValue(command, s), module: "STOCK_CAJAS_C14", metadata: { authorizationProofSha256: String(command.authorizationProof.authorizationProofSha256) }, createdAt: s.acceptedAt } }); await tx.operationalCommandAcceptance.create({ data: acceptanceValue(command, s) }); await tx.stockEvidence.create({ data: stockEvidenceData(command, s) as never })
  for (const row of command.stockEvidenceLines) await tx.stockEvidenceLine.create({ data: stockEvidenceLineData(command, row, s) as never })
  for (const reservation of command.reservationEvidences?.length ? command.reservationEvidences : [command.reservationEvidence]) await tx.stockReservationEvidence.create({ data: reservationEvidenceData(command, reservation, s) as never })
  await tx.cajasDispatch.create({ data: dispatchData(command, s) as never }); for (const row of command.dispatchLines) await tx.cajasDispatchLine.create({ data: dispatchLineData(command, row, s) as never })
  const reservationEffects = command.reservationEffects?.length ? command.reservationEffects : [command.reservationEffect]; for (const [index, effect] of reservationEffects.entries()) await tx.operationalCommandEffect.create({ data: { id: effect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: reservationEffects.length === 1 ? "reservation-application" : `reservation-application:${index + 1}`, effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_RESERVATION_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: null, stockReservationEvidenceId: effect.stockReservationEvidenceId as string, createdAt: s.acceptedAt } }); await tx.operationalCommandEffect.create({ data: { id: command.stockEffect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: "dispatch-stock", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: command.stockEffect.stockEvidenceId as string, stockReservationEvidenceId: null, createdAt: s.acceptedAt } })
  await forceDeferredChecks(tx); await rereadAnchors(tx, command.companyId, frozen); const dispatch = await readValidResult(tx, command, s.acceptedAt); if (!dispatch) throw new C14RuntimeError("C14_CX08_FINAL_STATE_INVALID", 422, 1); return { commandAcceptanceId: s.commandAcceptanceId, dispatch, replayed: false as const }
}

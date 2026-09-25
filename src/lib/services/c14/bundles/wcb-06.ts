import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { isApprovedAuthorizationProof } from "@/lib/permissions/c14/authorize-insert-writer"
import { C14RuntimeError, type Wcb06Command } from "@/lib/services/c14/bundles/private-writer-runtime"
import { validate } from "@/lib/validators/c14/bundles/wcb-06"

export const definition = Object.freeze({ bundleId: "WCB-06", contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], payloadSectionIds: ["stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "dispatchHeader", "dispatchLines", "reservationEffect", "stockEffect"], bundleRowSha256: "28f17b8991ca4391b5ee1c49aefc93635f28c142df19ac3fadae90904488abd6", productState: "ACTIVATION_CANDIDATE" } as const)

export type Wcb06Attempt = Readonly<{ attemptId: string; semanticKeySha256: string }>
const CONTRACTS = definition.contractIds
const LOCKS = [["StockIdentifiedUnit", "companyId", "id"], ["StockPosition", "companyId", "id"], ["StockReservation", "companyId", "id"], ["cajas_assignment", "company_id", "id"]] as const
const cj1 = (value: unknown): string => JSON.stringify(value, (_, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
const sha = (domain: string, value: unknown) => createHash("sha256").update(domain).update("\0").update(cj1(value)).digest("hex")
const b64 = (domain: string, value: unknown) => Buffer.from(`${domain}\0${cj1(value)}`).toString("base64url")
const same = (a: unknown, b: unknown) => cj1(a) === cj1(b)
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
  const ids = [command.anchorIdentifiedUnitIds, command.stockEvidenceLines.map(row => String(row.fromPositionId)), reservations.map(row => String(row.reservationId)), [String(command.dispatchHeader.assignmentId)]]
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
async function readValidResult(tx: Prisma.TransactionClient, command: Wcb06Command, acceptedAt: Date) {
  const s = system(command, acceptedAt)
  const reservations = command.reservationEvidences?.length ? command.reservationEvidences : [command.reservationEvidence]
  const reservationEffects = command.reservationEffects?.length ? command.reservationEffects : [command.reservationEffect]
  const [audit, acceptance, evidence, persistedReservations, dispatch, effects] = await Promise.all([
    tx.auditEvent.findUnique({ where: { id: s.auditEventId } }),
    tx.operationalCommandAcceptance.findUnique({ where: { id: s.commandAcceptanceId } }),
    tx.stockEvidence.findUnique({ where: { id: command.stockEvidenceHeader.id }, include: { lines: true } }),
    Promise.all(reservations.map(row => tx.stockReservationEvidence.findUnique({ where: { id: row.id } }))),
    tx.cajasDispatch.findUnique({ where: { id: command.resultEntityId }, include: { lines: true } }),
    tx.operationalCommandEffect.findMany({ where: { companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId }, orderBy: { effectKey: "asc" } }),
  ])
  const stockLines = command.stockEvidenceLines.map(({ traceSnapshot: _trace, ...line }) => ({ ...line, companyId: command.companyId, createdAt: s.acceptedAt }))
  const dispatchLines = command.dispatchLines.map(line => ({ ...line, companyId: command.companyId, createdAt: s.acceptedAt }))
  const expectedEffects = [
    ...reservationEffects.map((effect, index) => ({ id: effect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: reservationEffects.length === 1 ? "reservation-application" : `reservation-application:${index + 1}`, effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_RESERVATION_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: null, stockReservationEvidenceId: effect.stockReservationEvidenceId, createdAt: s.acceptedAt })),
    { id: command.stockEffect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: "dispatch-stock", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: command.stockEffect.stockEvidenceId, stockReservationEvidenceId: null, createdAt: s.acceptedAt },
  ]
  const checks = {
    audit: includes(audit, { id: s.auditEventId, companyId: command.companyId, userId: command.actorId, entityType: "CAJAS_DISPATCH", entityId: command.resultEntityId, action: "C14_COMMAND_ACCEPTED", detail: null, oldValue: null, newValue: auditValue(command, s), module: "STOCK_CAJAS_C14", metadata: { authorizationProofSha256: String(command.authorizationProof.authorizationProofSha256) }, createdAt: s.acceptedAt }),
    acceptance: includes(acceptance, acceptanceValue(command, s)),
    evidenceHeader: includes(evidence, { ...command.stockEvidenceHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt }),
    reservations: !persistedReservations.some((reservation, index) => !includes(reservation, { ...reservations[index], companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt })),
    dispatchHeader: includes(dispatch, { ...command.dispatchHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, createdAt: s.acceptedAt }),
    evidenceLines: exactRows(evidence?.lines ?? [], stockLines),
    dispatchLines: exactRows(dispatch?.lines ?? [], dispatchLines),
    effects: exactRows(effects, expectedEffects),
  }
  if (Object.values(checks).some(ok => !ok)) {
    const diffs: string[] = []
    const expEvidenceHeader = { ...command.stockEvidenceHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt }
    const expDispatchHeader = { ...command.dispatchHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, createdAt: s.acceptedAt }
    if (!checks.audit) diffs.push(`audit actual=${cj1(audit)} expected=${cj1({ id: s.auditEventId, companyId: command.companyId, userId: command.actorId, entityType: "CAJAS_DISPATCH", entityId: command.resultEntityId, action: "C14_COMMAND_ACCEPTED", detail: null, oldValue: null, newValue: auditValue(command, s), module: "STOCK_CAJAS_C14", metadata: { authorizationProofSha256: String(command.authorizationProof.authorizationProofSha256) }, createdAt: s.acceptedAt })}`)
    if (!checks.acceptance) diffs.push(`acceptance actual=${cj1(acceptance)} expected=${cj1(acceptanceValue(command, s))}`)
    if (!checks.evidenceHeader) diffs.push(`evidenceHeader actual=${cj1(evidence)} expected=${cj1(expEvidenceHeader)}`)
    if (!checks.dispatchHeader) diffs.push(`dispatchHeader actual=${cj1(dispatch)} expected=${cj1(expDispatchHeader)}`)
    if (!checks.reservations) for (let i = 0; i < reservations.length; i++) diffs.push(`reservation[${i}] actual=${cj1(persistedReservations[i])} expected=${cj1({ ...reservations[i], companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt })}`)
    if (!checks.evidenceLines) for (let i = 0; i < stockLines.length; i++) diffs.push(`stockLine[${i}] actual=${cj1(evidence?.lines?.[i])} expected=${cj1(stockLines[i])}`)
    if (!checks.dispatchLines) for (let i = 0; i < dispatchLines.length; i++) diffs.push(`dispatchLine[${i}] actual=${cj1(dispatch?.lines?.[i])} expected=${cj1(dispatchLines[i])}`)
    if (!checks.effects) for (let i = 0; i < expectedEffects.length; i++) diffs.push(`effect[${i}] actual=${cj1(effects[i])} expected=${cj1(expectedEffects[i])}`)
    console.error("[wcb06-final-state]", JSON.stringify(checks), ...diffs)
    return null
  }
  return dispatch
}

export async function execute(tx: Prisma.TransactionClient, input: Wcb06Command, attempt: Wcb06Attempt) {
  const command = validate(input)
  if (!attempt.attemptId || !/^[0-9a-f]{64}$/.test(attempt.semanticKeySha256)) throw denied()
  const accepted = await tx.operationalCommandAcceptance.findUnique({ where: { id: system(command, new Date(0)).commandAcceptanceId } })
  const expectedIntent = system(command, new Date(0)).intentHash
  if (accepted) {
    if (!isApprovedAuthorizationProof(command.authorizationProof) || accepted.intentHash !== expectedIntent || accepted.resultEntityId !== command.resultEntityId) throw new C14RuntimeError("C14_INSERT_CONFLICT", 409, 1)
    const dispatch = await readValidResult(tx, command, accepted.acceptedAt)
    if (!dispatch) throw new C14RuntimeError("C14_CX08_FINAL_STATE_INVALID", 422, 1)
    return { commandAcceptanceId: accepted.id, dispatch, replayed: true as const }
  }
  const frozen = await lockAnchors(tx, command)
  const capability = mintCapability(tx, command, attempt, frozen)
  consumeCapability(capability, tx, command, attempt, frozen)
  await rereadAnchors(tx, command.companyId, frozen)
  const [{ now }] = await tx.$queryRawUnsafe<{ now: Date }[]>("SELECT transaction_timestamp() AS now")
  const s = system(command, now instanceof Date ? now : new Date(String(now)))
  await tx.auditEvent.create({ data: { id: s.auditEventId, companyId: command.companyId, userId: command.actorId, entityType: "CAJAS_DISPATCH", entityId: command.resultEntityId, action: "C14_COMMAND_ACCEPTED", detail: null, oldValue: Prisma.JsonNull, newValue: auditValue(command, s), module: "STOCK_CAJAS_C14", metadata: { authorizationProofSha256: String(command.authorizationProof.authorizationProofSha256) }, createdAt: s.acceptedAt } })
  await tx.operationalCommandAcceptance.create({ data: acceptanceValue(command, s) })
  await tx.stockEvidence.create({ data: { ...command.stockEvidenceHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt } as never })
  for (const row of command.stockEvidenceLines) { const { traceSnapshot: _, ...data } = row; await tx.stockEvidenceLine.create({ data: { ...data, companyId: command.companyId, createdAt: s.acceptedAt } as never }) }
  for (const reservation of command.reservationEvidences?.length ? command.reservationEvidences : [command.reservationEvidence]) await tx.stockReservationEvidence.create({ data: { ...reservation, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, auditEventId: s.auditEventId, createdAt: s.acceptedAt } as never })
  await tx.cajasDispatch.create({ data: { ...command.dispatchHeader, companyId: command.companyId, acceptedAt: s.acceptedAt, acceptedById: command.actorId, commandAcceptanceId: s.commandAcceptanceId, createdAt: s.acceptedAt } as never })
  for (const row of command.dispatchLines) await tx.cajasDispatchLine.create({ data: { ...row, companyId: command.companyId, createdAt: s.acceptedAt } as never })
  const reservationEffects = command.reservationEffects?.length ? command.reservationEffects : [command.reservationEffect]
  for (const [index, effect] of reservationEffects.entries()) await tx.operationalCommandEffect.create({ data: { id: effect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: reservationEffects.length === 1 ? "reservation-application" : `reservation-application:${index + 1}`, effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_RESERVATION_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: null, stockReservationEvidenceId: effect.stockReservationEvidenceId as string, createdAt: s.acceptedAt } })
  await tx.operationalCommandEffect.create({ data: { id: command.stockEffect.id, companyId: command.companyId, commandAcceptanceId: s.commandAcceptanceId, effectKey: "dispatch-stock", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: command.resultEntityId, stockEvidenceId: command.stockEffect.stockEvidenceId as string, stockReservationEvidenceId: null, createdAt: s.acceptedAt } })
  await forceDeferredChecks(tx)
  await rereadAnchors(tx, command.companyId, frozen)
  const dispatch = await readValidResult(tx, command, s.acceptedAt)
  if (!dispatch) throw new C14RuntimeError("C14_CX08_FINAL_STATE_INVALID", 422, 1)
  return { commandAcceptanceId: s.commandAcceptanceId, dispatch, replayed: false as const }
}

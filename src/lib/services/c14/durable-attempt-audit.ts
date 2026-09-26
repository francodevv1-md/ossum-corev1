import { createHash } from "node:crypto"
import { Prisma, type PrismaClient } from "@prisma/client"
import { validate as uuidValidate, version as uuidVersion, v7 as uuidv7 } from "uuid"
import { WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"

export const DURABLE_STATIC = Object.freeze({
  schemaVersion: "C14-INSERT-DURABLE-ATTEMPT-AUDIT-EVENT-V3-CX08-CCT1",
  policyId: "AUP-C14-DUAL-AUDIT-CX08-CCT1", bundleId: "WCB-06",
  policySetSha256: "406b08dbaf852e9c9752a5ef8a7fdd52602cf0cd8977440b3f17358e541dd188",
  writerRegistrySha256: "52f8755d9bc2385f03dc0699c33e41f66e637e64adf6d8f5495d68ec6a4c2c47",
  scannerInputSha256: "69b3458e5d1390ef8ae87f32a0202465276c209b449cd1fc0a24e9f930493d4a",
})
const KINDS = ["AUTH_DENIED","ATTEMPT_STARTED","ATTEMPT_ROLLED_BACK","RETRY_SCHEDULED","RETRY_EXHAUSTED","SUCCESS_COMMITTED","SUCCESS_RECOVERED","PROCESS_DEATH_UNKNOWN","ROLLED_BACK_RECOVERED","AUDIT_PENDING"] as const
const STATES = ["NOT_STARTED","ROLLED_BACK","COMMITTED","UNKNOWN"] as const
const SQLSTATES = ["55P03","40P01","40001"] as const
const INPUT_KEYS = ["anchorSetSha256","attemptOrdinal","bundleSemanticKeySha256","companyId","completePayloadSha256","correlationId","domainCommitState","eventId","eventKind","eventOrdinal","occurredAt","predecessorEventSha256","sqlstate","transactionId"]
const HEX = /^[0-9a-f]{64}$/
const UTC_MILLIS = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/

type EventKind = typeof KINDS[number]
type CommitState = typeof STATES[number]
type Sqlstate = typeof SQLSTATES[number]
export type DurableEventInput = {
  eventId: string; correlationId: string; eventOrdinal: number; eventKind: EventKind; companyId: string
  bundleSemanticKeySha256: string; completePayloadSha256: string; attemptOrdinal: 1|2|3|null
  transactionId: string|null; anchorSetSha256: string|null; sqlstate: Sqlstate|null
  domainCommitState: CommitState; occurredAt: string; predecessorEventSha256: string|null
}
type AuditClient = Pick<PrismaClient, "$transaction">

const canonicalize = (value: unknown): unknown => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, canonicalize(v)])) : value
export const canonicalJson = (value: unknown) => JSON.stringify(canonicalize(value))
const sha256 = (...parts: string[]) => createHash("sha256").update(parts.join("\0")).digest("hex")
const isV7 = (value: string) => uuidValidate(value) && uuidVersion(value) === 7
export const newCorrelationId = () => uuidv7()
export const newTransactionId = () => uuidv7()
export const deriveDurableEventId = (correlationId: string, eventOrdinal: number) =>
  sha256("C14-INSERT-AUDIT-ID-V1", canonicalJson({ correlationId, eventOrdinal, schemaVersion: "C14-INSERT-AUDIT-ID-V1" }))

export async function appendWcb06TransportAuthorizationDenied(prisma: AuditClient, input: {
  actorId: string; companyId: string; remitoId: string; idempotencyKey?: string
}) {
  const correlationId = newCorrelationId()
  const transportKey = input.idempotencyKey?.trim() || input.remitoId
  return appendDurableAttemptEvent(prisma, {
    eventId: deriveDurableEventId(correlationId, 1), correlationId, eventOrdinal: 1, eventKind: "AUTH_DENIED",
    companyId: input.companyId,
    bundleSemanticKeySha256: createHash("sha256").update("C14-WCB06-SEMANTIC-KEY-V1").update("\0").update(JSON.stringify([input.companyId, input.remitoId, transportKey])).digest("hex"),
    completePayloadSha256: createHash("sha256").update("C14-WCB06-TRANSPORT-V1").update("\0").update(JSON.stringify([input.companyId, input.remitoId, input.idempotencyKey?.trim() || null])).digest("hex"),
    attemptOrdinal: null, transactionId: null, anchorSetSha256: null, sqlstate: null,
    domainCommitState: "NOT_STARTED", occurredAt: new Date().toISOString(), predecessorEventSha256: null,
  })
}

function core(input: DurableEventInput) {
  if (canonicalJson(Object.keys(input).sort()) !== canonicalJson(INPUT_KEYS) || !HEX.test(input.eventId)
    || !isV7(input.correlationId) || (input.transactionId !== null && !isV7(input.transactionId))
    || !Number.isInteger(input.eventOrdinal) || input.eventOrdinal < 1 || !KINDS.includes(input.eventKind)
    || !input.companyId || !HEX.test(input.bundleSemanticKeySha256) || !HEX.test(input.completePayloadSha256)
    || (input.anchorSetSha256 !== null && !HEX.test(input.anchorSetSha256))
    || (input.attemptOrdinal !== null && ![1,2,3].includes(input.attemptOrdinal))
    || (input.sqlstate !== null && !SQLSTATES.includes(input.sqlstate)) || !STATES.includes(input.domainCommitState)
    || !UTC_MILLIS.test(input.occurredAt) || new Date(input.occurredAt).toISOString() !== input.occurredAt
    || input.eventId !== deriveDurableEventId(input.correlationId, input.eventOrdinal)) throw new Error("C14_DURABLE_EVENT_INVALID")
  return { ...input, ...DURABLE_STATIC, contractIds: [...WCB06_CONTRACT_IDS] }
}

export async function appendDurableAttemptEvent(prisma: AuditClient, input: DurableEventInput) {
  const value = core(input)
  const eventSha256 = sha256(DURABLE_STATIC.schemaVersion, canonicalJson(value))
  return prisma.$transaction(async (tx) => {
    const existing = await tx.durableAttemptAuditEvent.findUnique({ where: { eventId: input.eventId } })
    if (existing) {
      if (existing.eventSha256 !== eventSha256) throw new Error("C14_DURABLE_IDEMPOTENCY_CONFLICT")
      return existing
    }
    const previous = await tx.durableAttemptAuditEvent.findFirst({ where: { correlationId: input.correlationId }, orderBy: { eventOrdinal: "desc" } })
    if (input.eventOrdinal !== (previous?.eventOrdinal ?? 0) + 1
      || input.predecessorEventSha256 !== (previous?.eventSha256 ?? null)) throw new Error("C14_DURABLE_CHAIN_INVALID")
    return tx.durableAttemptAuditEvent.create({ data: {
      ...value, contractIds: value.contractIds as unknown as Prisma.InputJsonValue,
      occurredAt: new Date(input.occurredAt), eventSha256,
    } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
}

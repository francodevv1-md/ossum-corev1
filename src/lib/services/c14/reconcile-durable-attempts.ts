import type { PrismaClient } from "@prisma/client"
import { appendDurableAttemptEvent, deriveDurableEventId, type DurableEventInput } from "./durable-attempt-audit"

export const DURABLE_RECONCILIATION_LEASE_MS = 60_000
type Client = Pick<PrismaClient, "$transaction"|"durableAttemptAuditEvent">
type Resolution = "SUCCESS"|"ROLLED_BACK"|"AMBIGUOUS"

export async function reconcileDurableAttempts(
  prisma: Client, resolve: (event: { companyId: string; bundleSemanticKeySha256: string; completePayloadSha256: string }) => Promise<Resolution>, now = new Date(),
  scope?: { companyId: string; bundleSemanticKeySha256: string },
) {
  const started = await prisma.durableAttemptAuditEvent.findMany({
    where: { eventKind: "ATTEMPT_STARTED", occurredAt: { lte: new Date(now.getTime() - DURABLE_RECONCILIATION_LEASE_MS) }, ...scope },
    orderBy: [{ occurredAt: "asc" }, { correlationId: "asc" }],
  })
  let reconciled = 0
  for (const candidate of started) {
    const latest = await prisma.durableAttemptAuditEvent.findFirst({ where: { correlationId: candidate.correlationId }, orderBy: { eventOrdinal: "desc" } })
    if (!latest || latest.eventKind !== "ATTEMPT_STARTED") continue
    const base = {
      correlationId: latest.correlationId, companyId: latest.companyId,
      bundleSemanticKeySha256: latest.bundleSemanticKeySha256, completePayloadSha256: latest.completePayloadSha256,
      attemptOrdinal: latest.attemptOrdinal as 1|2|3|null, transactionId: latest.transactionId,
      anchorSetSha256: latest.anchorSetSha256, sqlstate: null, occurredAt: now.toISOString(),
    }
    const unknown = await appendDurableAttemptEvent(prisma, event(base, latest.eventOrdinal + 1, "PROCESS_DEATH_UNKNOWN", "UNKNOWN", latest.eventSha256))
    const resolution = await resolve(base)
    const kind = resolution === "SUCCESS" ? "SUCCESS_RECOVERED" : resolution === "ROLLED_BACK" ? "ROLLED_BACK_RECOVERED" : "AUDIT_PENDING"
    const state = resolution === "SUCCESS" ? "COMMITTED" : resolution === "ROLLED_BACK" ? "ROLLED_BACK" : "UNKNOWN"
    await appendDurableAttemptEvent(prisma, event(base, unknown.eventOrdinal + 1, kind, state, unknown.eventSha256))
    reconciled++
  }
  return reconciled
}

function event(base: Omit<DurableEventInput,"eventId"|"eventOrdinal"|"eventKind"|"domainCommitState"|"predecessorEventSha256">,
  ordinal: number, eventKind: DurableEventInput["eventKind"], domainCommitState: DurableEventInput["domainCommitState"], predecessorEventSha256: string): DurableEventInput {
  return { ...base, eventId: deriveDurableEventId(base.correlationId, ordinal), eventOrdinal: ordinal, eventKind, domainCommitState, predecessorEventSha256 }
}

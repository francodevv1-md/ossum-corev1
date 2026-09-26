import { describe, expect, it, vi } from "vitest"
import { reconcileDurableAttempts, DURABLE_RECONCILIATION_LEASE_MS } from "@/lib/services/c14/reconcile-durable-attempts"
import { appendDurableAttemptEvent, deriveDurableEventId, newCorrelationId, newTransactionId } from "@/lib/services/c14/durable-attempt-audit"

function harness() {
  const rows: any[] = []
  const delegate = {
    findMany: vi.fn(async ({ where }) => rows.filter((x) => x.eventKind === "ATTEMPT_STARTED" && x.occurredAt <= where.occurredAt.lte)),
    findUnique: vi.fn(async ({ where }) => rows.find((x) => x.eventId === where.eventId) ?? null),
    findFirst: vi.fn(async ({ where }) => rows.filter((x) => x.correlationId === where.correlationId).sort((a,b) => b.eventOrdinal-a.eventOrdinal)[0] ?? null),
    create: vi.fn(async ({ data }) => (rows.push(data), data)),
  }
  return { rows, prisma: { durableAttemptAuditEvent: delegate, $transaction: vi.fn(async (fn) => fn({ durableAttemptAuditEvent: delegate })) } as never }
}

describe("durable reconciliation", () => {
  it("waits exactly 60 seconds then appends unknown and semantic resolution", async () => {
    const h = harness(), correlationId = newCorrelationId(), now = new Date("2026-08-13T10:01:00.000Z")
    await appendDurableAttemptEvent(h.prisma, { eventId: deriveDurableEventId(correlationId, 1), correlationId, eventOrdinal: 1,
      eventKind: "ATTEMPT_STARTED", companyId: "c1", bundleSemanticKeySha256: "a".repeat(64), completePayloadSha256: "b".repeat(64),
      attemptOrdinal: 1, transactionId: newTransactionId(), anchorSetSha256: null, sqlstate: null, domainCommitState: "NOT_STARTED",
      occurredAt: new Date(now.getTime() - DURABLE_RECONCILIATION_LEASE_MS).toISOString(), predecessorEventSha256: null })
    expect(await reconcileDurableAttempts(h.prisma, async () => "SUCCESS", now)).toBe(1)
    expect(h.rows.map((x) => x.eventKind)).toEqual(["ATTEMPT_STARTED", "PROCESS_DEATH_UNKNOWN", "SUCCESS_RECOVERED"])
    expect(h.rows.map((x) => x.eventOrdinal)).toEqual([1,2,3])
    expect(h.rows[2].predecessorEventSha256).toBe(h.rows[1].eventSha256)
  })
})

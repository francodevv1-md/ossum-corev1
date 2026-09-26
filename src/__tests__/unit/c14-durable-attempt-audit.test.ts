import { createHash } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { appendDurableAttemptEvent, canonicalJson, deriveDurableEventId, DURABLE_STATIC, newCorrelationId, newTransactionId } from "@/lib/services/c14/durable-attempt-audit"
import { WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"

function harness() {
  const rows: any[] = []
  const tx = { durableAttemptAuditEvent: {
    findUnique: vi.fn(async ({ where }) => rows.find((x) => x.eventId === where.eventId) ?? null),
    findFirst: vi.fn(async ({ where }) => rows.filter((x) => x.correlationId === where.correlationId).sort((a,b) => b.eventOrdinal-a.eventOrdinal)[0] ?? null),
    create: vi.fn(async ({ data }) => (rows.push(data), data)),
  } }
  return { rows, prisma: { $transaction: vi.fn(async (fn) => fn(tx)) } as never }
}
const input = (correlationId = newCorrelationId(), ordinal = 1, predecessor: string|null = null) => ({
  eventId: deriveDurableEventId(correlationId, ordinal), correlationId, eventOrdinal: ordinal,
  eventKind: "ATTEMPT_STARTED" as const, companyId: "c1", bundleSemanticKeySha256: "a".repeat(64),
  completePayloadSha256: "b".repeat(64), attemptOrdinal: 1 as const, transactionId: newTransactionId(),
  anchorSetSha256: null, sqlstate: null, domainCommitState: "NOT_STARTED" as const,
  occurredAt: "2026-08-13T10:00:00.000Z", predecessorEventSha256: predecessor,
})

describe("DurableAttemptAuditEventV3", () => {
  it("serializes exact core, derives hash, and appends idempotently in fresh transactions", async () => {
    const h = harness(); const value = input()
    const first: any = await appendDurableAttemptEvent(h.prisma, value)
    const core = { ...DURABLE_STATIC, ...value, contractIds: [...WCB06_CONTRACT_IDS] }
    const expected = createHash("sha256").update(DURABLE_STATIC.schemaVersion).update("\0").update(canonicalJson(core)).digest("hex")
    expect(first.eventSha256).toBe(expected)
    expect(await appendDurableAttemptEvent(h.prisma, value)).toEqual(first)
    expect(h.rows).toHaveLength(1); expect((h.prisma as any).$transaction).toHaveBeenCalledTimes(2)
  })

  it("enforces UUIDv7, immutable identities, contiguous ordinal, and predecessor", async () => {
    const h = harness(); const root: any = await appendDurableAttemptEvent(h.prisma, input())
    await expect(appendDurableAttemptEvent(h.prisma, input(root.correlationId, 3, root.eventSha256))).rejects.toThrow("C14_DURABLE_CHAIN_INVALID")
    await expect(appendDurableAttemptEvent(h.prisma, { ...input(), correlationId: "00000000-0000-4000-8000-000000000000" })).rejects.toThrow("C14_DURABLE_EVENT_INVALID")
    await expect(appendDurableAttemptEvent(h.prisma, { ...input(), schemaVersion: "forged" } as never)).rejects.toThrow("C14_DURABLE_EVENT_INVALID")
  })
})

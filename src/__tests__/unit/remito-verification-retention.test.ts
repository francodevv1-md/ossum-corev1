import { describe, expect, it, vi } from "vitest"
import { createRemitoRetentionPost } from "@/app/api/internal/maintenance/remito-verification-retention/route"
import { purgeRemitoVerificationRateBuckets, verifySchedulerBearer } from "@/lib/remito-verification/rate-retention"

const now = new Date("2026-08-12T12:00:00.000Z"), secret = Buffer.alloc(32, 9)

describe("Remito verification retention", () => {
  it("atomically purges expired buckets while returning aggregate telemetry only", async () => {
    const bucket = { deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
      findFirst: vi.fn().mockResolvedValue({ firstSeenAt: new Date("2026-08-01T12:00:00.000Z") }) }
    const prisma = { $transaction: (run: (tx: unknown) => Promise<unknown>) => run({ publicVerificationRateBucket: bucket }) }
    const result = await purgeRemitoVerificationRateBuckets(prisma as never, now)
    expect(result).toEqual({ deleted: 3, oldestRemainingAgeSeconds: 950400, retentionAlert: false })
    expect(JSON.stringify(result)).not.toMatch(/fingerprint|address|token/i)
  })

  it("timing-safely accepts only the injected Authorization bearer", () => {
    const bearer = `Bearer ${secret.toString("base64url")}`
    expect(verifySchedulerBearer(bearer, secret)).toBe(true)
    expect(verifySchedulerBearer(null, secret)).toBe(false)
    expect(verifySchedulerBearer(`Basic ${secret.toString("base64url")}`, secret)).toBe(false)
  })

  it("redacts authorization, fingerprints and failures from route responses", async () => {
    const bucket = { deleteMany: vi.fn().mockResolvedValue({ count: 2 }), findFirst: vi.fn().mockResolvedValue(null) }
    const prisma = { $transaction: (run: (tx: unknown) => Promise<unknown>) => run({ publicVerificationRateBucket: bucket }) }
    const handler = createRemitoRetentionPost({ prisma: prisma as never, schedulerSecret: secret, now: () => now })
    const denied = await handler(new Request("https://app.test/api/internal/maintenance", { method: "POST", headers: { cookie: `Authorization=${secret.toString("base64url")}` } }))
    expect(denied.status).toBe(401); expect(await denied.text()).not.toContain(secret.toString("base64url"))
    const response = await handler(new Request("https://app.test/api/internal/maintenance", { method: "POST", headers: { authorization: `Bearer ${secret.toString("base64url")}` } }))
    expect(await response.json()).toEqual({ deleted: 2, oldestRemainingAgeSeconds: null })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  })

  it("fails the retention gate before a row reaches 30 days", async () => {
    const bucket = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findFirst: vi.fn().mockResolvedValue({ firstSeenAt: new Date(now.getTime() - 29.5 * 86_400_000) }) }
    const prisma = { $transaction: (run: (tx: unknown) => Promise<unknown>) => run({ publicVerificationRateBucket: bucket }) }
    const response = await createRemitoRetentionPost({ prisma: prisma as never, schedulerSecret: secret, now: () => now })(
      new Request("https://app.test/api/internal/maintenance", { method: "POST", headers: { authorization: `Bearer ${secret.toString("base64url")}` } }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ deleted: 0, oldestRemainingAgeSeconds: 2548800 })
  })
})

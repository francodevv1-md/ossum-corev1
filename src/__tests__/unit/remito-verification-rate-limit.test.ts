import { describe, expect, it, vi } from "vitest"
import { consumeRateBeforeLookup, createRateSourceFingerprint, recordInvalidRateOutcome, validateRateLimitConfig } from "@/lib/remito-verification/rate-limit"

const now = new Date("2026-08-12T12:34:56.000Z"), keyDate = new Date("2026-08-12T00:00:00.000Z")

describe("Remito public rate limiting", () => {
  it("validates the 60/10/15 defaults and configuration bounds", () => {
    expect(validateRateLimitConfig()).toEqual({ checksPerMinute: 60, invalidPerMinute: 10, blockMinutes: 15 })
    expect(() => validateRateLimitConfig({ checksPerMinute: 601, invalidPerMinute: 10, blockMinutes: 15 })).toThrow()
    expect(() => validateRateLimitConfig({ checksPerMinute: 60, invalidPerMinute: 61, blockMinutes: 15 })).toThrow()
  })

  it("derives a non-reversible fingerprint without retaining the raw address", () => {
    const address = Uint8Array.from([192, 0, 2, 1])
    const fingerprint = createRateSourceFingerprint(Buffer.alloc(32, 7), address)
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/); expect(fingerprint).not.toContain("192")
    expect(() => createRateSourceFingerprint(Buffer.alloc(31), address)).toThrow()
  })

  it("uses one atomic pre-lookup statement with immutable 29-day expiry", async () => {
    const query = vi.fn().mockResolvedValue([{ allowed: true, retryAfterSeconds: 0 }])
    await expect(consumeRateBeforeLookup({ $queryRawUnsafe: query }, { sourceFingerprint: "a".repeat(64), keyDate, now }))
      .resolves.toEqual({ allowed: true, retryAfterSeconds: 0 })
    expect(query).toHaveBeenCalledOnce(); expect(query.mock.calls[0][0]).toMatch(/ON CONFLICT[\s\S]*RETURNING/)
    expect(query.mock.calls[0][4]).toEqual(new Date("2026-09-10T12:34:56.000Z"))
    expect(query.mock.calls[0][0]).not.toMatch(/expiresAt"=/)
  })

  it("atomically blocks on the tenth invalid outcome for 15 minutes", async () => {
    const query = vi.fn().mockResolvedValue([{ allowed: false, retryAfterSeconds: 900 }])
    expect(await recordInvalidRateOutcome({ $queryRawUnsafe: query }, { sourceFingerprint: "b".repeat(64), keyDate, now }))
      .toEqual({ allowed: false, retryAfterSeconds: 900 })
    expect(query.mock.calls[0].slice(4)).toEqual([10, 15])
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPublicRemitoVerificationGet, type PublicRemitoVerificationRouteDependencies } from "@/app/api/public/remito-verifications/[token]/route"
import { installRemitoActivationRuntime } from "@/lib/remito-verification/activation"

const unavailable = { ok: false as const, status: 503 as const, body: { error: { code: "verification_temporarily_unavailable", message: "Verification temporarily unavailable" } } }
const base = (): PublicRemitoVerificationRouteDependencies => ({
  environment: "production",
  addressResolver: { resolve: vi.fn().mockReturnValue(unavailable) },
  addressInput: vi.fn().mockReturnValue({}), rateKey: vi.fn(),
  prisma: { $queryRawUnsafe: vi.fn(), remitoVerificationAccess: { findUnique: vi.fn() }, remitoVerificationDailyMetric: { upsert: vi.fn() } },
})

describe("public Remito API headers", () => {
  beforeEach(() => installRemitoActivationRuntime({ flags: {
    remitoLocatorIssuanceWrites: true, remitoInternalScanRead: true,
    remitoPublicPublicationWrites: true, remitoPublicCompatibilityRead: true, remitoPrintCodes: false,
  }, cohort: { companyIds: ["company"], cohortStart: new Date(0) } }))
  it("owns the exact anti-cache, referrer, indexing, CSP and CORP headers on every response", async () => {
    const response = await createPublicRemitoVerificationGet(base())(new Request("https://verify.test/api/public/remito-verifications/redacted"), { params: Promise.resolve({ token: "redacted" }) })
    expect(response.status).toBe(503)
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "no-store, max-age=0", pragma: "no-cache",
      "x-robots-tag": "noindex, nofollow, noarchive", "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "cross-origin-resource-policy": "same-origin", "content-type": "application/json",
    })
  })

  it("returns Retry-After without weakening security headers", async () => {
    const deps = base()
    deps.addressResolver.resolve = vi.fn().mockReturnValue({ ok: true, address: "192.0.2.1", networkBytes: Uint8Array.of(192, 0, 2, 1) })
    deps.rateKey = () => ({ key: new Uint8Array(32), keyDate: new Date("2026-08-12") })
    deps.prisma.$queryRawUnsafe = vi.fn().mockResolvedValue([{ allowed: false, retryAfterSeconds: 17 }])
    const response = await createPublicRemitoVerificationGet(deps)(new Request("https://verify.test"), { params: Promise.resolve({ token: "secret" }) })
    expect(response.status).toBe(429); expect(response.headers.get("retry-after")).toBe("17")
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0")
  })

  it("rejects HTTP before trusted-address or rate work outside development", async () => {
    const deps = base()
    const response = await createPublicRemitoVerificationGet(deps)(new Request("http://verify.test/api/public/remito-verifications/redacted"), { params: Promise.resolve({ token: "redacted" }) })
    expect(response.status).toBe(503)
    expect(deps.addressInput).not.toHaveBeenCalled()
  })
})

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { config, proxy } from "@/proxy"
import { installPublicRemitoVerificationRuntime } from "@/app/api/public/remito-verifications/[token]/route"
import { installRemitoActivationRuntime } from "@/lib/remito-verification/activation"

function nonceFromCsp(csp: string | null): string {
  return csp?.match(/'nonce-([^']+)'/)?.[1] ?? ""
}

describe("public Remito proxy", () => {
  beforeEach(() => installRemitoActivationRuntime({ flags: {
    remitoLocatorIssuanceWrites: true, remitoInternalScanRead: true,
    remitoPublicPublicationWrites: true, remitoPublicCompatibilityRead: true, remitoPrintCodes: false,
  }, cohort: { companyIds: ["company"], cohortStart: new Date(0) } }))
  it("matches only the public HTML path and excludes prefetches and every API path", () => {
    expect(config.matcher).toEqual([{ source: "/verificar/remito/:path*", missing: [
      { type: "header", key: "next-router-prefetch" },
      { type: "header", key: "purpose", value: "prefetch" },
    ] }])
    expect(config.matcher[0].source).toBe("/verificar/remito/:path*")
  })

  it("fails closed with a true 503 when composed verification is unavailable", async () => {
    installPublicRemitoVerificationRuntime(null)
    const response = await proxy(new NextRequest("https://verify.test/verificar/remito/redacted"))
    expect(response.status).toBe(503)
  })

  it("forwards a fresh nonce and verified projection with security headers", async () => {
    const dto = { verificationStatus: "invalid", issuerDisplayName: null, issuerTaxId: null, documentType: null, issuedDate: null, remitoShortCode: null, verificationVersion: null, fingerprint: null, checkedAt: "2026-08-12T12:00:00.000Z" }
    const deps = { environment: "production" as const, addressResolver: { resolve: vi.fn().mockReturnValue({ ok: true, address: "192.0.2.1", networkBytes: Uint8Array.of(192, 0, 2, 1) }) }, addressInput: vi.fn().mockReturnValue({}), rateKey: () => ({ key: new Uint8Array(32), keyDate: new Date("2026-08-12") }), prisma: { $queryRawUnsafe: vi.fn().mockResolvedValue([{ allowed: true, retryAfterSeconds: 0 }, {}]), remitoVerificationAccess: { findUnique: vi.fn() }, remitoVerificationDailyMetric: { upsert: vi.fn() } }, now: () => new Date("2026-08-12T12:00:00.000Z") }
    installPublicRemitoVerificationRuntime(deps)
    const first = await proxy(new NextRequest("https://verify.test/verificar/remito/redacted"))
    const second = await proxy(new NextRequest("https://verify.test/verificar/remito/redacted"))
    const responseNonce = nonceFromCsp(first.headers.get("content-security-policy"))
    const forwardedCsp = first.headers.get("x-middleware-request-content-security-policy")
    expect(nonceFromCsp(forwardedCsp)).toBe(responseNonce)
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(responseNonce)
    expect(nonceFromCsp(second.headers.get("content-security-policy"))).not.toBe(responseNonce)
    expect(first.headers.get("cache-control")).toBe("no-store, max-age=0")
    expect(first.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive")
    expect(first.headers.get("referrer-policy")).toBe("no-referrer")
    expect(JSON.parse(Buffer.from(first.headers.get("x-middleware-request-x-remito-verification")!, "base64url").toString())).toEqual(dto)
  })

  it("fails closed instead of redirecting an insecure non-development request", async () => {
    const previous = process.env.NODE_ENV
    vi.stubEnv("NODE_ENV", "production")
    const response = await proxy(new NextRequest("http://verify.test/verificar/remito/redacted"))
    vi.stubEnv("NODE_ENV", previous)
    expect(response.status).toBe(503)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'")
  })
})

import { describe, expect, it, vi } from "vitest"
import { createRemitoFingerprint } from "@/lib/remito-verification/fingerprint"
import { createRemitoTokenKeyring, generateRemitoPublicToken } from "@/lib/remito-verification/token"
import { requireConfiguredOrigin, revokeRemitoVerification, rotateRemitoVerification, verifyPublicRemitoToken } from "@/lib/remito-verification/service"

const now = new Date("2026-08-12T12:00:00.000Z")
const keyring = createRemitoTokenKeyring({ activeTokenKeyVersion: 1, keys: { 1: Buffer.alloc(32, 7).toString("base64url") } })
const origins = { internalOrigin: new URL("https://app.ossum.test"), publicOrigin: new URL("https://verify.ossum.test") }
const locator = "RM1-04HM-ASW9-NF6Y-ZZPW-M"
function fixture(status: "current" | "replaced" | "revoked") {
  const generated = generateRemitoPublicToken(keyring)
  const publication = { id: "pub", version: 1, status: "current", issuerDisplayNameSnapshot: "Issuer",
    issuerTaxIdSnapshot: "30123456789", documentTypeSnapshot: "REMITO_SALIDA",
    issuedDateSnapshot: new Date("2026-08-11T00:00:00.000Z"), remitoShortCodeSnapshot: locator,
    fingerprintVersion: "RF1", fingerprintSha256: "" }
  publication.fingerprintSha256 = createRemitoFingerprint({ issuerDisplayName: "Issuer", issuerTaxId: "30123456789",
    documentType: "REMITO_SALIDA", issuedAt: publication.issuedDateSnapshot,
    remitoShortCode: locator, verificationVersion: 1 }).hash
  return { generated, access: { id: "access", companyId: "company", publicationId: "pub", version: 1,
    status, tokenHash: generated.tokenHash, publication } }
}

describe("public Remito verification lifecycle", () => {
  it.each(["current", "replaced", "revoked"] as const)("returns the exact safe projection for %s", async (state) => {
    const { generated, access } = fixture(state), upsert = vi.fn()
    const dto = await verifyPublicRemitoToken({ now: () => now, prisma: {
      remitoVerificationAccess: { findUnique: vi.fn().mockResolvedValue(access) },
      remitoVerificationDailyMetric: { upsert },
    } }, generated.token)
    expect(Object.keys(dto)).toEqual(["verificationStatus", "issuerDisplayName", "issuerTaxId", "documentType",
      "issuedDate", "remitoShortCode", "verificationVersion", "fingerprint", "checkedAt"])
    expect(dto.verificationStatus).toBe(state === "current" ? "valid" : state)
    expect(dto.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(JSON.stringify(dto)).not.toMatch(/token|reason|redirect|target/i)
    expect(upsert).toHaveBeenCalledOnce()
  })

  it("requires the exact configured lifecycle origin", () => {
    expect(() => requireConfiguredOrigin(new Request("https://app.ossum.test", { headers: { origin: "https://app.ossum.test" } }), origins.internalOrigin)).not.toThrow()
    expect(() => requireConfiguredOrigin(new Request("https://app.ossum.test"), origins.internalOrigin)).toThrow()
    expect(() => requireConfiguredOrigin(new Request("https://app.ossum.test", { headers: { origin: "https://evil.test" } }), origins.internalOrigin)).toThrow()
  })

  it("makes malformed and unknown tokens uniformly invalid without metrics", async () => {
    const findUnique = vi.fn().mockResolvedValue(null), upsert = vi.fn()
    const dto = await verifyPublicRemitoToken({ now: () => now, prisma: {
      remitoVerificationAccess: { findUnique }, remitoVerificationDailyMetric: { upsert },
    } }, "not-a-token")
    expect(dto).toEqual({ verificationStatus: "invalid", issuerDisplayName: null, issuerTaxId: null,
      documentType: null, issuedDate: null, remitoShortCode: null, verificationVersion: null,
      fingerprint: null, checkedAt: now.toISOString() })
    expect(findUnique).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled()
    const unknown = generateRemitoPublicToken(keyring).token
    expect((await verifyPublicRemitoToken({ now: () => now, prisma: {
      remitoVerificationAccess: { findUnique }, remitoVerificationDailyMetric: { upsert },
    } }, unknown)).verificationStatus).toBe("invalid")
    expect(findUnique).toHaveBeenCalledOnce(); expect(upsert).not.toHaveBeenCalled()
  })

  it("rotates and revokes only through audited lifecycle writes with no secret audit fields", async () => {
    const old = fixture("current").access
    const tx = { remitoScanLocator: { findFirst: vi.fn().mockResolvedValue({ remitoId: "remito" }) },
      remitoVerificationPublication: { findFirst: vi.fn().mockResolvedValue({ id: "pub", accesses: [old] }) },
      remitoVerificationAccess: { update: vi.fn(), create: vi.fn() }, auditEvent: { create: vi.fn() } }
    const prisma = { $transaction: async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx) }
    const deps = { prisma, keyring, ...origins, now: () => now, randomId: () => "next" }
    expect(await rotateRemitoVerification(deps as never, { companyId: "company", remitoShortCode: locator, actorId: "actor", role: "admin" })).toEqual({ verificationVersion: 2 })
    expect(JSON.stringify(tx.auditEvent.create.mock.calls)).not.toMatch(/token|nonce|hash/i)
    expect(await revokeRemitoVerification(deps as never, { companyId: "company", remitoShortCode: locator, actorId: "actor", role: "coordinador", reason: "Compromised document" })).toEqual({ verificationStatus: "revoked" })
    await expect(rotateRemitoVerification(deps as never, { companyId: "company", remitoShortCode: locator, actorId: "actor", role: "logistica" })).rejects.toMatchObject({ status: 403 })
  })
})

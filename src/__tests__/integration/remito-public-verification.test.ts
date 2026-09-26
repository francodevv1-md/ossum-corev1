import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPublicRemitoVerificationGet, type PublicRemitoVerificationRouteDependencies } from "@/app/api/public/remito-verifications/[token]/route"
import { createRemitoFingerprint } from "@/lib/remito-verification/fingerprint"
import { createRemitoTokenKeyring, generateRemitoPublicToken } from "@/lib/remito-verification/token"
import { installRemitoActivationRuntime } from "@/lib/remito-verification/activation"

const now = new Date("2026-08-12T12:00:00.000Z")
const keyring = createRemitoTokenKeyring({ activeTokenKeyVersion: 1, keys: { 1: Buffer.alloc(32, 7).toString("base64url") } })
const locator = "RM1-04HM-ASW9-NF6Y-ZZPW-M"

function setup(status: "current" | "replaced" | "revoked" | "missing") {
  const generated = generateRemitoPublicToken(keyring)
  const publication = { id: "pub", version: 1, status: status === "replaced" ? "replaced" : "current",
    issuerDisplayNameSnapshot: "Issuer", issuerTaxIdSnapshot: "30123456789", documentTypeSnapshot: "REMITO_SALIDA",
    issuedDateSnapshot: new Date("2026-08-11T00:00:00.000Z"), remitoShortCodeSnapshot: locator,
    fingerprintVersion: "RF1", fingerprintSha256: "" }
  publication.fingerprintSha256 = createRemitoFingerprint({ issuerDisplayName: "Issuer", issuerTaxId: "30123456789",
    documentType: "REMITO_SALIDA", issuedAt: publication.issuedDateSnapshot, remitoShortCode: locator, verificationVersion: 1 }).hash
  const findUnique = vi.fn().mockResolvedValue(status === "missing" ? null : { id: "access", companyId: "company",
    publicationId: "pub", version: 1, status, tokenHash: generated.tokenHash, publication })
  const query = vi.fn().mockResolvedValue([{ allowed: true, retryAfterSeconds: 0 }])
  const deps: PublicRemitoVerificationRouteDependencies = {
    environment: "production",
    addressResolver: { resolve: vi.fn().mockReturnValue({ ok: true, address: "192.0.2.1", networkBytes: Uint8Array.of(192, 0, 2, 1) }) },
    addressInput: vi.fn().mockReturnValue({}), rateKey: () => ({ key: Buffer.alloc(32, 9), keyDate: now }), now: () => now,
    prisma: { $queryRawUnsafe: query, remitoVerificationAccess: { findUnique }, remitoVerificationDailyMetric: { upsert: vi.fn() } },
  }
  return { deps, token: generated.token, findUnique, query }
}

async function invoke(deps: PublicRemitoVerificationRouteDependencies, token: string) {
  const response = await createPublicRemitoVerificationGet(deps)(new Request(`https://verify.test/api/public/remito-verifications/${token}`), { params: Promise.resolve({ token }) })
  return { response, body: await response.json() }
}

describe("public Remito verification route", () => {
  beforeEach(() => installRemitoActivationRuntime({ flags: {
    remitoLocatorIssuanceWrites: true, remitoInternalScanRead: true,
    remitoPublicPublicationWrites: true, remitoPublicCompatibilityRead: true, remitoPrintCodes: false,
  }, cohort: { companyIds: ["company"], cohortStart: new Date(0) } }))
  it.each(["current", "revoked", "replaced"] as const)("rates before lookup and returns exact %s DTO", async (state) => {
    const { deps, token, findUnique, query } = setup(state); const { response, body } = await invoke(deps, token)
    expect(response.status).toBe(200)
    expect(Object.keys(body)).toEqual(["verificationStatus", "issuerDisplayName", "issuerTaxId", "documentType", "issuedDate", "remitoShortCode", "verificationVersion", "fingerprint", "checkedAt"])
    expect(body.verificationStatus).toBe(state === "current" ? "valid" : state)
    expect(query.mock.invocationCallOrder[0]).toBeLessThan(findUnique.mock.invocationCallOrder[0])
  })

  it("makes malformed and unknown inputs indistinguishable and records invalid only after pre-rate", async () => {
    const malformed = setup("missing"), unknown = setup("missing")
    const first = await invoke(malformed.deps, "malformed"), second = await invoke(unknown.deps, unknown.token)
    expect(first.body).toEqual(second.body); expect(first.response.status).toBe(200)
    expect(first.body).toMatchObject({ verificationStatus: "invalid", issuerDisplayName: null, issuerTaxId: null, fingerprint: null })
    expect(malformed.query).toHaveBeenCalledTimes(2); expect(malformed.findUnique).not.toHaveBeenCalled()
    expect(unknown.query.mock.invocationCallOrder[0]).toBeLessThan(unknown.findUnique.mock.invocationCallOrder[0])
  })

  it("is replay-safe, fail-closed, and never reports a token or caught error", async () => {
    const valid = setup("current"); await invoke(valid.deps, valid.token); await invoke(valid.deps, valid.token)
    expect(valid.findUnique).toHaveBeenCalledTimes(2)
    const failed = setup("current"), reportFailure = vi.fn(); failed.deps.reportFailure = reportFailure
    failed.deps.rateKey = () => { throw new Error(`secret:${failed.token}`) }
    const { response, body } = await invoke(failed.deps, failed.token)
    expect(response.status).toBe(503); expect(JSON.stringify(body)).not.toContain(failed.token)
    expect(reportFailure).toHaveBeenCalledWith("public_remito_verification_failed")
  })
})

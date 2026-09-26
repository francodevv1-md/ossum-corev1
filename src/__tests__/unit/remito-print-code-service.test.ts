import { beforeEach, describe, expect, it, vi } from "vitest"
import { createRemitoTokenKeyring, deriveRemitoPublicToken, hashRemitoPublicToken } from "@/lib/remito-verification/token"
import { getRemitoPrintCodes } from "@/lib/services/remito-print-code.service"
import { createRemitoActivationGate, installRemitoActivationRuntime } from "@/lib/remito-verification/activation"

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async (value: string) => `data:image/png,${value}`) } }))

const routeMocks = vi.hoisted(() => ({ identity: vi.fn(), memberships: vi.fn(), select: vi.fn(), runtime: vi.fn(),
  locator: vi.fn(), audit: vi.fn(), transaction: vi.fn() }))
vi.mock("@/lib/api/identity-context", () => ({ getApiIdentity: routeMocks.identity }))
vi.mock("@/lib/api/guards", () => ({ getActiveCompanyMemberships: routeMocks.memberships, requireSelectedCompanyMembership: routeMocks.select }))
vi.mock("@/lib/remito-verification/service", () => ({ getRemitoVerificationRuntime: routeMocks.runtime }))
vi.mock("@/lib/prisma", () => ({ default: { remitoScanLocator: { findFirst: routeMocks.locator },
  auditEvent: { create: routeMocks.audit }, $transaction: routeMocks.transaction } }))

import { GET } from "@/app/api/companies/[companyId]/remitos/[remitoId]/print-codes/route"

const locator = "RM1-04HM-ASW9-NF6Y-ZZPW-M"
const keyring = createRemitoTokenKeyring({ activeTokenKeyVersion: 1, keys: { 1: Buffer.alloc(32, 7).toString("base64url") } })
const nonce = Buffer.alloc(32, 9).toString("base64url")
const token = deriveRemitoPublicToken(keyring, 1, nonce)

async function dependencies(overrides: Record<string, unknown> = {}) {
  const row = { locator, remitoId: "remito-1", remito: { state: "Emitido", issuedAt: new Date(),
    verificationPublications: [{ status: "current", currentSlot: 1, accesses: [{ status: "current", currentSlot: 1,
      tokenNonce: nonce, tokenKeyVersion: 1, tokenHash: hashRemitoPublicToken(token) }] }] } }
  const tx = { remitoScanLocator: { findFirst: vi.fn().mockResolvedValue(row) }, auditEvent: { create: vi.fn() }, ...overrides }
  const activation = await createRemitoActivationGate({ flags: {
    remitoLocatorIssuanceWrites: true, remitoInternalScanRead: true,
    remitoPublicPublicationWrites: true, remitoPublicCompatibilityRead: true, remitoPrintCodes: true,
  }, cohort: { companyIds: ["company-1", "c"], cohortStart: new Date(0) } })
  return { deps: { prisma: { ...tx, $transaction: async <T>(fn: (value: typeof tx) => Promise<T>) => fn(tx) }, keyring,
    internalOrigin: new URL("https://app.ossum.test"), publicOrigin: new URL("https://verify.ossum.test"), activation }, tx }
}

describe("Remito print codes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installRemitoActivationRuntime({ flags: {
      remitoLocatorIssuanceWrites: true, remitoInternalScanRead: true,
      remitoPublicPublicationWrites: true, remitoPublicCompatibilityRead: true, remitoPrintCodes: true,
    }, cohort: { companyIds: ["company"], cohortStart: new Date(0) } })
  })

  it("returns only the exact DTO after issued/current lookup, hash verification, and audit", async () => {
    const { deps, tx } = await dependencies()
    const dto = await getRemitoPrintCodes(deps, { companyId: "company-1", remitoShortCode: locator, actorId: "actor-1", role: "logistica" })
    expect(Object.keys(dto)).toEqual(["remitoShortCode", "internalQrDataUrl", "publicQrDataUrl", "code128Svg", "labels"])
    expect(dto.internalQrDataUrl).toContain(`https://app.ossum.test/remitos/scan/${locator}`)
    expect(dto.publicQrDataUrl).toContain(`https://verify.ossum.test/verificar/remito/${token}`)
    expect(JSON.stringify(dto)).not.toMatch(/tokenHash|tokenNonce|company-1|remito-1/)
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "remito.print_codes_distributed" }) })
    expect(tx.remitoScanLocator.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", locator } }))
  })

  it.each([
    ["draft", { remitoScanLocator: { findFirst: vi.fn().mockResolvedValue({ locator, remitoId: "r", remito: { state: "Borrador", issuedAt: null, verificationPublications: [] } }) } }],
    ["hash mismatch", { remitoScanLocator: { findFirst: vi.fn().mockResolvedValue({ locator, remitoId: "r", remito: { state: "Emitido", issuedAt: new Date(), verificationPublications: [{ status: "current", currentSlot: 1, accesses: [{ status: "current", currentSlot: 1, tokenNonce: nonce, tokenKeyVersion: 1, tokenHash: "0".repeat(64) }] }] } }) } }],
  ])("fails closed for %s without audit", async (_name, overrides) => {
    const { deps, tx } = await dependencies(overrides)
    await expect(getRemitoPrintCodes(deps, { companyId: "c", remitoShortCode: locator, actorId: "a", role: "admin" }))
      .rejects.toMatchObject({ status: 404, code: "remito_print_codes_unavailable" })
    expect(tx.auditEvent.create).not.toHaveBeenCalled()
  })

  it("rejects absent/unsafe configuration and unauthorized roles before distribution", async () => {
    const { deps, tx } = await dependencies()
    await expect(getRemitoPrintCodes({ ...deps, publicOrigin: new URL("http://verify.test") }, { companyId: "c", remitoShortCode: locator, actorId: "a", role: "admin" })).rejects.toThrow(/HTTPS/)
    await expect(getRemitoPrintCodes(deps, { companyId: "c", remitoShortCode: locator, actorId: "a", role: "patient" })).rejects.toMatchObject({ status: 404 })
    expect(tx.auditEvent.create).not.toHaveBeenCalled()
  })

  it("authenticates and selects membership before service, and makes every response no-store", async () => {
    routeMocks.identity.mockResolvedValue({ actorUserId: "actor" })
    routeMocks.memberships.mockResolvedValue([{ companyId: "company", role: "admin" }])
    routeMocks.select.mockReturnValue({ companyId: "company", role: "admin" })
    routeMocks.runtime.mockReturnValue({ keyring, internalOrigin: new URL("https://app.test"), publicOrigin: new URL("https://verify.test") })
    routeMocks.locator.mockResolvedValue({ locator, remitoId: "remito", remito: { state: "Emitido", issuedAt: new Date(),
      verificationPublications: [{ status: "current", currentSlot: 1, accesses: [{ status: "current", currentSlot: 1,
        tokenNonce: nonce, tokenKeyVersion: 1, tokenHash: hashRemitoPublicToken(token) }] }] } })
    routeMocks.transaction.mockImplementation(async (fn) => fn({ remitoScanLocator: { findFirst: routeMocks.locator }, auditEvent: { create: routeMocks.audit } }))
    const response = await GET(new Request("https://app.test/api"), { params: Promise.resolve({ companyId: "company", remitoId: locator }) })
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(routeMocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "actor", action: "remito.print_codes_distributed" }) })
  })

  it("keeps authentication errors private and no-store", async () => {
    routeMocks.identity.mockRejectedValue(new Error("not configured"))
    const response = await GET(new Request("https://app.test/api"), { params: Promise.resolve({ companyId: "company", remitoId: locator }) })
    expect(response.status).toBe(500)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(routeMocks.transaction).not.toHaveBeenCalled()
  })
})

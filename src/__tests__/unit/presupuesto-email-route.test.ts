import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), guard: vi.fn(), get: vi.fn(), render: vi.fn(), send: vi.fn(), audit: vi.fn() }))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: mocks.guard }))
vi.mock("@/lib/services/presupuesto.service", () => ({
  getPresupuesto: mocks.get, PRESUPUESTO_MUTATION_ROLES: ["admin", "coordinador", "vendedor"],
}))
vi.mock("@react-pdf/renderer", async (original) => ({ ...(await original<typeof import("@react-pdf/renderer")>()), renderToBuffer: mocks.render }))
vi.mock("@/lib/outbound-email", async (original) => ({ ...(await original<typeof import("@/lib/outbound-email")>()), sendResendEmail: mocks.send }))
vi.mock("@/lib/audit", () => ({ createAuditEvent: mocks.audit }))
vi.mock("@/lib/prisma", () => ({ default: {} }))

import { formatPresupuestoDocumentDate, POST } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/email/route"
import { ApiError } from "@/lib/api/errors"

const presupuesto = {
  id: "budget-1", visibleNumber: 42, companyId: "company-1", surgeryId: "surgery-1", parentPresupuestoId: null,
  familyId: "family-1", branchId: "branch-1", clientContactId: "client-1", payerContactId: "payer-1",
  sourcePresupuestoId: null, slot: "CURRENT", revision: 2,
  versionNumber: 1, state: "Emitido", title: "Implantes", currency: "ARS", documentDate: "2026-08-30T00:00:00.000Z",
  paymentTerms: "Contado", priceListCode: "GENERAL", legend: "Commercial legend", notes: null,
  generalDiscountRate: "0", commercialSnapshot: {
    company: { name: "Districorr DEV" }, branch: { name: "Central" }, client: { legalName: "Cliente" },
    payer: { legalName: "Pagador" }, responsible: { firstName: "User", lastName: "One" },
  }, subtotal: "100", discountTotal: "0",
  taxTotal: "21", total: "121", validUntil: new Date("2026-09-30T00:00:00Z"), issuedAt: new Date("2026-08-30T00:00:00Z"),
  approvedAt: null, rejectedAt: null, createdById: "user-1", updatedById: null, metadata: null,
  createdAt: new Date("2026-08-29T00:00:00Z"), updatedAt: new Date("2026-08-30T00:00:00Z"),
  actions: ["approve"], items: [{ id: "item-1", position: 0, sku: "SKU", description: "Implante", quantity: "1", unit: "unidad", unitPrice: "100",
    discountRate: "0", discount: "0", taxRate: "21", tax: "21", total: "121", metadata: null }],
}

function request() {
  return new Request("http://localhost", { method: "POST", body: JSON.stringify({
    to: "recipient@example.com", subject: "Presupuesto", message: "Adjunto", copyMe: true, idempotencyKey: "key-12345",
  }) })
}

const context = { params: Promise.resolve({ companyId: "requested-company", presupuestoId: "budget-1" }) }

describe("Presupuesto email route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ actorUserId: "user-1", companyId: "company-1", role: "admin", user: { email: "actor@example.com" } })
    mocks.get.mockResolvedValue(presupuesto)
    mocks.render.mockResolvedValue(Buffer.from("pdf"))
    mocks.send.mockResolvedValue({ provider: "resend", providerMessageId: "email-1", status: "accepted" })
  })

  it("preserves calendar dates independently of the server timezone", () => {
    expect(formatPresupuestoDocumentDate("2026-09-30T00:00:00Z")).toBe("30/9/26")
  })

  it("checks the Presupuesto mutation roles, uses the authenticated company read, and attaches the PDF", async () => {
    const response = await POST(request(), context)
    expect(response.status).toBe(200)
    expect(mocks.guard).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1" }), ["admin", "coordinador", "vendedor"])
    expect(mocks.get).toHaveBeenCalledWith({ companyId: "company-1", presupuestoId: "budget-1", prisma: {} })
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "recipient@example.com", cc: "actor@example.com",
      idempotencyKey: "presupuesto/e7b1bb58acba4fbc16b9de2cc3043571d4c2090949b814319d68ddbee688875f",
      attachments: [{ filename: "P-0042.pdf", content: Buffer.from("pdf") }],
    }))
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "presupuesto_email_accepted", entityId: "budget-1" }))
  })

  it.each(["Borrador", "Rechazado", "Vencido", "Reemplazado", "Anulado"])("rejects %s before rendering or sending", async (state) => {
    mocks.get.mockResolvedValue({ ...presupuesto, state })
    expect((await POST(request(), context)).status).toBe(400)
    expect(mocks.render).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("allows Aprobado", async () => {
    mocks.get.mockResolvedValue({ ...presupuesto, state: "Aprobado" })
    expect((await POST(request(), context)).status).toBe(200)
    expect(mocks.send).toHaveBeenCalledOnce()
  })

  it("does not disclose foreign-company Presupuestos before PDF rendering or sending", async () => {
    mocks.get.mockRejectedValueOnce(new ApiError(404, "presupuesto_not_found", "Presupuesto not found"))

    const response = await POST(request(), context)

    expect(response.status).toBe(404)
    expect(mocks.get).toHaveBeenCalledWith({ companyId: "company-1", presupuestoId: "budget-1", prisma: {} })
    expect(mocks.render).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
    expect(JSON.stringify(await response.json())).not.toContain("Implantes")
  })

  it("returns provider acceptance when audit recording fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"))
    const response = await POST(request(), context)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: { status: "accepted", auditRecorded: false } })
    expect(error).toHaveBeenCalledWith("[presupuesto.email.POST] Email accepted but audit failed", { name: "Error", code: "audit_write_failed" })
    error.mockRestore()
  })

  it("allowlists provider failure logs and has no state mutation imports", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.send.mockRejectedValueOnce(new Error("recipient@example.com secret payload"))
    const response = await POST(request(), context)
    expect(response.status).toBe(500)
    expect(error).toHaveBeenCalledWith("[presupuesto.email.POST]", { name: "Error", code: "unhandled_error" })
    expect(JSON.stringify(error.mock.calls)).not.toContain("secret payload")
    const source = readFileSync(resolve(process.cwd(), "src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/email/route.ts"), "utf8")
    expect(source).not.toMatch(/emitPresupuesto|updatePresupuestoState|createPresupuestoVersion|deletePresupuesto/)
    error.mockRestore()
  })
})

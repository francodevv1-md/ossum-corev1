import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), guard: vi.fn(), getInvoice: vi.fn(), createInvoice: vi.fn(), emitInvoice: vi.fn(), updateInvoiceState: vi.fn(),
  render: vi.fn(), send: vi.fn(), audit: vi.fn(), invoiceUpdate: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: mocks.guard }))
vi.mock("@/lib/services/invoice.service", () => ({
  getInvoice: mocks.getInvoice,
  createInvoice: mocks.createInvoice,
  emitInvoice: mocks.emitInvoice,
  updateInvoiceState: mocks.updateInvoiceState,
  INVOICE_MUTATION_ROLES: ["admin", "coordinador", "vendedor"],
}))
vi.mock("@react-pdf/renderer", async (importOriginal) => ({ ...(await importOriginal<typeof import("@react-pdf/renderer")>()), renderToBuffer: mocks.render }))
vi.mock("@/lib/outbound-email", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/outbound-email")>()), sendResendEmail: mocks.send }))
vi.mock("@/lib/audit", () => ({ createAuditEvent: mocks.audit }))
vi.mock("@/lib/prisma", () => ({ default: { invoice: { update: mocks.invoiceUpdate } } }))

import { POST } from "@/app/api/companies/[companyId]/invoices/[invoiceId]/email/route"
import { buildOutboundEmailIdempotencyKey } from "@/lib/outbound-email"

const invoice = {
  id: "invoice-1", companyId: "company-1", visibleNumber: 7, surgeryId: "surgery-1", presupuestoId: null, consumoId: null,
  base: "manual", state: "Emitida", type: "FV", currency: "ARS", subtotal: "100", discountTotal: "0", taxTotal: "21",
  total: "121", paidTotal: "0", balance: "121", issuedAt: new Date("2026-08-30T12:00:00Z"), cancelledAt: null,
  createdById: "user-1", updatedById: null, metadata: null, createdAt: new Date("2026-08-30T11:00:00Z"), updatedAt: new Date("2026-08-30T12:00:00Z"),
  items: [{ id: "item-1", sku: "SKU", description: "Implante", quantity: "1", unit: "u", unitPrice: "100", discount: "0", tax: "21", total: "121", sourceType: null, sourceItemId: null, metadata: null, createdAt: new Date(), updatedAt: new Date() }],
}

function request(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost", { method: "POST", body: JSON.stringify({ to: "recipient@example.com", subject: "Factura", message: "Adjunto", copyMe: true, idempotencyKey: "client-key-123", ...overrides }) })
}

function call() {
  return POST(request(), { params: Promise.resolve({ companyId: "company-1", invoiceId: "invoice-1" }) })
}

describe("Invoice email route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ actorUserId: "user-1", companyId: "company-1", role: "admin", user: { email: "actor@example.com" } })
    mocks.getInvoice.mockResolvedValue(invoice)
    mocks.render.mockResolvedValue(Buffer.from("private-pdf"))
    mocks.send.mockResolvedValue({ provider: "resend", providerMessageId: "email-1", status: "accepted" })
  })

  it.each(["Emitida", "Parcialmente_cobrada", "Cobrada"])("sends a company-scoped %s operational Invoice as a private non-fiscal PDF", async (state) => {
    mocks.getInvoice.mockResolvedValue({ ...invoice, state })
    const response = await call()

    expect(response.status).toBe(200)
    expect(mocks.guard).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1" }), ["admin", "coordinador", "vendedor"])
    expect(mocks.getInvoice).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1", invoiceId: "invoice-1" }))
    const document = mocks.render.mock.calls[0][0]
    expect(document.props.data).toMatchObject({ documentKind: "operational_invoice", fiscalStatus: "non_fiscal", documentNumber: "Factura-7", state })
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "recipient@example.com", cc: "actor@example.com",
      idempotencyKey: buildOutboundEmailIdempotencyKey("invoice", "company-1", "invoice-1", "client-key-123"),
      attachments: [{ filename: "Factura-7.pdf", content: Buffer.from("private-pdf") }],
    }))
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice_email_accepted", metadata: expect.objectContaining({ documentKind: "operational_invoice", fiscalStatus: "non_fiscal" }) }))
    expect(mocks.createInvoice).not.toHaveBeenCalled()
    expect(mocks.emitInvoice).not.toHaveBeenCalled()
    expect(mocks.updateInvoiceState).not.toHaveBeenCalled()
    expect(mocks.invoiceUpdate).not.toHaveBeenCalled()
  })

  it.each(["Borrador", "Anulada"])("rejects %s before rendering or sending", async (state) => {
    mocks.getInvoice.mockResolvedValue({ ...invoice, state, visibleNumber: state === "Borrador" ? null : 7, issuedAt: state === "Borrador" ? null : invoice.issuedAt })
    const response = await call()
    expect(response.status).toBe(400)
    expect(mocks.render).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each([{ visibleNumber: null }, { issuedAt: null }])("requires both authoritative issuance fields: %o", async (missing) => {
    mocks.getInvoice.mockResolvedValue({ ...invoice, ...missing })
    const response = await call()
    await expect(response.json()).resolves.toMatchObject({ error: { code: "invoice_email_requires_issued" } })
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("returns provider acceptance without encouraging a duplicate retry when audit fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"))
    const response = await call()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: { status: "accepted", auditRecorded: false } })
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith("[invoice.email.POST] Email accepted but audit failed", { name: "Error", code: "audit_write_failed" })
    errorSpy.mockRestore()
  })

  it("logs only allowlisted provider error fields", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.send.mockRejectedValueOnce(new Error("recipient@example.com secret provider payload"))
    const response = await call()
    expect(response.status).toBe(500)
    expect(errorSpy).toHaveBeenCalledWith("[invoice.email.POST]", { name: "Error", code: "unhandled_error" })
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret provider payload")
    errorSpy.mockRestore()
  })
})

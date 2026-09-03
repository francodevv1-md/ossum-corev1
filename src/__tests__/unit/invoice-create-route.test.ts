import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationAccess: vi.fn(),
  createInvoice: vi.fn(),
  createInvoiceFromSource: vi.fn(),
}))

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }))
vi.mock("@/lib/api/guards", () => ({
  requireCompanyMutationAccess: mocks.requireCompanyMutationAccess,
  requireCompanyReadAccess: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({ default: { mocked: true } }))
vi.mock("@/lib/services/invoice.service", () => ({
  INVOICE_BASES: ["presupuesto", "consumo", "manual", "mixto"],
  INVOICE_STATES: ["Borrador", "Emitida", "Anulada", "Cobrada", "Parcialmente_cobrada"],
  INVOICE_TRANSITIONS: {},
  INVOICE_MUTATION_ROLES: ["admin"],
  createInvoice: mocks.createInvoice,
  createInvoiceFromSource: mocks.createInvoiceFromSource,
  listInvoices: vi.fn(),
}))

import { POST } from "@/app/api/companies/[companyId]/invoices/route"

const context = { params: Promise.resolve({ companyId: "company-real" }) }

describe("invoice create route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApiAuthContext.mockResolvedValue({ companyId: "company-real", actorUserId: "user-real", role: "admin" })
    mocks.createInvoice.mockResolvedValue({ id: "invoice-manual" })
    mocks.createInvoiceFromSource.mockResolvedValue({ id: "invoice-source" })
  })

  it("dispatches item-less source payloads to backend-authoritative creation", async () => {
    const response = await POST(new Request("http://localhost/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presupuestoId: "budget-real", consumoId: "consumo-real" }),
    }), context)

    expect(response.status).toBe(201)
    expect(mocks.createInvoiceFromSource).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-real",
      presupuestoId: "budget-real",
      consumoId: "consumo-real",
      createdById: "user-real",
    }))
    expect(mocks.createInvoice).not.toHaveBeenCalled()
  })

  it("preserves the existing manual item contract", async () => {
    const response = await POST(new Request("http://localhost/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base: "manual", items: [{ description: "Manual", quantity: "1", unitPrice: "10" }], legacyField: "ignored" }),
    }), context)

    expect(response.status).toBe(201)
    expect(mocks.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-real",
      base: "manual",
      items: [expect.objectContaining({ description: "Manual", unitPrice: "10" })],
    }))
    expect(mocks.createInvoiceFromSource).not.toHaveBeenCalled()
  })

  it("rejects client-priced items whenever a source id is present", async () => {
    const response = await POST(new Request("http://localhost/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        presupuestoId: "budget-real",
        consumoId: "consumo-real",
        base: "manual",
        items: [{ description: "Precio controlado por cliente", quantity: "1", unitPrice: "0.01" }],
      }),
    }), context)

    expect(response.status).toBe(400)
    expect(mocks.createInvoice).not.toHaveBeenCalled()
    expect(mocks.createInvoiceFromSource).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock("@/lib/api/client", () => ({ apiFetch }))

import { createInvoiceDraftFromSource, createManualInvoiceDraft, emitInvoice, fetchAllInvoices, fetchInvoices } from "@/lib/api/invoices"
import { cancelPayment, createInvoicePayment, fetchAllPayments, fetchPayments } from "@/lib/api/payments"

describe("billing and payment API clients", () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({})
  })

  it("uses the company-scoped invoice URLs and one-line manual payload", async () => {
    await fetchInvoices("company / one", { state: "Emitida", base: "manual", from: "2026-09-01", take: 100 })
    await createManualInvoiceDraft("company-1", {
      description: "Implante operativo",
      amount: "1500.50",
      surgeryId: "surgery-1",
      reference: "INT-7",
    })
    await emitInvoice("company-1", "invoice / real")

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/companies/company%20%2F%20one/invoices?state=Emitida&base=manual&from=2026-09-01&take=100")
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({
      surgeryId: "surgery-1",
      base: "manual",
      type: "FV",
      currency: "ARS",
      items: [{ description: "Implante operativo", quantity: "1", unitPrice: "1500.50", discount: "0", tax: "0" }],
      metadata: { reference: "INT-7" },
    })
    expect(apiFetch).toHaveBeenNthCalledWith(3, "/api/companies/company-1/invoices/invoice%20%2F%20real/emitir", { method: "POST" })
  })

  it("uses a real invoiceId for the sole imputation and correct payment endpoints", async () => {
    await fetchPayments("company-1", { state: "Registrado", surgeryId: "surgery-1", skip: 5 })
    await createInvoicePayment("company-1", {
      invoiceId: "invoice-real-42",
      surgeryId: "surgery-1",
      amount: 900,
      method: "transfer",
      receivedAt: "2026-09-01T12:00:00.000Z",
      reference: "TRX-9",
      notes: "Transferencia confirmada",
    })
    await cancelPayment("company-1", "payment / 2")

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/companies/company-1/payments?surgeryId=surgery-1&state=Registrado&skip=5")
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({
      surgeryId: "surgery-1",
      method: "transfer",
      currency: "ARS",
      amount: 900,
      receivedAt: "2026-09-01T12:00:00.000Z",
      imputations: [{ invoiceId: "invoice-real-42", amount: 900 }],
      metadata: { reference: "TRX-9", notes: "Transferencia confirmada" },
    })
    expect(apiFetch).toHaveBeenNthCalledWith(3, "/api/companies/company-1/payments/payment%20%2F%202/cancel", { method: "POST" })
  })

  it("creates a source draft without accepting client financial lines", async () => {
    await createInvoiceDraftFromSource("company-1", { presupuestoId: "budget-real", consumoId: "consumo-real" })

    expect(apiFetch).toHaveBeenCalledWith("/api/companies/company-1/invoices", expect.objectContaining({ method: "POST" }))
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ presupuestoId: "budget-real", consumoId: "consumo-real" })
  })

  it("loads every page for authoritative financial totals", async () => {
    const fullPage = Array.from({ length: 500 }, (_, index) => ({ id: `row-${index}` }))
    apiFetch
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce([{ id: "invoice-last" }])
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce([{ id: "payment-last" }])

    await expect(fetchAllInvoices("company-1")).resolves.toHaveLength(501)
    await expect(fetchAllPayments("company-1")).resolves.toHaveLength(501)

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/companies/company-1/invoices?take=500&skip=0")
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/companies/company-1/invoices?take=500&skip=500")
    expect(apiFetch).toHaveBeenNthCalledWith(3, "/api/companies/company-1/payments?take=500&skip=0")
    expect(apiFetch).toHaveBeenNthCalledWith(4, "/api/companies/company-1/payments?take=500&skip=500")
  })
})

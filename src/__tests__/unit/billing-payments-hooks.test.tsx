import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  fetchInvoices: vi.fn(),
  createManualInvoiceDraft: vi.fn(),
  emitInvoice: vi.fn(),
  fetchPayments: vi.fn(),
  createInvoicePayment: vi.fn(),
  cancelPayment: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.useAuth }))
vi.mock("@/lib/api/invoices", () => ({
  fetchAllInvoices: mocks.fetchInvoices,
  fetchInvoices: mocks.fetchInvoices,
  createManualInvoiceDraft: mocks.createManualInvoiceDraft,
  emitInvoice: mocks.emitInvoice,
}))
vi.mock("@/lib/api/payments", () => ({
  fetchAllPayments: mocks.fetchPayments,
  fetchPayments: mocks.fetchPayments,
  createInvoicePayment: mocks.createInvoicePayment,
  cancelPayment: mocks.cancelPayment,
}))

import { useInvoices } from "@/hooks/useInvoices"
import { usePayments } from "@/hooks/usePayments"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { PaymentApiRow } from "@/lib/api/payments"

const invoice = (id: string) => ({ id } as InvoiceApiRow)
const payment = (id: string) => ({ id } as PaymentApiRow)

describe("billing and payment hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-a" } })
  })

  it("drops stale invoice responses after the active company changes", async () => {
    const pending = new Map<string, (rows: InvoiceApiRow[]) => void>()
    mocks.fetchInvoices.mockImplementation((companyId: string) => new Promise((resolve) => pending.set(companyId, resolve)))
    const { result, rerender } = renderHook(() => useInvoices())

    await waitFor(() => expect(pending.has("company-a")).toBe(true))
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-b" } })
    rerender()
    await waitFor(() => expect(pending.has("company-b")).toBe(true))

    await act(async () => pending.get("company-b")?.([invoice("invoice-b")]))
    expect(result.current.invoices.map(({ id }) => id)).toEqual(["invoice-b"])
    await act(async () => pending.get("company-a")?.([invoice("invoice-a")]))
    expect(result.current.invoices.map(({ id }) => id)).toEqual(["invoice-b"])
  })

  it("refreshes each hook after its own mutations", async () => {
    mocks.fetchInvoices.mockResolvedValue([invoice("invoice-1")])
    mocks.fetchPayments.mockResolvedValue([payment("payment-1")])
    mocks.createManualInvoiceDraft.mockResolvedValue(invoice("invoice-2"))
    mocks.emitInvoice.mockResolvedValue(invoice("invoice-1"))
    mocks.createInvoicePayment.mockResolvedValue(payment("payment-2"))
    mocks.cancelPayment.mockResolvedValue(payment("payment-1"))

    const invoiceHook = renderHook(() => useInvoices())
    const paymentHook = renderHook(() => usePayments())
    await waitFor(() => {
      expect(mocks.fetchInvoices).toHaveBeenCalledTimes(1)
      expect(mocks.fetchPayments).toHaveBeenCalledTimes(1)
    })

    await act(async () => { await invoiceHook.result.current.create({ description: "Línea", amount: 10 }) })
    await act(async () => { await invoiceHook.result.current.emit("invoice-1") })
    await act(async () => { await paymentHook.result.current.create({ invoiceId: "invoice-1", amount: 10 }) })
    await act(async () => { await paymentHook.result.current.cancel("payment-1") })

    expect(mocks.createManualInvoiceDraft).toHaveBeenCalledWith("company-a", { description: "Línea", amount: 10 })
    expect(mocks.emitInvoice).toHaveBeenCalledWith("company-a", "invoice-1")
    expect(mocks.createInvoicePayment).toHaveBeenCalledWith("company-a", { invoiceId: "invoice-1", amount: 10 })
    expect(mocks.cancelPayment).toHaveBeenCalledWith("company-a", "payment-1")
    expect(mocks.fetchInvoices).toHaveBeenCalledTimes(3)
    expect(mocks.fetchPayments).toHaveBeenCalledTimes(3)
  })
})

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { PaymentApiRow } from "@/lib/api/payments"

const mocks = vi.hoisted(() => ({
  invoices: { companyId: "company-a" as string | undefined, invoices: [] as InvoiceApiRow[], loading: false, error: null as string | null, refresh: vi.fn() },
  payments: { companyId: "company-a" as string | undefined, payments: [] as PaymentApiRow[], loading: false, error: null as string | null, refresh: vi.fn() },
  mutation: vi.fn(),
}))
vi.mock("@/hooks/useInvoices", () => ({ useInvoices: () => ({ ...mocks.invoices, create: mocks.mutation, createFromSource: mocks.mutation, emit: mocks.mutation }) }))
vi.mock("@/hooks/usePayments", () => ({ usePayments: () => ({ ...mocks.payments, create: mocks.mutation, createPayment: mocks.mutation, cancel: mocks.mutation }) }))

import CollectionsPage from "@/app/ventas/cartera/page"

function invoice(overrides: Partial<InvoiceApiRow> = {}): InvoiceApiRow {
  return {
    id: "invoice-a", visibleNumber: 11, companyId: "company-a", surgeryId: "CX-11", presupuestoId: null, consumoId: null,
    base: "manual", state: "Emitida", type: "FV", currency: "ARS", subtotal: "999", discountTotal: "0", taxTotal: "0",
    total: "999", paidTotal: "1", balance: "12.0001", issuedAt: "2026-09-01T12:00:00Z", cancelledAt: null,
    createdById: null, updatedById: null, metadata: null, createdAt: "2026-08-01", updatedAt: "2026-09-01", items: [], ...overrides,
  }
}
function payment(overrides: Partial<PaymentApiRow> = {}): PaymentApiRow {
  return {
    id: "payment-a", visibleNumber: 1, companyId: "company-a", surgeryId: null, state: "Registrado", method: "transfer",
    currency: "USD", amount: "3.0001", receivedAt: "2026-10-04T10:00:00Z", createdById: null, updatedById: null,
    metadata: null, createdAt: "2026-10-04", updatedAt: "2026-10-04", imputations: [], ...overrides,
  }
}

describe("Collections portfolio read-only UI (mocked hooks)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"))
    Object.assign(mocks.invoices, { companyId: "company-a", invoices: [invoice()], loading: false, error: null })
    Object.assign(mocks.payments, { companyId: "company-a", payments: [payment()], loading: false, error: null })
    mocks.invoices.refresh.mockResolvedValue(undefined)
    mocks.payments.refresh.mockResolvedValue(undefined)
  })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it("shows backend balance adjustments, explicit currencies and honest age/read-only semantics", () => {
    render(<CollectionsPage />)
    const balances = screen.getByRole("region", { name: "Saldos por moneda" })
    expect(within(balances).getByText("Saldo pendiente · ARS")).toBeInTheDocument()
    expect(within(balances).getByText("Saldo pendiente · USD")).toBeInTheDocument()
    expect(screen.getAllByText("ARS 12,0001").length).toBeGreaterThan(0)
    expect(screen.queryByText(/998,0000/)).not.toBeInTheDocument()
    expect(screen.getByText(/La antigüedad desde emisión no indica vencimiento ni mora/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir a Cobros" })).toHaveAttribute("href", "/ventas/cobros")
    expect(screen.getByRole("link", { name: "Ir a Facturación" })).toHaveAttribute("href", "/ventas/facturacion")
    expect(screen.queryByRole("button", { name: /Cobrar|Anular|Emitir|Registrar/ })).not.toBeInTheDocument()
  })
  it.each(["invoices", "payments"] as const)("hides all aggregates while %s loads, including stale rows", (source) => {
    mocks[source].loading = true
    render(<CollectionsPage />)
    expect(screen.getByText("Cargando cartera completa…")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Saldos por moneda" })).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
  it.each(["invoices", "payments"] as const)("hides partial aggregates on %s failure and retries both sources", (source) => {
    mocks[source].error = "Failure from backend"
    render(<CollectionsPage />)
    expect(screen.getByRole("alert")).toHaveTextContent("No se muestran totales parciales")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(mocks.invoices.refresh).toHaveBeenCalledTimes(1)
    expect(mocks.payments.refresh).toHaveBeenCalledTimes(1)
    expect(mocks.mutation).not.toHaveBeenCalled()
  })
  it("requires an active company and never presents stale data without it", () => {
    mocks.invoices.companyId = undefined
    mocks.payments.companyId = undefined
    render(<CollectionsPage />)
    expect(screen.getByText(/Seleccioná una empresa/)).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeDisabled()
  })
  it("resets filters on company switch, hides mismatched hook scopes and rejects foreign rows", () => {
    const { rerender } = render(<CollectionsPage />)
    fireEvent.change(screen.getByLabelText("Buscar factura, cirugía o ítem"), { target: { value: "not-found" } })
    mocks.invoices.companyId = "company-b"
    rerender(<CollectionsPage />)
    expect(screen.getByText("Cargando cartera completa…")).toBeInTheDocument()
    expect(screen.queryByText("FV 11")).not.toBeInTheDocument()
    mocks.payments.companyId = "company-b"
    mocks.invoices.invoices = [invoice(), invoice({ id: "invoice-b", visibleNumber: 22, companyId: "company-b" })]
    rerender(<CollectionsPage />)
    expect(screen.getByLabelText("Buscar factura, cirugía o ítem")).toHaveValue("")
    expect(screen.getByText("FV 22")).toBeInTheDocument()
    expect(screen.queryByText("FV 11")).not.toBeInTheDocument()
    expect(screen.queryByText("Saldo pendiente · USD")).not.toBeInTheDocument()
  })
  it("handles an empty portfolio without claiming overdue status or requiring receipts", () => {
    mocks.invoices.invoices = []
    mocks.payments.payments = []
    render(<CollectionsPage />)
    expect(screen.getByText("No hay facturas abiertas con saldo pendiente.")).toBeInTheDocument()
    expect(screen.getByText(/Sin saldos válidos ni cobros registrados/)).toBeInTheDocument()
  })
  it("bounds invoice rendering to 20 and filters/searches without changing currency aggregates", () => {
    mocks.invoices.invoices = Array.from({ length: 25 }, (_, index) => invoice({ id: `invoice-${String(index).padStart(2, "0")}`, visibleNumber: index + 1 }))
    render(<CollectionsPage />)
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(21)
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6)
    expect(screen.getByText("25 resultados · Página 2 de 2")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Buscar factura, cirugía o ítem"), { target: { value: "FV 25" } })
    expect(screen.getByText("1 resultados · Página 1 de 1")).toBeInTheDocument()
    expect(screen.getAllByText("ARS 300,0025").length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText("Moneda"), { target: { value: "USD" } })
    expect(screen.getByText("Sin resultados para los filtros aplicados.")).toBeInTheDocument()
  })
  it("filters unusable dates and shows invalid amounts/currency explicitly rather than zero", () => {
    mocks.invoices.invoices = [invoice({ issuedAt: null }), invoice({ id: "bad", visibleNumber: 12, balance: "bad", currency: "ZZZ", issuedAt: "future-invalid" })]
    render(<CollectionsPage />)
    expect(screen.getByRole("alert")).toHaveTextContent("Facturas con saldo inválido")
    expect(screen.getByRole("alert")).toHaveTextContent("Facturas con moneda inválida")
    expect(screen.getByText("Saldo inválido")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Antigüedad desde emisión"), { target: { value: "missing" } })
    expect(screen.getByText("FV 11")).toBeInTheDocument()
    expect(screen.queryByText("FV 12")).not.toBeInTheDocument()
  })
  it("refreshes through unchanged read hooks only", () => {
    render(<CollectionsPage />)
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }))
    expect(mocks.invoices.refresh).toHaveBeenCalledTimes(1)
    expect(mocks.payments.refresh).toHaveBeenCalledTimes(1)
    expect(mocks.mutation).not.toHaveBeenCalled()
    const source = readFileSync("src/app/ventas/cartera/page.tsx", "utf8")
    expect(source).not.toMatch(/fetch\(|apiFetch|localStorage|useOrtoTrackStore|\.create\(|\.cancel\(|\.emit\(|receipt/i)
  })
  it("prioritizes oldest and largest outstanding invoices while excluding paid/draft/cancelled exposure", () => {
    mocks.invoices.invoices = [
      invoice({ id: "new-large", visibleNumber: 1, balance: "100", issuedAt: "2026-10-01T00:00:00Z" }),
      invoice({ id: "old-small", visibleNumber: 2, balance: "1", issuedAt: "2026-01-01T00:00:00Z" }),
      invoice({ id: "draft", visibleNumber: 3, state: "Borrador" }),
      invoice({ id: "paid", visibleNumber: 4, state: "Cobrada" }),
      invoice({ id: "cancelled", visibleNumber: 5, state: "Anulada" }),
    ]
    render(<CollectionsPage />)
    expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toHaveTextContent("FV 2")
    fireEvent.change(screen.getByLabelText("Prioridad"), { target: { value: "largest" } })
    expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toHaveTextContent("FV 1")
    expect(screen.getByText("2 resultados · Página 1 de 1")).toBeInTheDocument()
    expect(screen.queryByText("FV 3")).not.toBeInTheDocument()
    expect(screen.queryByText("FV 4")).not.toBeInTheDocument()
    expect(screen.queryByText("FV 5")).not.toBeInTheDocument()
  })
  it("shows recent registered payment windows by currency without cancelled payments", () => {
    mocks.payments.payments = [payment(), payment({ id: "cancelled", state: "Anulado", amount: "99" })]
    render(<CollectionsPage />)
    const trends = screen.getByRole("region", { name: "Tendencia de cobros registrados · últimos 28 días" })
    expect(within(trends).getByText("USD 3,0001")).toBeInTheDocument()
    expect(within(trends).queryByText(/99,0000/)).not.toBeInTheDocument()
    expect(within(trends).getByText("1 cobros registrados en el período")).toBeInTheDocument()
  })
})

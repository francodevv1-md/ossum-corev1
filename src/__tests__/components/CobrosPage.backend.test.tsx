import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useInvoices: vi.fn(),
  usePayments: vi.fn(),
  useStore: vi.fn(),
  createPayment: vi.fn(),
  cancelPayment: vi.fn(),
  refreshInvoices: vi.fn(),
  refreshPayments: vi.fn(),
  openExpediente: vi.fn(),
}))

vi.mock("@/hooks/useInvoices", () => ({ useInvoices: mocks.useInvoices }))
vi.mock("@/hooks/usePayments", () => ({ usePayments: mocks.usePayments }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: mocks.useStore }))
vi.mock("@/components/layout/app-shell", () => ({ useExpedienteDrawer: () => ({ openExpediente: mocks.openExpediente }) }))
vi.mock("@/components/shared", () => ({
  StatsCard: ({ title, value }: { title: string; value: string | number }) => <div>{title}: {value}</div>,
  StateBadge: ({ status }: { status: string }) => <span>{status}</span>,
  SurgeryDrawer: () => null,
}))
vi.mock("@/components/cobros/CobroFormDialog", () => ({
  CobroFormDialog: ({ open, invoice, onSubmit }: { open: boolean; invoice: { id: string } | null; onSubmit: (payload: { invoiceId: string; amount: string }) => Promise<unknown> }) => open && invoice
    ? <button onClick={() => void onSubmit({ invoiceId: invoice.id, amount: "40" })}>Confirmar cobro backend</button>
    : null,
}))

import CobrosPage from "@/app/ventas/cobros/page"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { PaymentApiRow } from "@/lib/api/payments"

const invoice = {
  id: "invoice-real-42",
  visibleNumber: 42,
  state: "Emitida",
  balance: "60",
  total: "100",
  paidTotal: "40",
  issuedAt: "2026-09-01T12:00:00.000Z",
  createdAt: "2026-09-01T11:00:00.000Z",
  surgeryId: "surgery-real",
  items: [{ description: "Backend invoice row" }],
} as InvoiceApiRow

const payment = {
  id: "payment-real-7",
  visibleNumber: 7,
  state: "Registrado",
  method: "transfer",
  amount: "40",
  receivedAt: "2026-09-01T13:00:00.000Z",
  metadata: { reference: "BACKEND-PAYMENT" },
  imputations: [{ invoiceId: "invoice-real-42", amount: "40" }],
} as PaymentApiRow

describe("CobrosPage backend authority", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useInvoices.mockReturnValue({
      companyId: "company-real",
      invoices: [invoice],
      loading: false,
      error: null,
      refresh: mocks.refreshInvoices.mockResolvedValue(undefined),
    })
    mocks.usePayments.mockReturnValue({
      companyId: "company-real",
      payments: [payment],
      loading: false,
      error: null,
      mutatingId: null,
      create: mocks.createPayment.mockResolvedValue(undefined),
      cancel: mocks.cancelPayment.mockResolvedValue(undefined),
      refresh: mocks.refreshPayments.mockResolvedValue(undefined),
    })
  })

  it("creates and cancels real backend payments, cross-refreshing without mock finance", async () => {
    render(<CobrosPage />)

    expect(screen.getByText("Backend invoice row")).toBeInTheDocument()
    expect(screen.queryByText(/MOCK-FV|Mock financial row/)).not.toBeInTheDocument()
    expect(mocks.useStore).not.toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "Ver recibos digitales" })).toHaveAttribute("href", "/ventas/recibos?from=cobros")
    expect(screen.getByRole("link", { name: "Ver recibos de FV 42" })).toHaveAttribute("href", "/ventas/recibos?from=cobros&surgeryId=surgery-real&invoice=42")
    fireEvent.click(screen.getByRole("button", { name: "Ver expediente surgery-real" }))
    expect(mocks.openExpediente).toHaveBeenCalledWith("surgery-real")

    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cobro backend" }))
    await waitFor(() => expect(mocks.createPayment).toHaveBeenCalledWith({ invoiceId: "invoice-real-42", amount: "40" }))

    fireEvent.keyDown(screen.getByRole("tab", { name: /Facturas con saldo/ }), { key: "ArrowRight" })
    expect(await screen.findByText("Cobro 7")).toBeInTheDocument()
    expect(screen.getByText("FV 42")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Anular" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar anulación" }))

    await waitFor(() => expect(mocks.cancelPayment).toHaveBeenCalledWith("payment-real-7"))
    expect(mocks.refreshInvoices).toHaveBeenCalledTimes(2)
    expect(mocks.refreshPayments).toHaveBeenCalledTimes(2)
  })
})

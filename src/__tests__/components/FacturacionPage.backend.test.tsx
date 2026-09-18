import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useInvoices: vi.fn(),
  usePayments: vi.fn(),
  useStore: vi.fn(),
  openExpediente: vi.fn(),
  emit: vi.fn(),
  createInvoice: vi.fn(),
  createPayment: vi.fn(),
  refreshInvoices: vi.fn(),
  fetchSurgeries: vi.fn(),
}))

vi.mock("@/hooks/useInvoices", () => ({ useInvoices: mocks.useInvoices }))
vi.mock("@/hooks/usePayments", () => ({ usePayments: mocks.usePayments }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: mocks.useStore }))
vi.mock("@/lib/api/backend-surgeries", () => ({ fetchBackendActiveSurgeries: mocks.fetchSurgeries }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-real" }, currentAccess: { role: "admin" } }) }))
vi.mock("@/lib/permissions/financial-document-email", () => ({ canSendFinancialDocumentEmail: () => false }))
vi.mock("@/components/layout/app-shell", () => ({ useExpedienteDrawer: () => ({ openExpediente: mocks.openExpediente }) }))
vi.mock("@/components/email/SendExistingFinancialDocumentDialog", () => ({ SendExistingFinancialDocumentDialog: () => null }))
vi.mock("@/components/shared", () => ({
  StatsCard: ({ title, value }: { title: string; value: string | number }) => <div>{title}: {value}</div>,
  StateBadge: ({ status }: { status: string }) => <span>{status}</span>,
  SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => <input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />,
  SurgeryDrawer: () => null,
}))
vi.mock("@/components/cobros/CobroFormDialog", () => ({
  CobroFormDialog: ({ open, invoice, onSubmit }: { open: boolean; invoice: { id: string } | null; onSubmit: (payload: { invoiceId: string; amount: string }) => Promise<unknown> }) => open && invoice
    ? <button onClick={() => void onSubmit({ invoiceId: invoice.id, amount: "25" })}>Confirmar cobro backend</button>
    : null,
}))

import FacturacionPage from "@/app/ventas/facturacion/page"
import type { InvoiceApiRow } from "@/lib/api/invoices"

const backendInvoices = [
  {
    id: "draft-real",
    visibleNumber: null,
    state: "Borrador",
    total: "100",
    paidTotal: "0",
    balance: "100",
    createdAt: "2026-09-01T12:00:00.000Z",
    issuedAt: null,
    surgeryId: null,
    metadata: { reference: "BACKEND-REF" },
    items: [{ description: "Backend draft line" }],
  },
  {
    id: "invoice-real",
    visibleNumber: 42,
    state: "Emitida",
    total: "80",
    paidTotal: "20",
    balance: "60",
    createdAt: "2026-09-01T12:00:00.000Z",
    issuedAt: "2026-09-01T13:00:00.000Z",
    surgeryId: "surgery-real",
    metadata: null,
    items: [{ description: "Backend emitted line" }],
  },
] as InvoiceApiRow[]

describe("FacturacionPage backend authority", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchSurgeries.mockResolvedValue([{ id: "CX-1", backendId: "surgery-real", patient: "Paciente backend" }])
    mocks.useInvoices.mockReturnValue({
      companyId: "company-real",
      invoices: backendInvoices,
      loading: false,
      error: null,
      mutatingId: null,
      emit: mocks.emit.mockResolvedValue(undefined),
      create: mocks.createInvoice.mockResolvedValue(undefined),
      refresh: mocks.refreshInvoices.mockResolvedValue(undefined),
    })
    mocks.usePayments.mockReturnValue({ error: null, mutatingId: null, create: mocks.createPayment.mockResolvedValue(undefined) })
  })

  it("renders and mutates backend rows without reading mock financial rows", async () => {
    render(<FacturacionPage />)

    expect(screen.getByText("Backend draft line")).toBeInTheDocument()
    expect(screen.getByText("Backend emitted line")).toBeInTheDocument()
    expect(screen.queryByText(/MOCK-FV|Mock financial row/)).not.toBeInTheDocument()
    expect(mocks.useStore).not.toHaveBeenCalled()
    await waitFor(() => expect(mocks.fetchSurgeries).toHaveBeenCalledWith("company-real"))

    fireEvent.click(screen.getByRole("button", { name: "Ver Cirugía surgery-real" }))
    expect(mocks.openExpediente).toHaveBeenCalledWith("surgery-real")

    fireEvent.click(screen.getByRole("button", { name: "Emitir" }))
    expect(mocks.emit).toHaveBeenCalledWith("draft-real")

    fireEvent.click(screen.getByRole("button", { name: "Cobrar" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cobro backend" }))

    await waitFor(() => expect(mocks.createPayment).toHaveBeenCalledWith({ invoiceId: "invoice-real", amount: "25" }))
    expect(mocks.refreshInvoices).toHaveBeenCalledTimes(1)
  })
})

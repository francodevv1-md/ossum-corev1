import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ useInvoices: vi.fn(), usePayments: vi.fn(), fetchSurgeries: vi.fn(), fiscalEvidenceDialog: vi.fn() }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/ventas/facturacion",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/hooks/useInvoices", () => ({ useInvoices: mocks.useInvoices }))
vi.mock("@/hooks/usePayments", () => ({ usePayments: mocks.usePayments }))
vi.mock("@/lib/api/backend-surgeries", () => ({ fetchBackendActiveSurgeries: mocks.fetchSurgeries }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-real" }, currentAccess: { role: "admin" } }) }))
vi.mock("@/lib/permissions/financial-document-email", () => ({ canSendFinancialDocumentEmail: () => false }))
vi.mock("@/components/layout/app-shell", () => ({ useExpedienteDrawer: () => ({ openExpediente: vi.fn() }) }))
vi.mock("@/components/email/SendExistingFinancialDocumentDialog", () => ({ SendExistingFinancialDocumentDialog: () => null }))
vi.mock("@/components/shared", () => ({
  StatsCard: ({ title }: { title: string }) => <div>{title}</div>,
  StateBadge: ({ status }: { status: string }) => <span>{status}</span>,
  SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => <input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />,
  SurgeryDrawer: () => null,
}))
vi.mock("@/components/cobros/CobroFormDialog", () => ({ CobroFormDialog: () => null }))
vi.mock("@/components/facturacion/FiscalEvidenceDialog", () => ({ FiscalEvidenceDialog: ({ invoiceId }: { invoiceId: string }) => { mocks.fiscalEvidenceDialog(invoiceId); return <div role="dialog">Fiscal evidence {invoiceId}</div> } }))

import FacturacionPage from "@/app/ventas/facturacion/page"

describe("FacturacionPage fiscal evidence", () => {
  let companyId = "company-real"

  beforeEach(() => {
    vi.clearAllMocks()
    companyId = "company-real"
    mocks.fetchSurgeries.mockResolvedValue([])
    mocks.useInvoices.mockImplementation(() => ({
      companyId,
      invoices: [{ id: "invoice-real", visibleNumber: 42, state: "Emitida", total: "80", paidTotal: "0", balance: "80", createdAt: "2026-09-01T12:00:00.000Z", issuedAt: "2026-09-01T13:00:00.000Z", surgeryId: null, metadata: null, items: [{ description: "Backend invoice" }] }],
      loading: false, error: null, mutatingId: null, emit: vi.fn(), create: vi.fn(), refresh: vi.fn(),
    }))
    mocks.usePayments.mockReturnValue({ error: null, mutatingId: null, create: vi.fn() })
  })

  it("uses the authoritative invoice id and clears the dialog on company switch", async () => {
    const page = render(<FacturacionPage />)
    await waitFor(() => expect(mocks.fetchSurgeries).toHaveBeenCalledWith("company-real"))
    fireEvent.click(screen.getByRole("button", { name: "Evidencia fiscal" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("invoice-real")

    companyId = "company-other"
    page.rerender(<FacturacionPage />)
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
})

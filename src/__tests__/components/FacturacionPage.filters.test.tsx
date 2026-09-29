import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useInvoices: vi.fn(),
  usePayments: vi.fn(),
  openExpediente: vi.fn(),
  refreshInvoices: vi.fn(),
  fetchSurgeries: vi.fn(),
  routerReplace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mocks.routerReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/ventas/facturacion",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: React.ComponentProps<"tr">) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/hooks/useInvoices", () => ({ useInvoices: mocks.useInvoices }))
vi.mock("@/hooks/usePayments", () => ({ usePayments: mocks.usePayments }))
vi.mock("@/lib/api/backend-surgeries", () => ({ fetchBackendActiveSurgeries: mocks.fetchSurgeries }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-real" }, currentAccess: { role: "admin" } }) }))
vi.mock("@/lib/permissions/financial-document-email", () => ({ canSendFinancialDocumentEmail: () => false }))
vi.mock("@/components/layout/app-shell", () => ({ useExpedienteDrawer: () => ({ openExpediente: mocks.openExpediente }) }))
vi.mock("@/components/email/SendExistingFinancialDocumentDialog", () => ({ SendExistingFinancialDocumentDialog: () => null }))
vi.mock("@/components/shared", () => ({
  StatsCard: ({ title, value }: { title: string; value: string | number }) => <div>{title}: {value}</div>,
  StateBadge: ({ status }: { status: string }) => <span>{status}</span>,
  SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => (
    <input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  SurgeryDrawer: () => null,
}))
vi.mock("@/components/cobros/CobroFormDialog", () => ({ CobroFormDialog: () => null }))
vi.mock("@/components/facturacion/FiscalEvidenceDialog", () => ({ FiscalEvidenceDialog: () => null }))

import FacturacionPage from "@/app/ventas/facturacion/page"
import type { InvoiceApiRow } from "@/lib/api/invoices"

const testInvoices: InvoiceApiRow[] = [
  {
    id: "inv-1",
    visibleNumber: 101,
    companyId: "company-real",
    surgeryId: "cx-100",
    presupuestoId: null,
    consumoId: null,
    base: "presupuesto",
    state: "Emitida",
    type: "Factura A",
    currency: "ARS",
    subtotal: "1000",
    discountTotal: "0",
    taxTotal: "210",
    total: "1210",
    paidTotal: "0",
    balance: "1210",
    issuedAt: "2026-09-10T10:00:00.000Z",
    cancelledAt: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    metadata: { clientName: "Hospital Italiano", fiscalState: "AUTHORIZED" },
    items: [{ id: "it-1", sku: "SKU-1", description: "Set prótesis cadera", quantity: "1", unit: "un", unitPrice: "1000", discount: "0", tax: "210", total: "1210", sourceType: null, sourceItemId: null, metadata: null, createdAt: "", updatedAt: "" }],
  },
  {
    id: "inv-2",
    visibleNumber: 102,
    companyId: "company-real",
    surgeryId: null,
    presupuestoId: null,
    consumoId: null,
    base: "manual",
    state: "Cobrada",
    type: "Factura B",
    currency: "ARS",
    subtotal: "500",
    discountTotal: "0",
    taxTotal: "105",
    total: "605",
    paidTotal: "605",
    balance: "0",
    issuedAt: "2026-09-15T12:00:00.000Z",
    cancelledAt: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-09-05T12:00:00.000Z",
    updatedAt: "2026-09-05T12:00:00.000Z",
    metadata: { clientName: "Sanatorio Güemes", fiscalState: "REJECTED" },
    items: [{ id: "it-2", sku: "SKU-2", description: "Tornillos de titanio", quantity: "2", unit: "un", unitPrice: "250", discount: "0", tax: "105", total: "605", sourceType: null, sourceItemId: null, metadata: null, createdAt: "", updatedAt: "" }],
  },
  {
    id: "inv-3",
    visibleNumber: null,
    companyId: "company-real",
    surgeryId: null,
    presupuestoId: null,
    consumoId: null,
    base: "consumo",
    state: "Borrador",
    type: "Factura A",
    currency: "ARS",
    subtotal: "2000",
    discountTotal: "0",
    taxTotal: "420",
    total: "2420",
    paidTotal: "0",
    balance: "2420",
    issuedAt: null,
    cancelledAt: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-09-20T15:00:00.000Z",
    updatedAt: "2026-09-20T15:00:00.000Z",
    metadata: { clientName: "Clínica Bazterrica" },
    items: [{ id: "it-3", sku: "SKU-3", description: "Insumos laparoscopía", quantity: "1", unit: "un", unitPrice: "2000", discount: "0", tax: "420", total: "2420", sourceType: null, sourceItemId: null, metadata: null, createdAt: "", updatedAt: "" }],
  },
]

describe("FacturacionPage primary filters and persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchSurgeries.mockResolvedValue([])
    mocks.useInvoices.mockReturnValue({
      companyId: "company-real",
      invoices: testInvoices,
      loading: false,
      error: null,
      mutatingId: null,
      emit: vi.fn(),
      create: vi.fn(),
      refresh: mocks.refreshInvoices,
    })
    mocks.usePayments.mockReturnValue({ error: null, mutatingId: null, create: vi.fn() })
  })

  it("filters by primary issued dates", async () => {
    render(<FacturacionPage />)

    expect(screen.getByText("Set prótesis cadera")).toBeInTheDocument()
    expect(screen.getByText("Tornillos de titanio")).toBeInTheDocument()

    const fromInput = screen.getByLabelText("Fecha emisión desde")
    const toInput = screen.getByLabelText("Fecha emisión hasta")

    // Filter from 2026-09-12 to 2026-09-16 (matches inv-2 with issuedAt 2026-09-15)
    fireEvent.change(fromInput, { target: { value: "2026-09-12" } })
    fireEvent.change(toInput, { target: { value: "2026-09-16" } })

    expect(screen.queryByText("Set prótesis cadera")).not.toBeInTheDocument()
    expect(screen.getByText("Tornillos de titanio")).toBeInTheDocument()
    expect(screen.queryByText("Insumos laparoscopía")).not.toBeInTheDocument()

    // Verifies router replace call with URL parameters
    expect(mocks.routerReplace).toHaveBeenCalledWith(
      expect.stringContaining("issuedFrom=2026-09-12&issuedTo=2026-09-16"),
      { scroll: false }
    )
  })

  it("filters by number or text with specific primary input", async () => {
    render(<FacturacionPage />)

    const searchInput = screen.getByLabelText("Buscar comprobante, concepto, referencia o cirugía…")
    fireEvent.change(searchInput, { target: { value: "101" } })

    expect(screen.getByText("Set prótesis cadera")).toBeInTheDocument()
    expect(screen.queryByText("Tornillos de titanio")).not.toBeInTheDocument()
    expect(screen.queryByText("Insumos laparoscopía")).not.toBeInTheDocument()

    expect(mocks.routerReplace).toHaveBeenCalledWith(
      expect.stringContaining("number=101"),
      { scroll: false }
    )
  })

  it("opens secondary popover and applies amount range filter", async () => {
    render(<FacturacionPage />)

    // Open "Más filtros" popover
    fireEvent.click(screen.getByRole("button", { name: /Más filtros/ }))
    expect(screen.getByText("Filtros secundarios")).toBeInTheDocument()

    // Set Total Min to 1000 and Max to 2000
    const minInput = screen.getAllByPlaceholderText("Mínimo")[0]
    const maxInput = screen.getAllByPlaceholderText("Máximo")[0]

    fireEvent.change(minInput, { target: { value: "1000" } })
    fireEvent.change(maxInput, { target: { value: "2000" } })

    // Only inv-1 (total 1210) should match
    expect(screen.getByText("Set prótesis cadera")).toBeInTheDocument()
    expect(screen.queryByText("Tornillos de titanio")).not.toBeInTheDocument()
    expect(screen.queryByText("Insumos laparoscopía")).not.toBeInTheDocument()

    // Should show active filter chip
    expect(screen.getByText(/Total: \$1000 - \$2000/)).toBeInTheDocument()
  })

  it("clears all filters and resets URL query", async () => {
    render(<FacturacionPage />)

    const searchInput = screen.getByLabelText("Buscar comprobante, concepto, referencia o cirugía…")
    fireEvent.change(searchInput, { target: { value: "laparoscopía" } })

    expect(screen.queryByText("Set prótesis cadera")).not.toBeInTheDocument()
    expect(screen.getByText("Insumos laparoscopía")).toBeInTheDocument()

    const clearButton = screen.getByRole("button", { name: "Limpiar filtros" })
    fireEvent.click(clearButton)

    expect(screen.getByText("Set prótesis cadera")).toBeInTheDocument()
    expect(screen.getByText("Tornillos de titanio")).toBeInTheDocument()
    expect(screen.getByText("Insumos laparoscopía")).toBeInTheDocument()
  })
})

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  useInvoices: vi.fn(),
  openExpediente: vi.fn(),
  searchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/ventas/documentos-ajuste",
  useSearchParams: () => mocks.searchParams(),
}))

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: React.ComponentProps<"tr">) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/hooks/useInvoices", () => ({ useInvoices: mocks.useInvoices }))
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ activeCompany: { id: "company-real" }, currentAccess: { role: "admin" } }),
}))
vi.mock("@/components/layout/app-shell", () => ({
  useExpedienteDrawer: () => ({ openExpediente: mocks.openExpediente }),
}))
vi.mock("@/components/shared", () => ({
  StatsCard: ({ title, value }: { title: string; value: string | number }) => (
    <div>{title}: {value}</div>
  ),
  StateBadge: ({ status }: { status: string }) => <span>{status}</span>,
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string
    onChange: (value: string) => void
    placeholder: string
  }) => (
    <input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  SurgeryDrawer: () => null,
}))

import { DocumentosAjusteWorkspace } from "@/components/documentos-ajuste/DocumentosAjusteWorkspace"
import { NuevoAjustePaso1Modal } from "@/components/documentos-ajuste/NuevoAjustePaso1Modal"
import {
  AdjustmentWorkspace,
  computeLineTotalsFromGross,
} from "@/components/documentos-ajuste/AdjustmentWorkspace"
import { InvoiceDetailDrawer } from "@/components/facturacion/InvoiceDetailDrawer"
import type { InvoiceApiRow } from "@/lib/api/invoices"

const testInvoices: InvoiceApiRow[] = [
  {
    id: "inv-emitted",
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
    metadata: { clientName: "Hospital Italiano" },
    items: [
      {
        id: "it-1",
        sku: "SKU-1",
        description: "Set prótesis cadera",
        quantity: 1,
        unit: "un",
        unitPrice: "1000",
        discount: "0",
        tax: "210",
        total: "1210",
        sourceType: null,
        sourceItemId: null,
        metadata: null,
        createdAt: "",
        updatedAt: "",
      },
    ],
  },
  {
    id: "inv-draft",
    visibleNumber: null,
    companyId: "company-real",
    surgeryId: null,
    presupuestoId: null,
    consumoId: null,
    base: "manual",
    state: "Borrador",
    type: "Factura B",
    currency: "ARS",
    subtotal: "500",
    discountTotal: "0",
    taxTotal: "105",
    total: "605",
    paidTotal: "0",
    balance: "605",
    issuedAt: null,
    cancelledAt: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-09-05T12:00:00.000Z",
    updatedAt: "2026-09-05T12:00:00.000Z",
    metadata: { clientName: "Borrador Ineligible" },
    items: [
      {
        id: "it-2",
        sku: "SKU-2",
        description: "Tornillos de titanio",
        quantity: 2,
        unit: "un",
        unitPrice: "250",
        discount: "0",
        tax: "105",
        total: "605",
        sourceType: null,
        sourceItemId: null,
        metadata: null,
        createdAt: "",
        updatedAt: "",
      },
    ],
  },
]

describe("Documentos de ajuste Experience & Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useInvoices.mockReturnValue({
      invoices: testInvoices,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    })
  })

  it("renders Documentos de ajuste workspace with KPIs, tabs, and columns", () => {
    render(<DocumentosAjusteWorkspace />)

    expect(screen.getByText("Documentos de ajuste")).toBeInTheDocument()
    expect(
      screen.getByText("Notas de crédito y débito vinculadas a comprobantes emitidos.")
    ).toBeInTheDocument()

    // KPIs
    expect(screen.getByText(/Notas de Crédito \(Disminución\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Notas de Débito \(Incremento\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Ajuste Neto/i)).toBeInTheDocument()

    // Tabs
    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Notas de crédito" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Notas de débito" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Borrador" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Emitidas" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Anuladas" })).toBeInTheDocument()
  })

  it("enforces emitted invoice origin invariant: blocks drafts and allows emitted in Step 1", () => {
    render(<NuevoAjustePaso1Modal open={true} onOpenChange={vi.fn()} />)

    // Button to continue is initially disabled
    const continueBtn = screen.getByRole("button", { name: /Continuar a edición de ajuste/i })
    expect(continueBtn).toBeDisabled()

    // Try clicking on the draft invoice (ineligible)
    const draftRow = screen.getByText(/Borrador \(inv-dr\)/i)
    fireEvent.click(draftRow)
    expect(continueBtn).toBeDisabled()

    // Click on emitted invoice
    const emittedRow = screen.getByText(/FV 101/i)
    fireEvent.click(emittedRow)

    // Context is shown and continue button becomes enabled
    expect(screen.getByText("Contexto de Factura Seleccionada (Solo lectura)")).toBeInTheDocument()
    expect(continueBtn).not.toBeDisabled()

    // Clicking continue navigates to dedicated page
    fireEvent.click(continueBtn)
    expect(mocks.push).toHaveBeenCalledWith(
      "/ventas/documentos-ajuste/nueva/editor?tipo=credito&facturaOrigen=inv-emitted"
    )
  })

  it("integrates with InvoiceDetailDrawer: shows Documentos de ajuste section and actions", () => {
    render(
      <InvoiceDetailDrawer
        invoice={testInvoices[0]}
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Documentos de ajuste/i)).toBeInTheDocument()
    const createButtons = screen.getAllByRole("button", { name: /Crear Ajuste/i })
    expect(createButtons.length).toBeGreaterThan(0)

    // Clicking Crear Ajuste navigates to dedicated screen
    fireEvent.click(createButtons[0])
    expect(mocks.push).toHaveBeenCalledWith(
      "/ventas/documentos-ajuste/nueva/editor?tipo=credito&facturaOrigen=inv-emitted"
    )
  })

  it("renders AdjustmentWorkspace with origin invoice snapshot, editable descriptions, and sticky financial calculations", () => {
    // Mock search params with facturaOrigen=inv-emitted
    mocks.searchParams.mockReturnValue(
      new URLSearchParams("tipo=credito&facturaOrigen=inv-emitted")
    )

    render(<AdjustmentWorkspace />)

    // Snapshot of origin invoice
    expect(screen.getByText(/FV 0001-00000101/i)).toBeInTheDocument()
    expect(screen.getByText(/Hospital Italiano/i)).toBeInTheDocument()
    expect(screen.getByText(/cx-100/i)).toBeInTheDocument()

    // Table item preloaded from invoice
    const descInput = screen.getByDisplayValue("Set prótesis cadera")
    expect(descInput).toBeInTheDocument()

    // Editing description does not mutate original description reference
    fireEvent.change(descInput, { target: { value: "Ajuste por devolución parcial prótesis" } })
    expect(screen.getByDisplayValue("Ajuste por devolución parcial prótesis")).toBeInTheDocument()
    expect(screen.getByText(/Orig: Set prótesis cadera/i)).toBeInTheDocument()

    // Sticky financial summary
    expect(screen.getByText("Impacto Financiero Proyectado")).toBeInTheDocument()
    expect(screen.getByText("Disponible para Acreditar:")).toBeInTheDocument()
  })

  it("supports manual adjustment lines for debit notes and external origins", () => {
    mocks.searchParams.mockReturnValue(
      new URLSearchParams(
        "tipo=debito&origen=externo&extDocType=FACTURA%20A&extPtoVta=2&extNumber=456&extClientName=Sanatorio%20Norte"
      )
    )

    render(<AdjustmentWorkspace />)

    // External snapshot
    expect(screen.getByText(/FACTURA A 0002-00000456/i)).toBeInTheDocument()
    expect(screen.getByText(/Sanatorio Norte/i)).toBeInTheDocument()

    // Manual line button
    const addManualBtn = screen.getByRole("button", { name: /\+ Línea de Ajuste/i })
    expect(addManualBtn).toBeInTheDocument()
    fireEvent.click(addManualBtn)

    expect(screen.getByText(/2 líneas de ajuste/i)).toBeInTheDocument()
  })

  it("calculates net and vat correctly from gross unit price with IVA included", () => {
    // Caso 1: Precio final 121 con IVA 21% -> neto 100, IVA 21, total 121
    const res1 = computeLineTotalsFromGross(1, 121, 21)
    expect(res1.grossUnitPrice).toBe(121)
    expect(Math.round(res1.netUnitPrice)).toBe(100)
    expect(Math.round(res1.tax)).toBe(21)
    expect(res1.total).toBe(121)

    // Caso 2: Cantidad 2, precio final 60.50 con IVA 21% -> total 121, subtotal 100, tax 21
    const res2 = computeLineTotalsFromGross(2, 60.5, 21)
    expect(res2.total).toBe(121)
    expect(Math.round(res2.subtotal)).toBe(100)
    expect(Math.round(res2.tax)).toBe(21)

    // Caso 3: IVA 0% -> neto = final
    const res3 = computeLineTotalsFromGross(3, 50, 0)
    expect(res3.netUnitPrice).toBe(50)
    expect(res3.tax).toBe(0)
    expect(res3.total).toBe(150)

    // Caso 4: Exento (-1) -> neto = final
    const res4 = computeLineTotalsFromGross(1, 200, -1)
    expect(res4.netUnitPrice).toBe(200)
    expect(res4.tax).toBe(0)
    expect(res4.total).toBe(200)
  })

  it("displays P. FINAL (IVA INC.) column and provides process feedback on saving draft", async () => {
    mocks.searchParams.mockReturnValue(
      new URLSearchParams("tipo=credito&facturaOrigen=inv-emitted")
    )

    render(<AdjustmentWorkspace />)

    // Verify gross price column header
    expect(screen.getByText(/P\. FINAL \(IVA INC\.\)/i)).toBeInTheDocument()

    // Save draft button (present in header and fixed footer)
    const saveDraftBtns = screen.getAllByRole("button", { name: /Guardar borrador/i })
    expect(saveDraftBtns.length).toBeGreaterThanOrEqual(1)
    expect(saveDraftBtns[0]).not.toBeDisabled()

    // Clicking save draft triggers feedback and disables buttons to prevent double submit
    fireEvent.click(saveDraftBtns[0])
    expect(saveDraftBtns[0]).toBeDisabled()
  })
})

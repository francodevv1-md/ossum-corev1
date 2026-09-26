import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useInvoices: vi.fn(),
  fiscalEvidenceDialog: vi.fn(),
}))

vi.mock("@/hooks/useInvoices", () => ({ useInvoices: mocks.useInvoices }))
vi.mock("@/components/facturacion/FiscalEvidenceDialog", () => ({
  FiscalEvidenceDialog: (props: { companyId: string; invoiceId: string }) => {
    mocks.fiscalEvidenceDialog(props)
    return <div role="dialog">Fiscal evidence {props.invoiceId}</div>
  },
}))

import { ComprobantesAsociados } from "@/components/expediente/ComprobantesAsociados"
import type { Comprobante, Surgery } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

const surgery = { id: "legacy-surgery-id", backendId: "surgery-api-id" } as Surgery
const comprobantes = [{
  id: "legacy-comprobante-id",
  type: "FV",
  number: "LEG-100",
  date: "2026-09-25",
  client: "Legacy client",
  concept: "Legacy invoice",
  amount: 100,
  toCollect: 100,
  state: "Emitida",
}] as Comprobante[]
const resumenCobranza = { facturas: [], saldoPendiente: 100, totalCobrado: 0 } as ResumenCobranzaSurgery

describe("ComprobantesAsociados fiscal evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useInvoices.mockReturnValue({
      companyId: "company-active",
      loading: false,
      invoices: [
        { id: "invoice-api-id", companyId: "company-active", surgeryId: "surgery-api-id", visibleNumber: 77 },
        { id: "invoice-other-company", companyId: "company-other", surgeryId: "surgery-api-id", visibleNumber: 88 },
        { id: "invoice-other-surgery", companyId: "company-active", surgeryId: "other-surgery", visibleNumber: 99 },
      ],
    })
  })

  it("uses active-company surgery invoices and passes only InvoiceApiRow.id to fiscal evidence", () => {
    render(<ComprobantesAsociados surgery={surgery} comprobantes={comprobantes} resumenCobranza={resumenCobranza} presupuestos={[]} />)

    expect(mocks.useInvoices).toHaveBeenCalledWith({ surgeryId: "surgery-api-id" })
    expect(screen.getByText("LEG-100")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Evidencia fiscal · Factura 77" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Evidencia fiscal · Factura 88" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Evidencia fiscal · Factura 99" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Evidencia fiscal · Factura 77" }))

    expect(mocks.fiscalEvidenceDialog).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-active",
      invoiceId: "invoice-api-id",
    }))
    expect(mocks.fiscalEvidenceDialog).not.toHaveBeenCalledWith(expect.objectContaining({ invoiceId: "legacy-comprobante-id" }))
  })

  it("keeps legacy rows usable without a fiscal action while authoritative invoices load", () => {
    mocks.useInvoices.mockReturnValue({ companyId: "company-active", loading: true, invoices: [] })

    render(<ComprobantesAsociados surgery={surgery} comprobantes={comprobantes} resumenCobranza={resumenCobranza} presupuestos={[]} />)

    expect(screen.getByText("LEG-100")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Evidencia fiscal/ })).not.toBeInTheDocument()
  })

  it("keeps legacy rows usable when the authoritative invoice query fails", () => {
    mocks.useInvoices.mockReturnValue({ companyId: "company-active", loading: false, error: "Backend unavailable", invoices: [] })

    render(<ComprobantesAsociados surgery={surgery} comprobantes={comprobantes} resumenCobranza={resumenCobranza} presupuestos={[]} />)

    expect(screen.getByText("LEG-100")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Evidencia fiscal/ })).not.toBeInTheDocument()
  })
})

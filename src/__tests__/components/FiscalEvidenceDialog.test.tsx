import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>()
  return { ...actual, apiFetch: mocks.apiFetch }
})

import { FiscalEvidenceDialog } from "@/components/facturacion/FiscalEvidenceDialog"
import { ApiClientError } from "@/lib/api/client"

const evidence = {
  document: { state: "UNKNOWN", displayState: "SIMULATED", createdAt: "2026-09-24T12:00:00.000Z", submittedAt: "2026-09-24T12:01:00.000Z", authorizedAt: null },
  attempts: [{ id: "attempt-1", attemptNumber: 1, state: "UNKNOWN", displayState: "SIMULATED", errorCode: "tusfacturas_missing_cae", createdAt: "2026-09-24T12:00:00.000Z", updatedAt: "2026-09-24T12:01:00.000Z", evidence: { issuance: { response: { comprobante_tipo: "FACTURA B", comprobante_nro: "00004-00000012", comprobante_pdf_url: "https://temporary.example/pdf" } } } }],
}

describe("FiscalEvidenceDialog", () => {
  it("renders server display state, DEV disclaimer, provider document, PDF, and attempt history", async () => {
    mocks.apiFetch.mockResolvedValueOnce(evidence)
    render(<FiscalEvidenceDialog companyId="company/1" invoiceId="invoice/1" invoiceLabel="FV 42" open onOpenChange={() => {}} />)

    expect(await screen.findAllByText("SIMULATED")).toHaveLength(2)
    expect(screen.getByText("Comprobante de prueba — no autorizado por ARCA")).toBeInTheDocument()
    expect(screen.getByText("FACTURA B")).toBeInTheDocument()
    expect(screen.getByText("00004-00000012")).toBeInTheDocument()
    const pdfLink = screen.getByRole("link", { name: "Abrir PDF DEV (se abre en una nueva pestaña)" })
    expect(pdfLink).toHaveAttribute("href", "https://temporary.example/pdf")
    expect(pdfLink).toHaveAttribute("target", "_blank")
    expect(pdfLink).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.getByText("Error: tusfacturas_missing_cae")).toBeInTheDocument()
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company%2F1/invoices/invoice%2F1/fiscal-evidence")
  })

  it("renders the no-evidence and API-error states accessibly", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new ApiClientError("Not found", 404, "fiscal_evidence_not_found"))
    const { rerender } = render(<FiscalEvidenceDialog companyId="company-1" invoiceId="invoice-1" invoiceLabel="FV 1" open onOpenChange={() => {}} />)
    expect(await screen.findByText("Esta factura no tiene evidencia fiscal registrada.")).toBeInTheDocument()

    mocks.apiFetch.mockRejectedValueOnce(new Error("Sin conexión"))
    rerender(<FiscalEvidenceDialog companyId="company-1" invoiceId="invoice-2" invoiceLabel="FV 2" open onOpenChange={() => {}} />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión")
  })

  it("does not render a DEV PDF affordance when the server omits its URL", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      ...evidence,
      attempts: [{ ...evidence.attempts[0], evidence: { issuance: { response: { comprobante_tipo: "FACTURA B", comprobante_nro: "00004-00000012" } } } }],
    })
    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="invoice-3" invoiceLabel="FV 3" open onOpenChange={() => {}} />)

    await screen.findByText("00004-00000012")
    expect(screen.queryByRole("link", { name: /Abrir PDF DEV/ })).not.toBeInTheDocument()
  })

  it("renders AUTHORIZED verbatim without the DEV disclaimer", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      ...evidence,
      document: { ...evidence.document, state: "AUTHORIZED", displayState: "AUTHORIZED" },
      attempts: [{ ...evidence.attempts[0], state: "AUTHORIZED", displayState: "AUTHORIZED", errorCode: null }],
    })
    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="invoice-authorized" invoiceLabel="FV 4" open onOpenChange={() => {}} />)

    expect(await screen.findAllByText("AUTHORIZED")).toHaveLength(2)
    expect(screen.queryByText("Comprobante de prueba — no autorizado por ARCA")).not.toBeInTheDocument()
  })

  it("renders rejected errors and empty attempts without provider artifacts", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      document: { state: "REJECTED", displayState: "REJECTED", createdAt: "2026-09-24T12:00:00.000Z", submittedAt: null, authorizedAt: null },
      attempts: [],
    })
    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="invoice-empty" invoiceLabel="FV 5" open onOpenChange={() => {}} />)

    expect(await screen.findByText("REJECTED")).toBeInTheDocument()
    expect(screen.getByText("No hay intentos registrados.")).toBeInTheDocument()
    expect(screen.getByText("Sin intentos registrados")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Abrir PDF DEV/ })).not.toBeInTheDocument()
    expect(screen.queryByText("FACTURA B")).not.toBeInTheDocument()
  })

  it("renders a rejected attempt error code", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      ...evidence,
      document: { ...evidence.document, state: "REJECTED", displayState: "REJECTED" },
      attempts: [{ ...evidence.attempts[0], state: "REJECTED", displayState: "REJECTED", errorCode: "provider_rejected" }],
    })
    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="invoice-rejected" invoiceLabel="FV 6" open onOpenChange={() => {}} />)

    expect(await screen.findByText("Error: provider_rejected")).toBeInTheDocument()
  })
})

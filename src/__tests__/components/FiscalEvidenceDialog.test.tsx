import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: mocks.apiFetch,
}))

import { ApiClientError } from "@/lib/api/client"
import { FiscalEvidenceDialog } from "@/components/facturacion/FiscalEvidenceDialog"

describe("FiscalEvidenceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. shows emit button, locks button on click, displays progress indicator and prevents double click", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new ApiClientError("No evidence found", 404, "fiscal_evidence_not_found"))

    let resolveIssue: (value: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolveIssue = resolve
    })
    mocks.apiFetch.mockReturnValueOnce(pendingPromise)

    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="inv-1" invoiceLabel="FV 42" open onOpenChange={() => {}} />)

    const emitButton = await screen.findByRole("button", { name: /Emitir comprobante en DEV/i })
    expect(emitButton).toBeInTheDocument()

    // First click
    fireEvent.click(emitButton)

    // Button should be disabled during submit
    expect(emitButton).toBeDisabled()
    expect(screen.getByRole("status")).toBeInTheDocument()

    // Second click while in-flight
    fireEvent.click(emitButton)

    // Only one POST call initiated
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2) // 1 initial GET + 1 POST
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company-1/invoices/inv-1/fiscal-issue", { method: "POST" })

    // Resolve request
    resolveIssue!({
      document: { state: "AUTHORIZED", displayState: "AUTHORIZED", createdAt: "2026-09-28T12:00:00.000Z", submittedAt: null, authorizedAt: "2026-09-28T12:05:00.000Z" },
      attempts: [
        {
          id: "attempt-1",
          attemptNumber: 1,
          state: "AUTHORIZED",
          displayState: "AUTHORIZED",
          errorCode: null,
          createdAt: "2026-09-28T12:00:00.000Z",
          updatedAt: "2026-09-28T12:05:00.000Z",
          evidence: { issuance: { response: { cae: "74392019482910", comprobante_tipo: "FACTURA A", comprobante_nro: "00001-00000042", comprobante_pdf_url: "https://example.com/pdf/42.pdf" } } },
        },
      ],
    })

    await waitFor(() => {
      expect(screen.getByText("Comprobante autorizado")).toBeInTheDocument()
    })
  })

  it("2. renders AUTHORIZED evidence with real CAE, authorization time, and PDF link", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      document: {
        state: "AUTHORIZED",
        displayState: "AUTHORIZED",
        createdAt: "2026-09-28T12:00:00.000Z",
        submittedAt: null,
        authorizedAt: "2026-09-28T12:05:00.000Z",
      },
      attempts: [
        {
          id: "attempt-1",
          attemptNumber: 1,
          state: "AUTHORIZED",
          displayState: "AUTHORIZED",
          errorCode: null,
          createdAt: "2026-09-28T12:00:00.000Z",
          updatedAt: "2026-09-28T12:05:00.000Z",
          evidence: {
            issuance: {
              response: {
                cae: "74392019482910",
                vencimiento_cae: "08/10/2026",
                comprobante_tipo: "FACTURA A",
                comprobante_nro: "00001-00000042",
                comprobante_pdf_url: "https://tusfacturas.app/pdf/42.pdf",
              },
            },
          },
        },
      ],
    })

    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="inv-1" invoiceLabel="FA 42" open onOpenChange={() => {}} />)

    expect(await screen.findByText("Comprobante autorizado")).toBeInTheDocument()
    expect(screen.getByText("74392019482910")).toBeInTheDocument()
    expect(screen.getByText("08/10/2026")).toBeInTheDocument()
    expect(screen.getByText("00001-00000042")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Abrir PDF DEV/i })).toHaveAttribute("href", "https://tusfacturas.app/pdf/42.pdf")
    expect(screen.queryByRole("button", { name: /Emitir comprobante en DEV/i })).not.toBeInTheDocument()
  })

  it("3. renders SIMULATED evidence explicitly identifying sandbox test without CAE", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      document: {
        state: "UNKNOWN",
        displayState: "SIMULATED",
        createdAt: "2026-09-24T12:00:00.000Z",
        submittedAt: null,
        authorizedAt: null,
      },
      attempts: [
        {
          id: "attempt-1",
          attemptNumber: 1,
          state: "UNKNOWN",
          displayState: "SIMULATED",
          errorCode: null,
          createdAt: "2026-09-24T12:00:00.000Z",
          updatedAt: "2026-09-24T12:01:00.000Z",
          evidence: {
            issuance: {
              response: {
                comprobante_tipo: "FACTURA B",
                comprobante_nro: "00004-00000012",
                comprobante_pdf_url: "https://temporary.example/pdf",
              },
            },
          },
        },
      ],
    })

    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="inv-1" invoiceLabel="FV 42" open onOpenChange={() => {}} />)

    expect(await screen.findByText("Simulación DEV completada — sin CAE fiscal")).toBeInTheDocument()
    expect(screen.getByText("00004-00000012")).toBeInTheDocument()
    expect(screen.queryByText(/CAE autorizado/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Emitir comprobante en DEV/i })).not.toBeInTheDocument()
  })

  it("4. renders REJECTED state with safe error code/message and provides Reconciliar action without blind emit", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      document: {
        state: "REJECTED",
        displayState: "REJECTED",
        lastErrorCode: "TFC_1042",
        lastErrorMessage: "CUIT inválido para el tipo de comprobante seleccionado",
        createdAt: "2026-09-28T12:00:00.000Z",
        submittedAt: null,
        authorizedAt: null,
      },
      attempts: [
        {
          id: "attempt-1",
          attemptNumber: 1,
          state: "REJECTED",
          displayState: "REJECTED",
          errorCode: "TFC_1042",
          errorMessage: "CUIT inválido para el tipo de comprobante seleccionado",
          createdAt: "2026-09-28T12:00:00.000Z",
          updatedAt: "2026-09-28T12:00:30.000Z",
          evidence: {},
        },
      ],
    })

    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="inv-1" invoiceLabel="FA 99" open onOpenChange={() => {}} />)

    expect(await screen.findByText("Emisión rechazada")).toBeInTheDocument()
    expect(screen.getByText(/Código: TFC_1042/i)).toBeInTheDocument()
    expect(screen.getAllByText("CUIT inválido para el tipo de comprobante seleccionado").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole("button", { name: /Reconciliar estado/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Emitir comprobante en DEV/i })).not.toBeInTheDocument()
  })

  it("5. renders UNKNOWN/PENDING state with Reconciliar as primary action and hides Emitir", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      document: {
        state: "UNKNOWN",
        displayState: "UNKNOWN",
        createdAt: "2026-09-28T12:00:00.000Z",
        submittedAt: "2026-09-28T12:00:00.000Z",
        authorizedAt: null,
      },
      attempts: [
        {
          id: "attempt-1",
          attemptNumber: 1,
          state: "UNKNOWN",
          displayState: "UNKNOWN",
          errorCode: "TIMEOUT",
          errorMessage: "Timeout de red tras 15000ms al conectar con TusFacturas",
          createdAt: "2026-09-28T12:00:00.000Z",
          updatedAt: "2026-09-28T12:00:15.000Z",
          evidence: {},
        },
      ],
    })

    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="inv-1" invoiceLabel="FV 100" open onOpenChange={() => {}} />)

    expect(await screen.findByText("Estado pendiente de confirmación")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Reconciliar estado/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Emitir comprobante en DEV/i })).not.toBeInTheDocument()
  })

  it("6. shows actionable error banner when API returns fiscal_issuance_in_progress (409)", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new ApiClientError("No evidence found", 404, "fiscal_evidence_not_found"))
    mocks.apiFetch.mockRejectedValueOnce(new ApiClientError("Conflict", 409, "fiscal_issuance_in_progress"))

    render(<FiscalEvidenceDialog companyId="company-1" invoiceId="inv-1" invoiceLabel="FV 42" open onOpenChange={() => {}} />)

    const emitButton = await screen.findByRole("button", { name: /Emitir comprobante en DEV/i })
    fireEvent.click(emitButton)

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText(/Existe una emisión previa sin confirmación o en curso/i)).toBeInTheDocument()
    })
  })

  it("7. does not render credentials, secrets, or raw token payloads", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      document: {
        state: "UNKNOWN",
        displayState: "SIMULATED",
        createdAt: "2026-09-24T12:00:00.000Z",
        submittedAt: null,
        authorizedAt: null,
      },
      attempts: [
        {
          id: "attempt-1",
          attemptNumber: 1,
          state: "UNKNOWN",
          displayState: "SIMULATED",
          errorCode: null,
          createdAt: "2026-09-24T12:00:00.000Z",
          updatedAt: "2026-09-24T12:01:00.000Z",
          evidence: {
            issuance: {
              response: {
                comprobante_tipo: "FACTURA B",
                comprobante_nro: "00004-00000012",
              },
            },
          },
        },
      ],
    })

    const { container } = render(<FiscalEvidenceDialog companyId="company-1" invoiceId="inv-1" invoiceLabel="FV 42" open onOpenChange={() => {}} />)

    await screen.findByText("Simulación DEV completada — sin CAE fiscal")
    expect(container.textContent).not.toContain("apikey")
    expect(container.textContent).not.toContain("usertoken")
    expect(container.textContent).not.toContain("apitoken")
    expect(container.textContent).not.toContain("secret")
  })
})

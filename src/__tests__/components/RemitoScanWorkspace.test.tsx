import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ resolve: vi.fn() }))
vi.mock("@/lib/api/remito-scan", () => ({ resolveRemitoScan: mocks.resolve }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "user-1" }, activeCompany: { id: "company-1" } }) }))

import { ApiClientError } from "@/lib/api/client"
import { RemitoScanWorkspace } from "@/components/remitos/RemitoScanWorkspace"

const projection = { remitoShortCode: "RM1-0000-0000-0000-0000-0", documentType: "REMITO", state: "Emitido", issuedAt: "2026-08-12T00:00:00Z", items: [{ sku: null, description: "Prótesis", quantity: "1", unit: "u.", returnedQuantity: "0", lotNumber: "L1", serialNumber: null, expirationDate: null }], capabilities: { canDeliver: false, canReturn: false } }

describe("RemitoScanWorkspace", () => {
  beforeEach(() => { mocks.resolve.mockReset(); localStorage.clear(); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }) })

  it("resolves manual input and renders a read-only projection", async () => {
    mocks.resolve.mockResolvedValue(projection)
    render(<RemitoScanWorkspace />)
    fireEvent.change(screen.getByLabelText("Código del remito"), { target: { value: projection.remitoShortCode } })
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }))
    expect(screen.getByRole("status")).toHaveTextContent("Consultando")
    expect(await screen.findByText("Prótesis")).toBeVisible()
    expect(mocks.resolve).toHaveBeenCalledWith(projection.remitoShortCode, "company-1")
    expect(screen.queryByRole("button", { name: /entregar|devolver|pdf/i })).not.toBeInTheDocument()
  })

  it.each([
    ["invalid_remito_locator", "Código inválido"],
    ["remito_scan_unavailable", "Remito no disponible"],
    ["company_selection_required", "Seleccioná una empresa"],
  ])("announces and focuses %s", async (code, heading) => {
    mocks.resolve.mockRejectedValue(new ApiClientError("neutral", 404, code))
    render(<RemitoScanWorkspace initialLocator="bad" />)
    const alertHeading = await screen.findByText(heading)
    await waitFor(() => expect(alertHeading).toHaveFocus())
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible()
  })

  it("offers manual recovery when camera is unavailable", async () => {
    render(<RemitoScanWorkspace />)
    fireEvent.click(screen.getByRole("button", { name: "Abrir cámara" }))
    expect(await screen.findByText("Cámara no disponible")).toHaveFocus()
    expect(screen.getByLabelText("Código del remito")).toBeVisible()
  })

  it("shows only the user and company partitioned cached projection offline", async () => {
    localStorage.setItem(`ossum.remitoScan.v1:user-1:company-1:${projection.remitoShortCode}`, JSON.stringify(projection))
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false })
    mocks.resolve.mockRejectedValue(new TypeError("offline"))
    render(<RemitoScanWorkspace initialLocator={projection.remitoShortCode} />)
    expect(await screen.findByText("Lectura guardada · puede estar desactualizada")).toBeVisible()
    expect(screen.getByText("Prótesis")).toBeVisible()
  })
})

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), push: vi.fn(), redirect: vi.fn(), activeCompany: { id: "company-1" } }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), redirect: mocks.redirect }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: mocks.activeCompany }) }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => ({
  remitosProveedor: [{ id: "RP-1", proveedorId: "local-only", proveedorName: "Proveedor", number: "REM-10", date: "2026-08-25", state: "Pendiente", items: [{ name: "Placa", code: "PL-1", quantity: 3 }] }],
  proveedores: [{ id: "local-only", name: "Proveedor", active: true }],
}) }))

import RemitosProveedorPage from "@/app/compras/remitos-proveedor/page"
import RecepcionesPage from "@/app/recepciones/page"
import { findSupplierReceipt } from "@/app/compras/remitos-proveedor/receipt-flow"

const receipt = {
  id: "receipt-1", status: "DRAFT", documentReference: "REM-10", idempotencyKey: "supplier-remito:RP-1",
  scanEvents: [{ resolutionStatus: "PENDING" }],
  lines: [{ articleId: "article-1", requestedQuantity: "3", expectedQuantity: "3", receivedQuantity: "1", resolutionStatus: "RESOLVED" }],
}

describe("Supplier receipt flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, "", "/compras/remitos-proveedor?tab=recepciones")
  })

  it("keeps receipt inside Supplier Remittances and exposes explicit discrepancies", async () => {
    mocks.apiFetch.mockResolvedValueOnce([receipt])
    render(<RemitosProveedorPage />)

    expect(await screen.findByText("Cola de recepción física")).toBeVisible()
    expect(screen.getByText("Requiere atención")).toBeVisible()
    expect(screen.getByText("Esperado 3 · Recibido 1")).toBeVisible()
    expect(screen.getByText("Faltantes 2 · Excedentes 0")).toBeVisible()
    expect(screen.getByText("Incongruencias 1 · Artículos por identificar 0")).toBeVisible()
    expect(screen.queryByLabelText(/Archivo del remito/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Abrir recepción" }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/compras/remitos-proveedor/RP-1/recepcion"))
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1)
  })

  it("opens on loaded remittances and makes the user navigate internally to reception", async () => {
    window.history.replaceState({}, "", "/compras/remitos-proveedor")
    mocks.apiFetch.mockResolvedValueOnce([])
    render(<RemitosProveedorPage />)

    expect(screen.getByRole("tab", { name: "Remitos cargados" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("navigation", { name: "Proceso de ingreso" })).toHaveTextContent("1. Remito proveedor→2. Recepción física")
    expect(screen.queryByText(/Artículos/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Diferencias y confirmación/)).not.toBeInTheDocument()
    expect(screen.getByText("REM-10")).toBeVisible()
    expect(screen.queryByText("Cola de recepción física")).not.toBeInTheDocument()
  })

  it("translates denied receipt mutations without exposing the technical API message", async () => {
    const denied = Object.assign(new Error("Company mutation access denied"), { code: "company_mutation_access_denied" })
    mocks.apiFetch.mockRejectedValueOnce(denied)
    render(<RemitosProveedorPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent("No tenés permisos para modificar recepciones en esta empresa.")
    expect(screen.queryByText("Company mutation access denied")).not.toBeInTheDocument()
  })

  it("keeps the confirmed receipt state visible from the loaded-remittances view", async () => {
    window.history.replaceState({}, "", "/compras/remitos-proveedor")
    mocks.apiFetch.mockResolvedValueOnce([{ ...receipt, status: "CONFIRMED", scanEvents: [], lines: [{ ...receipt.lines[0], expectedQuantity: "3", receivedQuantity: "3" }] }])
    render(<RemitosProveedorPage />)

    expect(await screen.findByText("Confirmada")).toBeVisible()
  })

  it("creates once with the supplier-remittance idempotency key and no local supplier id", async () => {
    mocks.apiFetch.mockResolvedValueOnce([]).mockResolvedValueOnce({ ...receipt, lines: [], idempotencyKey: "supplier-remito:RP-1" })
    render(<RemitosProveedorPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar recepción" }))

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(2))
    const payload = JSON.parse(mocks.apiFetch.mock.calls[1][1].body)
    expect(payload).toEqual({
      documentReference: "REM-10",
      idempotencyKey: "supplier-remito:RP-1",
      expectedLines: [{ code: "PL-1", description: "Placa", expectedQuantity: "3" }],
    })
    expect(payload).not.toHaveProperty("supplierId")
  })

  it("redirects the legacy root receipt route to the internal queue", () => {
    RecepcionesPage()
    expect(mocks.redirect).toHaveBeenCalledWith("/compras/remitos-proveedor?tab=recepciones")
  })

  it("uses document reference fallback only for legacy receipts without an idempotency key", () => {
    const remito = { id: "RP-1", proveedorId: "p", proveedorName: "P", number: "REM-10", date: "2026-08-25", state: "Pendiente" as const, items: [] }
    expect(findSupplierReceipt([{ ...receipt, idempotencyKey: "another-flow" }], remito)).toBeUndefined()
    expect(findSupplierReceipt([{ ...receipt, idempotencyKey: null }], remito)?.id).toBe("receipt-1")
  })
})

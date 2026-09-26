import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  form: {
    activeCompany: { id: "company-1" }, phase: "results", result: null, isProcessing: false, error: null,
    proveedorId: "", proveedores: [], proveedorName: "", cuit: "", numero: "", fecha: "", fechaError: "Indicá la fecha del documento antes de guardar.", ordenCompraRef: "", tipoFactura: "", total: "", observaciones: "", items: [], linkedStockIds: {},
    setProveedorId: vi.fn(), setProveedorName: vi.fn(), setCuit: vi.fn(), setNumero: vi.fn(), setFecha: vi.fn(), setOrdenCompraRef: vi.fn(), setTipoFactura: vi.fn(), setTotal: vi.fn(), setObservaciones: vi.fn(), setItems: vi.fn(), updateItem: vi.fn(), linkItemToStock: vi.fn(), unlinkItem: vi.fn(), removeItem: vi.fn(), handleConfirm: vi.fn(), handleReset: vi.fn(), openCreateProveedor: vi.fn(), openCreateArticle: vi.fn(), setCreateArticleOpen: vi.fn(), setCreateProvOpen: vi.fn(), createArticleOpen: false, createProvOpen: false,
  },
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("next/link", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/hooks/useComprasOcrForm", () => ({ useComprasOcrForm: () => mocks.form }))
vi.mock("@/components/compras/CreateArticleModal", () => ({ CreateArticleModal: () => null }))
vi.mock("@/components/compras/CreateProveedorModal", () => ({ CreateProveedorModal: () => null }))

import { ReceiptOperationalWorkspace } from "@/components/compras/ReceiptOperationalWorkspace"
import { ComprasOcrWorkspace } from "@/components/compras/ComprasOcrWorkspace"

describe("supplier remittance closeout UI", () => {
  it("shows a manual compatible-remittance selector and posts only after explicit confirmation", async () => {
    let linked = false
    mocks.apiFetch.mockImplementation((url: string, options?: { method?: string }) => {
      if (url.includes("goods-receipts?catalog=1")) return Promise.resolve({ suppliers: [], deposits: [], articles: [] })
      if (url.endsWith("/goods-receipts")) return Promise.resolve([{ id: "receipt-free", status: "CONFIRMED", documentReference: "Libre", idempotencyKey: "free:1", supplierRemittanceId: linked ? "remittance-free" : undefined }])
      if (url.endsWith("/supplier-remittances")) return Promise.resolve([
        { id: "remittance-free", number: "RP-100", goodsReceipt: linked ? { id: "receipt-free", status: "CONFIRMED" } : null },
        { id: "remittance-linked", number: "RP-200", goodsReceipt: { id: "receipt-other", status: "CONFIRMED" } },
      ])
      if (url.includes("/supplier-remittance") && options?.method === "POST") { linked = true; return Promise.resolve({}) }
      return Promise.resolve({})
    })

    render(<ReceiptOperationalWorkspace companyId="company-1" />)
    const selector = await screen.findByLabelText("Remito proveedor para recepción receipt-free")
    expect(screen.getByRole("option", { name: "RP-100" })).toBeVisible()
    expect(screen.queryByRole("option", { name: "RP-200" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Vincular Remito" })).toBeDisabled()

    fireEvent.change(selector, { target: { value: "remittance-free" } })
    fireEvent.click(screen.getByRole("button", { name: "Vincular Remito" }))

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/companies/company-1/goods-receipts/receipt-free/supplier-remittance",
      { method: "POST", body: JSON.stringify({ supplierRemittanceId: "remittance-free" }) },
    ))
    expect(await screen.findByText("Remito RP-100")).toBeVisible()
    expect(screen.queryByLabelText("Remito proveedor para recepción receipt-free")).not.toBeInTheDocument()
  })

  it("renders the required-date error alongside the date input", () => {
    render(<ComprasOcrWorkspace tipo="remito-proveedor" backHref="/compras/remitos-proveedor" />)
    fireEvent.click(screen.getByRole("button", { name: /Carga manual/ }))
    const dateInput = screen.getByText("Fecha *").parentElement?.querySelector('input[type="date"]')
    expect(dateInput).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Indicá la fecha del documento antes de guardar.")).toBeVisible()
  })
})

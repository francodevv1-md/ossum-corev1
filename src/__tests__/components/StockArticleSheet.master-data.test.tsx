import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  updateArticleVatApi: vi.fn(),
  useAuth: vi.fn(() => ({
    activeCompany: { id: "comp-sa-01", name: "Districorr DEV" },
    currentUser: { id: "usr-01", role: "admin" },
  })),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: mocks.useAuth,
}))

vi.mock("@/lib/api/articles", () => ({
  updateArticleVatApi: mocks.updateArticleVatApi,
}))

import { TooltipProvider } from "@/components/ui/tooltip"
import { StockArticleSheet } from "@/components/stock/StockArticleSheet"
import type { StockItem } from "@/lib/stock/stock-ui-model"

const baseItem: StockItem = {
  id: "stock-001",
  articleId: "art-canonical-001",
  code: "PROT-ROD-01",
  name: "Prótesis de Rodilla Titanio",
  descriptionExtra: "Implante quirúrgico",
  family: "Rodilla",
  category: "Implantes",
  rubro: "Ortopedia",
  seccion: "Quirófano",
  linea: "Línea Alta Complejidad",
  brand: "Biomet",
  type: "Implante",
  unit: "u",
  unitBuy: "u",
  manufacturer: "Biomet Inc",
  gtin: "7791234567890",
  pm: "PM-1234-56",
  sterile: true,
  preferredSupplier: "Biomet Argentina",
  cost: 10000,
  price: 15000,
  available: 5,
  reserved: 1,
  inTransit: 0,
  min: 2,
  state: "Disponible",
  masterStatus: "Activo",
  control: "lote",
  articleType: "Implante",
  lots: [],
  movements: [],
  vatTreatment: "GRAVADO",
  vatRate: 21,
  iva: "21%",
}

const sparseItem: StockItem = {
  id: "stock-002",
  code: "SPARSE-001",
  name: "Artículo Sin Opcionales",
  descriptionExtra: "",
  family: "Insumos",
  category: "Insumos",
  rubro: "Ortopedia",
  seccion: "General",
  linea: "Básica",
  brand: "",
  type: "Insumo",
  unit: "u",
  unitBuy: "u",
  manufacturer: "",
  gtin: "",
  pm: "",
  sterile: false,
  preferredSupplier: "",
  cost: 0,
  price: 0,
  available: 0,
  reserved: 0,
  inTransit: 0,
  min: 0,
  state: "Pendiente",
  masterStatus: "Inactivo",
  control: "cantidad",
  articleType: "Insumo",
  lots: [],
  movements: [],
}

function renderSheet(item: StockItem, initialTab?: "general" | "compras" | "comercial") {
  return render(
    <TooltipProvider>
      <StockArticleSheet
        open={true}
        item={item}
        initialTab={initialTab}
        onOpenChange={() => {}}
        companyId="comp-sa-01"
      />
    </TooltipProvider>
  )
}

describe("StockArticleSheet - Master Data Honest UI (General, Compras, Comercial)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("General tab: displays master data as read-only and handles empty optional fields with '—'", () => {
    renderSheet(sparseItem, "general")

    const codeInput = screen.getByDisplayValue("SPARSE-001") as HTMLInputElement
    expect(codeInput.readOnly).toBe(true)

    const dashInputs = screen.getAllByDisplayValue("—")
    expect(dashInputs.length).toBeGreaterThanOrEqual(3)

    expect(screen.getByDisplayValue("Inactivo")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Cantidad")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Deshabilitado")).toBeInTheDocument()

    // Ensure no interactive switch or radiogroup exists in General tab
    expect(screen.queryByRole("radiogroup", { name: /método de trazabilidad/i })).not.toBeInTheDocument()
  })

  it("Compras tab: shows read-only purchase attributes and honest notice for multi-supplier management", () => {
    renderSheet(baseItem, "compras")

    expect(screen.getByDisplayValue("Biomet Argentina")).toBeInTheDocument()
    expect(
      screen.getByText(/No hay múltiples proveedores vinculados para este artículo en backend DEV/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("Comercial tab: keeps VAT editor editable for canonical articles while price/margin fields are read-only", async () => {
    mocks.updateArticleVatApi.mockResolvedValueOnce({
      id: "art-canonical-001",
      vatTreatment: "GRAVADO",
      vatRate: 10.5,
    })

    renderSheet(baseItem, "comercial")

    const vatSelect = screen.getByLabelText("Alícuota de IVA") as HTMLSelectElement
    expect(vatSelect.disabled).toBe(false)

    fireEvent.change(vatSelect, { target: { value: "10.5%" } })
    const saveVatButton = screen.getByRole("button", { name: /guardar iva/i })
    expect(saveVatButton).not.toBeDisabled()

    fireEvent.click(saveVatButton)

    await waitFor(() => {
      expect(mocks.updateArticleVatApi).toHaveBeenCalledWith(
        "comp-sa-01",
        "art-canonical-001",
        expect.objectContaining({ vatRate: 10.5 })
      )
    })

    const priceInput = screen.getByLabelText("Precio de venta de referencia") as HTMLInputElement
    expect(priceInput).toHaveValue(15000)

    // No unbacked calculation formula banners or fake demo save toast
    expect(screen.queryByText(/costo × \(1 \+ margen objetivo\)/i)).not.toBeInTheDocument()
  })

  it("Footer: provides honest 'Cerrar' button and does not contain fake demo save button", () => {
    renderSheet(baseItem, "general")

    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /guardar cambios/i })).not.toBeInTheDocument()
  })
})

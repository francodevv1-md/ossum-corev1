import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({
    activeCompany: { id: "comp-sa-01", name: "Districorr DEV" },
    currentUser: { id: "usr-01", role: "admin" },
  })),
  useArticleStockDetail: vi.fn(() => ({
    data: {
      summary: { physical: 10, reserved: 2, inTransit: 1, available: 7 },
      lots: [],
      movements: [],
    },
    loading: false,
    recordAdjustment: vi.fn(),
    refresh: vi.fn(),
  })),
  listBoxFormulasApi: vi.fn().mockResolvedValue([]),
  getBoxFormulaApi: vi.fn(),
  createBoxFormulaApi: vi.fn(),
  publishFormulaVersionApi: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: mocks.useAuth,
}))

vi.mock("@/hooks/useStock", () => ({
  useArticleStockDetail: mocks.useArticleStockDetail,
}))

vi.mock("@/lib/api/cajas-formulas", () => ({
  listBoxFormulasApi: mocks.listBoxFormulasApi,
  getBoxFormulaApi: mocks.getBoxFormulaApi,
  createBoxFormulaApi: mocks.createBoxFormulaApi,
  publishFormulaVersionApi: mocks.publishFormulaVersionApi,
}))

import { TooltipProvider } from "@/components/ui/tooltip"
import { StockArticleSheet, type FichaTab } from "@/components/stock/StockArticleSheet"
import type { StockItem } from "@/lib/stock/stock-ui-model"

const testItem: StockItem = {
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
  available: 7,
  reserved: 2,
  inTransit: 1,
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

function renderSheet(initialTab: FichaTab = "cajas") {
  return render(
    <TooltipProvider>
      <StockArticleSheet
        open
        onOpenChange={() => {}}
        initialTab={initialTab}
        item={testItem}
        companyId="comp-sa-01"
      />
    </TooltipProvider>
  )
}

describe("STOCK-ARTICLE-BOXES-HONEST-UI-DEV-001 — Honest Cajas Tab & No Fake Mock Box UI", () => {
  it("1. Cajas tab renders the backend-authoritative empty formula state without fake metrics", async () => {
    renderSheet("cajas")

    expect(await screen.findByText(/Sin composición de caja modelo registrada/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Este artículo puede definirse como una Caja Modelo/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Definir composición de caja/i })).toBeInTheDocument()

    expect(screen.queryByText(/Cantidad esperada/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cantidad actual/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/con faltantes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/BOX-/i)).not.toBeInTheDocument()
  })

  it("2. General tab does not render fake derived box banner or summary", () => {
    renderSheet("general")

    // General tab header is present
    expect(screen.getByText(/Datos principales/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue("PROT-ROD-01")).toBeInTheDocument()

    // Must NOT render fake box banner in General tab
    expect(screen.queryByText(/presente en .* cajas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ver relaciones →/i)).not.toBeInTheDocument()
  })

  it("3. Real backend tabs remain intact and accessible", async () => {
    renderSheet("stock")

    // Stock tab live data rendered
    expect(screen.getByText(/Estado y existencias de stock/i)).toBeInTheDocument()
    expect(screen.getByText(/Disponible real/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Ajustar inventario/i })).toBeInTheDocument()

    // Switch to Cajas tab
    const cajasTabButton = screen.getByRole("button", { name: /Cajas/i })
    fireEvent.click(cajasTabButton)

    expect(await screen.findByText(/Sin composición de caja modelo registrada/i)).toBeInTheDocument()
  })

  it("4. StockArticleSheet source code has zero imports or usages of articleBoxes / articleBoxSummary", () => {
    const filePath = path.resolve(__dirname, "../../components/stock/StockArticleSheet.tsx")
    const content = fs.readFileSync(filePath, "utf-8")

    expect(content).not.toContain("articleBoxes")
    expect(content).not.toContain("articleBoxSummary")
    expect(content).not.toContain("BoxFichaSheet")
  })
})

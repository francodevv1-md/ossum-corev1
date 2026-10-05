import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({
    activeCompany: { id: "comp-sa-01", name: "Districorr DEV" },
    currentUser: { id: "usr-01", role: "admin" },
  })),
  useArticleStockDetail: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: mocks.useAuth,
}))

vi.mock("@/hooks/useStock", () => ({
  useArticleStockDetail: mocks.useArticleStockDetail,
}))

import { TooltipProvider } from "@/components/ui/tooltip"
import { StockArticleSheet } from "@/components/stock/StockArticleSheet"
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
  movements: [
    // Mock movements that must NOT leak into HistorialTab
    {
      id: "mock-mov-1",
      date: "2020-01-01",
      type: "MOCK_ENTRADA",
      qty: 999,
      ref: "MOCK-REF-999",
      user: "Mock User",
    },
  ],
  createdBy: "Mock Creator",
  createdAt: "2020-01-01",
  vatTreatment: "GRAVADO",
  vatRate: 21,
  iva: "21%",
}

function renderSheet() {
  return render(
    <TooltipProvider>
      <StockArticleSheet
        open
        onOpenChange={() => {}}
        initialTab="historial"
        item={testItem}
        companyId="comp-sa-01"
      />
    </TooltipProvider>
  )
}

describe("STOCK-ARTICLE-HISTORY-HONEST-UI-DEV-001 — Honest Ledger History Tab", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. Historial con movimientos backend muestra evidencia real del ledger", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: {
        summary: { physical: 10, reserved: 2, inTransit: 1, available: 7 },
        lots: [],
        movements: [
          {
            id: "ledger-mov-001",
            date: "2026-09-28T14:30:00Z",
            type: "Ajuste de inventario",
            qty: 5,
            ref: "AJ-2026-001",
            user: "franco.admin",
          },
        ],
      },
      loading: false,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    // Real backend data rendered in both summary card and movements table
    expect(screen.getAllByText("franco.admin").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("AJ-2026-001").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Ajuste de inventario").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("+5")).toBeInTheDocument()

    // Must NOT show mock creator or mock movement
    expect(screen.queryByText("Mock Creator")).not.toBeInTheDocument()
    expect(screen.queryByText("Mock User")).not.toBeInTheDocument()
    expect(screen.queryByText("MOCK-REF-999")).not.toBeInTheDocument()
  })

  it("2. Historial sin liveDetail no muestra fallback mock y presenta estado honesto", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: null,
      loading: false,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    // Shows honest empty/unavailable state
    expect(screen.getByText(/Sin movimientos registrados/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Este artículo aún no registra movimientos auditados en el ledger backend/i)
    ).toBeInTheDocument()

    // Must NOT leak mock item values
    expect(screen.queryByText("Mock Creator")).not.toBeInTheDocument()
    expect(screen.queryByText("Mock User")).not.toBeInTheDocument()
    expect(screen.queryByText("MOCK-REF-999")).not.toBeInTheDocument()
  })

  it("3. Historial vacío (array de movimientos vacío) muestra estado honesto", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: {
        summary: { physical: 0, reserved: 0, inTransit: 0, available: 0 },
        lots: [],
        movements: [],
      },
      loading: false,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    expect(screen.getByText(/Sin movimientos registrados/i)).toBeInTheDocument()
    expect(screen.queryByText("Mock Creator")).not.toBeInTheDocument()
    expect(screen.queryByText("Mock User")).not.toBeInTheDocument()
  })

  it("4. Historial mientras carga muestra spinner de carga", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: null,
      loading: true,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    expect(screen.getByText(/Cargando historial del ledger.../i)).toBeInTheDocument()
  })

  it("5. Panel contextual sin detalle no usa métricas ni costos mock", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: null,
      loading: false,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    expect(screen.getByText("Resumen")).toBeInTheDocument()
    const availableLabel = screen.getAllByText("Disponible").find((element) => element.tagName === "DT")
    expect(availableLabel?.parentElement).toHaveTextContent("—")
    expect(screen.getByText("Costo de ref.").parentElement).toHaveTextContent("—")
    expect(screen.getByText("Proveedor pref.").parentElement).toHaveTextContent("—")
    expect(screen.queryByText("Biomet Argentina")).not.toBeInTheDocument()
  })

  it("6. StockArticleSheet source code no contiene lastMovement dentro de HistorialTab", () => {
    const filePath = path.resolve(__dirname, "../../components/stock/StockArticleSheet.tsx")
    const content = fs.readFileSync(filePath, "utf-8")

    const historialTabSection = content.substring(
      content.indexOf("function HistorialTab"),
      content.indexOf("function FichaTabContent")
    )

    expect(historialTabSection).not.toContain("lastMovement")
    expect(historialTabSection).not.toContain("item.createdBy")
    expect(historialTabSection).not.toContain("item.createdAt")
    expect(historialTabSection).not.toContain("item.state")
  })
})

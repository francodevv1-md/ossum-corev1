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
  lots: [
    {
      id: "mock-lot-1",
      deposit: "MOCK-DEP",
      location: "A-1",
      lot: "MOCK-LOT-999",
      serial: "SER-999",
      expiry: "2020-01-01",
      available: 999,
      status: "Disponible",
    },
  ],
  movements: [
    {
      id: "mock-mov-1",
      date: "2020-01-01",
      type: "MOCK_ENTRADA",
      qty: 999,
      ref: "MOCK-REF-999",
      user: "Mock User",
    },
  ],
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
        initialTab="trazabilidad"
        item={testItem}
        companyId="comp-sa-01"
      />
    </TooltipProvider>
  )
}

describe("STOCK-ARTICLE-TRACEABILITY-HONEST-UI-DEV-001 — Honest Traceability Tab", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. Movimiento backend real se muestra en TrazabilidadTab", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: {
        summary: { physical: 10, reserved: 2, inTransit: 1, available: 7 },
        lots: [
          {
            id: "lot-real-1",
            deposit: "Depósito Central",
            lot: "LOT-REAL-777",
            available: 7,
            status: "Disponible",
          },
        ],
        movements: [
          {
            id: "ledger-mov-001",
            date: "2026-09-30T10:00:00Z",
            type: "Ingreso por remito",
            qty: 7,
            ref: "REM-2026-888",
            user: "operador.deposito",
          },
        ],
      },
      loading: false,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    // Real movement and lot rendered
    expect(screen.getAllByText("operador.deposito").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("REM-2026-888").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/LOT-REAL-777/i)).toBeInTheDocument()
    expect(screen.getByText(/Último movimiento:/i)).toHaveTextContent("operador.deposito")

    // Must NOT show mock lot or mock movement
    expect(screen.queryByText("MOCK-LOT-999")).not.toBeInTheDocument()
    expect(screen.queryByText("Mock User")).not.toBeInTheDocument()
    expect(screen.queryByText("MOCK-REF-999")).not.toBeInTheDocument()
  })

  it("2. Sin liveDetail no se filtran valores mock de item.movements ni item.lots", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: null,
      loading: false,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    // Shows honest empty state for last movement and tables
    expect(screen.getByText("Último movimiento: —")).toBeInTheDocument()
    expect(screen.getByText("Sin movimientos registrados.")).toBeInTheDocument()
    expect(screen.getByText("Este artículo no registra existencias físicas.")).toBeInTheDocument()

    // Must NOT leak mock items
    expect(screen.queryByText("MOCK-LOT-999")).not.toBeInTheDocument()
    expect(screen.queryByText("Mock User")).not.toBeInTheDocument()
    expect(screen.queryByText("MOCK-REF-999")).not.toBeInTheDocument()
  })

  it("3. Carga muestra spinner y mensaje honesto", () => {
    mocks.useArticleStockDetail.mockReturnValue({
      data: null,
      loading: true,
      recordAdjustment: vi.fn(),
      refresh: vi.fn(),
    })

    renderSheet()

    expect(screen.getByText(/Cargando último movimiento.../i)).toBeInTheDocument()
  })

  it("4. TrazabilidadTab source code no contiene lastMovement", () => {
    const filePath = path.resolve(__dirname, "../../components/stock/StockArticleSheet.tsx")
    const content = fs.readFileSync(filePath, "utf-8")

    const trazabilidadTabSection = content.substring(
      content.indexOf("function TrazabilidadTab"),
      content.indexOf("function CajasTab")
    )

    expect(trazabilidadTabSection).not.toContain("lastMovement")
  })
})

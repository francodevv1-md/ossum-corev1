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
import { ArticleCodesDialog } from "@/components/stock/ArticleCodesDialog"
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

const noCodeItem: StockItem = {
  id: "stock-002",
  code: "",
  name: "Artículo Sin Códigos",
  descriptionExtra: "",
  family: "Rodilla",
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
  state: "Disponible",
  masterStatus: "Activo",
  control: "cantidad",
  articleType: "Insumo",
  lots: [],
  movements: [],
}

describe("StockArticleSheet - Actions & ArticleCodesDialog Honest UI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Header actions: no mock actions exist for 'Duplicar', 'Cambiar estado', or 'Dar de baja'", () => {
    render(
      <TooltipProvider>
        <StockArticleSheet
          open={true}
          item={baseItem}
          onOpenChange={() => {}}
          companyId="comp-sa-01"
        />
      </TooltipProvider>
    )

    // Ensure mock dropdown items and trigger do not exist
    expect(screen.queryByTitle("Más acciones")).not.toBeInTheDocument()
    expect(screen.queryByText("Duplicar")).not.toBeInTheDocument()
    expect(screen.queryByText("Cambiar estado")).not.toBeInTheDocument()
    expect(screen.queryByText("Dar de baja")).not.toBeInTheDocument()

    // Ensure legitimate controls are present
    expect(screen.getByRole("button", { name: /códigos/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument()
  })

  it("ArticleCodesDialog: displays existing master data in read-only format without fake save/generate controls", () => {
    render(
      <ArticleCodesDialog
        open={true}
        item={baseItem}
        onOpenChange={() => {}}
      />
    )

    expect(screen.getAllByText("PROT-ROD-01").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Code 128 · interno")).toBeInTheDocument()
    expect(screen.getByText("QR")).toBeInTheDocument()

    // No unbacked mutation buttons
    expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /generar nuevo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument()
  })

  it("ArticleCodesDialog: shows honest empty state when article has no code or GTIN", () => {
    render(
      <ArticleCodesDialog
        open={true}
        item={noCodeItem}
        onOpenChange={() => {}}
      />
    )

    expect(
      screen.getByText(/sin códigos maestros registrados para este artículo/i)
    ).toBeInTheDocument()
    expect(screen.queryByText("Code 128 · interno")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /imprimir etiqueta/i })).not.toBeInTheDocument()
  })
})

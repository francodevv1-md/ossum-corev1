import fs from "fs"
import path from "path"
import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({
    activeCompany: { id: "comp-sa-01", name: "Districorr DEV" },
    currentUser: { id: "usr-01", role: "admin" },
  })),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: mocks.useAuth,
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

describe("STOCK-ARTICLE-IMAGE-HONEST-UI-DEV-001 - Honest Visual Representation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render file inputs or image upload triggers", () => {
    const { container } = render(
      <TooltipProvider>
        <StockArticleSheet
          open={true}
          item={baseItem}
          onOpenChange={() => {}}
          companyId="comp-sa-01"
        />
      </TooltipProvider>
    )

    // No file input
    const fileInputs = container.querySelectorAll('input[type="file"]')
    expect(fileInputs.length).toBe(0)

    // No upload buttons or triggers
    expect(screen.queryByText(/cargar imagen/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/cambiar imagen/i)).not.toBeInTheDocument()
    expect(screen.queryByTitle(/cargar imagen del artículo/i)).not.toBeInTheDocument()
  })

  it("renders read-only family visual representation badge/icon", () => {
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

    // Visual thumb element with family title exists
    expect(screen.getByTitle("Rodilla")).toBeInTheDocument()
  })

  it("source code of StockArticleSheet.tsx does not contain ephemeral image state or createObjectURL", () => {
    const sheetPath = path.resolve(process.cwd(), "src/components/stock/StockArticleSheet.tsx")
    const source = fs.readFileSync(sheetPath, "utf8")

    expect(source).not.toContain("URL.createObjectURL")
    expect(source).not.toContain("const [image, setImage]")
    expect(source).not.toContain('accept="image/*"')
  })
})

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

const baseCanonicalItem: StockItem = {
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

const baseNonCanonicalItem: StockItem = {
  ...baseCanonicalItem,
  id: "stock-legacy-002",
  articleId: null, // No canonical article
}

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe("StockArticleSheet — Canonical VAT Persistence & Guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. updates VAT to 10.5% via PATCH when item has canonical articleId", async () => {
    mocks.updateArticleVatApi.mockResolvedValueOnce({
      id: "art-canonical-001",
      vatTreatment: "GRAVADO",
      vatRate: 10.5,
      ivaKey: "10.5",
    })

    const onItemUpdated = vi.fn()

    renderWithTooltip(
      <StockArticleSheet
        open
        onOpenChange={() => {}}
        initialTab="comercial"
        item={baseCanonicalItem}
        companyId="comp-sa-01"
        onItemUpdated={onItemUpdated}
      />
    )

    // Select should be active and have 21%
    const select = screen.getByRole("combobox", { name: /Alícuota de IVA/i })
    expect(select).not.toBeDisabled()
    expect(select).toHaveValue("21%")

    // "Guardar IVA" should be disabled initially (no changes)
    const saveBtn = screen.getByRole("button", { name: /Guardar IVA/i })
    expect(saveBtn).toBeDisabled()

    // Change value to 10.5%
    fireEvent.change(select, { target: { value: "10.5%" } })
    expect(select).toHaveValue("10.5%")
    expect(saveBtn).not.toBeDisabled()

    // Click Guardar IVA
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mocks.updateArticleVatApi).toHaveBeenCalledTimes(1)
      expect(mocks.updateArticleVatApi).toHaveBeenCalledWith("comp-sa-01", "art-canonical-001", {
        vatTreatment: "GRAVADO",
        vatRate: 10.5,
      })
    })

    // Shows success feedback
    expect(await screen.findByText(/✓ IVA guardado/i)).toBeInTheDocument()
    expect(saveBtn).toBeDisabled()
    expect(onItemUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        vatTreatment: "GRAVADO",
        vatRate: 10.5,
        iva: "10.5%",
      })
    )
  })

  it("2. displays alert error and does not update baseline when PATCH fails", async () => {
    mocks.updateArticleVatApi.mockRejectedValueOnce(
      new Error("Tasa de IVA inválida para la empresa")
    )

    renderWithTooltip(
      <StockArticleSheet
        open
        onOpenChange={() => {}}
        initialTab="comercial"
        item={baseCanonicalItem}
        companyId="comp-sa-01"
      />
    )

    const select = screen.getByRole("combobox", { name: /Alícuota de IVA/i })
    const saveBtn = screen.getByRole("button", { name: /Guardar IVA/i })

    fireEvent.change(select, { target: { value: "27%" } })
    fireEvent.click(saveBtn)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Tasa de IVA inválida para la empresa")
    expect(saveBtn).not.toBeDisabled() // User can retry or change
  })

  it("3. prevents double submit on rapid clicks", async () => {
    let resolvePatch: (val: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePatch = resolve
    })
    mocks.updateArticleVatApi.mockReturnValueOnce(pendingPromise)

    renderWithTooltip(
      <StockArticleSheet
        open
        onOpenChange={() => {}}
        initialTab="comercial"
        item={baseCanonicalItem}
        companyId="comp-sa-01"
      />
    )

    const select = screen.getByRole("combobox", { name: /Alícuota de IVA/i })
    const saveBtn = screen.getByRole("button", { name: /Guardar IVA/i })

    fireEvent.change(select, { target: { value: "exento" } })

    // Double click
    fireEvent.click(saveBtn)
    fireEvent.click(saveBtn)

    expect(mocks.updateArticleVatApi).toHaveBeenCalledTimes(1)
    expect(saveBtn).toBeDisabled()

    resolvePatch!({
      id: "art-canonical-001",
      vatTreatment: "EXENTO",
      vatRate: 0,
      ivaKey: "exento",
    })

    await waitFor(() => {
      expect(screen.getByText(/✓ IVA guardado/i)).toBeInTheDocument()
    })
  })

  it("4. disables editing and displays warning when item has NO canonical article", () => {
    renderWithTooltip(
      <StockArticleSheet
        open
        onOpenChange={() => {}}
        initialTab="comercial"
        item={baseNonCanonicalItem}
        companyId="comp-sa-01"
      />
    )

    // Should show badge/warning
    expect(screen.getAllByText(/Sin artículo canónico vinculado/i)[0]).toBeInTheDocument()

    // Select should be disabled
    const select = screen.getByRole("combobox", { name: /Alícuota de IVA/i })
    expect(select).toBeDisabled()

    // Guardar IVA button should not be present
    expect(screen.queryByRole("button", { name: /Guardar IVA/i })).not.toBeInTheDocument()

    // No API calls
    expect(mocks.updateArticleVatApi).not.toHaveBeenCalled()
  })
})

import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StockAvailabilityQuery } from "@/lib/validators/stock"
import type { ArticleStockAvailability } from "@/lib/services/stock-ledger.service"

const mocks = vi.hoisted(() => ({
  useStockMock: vi.fn(),
  activeCompany: { id: "company-test", name: "Empresa Test" },
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: mocks.activeCompany,
    isAuthenticated: true,
    isLoading: false,
    currentUserLoading: false,
  }),
}))

vi.mock("@/hooks/useStock", () => ({
  useStock: (query?: Partial<StockAvailabilityQuery>) => mocks.useStockMock(query),
  useArticleStockDetail: vi.fn(() => ({ data: null, loading: false })),
}))

vi.mock("@/lib/api/stock", () => ({
  useArticleStockDetail: vi.fn(() => ({ data: null, loading: false })),
}))

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}))

import StockPage from "@/app/stock/page"

const sampleArticle: ArticleStockAvailability = {
  id: "art-001",
  code: "TORN-3.5",
  name: "Tornillo Cortical 3.5mm",
  category: "Implantes",
  brand: "Biomet",
  articleType: "Implante",
  family: "Trauma",
  unit: "u",
  manufacturer: "Biomet Corp",
  gtin: "7791234567890",
  pmAnmat: "PM-1234-5",
  isSterile: true,
  cost: 0,
  price: 0,
  physical: 30,
  available: 25,
  reserved: 5,
  inTransit: 0,
  min: 10,
  state: "Disponible",
  masterStatus: "Activo",
  control: "lote",
  lotCount: 2,
  hasExpiringLots: false,
  hasExpiredLots: false,
  lastMovementAt: "2026-08-10T12:00:00Z",
}

describe("STOCK-ACCESSIBILITY-RESPONSIVE-DEV-001 — Stock Accessibility & Responsive", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useStockMock.mockReturnValue({
      items: [sampleArticle],
      loading: false,
      error: null,
      summary: {
        total: 1,
        bajo: 0,
        sinstock: 0,
        transito: 0,
        totalPhysical: 30,
        totalReserved: 5,
        totalInTransit: 0,
        totalAvailable: 25,
      },
      facets: {
        families: ["Trauma"],
        brands: ["Biomet"],
        articleTypes: ["Implante"],
      },
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
      refresh: vi.fn(),
    })
  })

  it("renders table rows with focus-visible styling, tabIndex=0, and keyboard interaction (Enter to open sheet, Space to select)", () => {
    render(<StockPage />)

    const row = screen.getByRole("row", { name: /Tornillo Cortical 3.5mm/i })
    expect(row).toHaveAttribute("tabIndex", "0")
    expect(row).toHaveClass("focus-visible:ring-2")

    // Space selects row
    fireEvent.keyDown(row, { key: " " })
    expect(row).toHaveAttribute("aria-selected", "true")

    // Enter opens sheet dialog
    fireEvent.keyDown(row, { key: "Enter" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("provides accessible sort headers with informative aria-labels and focus indicators", () => {
    render(<StockPage />)

    const sortButton = screen.getByRole("button", { name: /ordenar por artículo/i })
    expect(sortButton).toHaveClass("focus-visible:ring-2")
    expect(sortButton).toHaveAttribute("aria-label", expect.stringMatching(/ordenar por artículo/i))
  })

  it("provides accessible quick filters with aria-pressed, role region, and tactile targets", () => {
    render(<StockPage />)

    const quickFiltersRegion = screen.getByRole("region", { name: /filtros rápidos de stock/i })
    expect(quickFiltersRegion).toBeInTheDocument()

    const bajoStockButton = screen.getByRole("button", { name: /bajo stock/i })
    expect(bajoStockButton).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(bajoStockButton)
    expect(bajoStockButton).toHaveAttribute("aria-pressed", "true")
  })

  it("ensures search bar, filters, and clear search button have explicit aria labels", () => {
    render(<StockPage />)

    const searchInput = screen.getByRole("textbox", { name: /buscar artículo/i })
    expect(searchInput).toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: "Tornillo" } })

    const clearButton = screen.getByRole("button", { name: /limpiar búsqueda/i })
    expect(clearButton).toBeInTheDocument()
    expect(clearButton).toHaveClass("focus-visible:ring-1")
  })

  it("wraps pagination footer with accessible controls and responsive container", () => {
    render(<StockPage />)

    const footer = screen.getByRole("contentinfo", { name: /paginación de stock/i })
    expect(footer).toHaveClass("flex-wrap")

    expect(screen.getByRole("button", { name: /página anterior/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /página siguiente/i })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /artículos por página/i })).toBeInTheDocument()
  })
})

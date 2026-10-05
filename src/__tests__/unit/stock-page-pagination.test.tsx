import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StockAvailabilityQuery } from "@/lib/validators/stock"

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
}))

vi.mock("@/components/stock/StockArticleSheet", () => ({
  StockArticleSheet: () => null,
}))

vi.mock("@/components/stock/ArticleCodesDialog", () => ({
  ArticleCodesDialog: () => null,
}))

import StockPage from "@/app/stock/page"

describe("STOCK-DYNAMIC-FILTER-FACETS-DEV-001 & STOCK-BACKEND-PAGINATION-DEV-001", () => {
  const sampleItems = [
    {
      id: "art-1",
      code: "SKU-001",
      name: "Tornillo de titanio 3.5mm",
      family: "Cadera",
      category: "Cadera",
      brand: "Acme Medical",
      articleType: "Insumo Especial",
      unit: "u",
      manufacturer: "Acme Medical Corp",
      gtin: "7791234567890",
      physical: 50,
      reserved: 10,
      inTransit: 5,
      available: 35,
      min: 5,
      state: "Disponible" as const,
      masterStatus: "Activo" as const,
      control: "cantidad" as const,
      lotCount: 0,
      hasExpiringLots: false,
      hasExpiredLots: false,
      lastMovementAt: null,
    },
    {
      id: "art-2",
      code: "SKU-002",
      name: "Placa LCP 3.5mm",
      family: "Columna",
      category: "Columna",
      brand: "Synthes Biotech",
      articleType: "Implante Quirúrgico",
      unit: "u",
      manufacturer: "Synthes Biotech Inc",
      gtin: "7791234567891",
      physical: 20,
      reserved: 0,
      inTransit: 0,
      available: 20,
      min: 5,
      state: "Disponible" as const,
      masterStatus: "Activo" as const,
      control: "lote" as const,
      lotCount: 1,
      hasExpiringLots: false,
      hasExpiredLots: false,
      lastMovementAt: null,
    },
  ]

  const sampleFacets = {
    families: ["Cadera", "Columna"],
    brands: ["Acme Medical", "Synthes Biotech"],
    articleTypes: ["Implante Quirúrgico", "Insumo Especial"],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useStockMock.mockReturnValue({
      items: sampleItems,
      summary: {
        total: 120,
        bajo: 10,
        sinstock: 5,
        transito: 8,
        totalPhysical: 500,
        totalAvailable: 400,
        totalReserved: 100,
        expiringCount: 2,
      },
      facets: sampleFacets,
      pagination: {
        page: 1,
        limit: 50,
        total: 120,
        totalPages: 3,
      },
      loading: false,
      ready: true,
      error: null,
      refresh: vi.fn(),
    })
  })

  it("1. sends page and limit in initial request to useStock", () => {
    render(<StockPage />)

    expect(mocks.useStockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 50,
        sortKey: "articulo",
        sortDir: "asc",
      }),
    )
  })

  it("2. advances page and disables previous button on first page", () => {
    render(<StockPage />)

    const prevButton = screen.getByRole("button", { name: "Página anterior" })
    const nextButton = screen.getByRole("button", { name: "Página siguiente" })

    expect(prevButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    fireEvent.click(nextButton)

    expect(mocks.useStockMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 50,
      }),
    )
  })

  it("3. resets to page 1 when search, family, brand, type, quick filter, or sorting changes", async () => {
    render(<StockPage />)

    // Go to page 2 first
    const nextButton = screen.getByRole("button", { name: "Página siguiente" })
    fireEvent.click(nextButton)
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))

    // Change search -> page should reset to 1
    const searchInput = screen.getByLabelText("Buscar artículo")
    fireEvent.change(searchInput, { target: { value: "placa" } })
    await waitFor(() => {
      expect(mocks.useStockMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: "placa",
          page: 1,
        }),
      )
    })

    // Go to page 2 again
    fireEvent.click(nextButton)
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))

    // Change family filter -> page resets to 1
    const familySelect = screen.getByLabelText("Filtrar por familia")
    fireEvent.change(familySelect, { target: { value: "Cadera" } })
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        family: "Cadera",
        page: 1,
      }),
    )

    // Go to page 2 again
    fireEvent.click(nextButton)
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))

    // Change brand filter using dynamic facet -> page resets to 1
    const brandSelect = screen.getByLabelText("Filtrar por marca")
    fireEvent.change(brandSelect, { target: { value: "Acme Medical" } })
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        brand: "Acme Medical",
        page: 1,
      }),
    )

    // Change type filter using dynamic facet -> page resets to 1
    const typeSelect = screen.getByLabelText("Filtrar por tipo")
    fireEvent.change(typeSelect, { target: { value: "Insumo Especial" } })
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        articleType: "Insumo Especial",
        page: 1,
      }),
    )

    // Change quick filter -> page resets to 1
    const lowStockChip = screen.getByRole("button", { name: /Bajo stock/i })
    fireEvent.click(lowStockChip)
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        quickFilter: "bajo",
        page: 1,
      }),
    )

    // Change sort header -> page resets to 1
    const sortCodeHeader = screen.getByRole("button", { name: /Código/i })
    fireEvent.click(sortCodeHeader)
    expect(mocks.useStockMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortKey: "codigo",
        page: 1,
      }),
    )
  })

  it("4. displays total and range from backend pagination", () => {
    mocks.useStockMock.mockReturnValue({
      items: sampleItems,
      summary: { total: 120, bajo: 10, sinstock: 5, transito: 8, totalPhysical: 500, totalAvailable: 400, totalReserved: 100, expiringCount: 2 },
      facets: sampleFacets,
      pagination: {
        page: 2,
        limit: 50,
        total: 120,
        totalPages: 3,
      },
      loading: false,
      ready: true,
      error: null,
      refresh: vi.fn(),
    })

    render(<StockPage />)

    const footer = screen.getByLabelText("Paginación de stock")
    expect(within(footer).getByText(/Mostrando/i)).toBeInTheDocument()
    expect(within(footer).getByText(/51–100/i)).toBeInTheDocument()
    expect(within(footer).getByText(/Pág\./i)).toBeInTheDocument()
    expect(within(footer).getByText("2")).toBeInTheDocument()
    expect(within(footer).getByText(/de 3/i)).toBeInTheDocument()
  })

  it("5. renders dynamic options from facets instead of static mock data", () => {
    render(<StockPage />)

    const familySelect = screen.getByLabelText("Filtrar por familia") as HTMLSelectElement
    const brandSelect = screen.getByLabelText("Filtrar por marca") as HTMLSelectElement
    const typeSelect = screen.getByLabelText("Filtrar por tipo") as HTMLSelectElement

    const familyOptions = Array.from(familySelect.options).map((o) => o.value)
    const brandOptions = Array.from(brandSelect.options).map((o) => o.value)
    const typeOptions = Array.from(typeSelect.options).map((o) => o.value)

    expect(familyOptions).toEqual(["", "Cadera", "Columna"])
    expect(brandOptions).toEqual(["", "Acme Medical", "Synthes Biotech"])
    expect(typeOptions).toEqual(["", "Implante Quirúrgico", "Insumo Especial"])
  })

  it("6. provides clean honest fallback when facets are empty", () => {
    mocks.useStockMock.mockReturnValue({
      items: [],
      summary: { total: 0, bajo: 0, sinstock: 0, transito: 0, totalPhysical: 0, totalAvailable: 0, totalReserved: 0, expiringCount: 0 },
      facets: { families: [], brands: [], articleTypes: [] },
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
      loading: false,
      ready: true,
      error: null,
      refresh: vi.fn(),
    })

    render(<StockPage />)

    const familySelect = screen.getByLabelText("Filtrar por familia") as HTMLSelectElement
    const brandSelect = screen.getByLabelText("Filtrar por marca") as HTMLSelectElement
    const typeSelect = screen.getByLabelText("Filtrar por tipo") as HTMLSelectElement

    expect(Array.from(familySelect.options).map((o) => o.label)).toEqual(["Todas las familias"])
    expect(Array.from(brandSelect.options).map((o) => o.label)).toEqual(["Todas las marcas"])
    expect(Array.from(typeSelect.options).map((o) => o.label)).toEqual(["Todos los tipos"])
  })

  it("7. removes unsupported mock filters from the toolbar", () => {
    render(<StockPage />)

    expect(screen.queryByLabelText("Filtrar por depósito")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Filtrar por categoría")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Filtrar por estado")).not.toBeInTheDocument()
    expect(screen.queryByText(/Más filtros/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Filtrar por GTIN/EAN")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Filtrar por PM")).not.toBeInTheDocument()

    // Supported filters must be present
    expect(screen.getByLabelText("Buscar artículo")).toBeInTheDocument()
    expect(screen.getByLabelText("Filtrar por familia")).toBeInTheDocument()
    expect(screen.getByLabelText("Filtrar por marca")).toBeInTheDocument()
    expect(screen.getByLabelText("Filtrar por tipo")).toBeInTheDocument()
  })
})

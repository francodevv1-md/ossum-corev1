import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StockAvailabilityQuery } from "@/lib/validators/stock"

const mocks = vi.hoisted(() => ({
  useStockMock: vi.fn(),
  activeCompany: { id: "company-test", name: "Empresa Test" },
  apiFetch: vi.fn(),
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

vi.mock("@/lib/api/stock", () => ({
  useArticleStockDetail: vi.fn(() => ({ data: null, loading: false })),
}))

vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => mocks.apiFetch(...args),
}))

import StockPage from "@/app/stock/page"

describe("STOCK-NEW-ARTICLE-HONEST-FORM-DEV-001 - Honest NewArticleDialog Form", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useStockMock.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      summary: {
        totalArticles: 0,
        totalPhysical: 0,
        totalReserved: 0,
        totalInTransit: 0,
        totalAvailable: 0,
      },
      facets: {
        families: ["Cadera"],
        brands: ["Zimmer Biomet"],
        articleTypes: ["Implante"],
      },
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      },
      refresh: vi.fn(),
    })
  })

  it("opens modal and renders genuinely backed classification controls (Categoría, PM / Registro, Estéril) while omitting unbacked features (image uploading)", () => {
    render(<StockPage />)

    fireEvent.click(screen.getByRole("button", { name: /nuevo artículo/i }))

    expect(screen.getByText("Creá la ficha maestra del producto.")).toBeInTheDocument()

    // Backed controls are present
    expect(screen.getByRole("combobox", { name: /categoría/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("PM-1182-1")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: /producto estéril/i })).toBeInTheDocument()

    // Truly unbacked controls remain absent
    expect(screen.queryByText(/cambiar imagen/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/usar imagen de familia/i)).not.toBeInTheDocument()
  })

  it("displays base unit as read-only and retains genuinely persisted fields", () => {
    render(<StockPage />)

    fireEvent.click(screen.getByRole("button", { name: /nuevo artículo/i }))

    // Read-only unit base
    expect(screen.getByText("Unidad base")).toBeInTheDocument()
    const unitInput = screen.getByDisplayValue("u (Unidad)") as HTMLInputElement
    expect(unitInput.readOnly).toBe(true)

    // Persisted fields
    expect(screen.getByPlaceholderText("Tornillo cortical 3.5 mm x 24 mm")).toBeInTheDocument()
    expect(screen.getByText("Tipo de artículo")).toBeInTheDocument()
    expect(screen.getByText("Marca")).toBeInTheDocument()
    expect(screen.getByText("Familia / Patología")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("DePuy Synthes")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("00888867011234")).toBeInTheDocument()
  })

  it("submits POST payload with exact expected contract including classification fields", async () => {
    mocks.apiFetch.mockResolvedValueOnce({ id: "art-new-123" })

    render(<StockPage />)

    fireEvent.click(screen.getByRole("button", { name: /nuevo artículo/i }))

    const descInput = screen.getByPlaceholderText("Tornillo cortical 3.5 mm x 24 mm")
    fireEvent.change(descInput, { target: { value: "Prótesis de Cadera Cerámica" } })

    const brandSelect = screen.getByRole("combobox", { name: /marca/i })
    fireEvent.change(brandSelect, { target: { value: "Zimmer Biomet" } })

    const categorySelect = screen.getByRole("combobox", { name: /categoría/i })
    fireEvent.change(categorySelect, { target: { value: "Implantes" } })

    const pmInput = screen.getByPlaceholderText("PM-1182-1")
    fireEvent.change(pmInput, { target: { value: "PM-1234-5" } })

    const sterileSwitch = screen.getByRole("switch", { name: /producto estéril/i })
    fireEvent.click(sterileSwitch)

    const saveButton = screen.getByRole("button", { name: /guardar artículo/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/companies/company-test/articles",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"description":"Prótesis de Cadera Cerámica"'),
        })
      )
    })

    const payload = JSON.parse(mocks.apiFetch.mock.calls[0][1].body)
    expect(payload).toMatchObject({
      description: "Prótesis de Cadera Cerámica",
      unit: "u",
      category: "Implantes",
      pmAnmat: "PM-1234-5",
      isSterile: true,
      brand: "Zimmer Biomet",
      traceabilityPolicy: "NONE",
    })
  })
})

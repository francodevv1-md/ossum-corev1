import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ReactElement } from "react"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }))
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client")
  return { ...actual, apiFetch: mocks.apiFetch }
})
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.useAuth }))

import { ApiClientError } from "@/lib/api/client"
import { StockArticleView } from "@/components/stock/StockArticleView"
import { TooltipProvider } from "@/components/ui/tooltip"

const renderWithProviders = (ui: ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>)

afterEach(() => {
  vi.clearAllMocks()
})

describe("StockArticleView", () => {
  it("renders canonical article from API when company is active", async () => {
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-1" }, currentUserLoading: false, isLoading: false })
    mocks.apiFetch.mockResolvedValueOnce({
      id: "art-001",
      sku: "ITM-API-001",
      description: "Tornillo API",
      articleType: "Implante",
      brand: "BioSynth",
      manufacturer: "BioFactory",
      unit: "ud",
      identifiers: [{ type: "GTIN_EAN", value: "9990001112223" }],
      tracePolicies: [{ minimumRequirement: "LOT", expirationRequired: true }],
      supplierMappings: [{ supplierCode: "SUP-01", supplier: { legalName: "Proveedor API SA" } }],
    })

    renderWithProviders(<StockArticleView id="art-001" />)

    expect(await screen.findByDisplayValue("ITM-API-001")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Tornillo API")).toBeInTheDocument()
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company-1/articles/art-001")
  })

  it("shows the API error without falling back to local Articles", async () => {
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-1" }, currentUserLoading: false, isLoading: false })
    mocks.apiFetch.mockRejectedValueOnce(new ApiClientError("No encontrado", 404, "article_not_found"))

    renderWithProviders(<StockArticleView id="ART-001" />)

    expect(await screen.findByText("No pudimos cargar el artículo")).toBeInTheDocument()
    expect(screen.getByText("No encontrado")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("TORN-3.5-COR")).not.toBeInTheDocument()
  })

  it("requires an active company instead of using local Articles", () => {
    mocks.useAuth.mockReturnValue({ currentUserLoading: false, isLoading: false })
    renderWithProviders(<StockArticleView id="ART-001" />)

    expect(screen.getByText("Seleccioná una empresa para consultar el artículo.")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("TORN-3.5-COR")).not.toBeInTheDocument()
    expect(mocks.apiFetch).not.toHaveBeenCalled()
  })
})

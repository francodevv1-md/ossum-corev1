import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
  useArticleStockDetail: vi.fn(() => ({ data: null, loading: false })),
}))

vi.mock("@/lib/api/stock", () => ({
  useArticleStockDetail: vi.fn(() => ({ data: null, loading: false })),
}))

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}))

import StockPage from "@/app/stock/page"

describe("STOCK-PERFORMANCE-PROFILE-DEV-001 — Stock Search Debounce & Query Optimization", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.useStockMock.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      summary: {
        total: 0,
        bajo: 0,
        sinstock: 0,
        transito: 0,
        totalPhysical: 0,
        totalReserved: 0,
        totalInTransit: 0,
        totalAvailable: 0,
      },
      facets: {
        families: [],
        brands: [],
        articleTypes: [],
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

  afterEach(() => {
    vi.useRealTimers()
  })

  it("debounces rapid keystrokes so intermediate search terms do not trigger immediate query rebuilds", () => {
    render(<StockPage />)

    const searchInput = screen.getByRole("textbox", { name: /buscar artículo/i })

    // Type 4 characters rapidly
    fireEvent.change(searchInput, { target: { value: "t" } })
    fireEvent.change(searchInput, { target: { value: "to" } })
    fireEvent.change(searchInput, { target: { value: "tor" } })
    fireEvent.change(searchInput, { target: { value: "tornillo" } })

    // Before timer expiration, useStock query has not yet received "tornillo"
    const callsBeforeTimer = mocks.useStockMock.mock.calls
    const lastCallBefore = callsBeforeTimer[callsBeforeTimer.length - 1]?.[0]
    expect(lastCallBefore?.search).toBeUndefined()

    // Advance debounce timer (250ms)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // After debounce timer, useStock query receives the final value "tornillo"
    const callsAfterTimer = mocks.useStockMock.mock.calls
    const lastCallAfter = callsAfterTimer[callsAfterTimer.length - 1]?.[0]
    expect(lastCallAfter?.search).toBe("tornillo")
  })

  it("clearing filters or search immediately resets search query without delay", () => {
    render(<StockPage />)

    const searchInput = screen.getByRole("textbox", { name: /buscar artículo/i })
    fireEvent.change(searchInput, { target: { value: "placa" } })

    act(() => {
      vi.advanceTimersByTime(250)
    })

    const clearButton = screen.getByRole("button", { name: /limpiar búsqueda/i })
    fireEvent.click(clearButton)

    const lastCall = mocks.useStockMock.mock.calls[mocks.useStockMock.mock.calls.length - 1]?.[0]
    expect(lastCall?.search).toBeUndefined()
  })
})

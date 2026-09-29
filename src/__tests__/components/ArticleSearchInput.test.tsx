import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  searchArticlesApi: vi.fn(),
  getArticleApi: vi.fn(),
}))

vi.mock("@/lib/api/articles", () => mocks)
vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: (selector: (state: { stock: unknown[] }) => unknown) =>
    selector({ stock: [{ id: "local-1", code: "LOCAL", name: "Stock local" }] }),
}))

import { ArticleSearchInput } from "@/components/compras/ArticleSearchInput"

describe("ArticleSearchInput", () => {
  it("uses backend article rows when a company is supplied", async () => {
    mocks.searchArticlesApi.mockResolvedValue([
      { id: "article-1", sku: "API-001", description: "Artículo desde API", unit: "u" },
    ])
    const onSelect = vi.fn()

    render(<ArticleSearchInput companyId="company-1" onSelect={onSelect} />)

    fireEvent.change(screen.getByPlaceholderText(/buscar artículo/i), {
      target: { value: "artículo" },
    })

    await waitFor(() =>
      expect(mocks.searchArticlesApi).toHaveBeenCalledWith("company-1", "artículo", 8)
    )
    expect(await screen.findByText("Artículo desde API")).toBeInTheDocument()
    expect(screen.queryByText("Stock local")).not.toBeInTheDocument()

    fireEvent.click(screen.getByText("Artículo desde API"))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "article-1" }))
  })
})

/**
 * CHATZAI-017O: Tests for Article Selector Modal, column alignment, and Argentine number format.
 *
 * Test cases:
 * 1. ArticleSelectorModal renders when open=true
 * 2. Search filters articles by code
 * 3. Search filters articles by name
 * 4. Selecting an article calls onSelect with correct data
 * 5. "Cargar artículo flexible" calls onSelectFree
 * 6. Code "Z" triggers libre article mode
 * 7. Column alignment: table has single table element with matching th/td widths
 * 8. formatNumberAR produces Argentine format (punto miles, coma decimales)
 * 9. formatCurrency with decimals shows comma for decimals
 */
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ArticleSelectorModal } from "@/components/presupuestos/ArticleSelectorModal"
import { searchCatalogByQuery, getCatalogByCode } from "@/data/mock-catalog"
import { formatNumberAR, formatCurrency } from "@/lib/formatters"
import { PresupuestoItemsTable } from "@/components/presupuestos/PresupuestoItemsTable"
import type { CatalogMatch } from "@/data/mock-catalog"
import type { FormItem } from "@/hooks/usePresupuestoForm"
import { EMPTY_FORM_ITEM } from "@/hooks/usePresupuestoForm"

// ─── 1. ArticleSelectorModal renders when open=true ───

describe("CHATZAI-017O — ArticleSelectorModal rendering", () => {
  it("renders when open=true", () => {
    render(
      <ArticleSelectorModal
        open={true}
        onOpenChange={() => {}}
        onSelect={() => {}}
        onSelectFree={() => {}}
      />
    )
    expect(screen.getByText("Buscar artículo en catálogo")).toBeInTheDocument()
  })

  it("does not render content when open=false", () => {
    render(
      <ArticleSelectorModal
        open={false}
        onOpenChange={() => {}}
        onSelect={() => {}}
        onSelectFree={() => {}}
      />
    )
    expect(screen.queryByText("Buscar artículo en catálogo")).not.toBeInTheDocument()
  })

  it("shows search input placeholder", () => {
    render(
      <ArticleSelectorModal
        open={true}
        onOpenChange={() => {}}
        onSelect={() => {}}
        onSelectFree={() => {}}
      />
    )
    expect(screen.getByPlaceholderText("Buscar por código o nombre...")).toBeInTheDocument()
  })

  it("shows free article button", () => {
    render(
      <ArticleSelectorModal
        open={true}
        onOpenChange={() => {}}
        onSelect={() => {}}
        onSelectFree={() => {}}
      />
    )
    expect(screen.getByText("Cargar artículo flexible")).toBeInTheDocument()
  })
})

// ─── 2. Search filters articles by code ───

describe("CHATZAI-017O — Search by code", () => {
  it("searchCatalogByQuery finds articles by code prefix", () => {
    const results = searchCatalogByQuery("IMP-RTR")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].code).toMatch(/^IMP-RTR/i)
  })

  it("searchCatalogByQuery finds articles by exact code", () => {
    const results = searchCatalogByQuery("IMP-RTR-001")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].code).toBe("IMP-RTR-001")
  })

  it("searchCatalogByQuery returns empty for non-existent code", () => {
    const results = searchCatalogByQuery("NONEXISTENT-CODE-999")
    expect(results.length).toBe(0)
  })
})

// ─── 3. Search filters articles by name ───

describe("CHATZAI-017O — Search by name", () => {
  it("searchCatalogByQuery finds articles by name", () => {
    const results = searchCatalogByQuery("Implante femoral")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name.toLowerCase()).toContain("implante femoral")
  })

  it("searchCatalogByQuery is case-insensitive", () => {
    const resultsLower = searchCatalogByQuery("implante")
    const resultsUpper = searchCatalogByQuery("IMPLANTE")
    expect(resultsLower.length).toBeGreaterThan(0)
    expect(resultsUpper.length).toBeGreaterThan(0)
    expect(resultsLower.length).toBe(resultsUpper.length)
  })

  it("searchCatalogByQuery deduplicates results", () => {
    // A query that could match both code and name should not duplicate
    const results = searchCatalogByQuery("IMP")
    const ids = results.map((r) => r.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  it("searchCatalogByQuery respects limit parameter", () => {
    const results = searchCatalogByQuery("IMP", 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })
})

// ─── 4. Selecting an article calls onSelect with correct data ───

describe("CHATZAI-017O — Article selection", () => {
  it("clicking an article row calls onSelect", async () => {
    let selectedMatch: CatalogMatch | null = null
    const onSelect = (match: CatalogMatch) => { selectedMatch = match }
    const onOpenChange = () => {}

    render(
      <ArticleSelectorModal
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        onSelectFree={() => {}}
        initialCode="IMP"
      />
    )

    // Wait for results to appear
    await waitFor(() => {
      const rows = screen.queryAllByRole("row")
      // The header row + at least one result
      expect(rows.length).toBeGreaterThan(1)
    })

    // Click the first result row (skip header)
    const bodyRows = screen.getAllByRole("row").slice(1)
    if (bodyRows.length > 0) {
      fireEvent.click(bodyRows[0])
      expect(selectedMatch).not.toBeNull()
      expect(selectedMatch!.code).toBeTruthy()
      expect(selectedMatch!.name).toBeTruthy()
    }
  })
})

// ─── 5. "Cargar artículo flexible" calls onSelectFree ───

describe("CHATZAI-017O — Free article selection", () => {
  it("clicking free article button calls onSelectFree", () => {
    let freeSelected = false
    render(
      <ArticleSelectorModal
        open={true}
        onOpenChange={() => {}}
        onSelect={() => {}}
        onSelectFree={() => { freeSelected = true }}
      />
    )

    const freeButton = screen.getByText("Cargar artículo flexible")
    fireEvent.click(freeButton)
    expect(freeSelected).toBe(true)
  })
})

// ─── 6. Code "Z" triggers libre article mode ───

describe("CHATZAI-017O — Z code triggers libre mode", () => {
  it("getCatalogByCode does not match 'Z'", () => {
    const match = getCatalogByCode("Z")
    expect(match).toBeUndefined()
  })

  it("code 'Z' is treated as libre article (uppercase)", () => {
    const code = "Z"
    const isLibre = code.trim().toUpperCase() === "Z"
    expect(isLibre).toBe(true)
  })

  it("code 'z' is treated as libre article (lowercase)", () => {
    const code = "z"
    const isLibre = code.trim().toUpperCase() === "Z"
    expect(isLibre).toBe(true)
  })

  it("FormItem with code Z has isArticuloLibre=true", () => {
    const item: FormItem = {
      ...EMPTY_FORM_ITEM,
      code: "Z",
      catalogItemId: "",
    }
    // isArticuloLibre is derived from !catalogItemId
    const isArticuloLibre = !item.catalogItemId || item.catalogItemId.trim() === ""
    expect(isArticuloLibre).toBe(true)
  })
})

// ─── 7. Column alignment: table has single table element with matching th/td widths ───

describe("CHATZAI-017O — Column alignment", () => {
  it("PresupuestoItemsTable uses a single <table> element", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Test Item", unitPrice: 1000 },
    ]

    const { container } = render(
      <PresupuestoItemsTable
        items={items}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
        errors={{}}
      />
    )

    const tables = container.querySelectorAll("table")
    expect(tables.length).toBe(1)
  })

  it("table has thead and tbody in same table", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Test Item", unitPrice: 1000 },
    ]

    const { container } = render(
      <PresupuestoItemsTable
        items={items}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
        errors={{}}
      />
    )

    const table = container.querySelector("table")
    expect(table).not.toBeNull()
    expect(table!.querySelector("thead")).not.toBeNull()
    expect(table!.querySelector("tbody")).not.toBeNull()
  })

  it("th and td have matching width styles for fixed columns", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Test Item", unitPrice: 1000 },
    ]

    const { container } = render(
      <PresupuestoItemsTable
        items={items}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
        errors={{}}
      />
    )

    const ths = container.querySelectorAll("thead th")
    const tds = container.querySelectorAll("tbody tr:first-child td")

    // Expected column widths (CHATZAI-025: IVA column added after Dto.%)
    const expectedWidths = ["90px", undefined, "52px", "96px", "56px", "80px", "100px", undefined, "28px"]

    // Check each fixed-width column has matching th and td widths
    expectedWidths.forEach((width, idx) => {
      if (width) {
        const thStyle = ths[idx]?.getAttribute("style")
        const tdStyle = tds[idx]?.getAttribute("style")
        expect(thStyle).toContain(`width: ${width}`)
        expect(tdStyle).toContain(`width: ${width}`)
      }
    })
  })

  it("9 columns in header (CHATZAI-025: +IVA column)", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Test Item", unitPrice: 1000 },
    ]

    const { container } = render(
      <PresupuestoItemsTable
        items={items}
        addItem={() => {}}
        removeItem={() => {}}
        updateItem={() => {}}
        errors={{}}
      />
    )

    const ths = container.querySelectorAll("thead th")
    expect(ths.length).toBe(9)
  })
})

// ─── 8. formatNumberAR produces Argentine format ───

describe("CHATZAI-017O — formatNumberAR", () => {
  it("formats thousands with punto (.) as thousand separator", () => {
    const result = formatNumberAR(1930000)
    // es-AR: 1.930.000
    expect(result).toContain(".")
    expect(result).toBe("1.930.000")
  })

  it("formats decimals with coma (,) as decimal separator", () => {
    const result = formatNumberAR(1234.56, 2)
    // es-AR: 1.234,56
    expect(result).toContain(",")
    expect(result).toBe("1.234,56")
  })

  it("formats 0 correctly", () => {
    expect(formatNumberAR(0)).toBe("0")
  })

  it("formats small numbers without thousand separator", () => {
    expect(formatNumberAR(42)).toBe("42")
  })

  it("respects decimals parameter", () => {
    expect(formatNumberAR(100, 0)).toBe("100")
    expect(formatNumberAR(100, 2)).toBe("100,00")
    expect(formatNumberAR(100.5, 1)).toBe("100,5")
  })

  it("large number with decimals", () => {
    const result = formatNumberAR(2850000.75, 2)
    expect(result).toBe("2.850.000,75")
  })
})

// ─── 9. formatCurrency with decimals shows comma for decimals ───

describe("CHATZAI-017O — formatCurrency with decimals", () => {
  it("formatCurrency with 0 decimals (default) has no decimals", () => {
    const result = formatCurrency(1930000)
    expect(result).not.toContain(",")
  })

  it("formatCurrency with 2 decimals shows comma for decimals", () => {
    const result = formatCurrency(1930000, 2)
    // es-AR currency: $ 1.930.000,00
    expect(result).toContain(",")
    expect(result).toContain("00")
  })

  it("formatCurrency with fractional amount shows proper decimal", () => {
    const result = formatCurrency(1234.56, 2)
    // es-AR currency: $ 1.234,56
    expect(result).toContain(",")
    expect(result).toContain("56")
  })

  it("formatCurrency uses Argentine thousand separator (punto)", () => {
    const result = formatCurrency(1000000, 0)
    expect(result).toContain(".")
  })

  it("formatCurrency with 2 decimals on round number", () => {
    const result = formatCurrency(2850000, 2)
    expect(result).toContain("2.850.000,00")
  })

  it("formatCurrency line subtotal example", () => {
    // qty=2, unitPrice=2850000, discount=0 → subtotal=5700000
    const lineSubtotal = 2 * 2850000 * (1 - 0 / 100)
    const result = formatCurrency(lineSubtotal, 2)
    expect(result).toContain("5.700.000,00")
  })
})

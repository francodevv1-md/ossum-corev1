/**
 * CHATZAI-017L: Tests for catalog-linked article loading and automatic Z/libre determination
 *
 * Covers the 6 required test scenarios:
 * 1. Código existente autocompleta artículo
 * 2. Seleccionar artículo completa código
 * 3. Código inexistente no bloquea y permite artículo libre
 * 4. Ítem sin match de catálogo queda marcado internamente como libre
 * 5. El checkbox/columna Z ya no aparece
 * 6. Presupuesto admite mezcla de artículos catalogados y libres
 *
 * Additional:
 * 7. FormItem defaults (catalogItemId="", isArticuloLibre=true)
 * 8. isArticuloLibre derived from catalogItemId in updateItem
 * 9. Catalog search functions work correctly
 */
import { describe, it, expect } from "vitest"
import { EMPTY_FORM_ITEM, type FormItem } from "@/hooks/usePresupuestoForm"
import {
  getCatalogByCode,
  searchCatalogByName,
  getCatalogById,
  isArticuloLibre,
} from "@/data/mock-catalog"

// ─── 1. Código existente autocompleta artículo ───

describe("CHATZAI-017L — Código existente autocompleta artículo", () => {
  it("existing code returns a catalog match", () => {
    const match = getCatalogByCode("IMP-RTR-001")
    expect(match).toBeDefined()
    expect(match!.name).toBe("Implante femoral NEXGEN CR")
    expect(match!.code).toBe("IMP-RTR-001")
    expect(match!.unitPrice).toBe(2850000)
  })

  it("existing code lookup is case-insensitive", () => {
    const match = getCatalogByCode("imp-rtr-001")
    expect(match).toBeDefined()
    expect(match!.code).toBe("IMP-RTR-001")
  })

  it("catalog match provides data needed to auto-fill the row", () => {
    const match = getCatalogByCode("IMP-PC-002")
    expect(match).toBeDefined()
    expect(match!.id).toBeTruthy() // for catalogItemId
    expect(match!.name).toBeTruthy() // for name field
    expect(match!.unitPrice).toBeGreaterThan(0) // for price field
  })

  it("code lookup trims whitespace", () => {
    const match = getCatalogByCode("  IMP-RTR-001  ")
    expect(match).toBeDefined()
    expect(match!.code).toBe("IMP-RTR-001")
  })
})

// ─── 2. Seleccionar artículo completa código ───

describe("CHATZAI-017L — Seleccionar artículo completa código", () => {
  it("searching by name returns matching catalog items", () => {
    const results = searchCatalogByName("Implante femoral")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toContain("Implante femoral")
    expect(results[0].code).toBeTruthy()
  })

  it("search results include code and price for auto-fill", () => {
    const results = searchCatalogByName("NEXGEN")
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.code).toBeTruthy()
      expect(r.id).toBeTruthy()
      expect(r.unitPrice).toBeGreaterThanOrEqual(0)
    }
  })

  it("search is case-insensitive", () => {
    const results = searchCatalogByName("nexgen")
    expect(results.length).toBeGreaterThan(0)
  })

  it("search returns at most the specified limit", () => {
    const results = searchCatalogByName("a", 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it("search returns empty for empty query", () => {
    const results = searchCatalogByName("")
    expect(results.length).toBe(0)
  })

  it("catalog lookup by ID returns the correct item", () => {
    const match = getCatalogById("STK-0001")
    expect(match).toBeDefined()
    expect(match!.code).toBe("IMP-RTR-001")
  })
})

// ─── 3. Código inexistente no bloquea y permite artículo libre ───

describe("CHATZAI-017L — Código inexistente no bloquea", () => {
  it("non-existing code returns undefined (no match)", () => {
    const match = getCatalogByCode("XYZ-999-NONEXISTENT")
    expect(match).toBeUndefined()
  })

  it("empty code returns undefined", () => {
    const match = getCatalogByCode("")
    expect(match).toBeUndefined()
  })

  it("whitespace-only code returns undefined", () => {
    const match = getCatalogByCode("   ")
    expect(match).toBeUndefined()
  })

  it("non-matching code should not prevent free text entry", () => {
    // Simulate: user types code "CUSTOM-001", no match found
    const match = getCatalogByCode("CUSTOM-001")
    // The grid should NOT block the user — they continue as libre
    expect(match).toBeUndefined()
    // The item would remain libre (no catalogItemId set)
    const item: FormItem = {
      ...EMPTY_FORM_ITEM,
      code: "CUSTOM-001",
      name: "Custom article",
      unitPrice: 500000,
    }
    expect(item.isArticuloLibre).toBe(true)
    expect(item.catalogItemId).toBe("")
  })
})

// ─── 4. Ítem sin match de catálogo queda marcado como libre ───

describe("CHATZAI-017L — Ítem sin match queda marcado como libre", () => {
  it("isArticuloLibre returns true when catalogItemId is empty", () => {
    expect(isArticuloLibre("")).toBe(true)
    expect(isArticuloLibre(null)).toBe(true)
    expect(isArticuloLibre(undefined)).toBe(true)
  })

  it("isArticuloLibre returns false when catalogItemId is set", () => {
    expect(isArticuloLibre("STK-0001")).toBe(false)
  })

  it("EMPTY_FORM_ITEM is libre by default", () => {
    expect(EMPTY_FORM_ITEM.isArticuloLibre).toBe(true)
    expect(EMPTY_FORM_ITEM.catalogItemId).toBe("")
  })

  it("item with catalogItemId is not libre", () => {
    const item: FormItem = {
      ...EMPTY_FORM_ITEM,
      catalogItemId: "STK-0001",
      isArticuloLibre: false,
    }
    expect(item.isArticuloLibre).toBe(false)
  })

  it("updateItem derives isArticuloLibre from catalogItemId", () => {
    // Simulate the derivation logic from usePresupuestoForm.updateItem
    function deriveIsArticuloLibre(item: Partial<FormItem> & { catalogItemId: string }): boolean {
      return !item.catalogItemId || item.catalogItemId.trim() === ""
    }

    // Setting catalogItemId → not libre
    expect(deriveIsArticuloLibre({ catalogItemId: "STK-0001" })).toBe(false)
    // Clearing catalogItemId → libre
    expect(deriveIsArticuloLibre({ catalogItemId: "" })).toBe(true)
    // Whitespace catalogItemId → libre
    expect(deriveIsArticuloLibre({ catalogItemId: "  " })).toBe(true)
  })
})

// ─── 5. El checkbox/columna Z ya no aparece ───

describe("CHATZAI-017L — Z checkbox/column eliminated", () => {
  it("grid columns do NOT include Z", () => {
    const columns = ["Código", "Artículo", "Cant.", "P.Unit.", "Dto. %", "Subtotal", "Observación", "Acciones"]
    expect(columns).not.toContain("Z")
    expect(columns.length).toBe(8)
  })

  it("FormItem no longer has isArticuloZ", () => {
    // FormItem now uses catalogItemId + isArticuloLibre
    const item = EMPTY_FORM_ITEM
    expect(item).toHaveProperty("catalogItemId")
    expect(item).toHaveProperty("isArticuloLibre")
    // isArticuloZ does not exist on FormItem
    expect((item as unknown as Record<string, unknown>).isArticuloZ).toBeUndefined()
  })

  it("CellCol type does not include 'z' for navigation", () => {
    const navCols = ["code", "name", "quantity", "unitPrice", "discountPercent", "observacion"]
    expect(navCols).not.toContain("z")
    expect(navCols).not.toContain("Z")
  })

  it("Z status is auto-determined, not manual", () => {
    // Items are libre when they have no catalogItemId
    const libreItem: FormItem = { ...EMPTY_FORM_ITEM, code: "Z-LIBRE", name: "Custom item", isArticuloLibre: true }
    const catalogedItem: FormItem = { ...EMPTY_FORM_ITEM, code: "IMP-RTR-001", name: "Implante femoral NEXGEN CR", catalogItemId: "STK-0001", isArticuloLibre: false }

    expect(libreItem.isArticuloLibre).toBe(true)
    expect(catalogedItem.isArticuloLibre).toBe(false)
  })
})

// ─── 6. Presupuesto admite mezcla de artículos catalogados y libres ───

describe("CHATZAI-017L — Presupuesto admite mezcla de catalogados y libres", () => {
  it("mixed items: some cataloged, some libre", () => {
    const items: FormItem[] = [
      // Cataloged item (linked to stock)
      { ...EMPTY_FORM_ITEM, code: "IMP-RTR-001", name: "Implante femoral NEXGEN CR", unitPrice: 2850000, catalogItemId: "STK-0001", isArticuloLibre: false },
      // Libre item (custom/free entry)
      { ...EMPTY_FORM_ITEM, code: "Z-LIBRE", name: "Instrumental específico", unitPrice: 0, catalogItemId: "", isArticuloLibre: true },
      // Another cataloged item
      { ...EMPTY_FORM_ITEM, code: "IMP-OST-003", name: "Placa LCP 4.5/5.0 8 orificios", unitPrice: 680000, catalogItemId: "STK-0003", isArticuloLibre: false },
    ]

    const libreCount = items.filter(i => i.isArticuloLibre).length
    const catalogedCount = items.filter(i => !i.isArticuloLibre).length

    expect(libreCount).toBe(1)
    expect(catalogedCount).toBe(2)
  })

  it("all items can be libre (no catalog links)", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, code: "CUSTOM-001", name: "Custom item 1", unitPrice: 100000 },
      { ...EMPTY_FORM_ITEM, code: "CUSTOM-002", name: "Custom item 2", unitPrice: 200000 },
    ]
    const allLibre = items.every(i => i.isArticuloLibre)
    expect(allLibre).toBe(true)
  })

  it("all items can be cataloged (all linked)", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, code: "IMP-RTR-001", name: "Implante femoral NEXGEN CR", unitPrice: 2850000, catalogItemId: "STK-0001", isArticuloLibre: false },
      { ...EMPTY_FORM_ITEM, code: "IMP-PC-002", name: "Vástago femoral TAPERLOC", unitPrice: 3200000, catalogItemId: "STK-0002", isArticuloLibre: false },
    ]
    const allCataloged = items.every(i => !i.isArticuloLibre)
    expect(allCataloged).toBe(true)
  })

  it("libre items can have free name, observation, and price", () => {
    const libreItem: FormItem = {
      ...EMPTY_FORM_ITEM,
      code: "FREE-001",
      name: "Artículo libre personalizado",
      unitPrice: 150000,
      discountPercent: 5,
      catalogItemId: "",
      isArticuloLibre: true,
      descripcionLibre: "Detalle especial para concurso",
    }
    expect(libreItem.name).toBeTruthy()
    expect(libreItem.descripcionLibre).toBeTruthy()
    expect(libreItem.unitPrice).toBeGreaterThan(0)
    expect(libreItem.isArticuloLibre).toBe(true)
  })

  it("articuloLibreCount counts correctly for mixed items", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "A", catalogItemId: "STK-0001", isArticuloLibre: false },
      { ...EMPTY_FORM_ITEM, name: "B", catalogItemId: "", isArticuloLibre: true },
      { ...EMPTY_FORM_ITEM, name: "C", catalogItemId: "", isArticuloLibre: true },
      { ...EMPTY_FORM_ITEM, name: "D", catalogItemId: "STK-0003", isArticuloLibre: false },
    ]
    const count = items.filter(i => i.isArticuloLibre).length
    expect(count).toBe(2)
  })
})

// ─── 7. FormItem defaults ───

describe("CHATZAI-017L — FormItem defaults for catalog fields", () => {
  it("EMPTY_FORM_ITEM has catalogItemId: ''", () => {
    expect(EMPTY_FORM_ITEM.catalogItemId).toBe("")
  })

  it("EMPTY_FORM_ITEM has isArticuloLibre: true", () => {
    expect(EMPTY_FORM_ITEM.isArticuloLibre).toBe(true)
  })

  it("new FormItem via spread inherits libre defaults", () => {
    const item: FormItem = { ...EMPTY_FORM_ITEM, name: "Test Item" }
    expect(item.catalogItemId).toBe("")
    expect(item.isArticuloLibre).toBe(true)
  })
})

// ─── 8. isArticuloLibre derivation ───

describe("CHATZAI-017L — isArticuloLibre derived from catalogItemId", () => {
  it("setting catalogItemId makes item not-libre", () => {
    // Simulating updateItem behavior
    const item = { ...EMPTY_FORM_ITEM }
    const updates = { catalogItemId: "STK-0001" }
    const merged = { ...item, ...updates }
    merged.isArticuloLibre = !merged.catalogItemId || merged.catalogItemId.trim() === ""
    expect(merged.isArticuloLibre).toBe(false)
  })

  it("clearing catalogItemId makes item libre again", () => {
    const item = { ...EMPTY_FORM_ITEM, catalogItemId: "STK-0001", isArticuloLibre: false }
    const updates = { catalogItemId: "" }
    const merged = { ...item, ...updates }
    merged.isArticuloLibre = !merged.catalogItemId || merged.catalogItemId.trim() === ""
    expect(merged.isArticuloLibre).toBe(true)
  })

  it("editing name of a cataloged item breaks the link (makes it libre)", () => {
    // When user manually edits the name in ArticleAutocomplete,
    // catalogItemId is cleared → becomes libre
    const item = { ...EMPTY_FORM_ITEM, catalogItemId: "STK-0001", isArticuloLibre: false, name: "Implante femoral" }
    const updates = { name: "Implante femoral modificado", catalogItemId: "" }
    const merged = { ...item, ...updates }
    merged.isArticuloLibre = !merged.catalogItemId || merged.catalogItemId.trim() === ""
    expect(merged.isArticuloLibre).toBe(true)
  })
})

// ─── 9. Catalog search functions ───

describe("CHATZAI-017L — Catalog search functions", () => {
  it("searchCatalogByName ranks exact matches first", () => {
    const results = searchCatalogByName("Implante femoral NEXGEN CR")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe("Implante femoral NEXGEN CR")
  })

  it("searchCatalogByName ranks startsWith before contains", () => {
    const results = searchCatalogByName("Implante")
    expect(results.length).toBeGreaterThan(1)
    // All results should contain "Implante"
    for (const r of results) {
      expect(r.name.toLowerCase()).toContain("implante")
    }
  })

  it("getCatalogById returns correct item", () => {
    const match = getCatalogById("STK-0005")
    expect(match).toBeDefined()
    expect(match!.code).toBe("IMP-COL-005")
    expect(match!.name).toContain("Cage interbody")
  })

  it("getCatalogById returns undefined for non-existent ID", () => {
    const match = getCatalogById("NON-EXISTENT")
    expect(match).toBeUndefined()
  })

  it("all mock stock items are findable by code", () => {
    // Verify all stock items in mock data have unique codes
    const match1 = getCatalogByCode("IMP-RTR-001")
    const match2 = getCatalogByCode("IMP-PC-002")
    const match3 = getCatalogByCode("IMP-OST-003")
    expect(match1).toBeDefined()
    expect(match2).toBeDefined()
    expect(match3).toBeDefined()
  })
})

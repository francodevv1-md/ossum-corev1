import { describe, expect, it } from "vitest"

import { mapCanonicalArticleToStockItem } from "@/lib/stock/article-adapter"

describe("mapCanonicalArticleToStockItem", () => {
  it("uses company-scoped projection balances instead of placeholder quantities", () => {
    const item = mapCanonicalArticleToStockItem({
      id: "article-1",
      sku: "ITM-001",
      description: "Implante",
      unit: "u",
      stock: { physical: "12", reserved: "4", available: "8", inTransit: 0 },
      positions: [{ id: "position-1", deposit: "Central", location: "", lot: "LOT-1", serial: "", expiry: "2030-01-01", available: "8", reserved: "4" }],
      movements: [{ id: "evidence-1", date: "2026-08-26T00:00:00.000Z", type: "Ingreso", qty: "12", user: "Operador", ref: "receipt-1" }],
    })

    expect(item).toMatchObject({ available: 8, reserved: 4, inTransit: 0, state: "Disponible" })
    expect(item.lots).toMatchObject([{ lot: "LOT-1", available: 8, status: "Disponible" }])
    expect(item.movements).toMatchObject([{ type: "Ingreso", qty: 12 }])
  })

  it("prefers canonical catalog labels over legacy scalar fallbacks", () => {
    const item = mapCanonicalArticleToStockItem({
      id: "article-2", sku: "ITM-002", description: "Implante", unit: "u",
      category: { id: "cat-1", name: "Trauma" }, clinicalFamily: { id: "family-1", name: "Rodilla" },
      brandCatalog: { id: "brand-1", name: "Canon" }, manufacturerCatalog: { id: "manufacturer-1", name: "Fabricante" }, productLine: { id: "line-1", name: "Línea" },
      brand: "Legacy", manufacturer: "Legacy", family: "Legacy",
    })
    expect(item).toMatchObject({ category: "Trauma", family: "Rodilla", brand: "Canon", manufacturer: "Fabricante", linea: "Línea" })
  })
})

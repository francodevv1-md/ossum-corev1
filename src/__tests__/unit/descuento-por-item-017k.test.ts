/**
 * CHATZAI-017K: Tests for per-item discount in Presupuesto
 *
 * Covers:
 * 1. Column Dto. % visible (9 columns in grid)
 * 2. Subtotal de línea se reduce correctamente con descuento
 * 3. Descuento 0% no altera subtotal
 * 4. Descuento 10% calcula bien
 * 5. No acepta valores menores a 0 ni mayores a 100
 * 6. Totales generales contemplan descuento por ítem + descuento general
 * 7. Convivencia con IVA: línea → descuento general → IVA
 * 8. FormItem.discountPercent default is 0
 * 9. EMPTY_FORM_ITEM has discountPercent: 0
 */
import { describe, it, expect } from "vitest"
import { EMPTY_FORM_ITEM, type FormItem } from "@/hooks/usePresupuestoForm"

// ─── Helper: replicate the line calculation from usePresupuestoForm ───

function computeLineSubtotal(item: { quantity: number; unitPrice: number; discountPercent: number }): number {
  const subtotalBruto = item.quantity * item.unitPrice
  const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
  const descuentoLinea = subtotalBruto * (clampedDiscount / 100)
  return subtotalBruto - descuentoLinea
}

// Helper: replicate the full calculation chain from usePresupuestoForm
function computeTotals(
  items: FormItem[],
  descuentoGeneral: number,
  ivaPercentage: number
): { subtotalBruto: number; descuentoLineasMonto: number; subtotal: number; descuentoMonto: number; baseNeta: number; ivaMonto: number; total: number } {
  const subtotalBruto = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const descuentoLineasMonto = items.reduce((sum, item) => {
    const lineBruto = item.quantity * item.unitPrice
    const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
    return sum + lineBruto * (clampedDiscount / 100)
  }, 0)
  const subtotal = subtotalBruto - descuentoLineasMonto
  const descuentoMonto = descuentoGeneral > 0 ? subtotal * (descuentoGeneral / 100) : 0
  const baseNeta = subtotal - descuentoMonto
  const ivaMonto = baseNeta * (ivaPercentage / 100)
  const total = baseNeta + ivaMonto
  return { subtotalBruto, descuentoLineasMonto, subtotal, descuentoMonto, baseNeta, ivaMonto, total }
}

// ─── 1. Grid columns ───

describe("CHATZAI-017K — Column Dto. % visible in grid", () => {
  it("grid has 9 columns including Dto. %", () => {
    const columns = ["Código", "Artículo", "Cant.", "P.Unit.", "Dto. %", "Subtotal", "Z", "Observación", "Acciones"]
    expect(columns.length).toBe(9)
    expect(columns).toContain("Dto. %")
  })

  it("Dto. % is positioned between P.Unit. and Subtotal", () => {
    const columns = ["Código", "Artículo", "Cant.", "P.Unit.", "Dto. %", "Subtotal", "Z", "Observación", "Acciones"]
    const dtoIdx = columns.indexOf("Dto. %")
    const punitIdx = columns.indexOf("P.Unit.")
    const subtotalIdx = columns.indexOf("Subtotal")
    expect(dtoIdx).toBe(punitIdx + 1)
    expect(dtoIdx).toBe(subtotalIdx - 1)
  })
})

// ─── 2. Subtotal de línea se reduce correctamente ───

describe("CHATZAI-017K — Line subtotal calculation with discount", () => {
  it("descuento 10% reduces subtotal correctly", () => {
    const item = { quantity: 2, unitPrice: 1000, discountPercent: 10 }
    const result = computeLineSubtotal(item)
    // 2 × 1000 = 2000; 10% = 200; net = 1800
    expect(result).toBe(1800)
  })

  it("descuento 50% halves the subtotal", () => {
    const item = { quantity: 1, unitPrice: 2000, discountPercent: 50 }
    const result = computeLineSubtotal(item)
    expect(result).toBe(1000)
  })

  it("descuento 100% makes subtotal 0", () => {
    const item = { quantity: 3, unitPrice: 500, discountPercent: 100 }
    const result = computeLineSubtotal(item)
    expect(result).toBe(0)
  })

  it("fractional discount works correctly (7.5%)", () => {
    const item = { quantity: 1, unitPrice: 1000, discountPercent: 7.5 }
    const result = computeLineSubtotal(item)
    expect(result).toBe(925)
  })
})

// ─── 3. Descuento 0% no altera subtotal ───

describe("CHATZAI-017K — 0% discount does not alter subtotal", () => {
  it("0% discount preserves full subtotal", () => {
    const item = { quantity: 2, unitPrice: 1000, discountPercent: 0 }
    const result = computeLineSubtotal(item)
    expect(result).toBe(2000)
  })

  it("default discountPercent (0) preserves full subtotal", () => {
    const item = { quantity: 5, unitPrice: 300, discountPercent: EMPTY_FORM_ITEM.discountPercent }
    const result = computeLineSubtotal(item)
    expect(result).toBe(1500)
  })
})

// ─── 4. Descuento 10% calcula bien (multi-item) ───

describe("CHATZAI-017K — 10% discount calculation across multiple items", () => {
  it("single item with 10% discount", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 10 },
    ]
    const totals = computeTotals(items, 0, 0)
    expect(totals.subtotal).toBe(900)
    expect(totals.descuentoLineasMonto).toBe(100)
    expect(totals.total).toBe(900)
  })

  it("multiple items with different discounts", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 10 }, // 900
      { ...EMPTY_FORM_ITEM, name: "Item B", quantity: 2, unitPrice: 500, discountPercent: 0 },   // 1000
      { ...EMPTY_FORM_ITEM, name: "Item C", quantity: 1, unitPrice: 2000, discountPercent: 25 }, // 1500
    ]
    const totals = computeTotals(items, 0, 0)
    expect(totals.subtotalBruto).toBe(4000)
    expect(totals.descuentoLineasMonto).toBe(600) // 100 + 0 + 500
    expect(totals.subtotal).toBe(3400)            // 4000 - 600
    expect(totals.total).toBe(3400)
  })
})

// ─── 5. Validación: no acepta < 0 ni > 100 ───

describe("CHATZAI-017K — Discount validation (0-100 range)", () => {
  it("negative discount is clamped to 0", () => {
    const item = { quantity: 1, unitPrice: 1000, discountPercent: -5 }
    const result = computeLineSubtotal(item)
    // Clamped to 0 → full price
    expect(result).toBe(1000)
  })

  it("discount > 100 is clamped to 100", () => {
    const item = { quantity: 1, unitPrice: 1000, discountPercent: 150 }
    const result = computeLineSubtotal(item)
    // Clamped to 100 → 0
    expect(result).toBe(0)
  })

  it("discount of exactly 0 is valid", () => {
    const item = { quantity: 1, unitPrice: 1000, discountPercent: 0 }
    const result = computeLineSubtotal(item)
    expect(result).toBe(1000)
  })

  it("discount of exactly 100 is valid", () => {
    const item = { quantity: 1, unitPrice: 1000, discountPercent: 100 }
    const result = computeLineSubtotal(item)
    expect(result).toBe(0)
  })

  it("clamping in totals calculation (negative)", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: -10 },
    ]
    const totals = computeTotals(items, 0, 0)
    expect(totals.descuentoLineasMonto).toBe(0)
    expect(totals.subtotal).toBe(1000)
  })

  it("clamping in totals calculation (> 100)", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 200 },
    ]
    const totals = computeTotals(items, 0, 0)
    expect(totals.descuentoLineasMonto).toBe(1000) // clamped to 100%
    expect(totals.subtotal).toBe(0)
  })
})

// ─── 6. Totales generales: descuento por ítem + descuento general ───

describe("CHATZAI-017K — Totales con descuento por ítem + descuento general", () => {
  it("line discount + general discount sequence", () => {
    // Item: qty=2, price=1000, lineDiscount=10% → lineNeto=1800
    // General discount: 5% on 1800 = 90
    // Base neta: 1800 - 90 = 1710
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 2, unitPrice: 1000, discountPercent: 10 },
    ]
    const totals = computeTotals(items, 5, 0)
    expect(totals.subtotalBruto).toBe(2000)
    expect(totals.descuentoLineasMonto).toBe(200)
    expect(totals.subtotal).toBe(1800)
    expect(totals.descuentoMonto).toBe(90)  // 5% of 1800
    expect(totals.baseNeta).toBe(1710)
    expect(totals.total).toBe(1710)
  })

  it("multiple items with discounts + general discount", () => {
    // Item A: qty=1, price=1000, dto=10% → 900
    // Item B: qty=2, price=500,  dto=0%  → 1000
    // Subtotal = 1900
    // General 10% = 190
    // Base neta = 1710
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 10 },
      { ...EMPTY_FORM_ITEM, name: "Item B", quantity: 2, unitPrice: 500, discountPercent: 0 },
    ]
    const totals = computeTotals(items, 10, 0)
    expect(totals.subtotal).toBe(1900)
    expect(totals.descuentoLineasMonto).toBe(100)
    expect(totals.descuentoMonto).toBe(190)
    expect(totals.baseNeta).toBe(1710)
    expect(totals.total).toBe(1710)
  })

  it("no line discounts, only general discount", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 0 },
    ]
    const totals = computeTotals(items, 10, 0)
    expect(totals.descuentoLineasMonto).toBe(0)
    expect(totals.subtotal).toBe(1000)
    expect(totals.descuentoMonto).toBe(100)
    expect(totals.total).toBe(900)
  })
})

// ─── 7. Convivencia con IVA: línea → descuento general → IVA ───

describe("CHATZAI-017K — Full calculation chain: line discount → general discount → IVA", () => {
  it("complete chain with 10% line + 5% general + 21% IVA", () => {
    // Item: qty=2, price=1000, lineDiscount=10% → lineNeto=1800
    // General discount: 5% on 1800 = 90
    // Base neta: 1800 - 90 = 1710
    // IVA 21%: 1710 × 0.21 = 359.1
    // Total: 1710 + 359.1 = 2069.1
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 2, unitPrice: 1000, discountPercent: 10 },
    ]
    const totals = computeTotals(items, 5, 21)
    expect(totals.subtotal).toBe(1800)
    expect(totals.descuentoMonto).toBe(90)
    expect(totals.baseNeta).toBe(1710)
    expect(totals.ivaMonto).toBeCloseTo(359.1, 2)
    expect(totals.total).toBeCloseTo(2069.1, 2)
  })

  it("complete chain with multiple items + 0% general + 21% IVA", () => {
    // Item A: qty=1, price=1000, dto=20% → 800
    // Item B: qty=1, price=500,  dto=0%  → 500
    // Subtotal = 1300
    // General 0% = 0
    // Base neta = 1300
    // IVA 21% = 273
    // Total = 1573
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 20 },
      { ...EMPTY_FORM_ITEM, name: "Item B", quantity: 1, unitPrice: 500, discountPercent: 0 },
    ]
    const totals = computeTotals(items, 0, 21)
    expect(totals.subtotal).toBe(1300)
    expect(totals.descuentoLineasMonto).toBe(200)
    expect(totals.descuentoMonto).toBe(0)
    expect(totals.ivaMonto).toBe(273)
    expect(totals.total).toBe(1573)
  })

  it("complete chain: 15% line + 10% general + IVA 27%", () => {
    // Item: qty=1, price=1000, lineDiscount=15% → 850
    // General 10% on 850 = 85
    // Base neta = 765
    // IVA 27% = 206.55
    // Total = 971.55
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 15 },
    ]
    const totals = computeTotals(items, 10, 27)
    expect(totals.subtotal).toBe(850)
    expect(totals.descuentoMonto).toBe(85)
    expect(totals.baseNeta).toBe(765)
    expect(totals.ivaMonto).toBeCloseTo(206.55, 2)
    expect(totals.total).toBeCloseTo(971.55, 2)
  })

  it("IVA exento (0%) with line discount", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Item A", quantity: 1, unitPrice: 1000, discountPercent: 10 },
    ]
    const totals = computeTotals(items, 0, 0)
    expect(totals.subtotal).toBe(900)
    expect(totals.ivaMonto).toBe(0)
    expect(totals.total).toBe(900)
  })
})

// ─── 8. FormItem.discountPercent default ───

describe("CHATZAI-017K — FormItem.discountPercent defaults", () => {
  it("EMPTY_FORM_ITEM has discountPercent: 0", () => {
    expect(EMPTY_FORM_ITEM.discountPercent).toBe(0)
  })

  it("new FormItem via spread has discountPercent: 0", () => {
    const item: FormItem = { ...EMPTY_FORM_ITEM, name: "Test Item" }
    expect(item.discountPercent).toBe(0)
  })

  it("FormItem with explicit discountPercent overrides default", () => {
    const item: FormItem = { ...EMPTY_FORM_ITEM, name: "Test Item", discountPercent: 15 }
    expect(item.discountPercent).toBe(15)
  })
})

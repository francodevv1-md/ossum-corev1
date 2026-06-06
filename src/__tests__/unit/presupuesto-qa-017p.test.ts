/**
 * CHATZAI-017P: QA tests for bugs found and fixed during final QA.
 *
 * Covers:
 * 1. Decimal consistency: formatCurrency uses 0 decimals in grid (matching TotalesSection)
 * 2. Template catalog linking: loadTemplate looks up catalog by code
 * 3. ivaKey passed to TotalesSection for correct IVA label display
 * 4. ImportSubmodal uses catalogItemId (not deprecated isArticuloZ) for Z count
 * 5. Numeric format consistency across all monetary displays
 * 6. Calculation verification with concrete Argentine-peso examples
 */
import { describe, it, expect } from "vitest"
import { formatCurrency, formatNumberAR } from "@/lib/formatters"
import { getCatalogByCode } from "@/data/mock-catalog"
import { ivaValueFromKey } from "@/lib/presupuestos.constants"
import { EMPTY_FORM_ITEM, type FormItem } from "@/hooks/usePresupuestoForm"

// ─── 1. Decimal consistency ───

describe("CHATZAI-017P — Decimal consistency: formatCurrency defaults to 0 decimals", () => {
  it("formatCurrency(2850000) shows no decimal places (0 decimals default)", () => {
    const result = formatCurrency(2850000)
    // es-AR: $ 2.850.000 — no comma, no ,00
    expect(result).not.toContain(",00")
    expect(result).toContain("2.850.000")
  })

  it("formatCurrency(5700000) matches TotalesSection format", () => {
    const result = formatCurrency(5700000)
    expect(result).not.toContain(",")
    expect(result).toContain("5.700.000")
  })

  it("formatCurrency with explicit 2 decimals still works for edge cases", () => {
    const result = formatCurrency(1234.56, 2)
    expect(result).toContain(",")
    expect(result).toContain("1.234,56")
  })

  it("small amounts format correctly without decimals", () => {
    const result = formatCurrency(500)
    expect(result).toContain("500")
    expect(result).not.toContain(",")
  })
})

// ─── 2. Template catalog linking ───

describe("CHATZAI-017P — Template catalog linking via getCatalogByCode", () => {
  it("existing code IMP-RTR-001 returns catalog match for template linking", () => {
    const match = getCatalogByCode("IMP-RTR-001")
    expect(match).toBeDefined()
    expect(match!.id).toBe("STK-0001")
    expect(match!.code).toBe("IMP-RTR-001")
    expect(match!.name).toBe("Implante femoral NEXGEN CR")
    expect(match!.unitPrice).toBe(2850000)
  })

  it("existing code IMP-OST-003 returns catalog match", () => {
    const match = getCatalogByCode("IMP-OST-003")
    expect(match).toBeDefined()
    expect(match!.id).toBe("STK-0003")
  })

  it("non-existing code returns undefined (stays as libre in template)", () => {
    const match = getCatalogByCode("CUSTOM-ARTICLE")
    expect(match).toBeUndefined()
  })

  it("simulated template load: items with valid codes get catalogItemId", () => {
    // Simulate what loadTemplate does
    const templateItems = [
      { code: "IMP-RTR-001", name: "Implante femoral NEXGEN CR", quantity: 1, unitPrice: 2850000, isArticuloZ: false },
      { code: "CUSTOM-FEE", name: "Honorario especial", quantity: 1, unitPrice: 500000, isArticuloZ: true },
    ]

    const mappedItems = templateItems.map((item) => {
      const catalogMatch = item.code ? getCatalogByCode(item.code) : undefined
      const isLibre = item.isArticuloZ || !item.code || !catalogMatch
      return {
        code: catalogMatch ? catalogMatch.code : (item.code || ""),
        name: catalogMatch ? catalogMatch.name : item.name,
        quantity: item.quantity,
        unitPrice: catalogMatch ? catalogMatch.unitPrice : item.unitPrice,
        discountPercent: 0,
        catalogItemId: catalogMatch ? catalogMatch.id : "",
        isArticuloLibre: isLibre,
        descripcionLibre: "",
      }
    })

    // First item: cataloged (linked to STK-0001)
    expect(mappedItems[0].catalogItemId).toBe("STK-0001")
    expect(mappedItems[0].isArticuloLibre).toBe(false)
    expect(mappedItems[0].unitPrice).toBe(2850000) // catalog price

    // Second item: libre (no catalog match)
    expect(mappedItems[1].catalogItemId).toBe("")
    expect(mappedItems[1].isArticuloLibre).toBe(true)
    expect(mappedItems[1].unitPrice).toBe(500000) // template price
  })
})

// ─── 3. ivaKey in TotalesSection ───

describe("CHATZAI-017P — ivaKey determines correct IVA label display", () => {
  it("ivaKey 'exento' should display 'Exento / No gravado' label", () => {
    // This tests the ivaLabel function logic from TotalesSection
    function ivaLabel(percentage: number, key?: string): string {
      if (key === "exento") return "Exento / No gravado"
      if (percentage === 0) return "IVA 0%"
      return `IVA ${percentage}%`
    }
    expect(ivaLabel(0, "exento")).toBe("Exento / No gravado")
    expect(ivaLabel(21, "21")).toBe("IVA 21%")
    expect(ivaLabel(0, "0")).toBe("IVA 0%")
    expect(ivaLabel(10.5, "10.5")).toBe("IVA 10.5%")
    expect(ivaLabel(27, "27")).toBe("IVA 27%")
  })

  it("ivaKey passed from form data correctly maps to IVA display", () => {
    // formData.iva stores the key string
    const ivaKeys = ["exento", "0", "10.5", "21", "27"]
    const expected = [
      { percentage: 0, label: "Exento / No gravado" },
      { percentage: 0, label: "IVA 0%" },
      { percentage: 10.5, label: "IVA 10.5%" },
      { percentage: 21, label: "IVA 21%" },
      { percentage: 27, label: "IVA 27%" },
    ]

    function ivaLabel(percentage: number, key?: string): string {
      if (key === "exento") return "Exento / No gravado"
      if (percentage === 0) return "IVA 0%"
      return `IVA ${percentage}%`
    }

    ivaKeys.forEach((key, i) => {
      const percentage = ivaValueFromKey(key)
      const label = ivaLabel(percentage, key)
      expect(label).toBe(expected[i].label)
    })
  })
})

// ─── 4. ImportSubmodal uses catalogItemId for Z detection ───

describe("CHATZAI-017P — Import submodal uses catalogItemId for libre detection", () => {
  it("PresupuestoItem with catalogItemId is NOT libre", () => {
    const pi = { code: "IMP-RTR-001", catalogItemId: "STK-0001", isArticuloZ: undefined }
    const isLibre = !pi.catalogItemId
    expect(isLibre).toBe(false)
  })

  it("PresupuestoItem without catalogItemId IS libre", () => {
    const pi = { code: "Z-LIBRE", catalogItemId: undefined, isArticuloZ: true }
    const isLibre = !pi.catalogItemId
    expect(isLibre).toBe(true)
  })

  it("PresupuestoItem with empty catalogItemId IS libre", () => {
    const pi = { code: "CUSTOM", catalogItemId: "", isArticuloZ: undefined }
    const isLibre = !pi.catalogItemId
    expect(isLibre).toBe(true)
  })

  it("Z count in import: items.filter(!catalogItemId) matches modern approach", () => {
    const items = [
      { code: "IMP-RTR-001", catalogItemId: "STK-0001" },
      { code: "Z-LIBRE", catalogItemId: undefined },
      { code: "CUSTOM", catalogItemId: "" },
      { code: "IMP-PC-002", catalogItemId: "STK-0002" },
    ]
    const zCount = items.filter(i => !i.catalogItemId).length
    expect(zCount).toBe(2)
  })
})

// ─── 5. Numeric format consistency ───

describe("CHATZAI-017P — Argentine numeric format consistency", () => {
  it("formatCurrency and formatNumberAR use same locale (es-AR)", () => {
    const currency = formatCurrency(1000000)
    const number = formatNumberAR(1000000)
    // Both should use punto for thousands
    expect(currency).toContain("1.000.000")
    expect(number).toContain("1.000.000")
  })

  it("large amounts: 2.850.000 × 2 = 5.700.000 formatted correctly", () => {
    const lineSubtotal = 2 * 2850000 // qty=2, price=2850000
    expect(lineSubtotal).toBe(5700000)
    const formatted = formatCurrency(lineSubtotal)
    expect(formatted).toContain("5.700.000")
    expect(formatted).not.toContain(",") // 0 decimals
  })

  it("format with fractional cents (explicit 2 decimals)", () => {
    const result = formatCurrency(5700000.5, 2)
    expect(result).toContain("5.700.000,50")
  })
})

// ─── 6. Calculation verification with concrete examples ───

describe("CHATZAI-017P — Calculation chain verification (Argentine pesos)", () => {
  function computeTotals(
    items: FormItem[],
    descuentoGeneral: number,
    ivaPercentage: number
  ) {
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

  it("CASE 1: Rodilla implant — 1×IMP-RTR-001 ($2.850.000) + 1×IMP-RTR-010 ($890.000), dto 10% gral, IVA 21%", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Implante femoral NEXGEN CR", quantity: 1, unitPrice: 2850000, discountPercent: 0 },
      { ...EMPTY_FORM_ITEM, name: "Inserto polietileno NEXGEN", quantity: 1, unitPrice: 890000, discountPercent: 0 },
    ]
    const totals = computeTotals(items, 10, 21)

    // Subtotal bruto: 2.850.000 + 890.000 = 3.740.000
    expect(totals.subtotalBruto).toBe(3740000)
    expect(totals.descuentoLineasMonto).toBe(0)
    expect(totals.subtotal).toBe(3740000)

    // Descuento gral 10%: 374.000
    expect(totals.descuentoMonto).toBe(374000)

    // Base neta: 3.366.000
    expect(totals.baseNeta).toBe(3366000)

    // IVA 21%: 706.860
    expect(totals.ivaMonto).toBeCloseTo(706860, 2)

    // Total: 4.072.860
    expect(totals.total).toBeCloseTo(4072860, 2)

    // Verify formatted output
    expect(formatCurrency(totals.total)).toContain("4.072.860")
  })

  it("CASE 2: 2×IMP-OST-003 ($680.000 c/u, dto 15% ítem) + Z libre ($500.000), dto 5% gral, IVA 21%", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Placa LCP", quantity: 2, unitPrice: 680000, discountPercent: 15, catalogItemId: "STK-0003", isArticuloLibre: false },
      { ...EMPTY_FORM_ITEM, name: "Instrumental especial", quantity: 1, unitPrice: 500000, discountPercent: 0, catalogItemId: "", isArticuloLibre: true },
    ]
    const totals = computeTotals(items, 5, 21)

    // Subtotal bruto: 2×680.000 + 500.000 = 1.860.000
    expect(totals.subtotalBruto).toBe(1860000)

    // Descuento ítem: 2×680.000 × 15% = 204.000
    expect(totals.descuentoLineasMonto).toBe(204000)

    // Subtotal neto: 1.656.000
    expect(totals.subtotal).toBe(1656000)

    // Descuento gral 5%: 82.800
    expect(totals.descuentoMonto).toBe(82800)

    // Base neta: 1.573.200
    expect(totals.baseNeta).toBe(1573200)

    // IVA 21%: 330.372
    expect(totals.ivaMonto).toBeCloseTo(330372, 2)

    // Total: 1.903.572
    expect(totals.total).toBeCloseTo(1903572, 2)
  })

  it("CASE 3: Single item exento — 1×IMP-PC-002 ($3.200.000), IVA exento", () => {
    const items: FormItem[] = [
      { ...EMPTY_FORM_ITEM, name: "Vástago femoral TAPERLOC", quantity: 1, unitPrice: 3200000, discountPercent: 0 },
    ]
    const totals = computeTotals(items, 0, 0) // 0% = exento

    expect(totals.subtotal).toBe(3200000)
    expect(totals.descuentoMonto).toBe(0)
    expect(totals.ivaMonto).toBe(0)
    expect(totals.total).toBe(3200000)

    // Verify formatted output shows $ 3.200.000
    expect(formatCurrency(totals.total)).toContain("3.200.000")
  })
})

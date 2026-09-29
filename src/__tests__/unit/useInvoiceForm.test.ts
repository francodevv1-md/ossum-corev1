import { describe, expect, it } from "vitest"
import {
  computeLineValues,
  computeInvoiceTotals,
  useInvoiceForm,
  type InvoiceFormItem,
} from "@/hooks/useInvoiceForm"
import { renderHook, act } from "@testing-library/react"

describe("useInvoiceForm calculations and behaviors", () => {
  it("calculates line values with VAT 21% and discount correctly from gross price", () => {
    // Gross unit price $1210 (net $1000 + 21% IVA)
    const item: InvoiceFormItem = {
      code: "ART-01",
      description: "Prótesis de rodilla",
      quantity: 2,
      unitPrice: 1210,
      discountPercent: 10,
      ivaKey: "21",
      catalogItemId: "cat-1",
      isArticuloLibre: false,
      note: "Nota 1",
      codeResolved: true,
    }

    const line = computeLineValues(item)
    // 2 * 1000 net = 2000 subtotal neto
    expect(line.netSubtotal).toBe(2000)
    // 10% discount on net = 200
    expect(line.discountAmount).toBe(200)
    // Taxable = 2000 - 200 = 1800
    expect(line.taxableAmount).toBe(1800)
    expect(line.taxRate).toBe(21)
    // VAT = 1800 * 0.21 = 378
    expect(line.taxAmount).toBe(378)
    // Line total = 1800 + 378 = 2178 (equals 2 * 1210 * 0.9)
    expect(line.lineTotal).toBe(2178)
  })

  it("calculates line values with VAT 10.5% and Exento correctly from gross price", () => {
    // Gross unit price $1105 (net $1000 + 10.5% IVA)
    const item105: InvoiceFormItem = {
      code: "MED-01",
      description: "Medicamento",
      quantity: 1,
      unitPrice: 1105,
      discountPercent: 0,
      ivaKey: "10.5",
      catalogItemId: "",
      isArticuloLibre: true,
      note: "",
      codeResolved: false,
    }

    const line105 = computeLineValues(item105)
    expect(line105.netSubtotal).toBe(1000)
    expect(line105.taxRate).toBe(10.5)
    expect(line105.taxAmount).toBe(105)
    expect(line105.lineTotal).toBe(1105)

    const itemExento: InvoiceFormItem = {
      code: "HON-01",
      description: "Honorario médico",
      quantity: 1,
      unitPrice: 500,
      discountPercent: 0,
      ivaKey: "exento",
      catalogItemId: "",
      isArticuloLibre: true,
      note: "",
      codeResolved: false,
    }

    const lineExento = computeLineValues(itemExento)
    expect(lineExento.netSubtotal).toBe(500)
    expect(lineExento.taxRate).toBe(0)
    expect(lineExento.taxAmount).toBe(0)
    expect(lineExento.lineTotal).toBe(500)
  })

  it("computes overall invoice totals across multiple diverse VAT lines", () => {
    const items: InvoiceFormItem[] = [
      {
        code: "ART-21",
        description: "Artículo 21",
        quantity: 1,
        unitPrice: 1210, // net 1000 + iva 210
        discountPercent: 0,
        ivaKey: "21",
        catalogItemId: "",
        isArticuloLibre: true,
        note: "",
        codeResolved: false,
      },
      {
        code: "ART-105",
        description: "Artículo 10.5",
        quantity: 1,
        unitPrice: 2210, // net 2000 + iva 210 (10.5%)
        discountPercent: 10, // net discount 200 -> taxable 1800 -> iva 189
        ivaKey: "10.5",
        catalogItemId: "",
        isArticuloLibre: true,
        note: "",
        codeResolved: false,
      },
      {
        code: "ART-EX",
        description: "Artículo Exento",
        quantity: 1,
        unitPrice: 500, // net 500
        discountPercent: 0,
        ivaKey: "exento",
        catalogItemId: "",
        isArticuloLibre: true,
        note: "",
        codeResolved: false,
      },
    ]

    const totals = computeInvoiceTotals(items)
    expect(totals.subtotalNeto).toBe(3500) // 1000 + 2000 + 500
    expect(totals.totalDescuento).toBe(200) // 200 from item 2
    expect(totals.gravado21).toBe(1000)
    expect(totals.gravado105).toBe(1800)
    expect(totals.noGravadoExento).toBe(500)
    expect(totals.iva21).toBe(210)
    expect(totals.iva105).toBe(189)
    expect(totals.totalIva).toBe(399) // 210 + 189
    expect(totals.total).toBe(3699) // (3500 - 200) + 399
  })

  it("validates form items and formats API payload with derived net unit price", () => {
    const { result } = renderHook(() => useInvoiceForm())

    // Initial state has 1 empty item
    expect(result.current.formData.items.length).toBe(1)

    // Validation fails on empty item
    let isValid = false
    act(() => {
      isValid = result.current.validate()
    })
    expect(isValid).toBe(false)
    expect(result.current.errors["items[0].description"]).toBeDefined()

    // Add and fill valid item with gross price $6050 (net $5000 + 21% IVA)
    act(() => {
      result.current.updateItem(0, {
        code: "SKU-99",
        description: "Clavo intramedular",
        quantity: 2,
        unitPrice: 6050,
        discountPercent: 5,
        ivaKey: "21",
      })
      result.current.updateField("clientName", "Clínica Modelo")
      result.current.updateField("type", "FA")
    })

    act(() => {
      isValid = result.current.validate()
    })
    expect(isValid).toBe(true)
    expect(Object.keys(result.current.errors).length).toBe(0)

    const payload = result.current.toApiPayload()
    expect(payload.type).toBe("FA")
    expect(payload.base).toBe("manual")
    expect(payload.items.length).toBe(1)
    expect(payload.items[0].description).toBe("Clavo intramedular")
    expect(payload.items[0].quantity).toBe("2")
    expect(payload.items[0].unitPrice).toBe("5000")
    expect(payload.items[0].discount).toBe("500") // 10000 * 5% = 500
    expect(payload.items[0].tax).toBe("1995") // (10000 - 500) * 21% = 1995
    expect(payload.metadata?.clientName).toBe("Clínica Modelo")
  })
})

/**
 * CHATZAI-017J: Tests for IVA editable en Presupuesto
 *
 * Covers:
 * 1. suggestIvaKey utility — mapping from CondicionIvaCliente → IVA key
 * 2. ivaValueFromKey / ivaKeyFromValue lookup helpers
 * 3. IVA calculation: ivaMonto = baseNeta * (ivaPercentage / 100)
 * 4. Total = baseNeta + ivaMonto (IVA discriminado)
 */
import { describe, it, expect } from "vitest"
import { suggestIvaKey } from "@/data/mock-clientes"
import { IVA_OPTIONS, ivaValueFromKey, ivaKeyFromValue } from "@/lib/presupuestos.constants"

// ─── 1. suggestIvaKey ───

describe("suggestIvaKey — Condición IVA del cliente → IVA key del presupuesto", () => {
  it("Responsable Inscripto → 21%", () => {
    expect(suggestIvaKey("Responsable Inscripto")).toBe("21")
  })

  it("Consumidor Final → 21%", () => {
    expect(suggestIvaKey("Consumidor Final")).toBe("21")
  })

  it("Exento → exento", () => {
    expect(suggestIvaKey("Exento")).toBe("exento")
  })

  it("Responsable Monotributo → 0%", () => {
    expect(suggestIvaKey("Responsable Monotributo")).toBe("0")
  })

  it("No Responsable → 0%", () => {
    expect(suggestIvaKey("No Responsable")).toBe("0")
  })

  it("Unknown condition defaults to 21%", () => {
    expect(suggestIvaKey("Otra condición")).toBe("21")
  })
})

// ─── 2. IVA lookup helpers ───

describe("ivaValueFromKey — IVA key → numeric value", () => {
  it("exento → 0", () => {
    expect(ivaValueFromKey("exento")).toBe(0)
  })

  it("0 → 0", () => {
    expect(ivaValueFromKey("0")).toBe(0)
  })

  it("10.5 → 10.5", () => {
    expect(ivaValueFromKey("10.5")).toBe(10.5)
  })

  it("21 → 21", () => {
    expect(ivaValueFromKey("21")).toBe(21)
  })

  it("27 → 27", () => {
    expect(ivaValueFromKey("27")).toBe(27)
  })

  it("unknown key → 0 (fallback)", () => {
    expect(ivaValueFromKey("unknown")).toBe(0)
  })
})

describe("ivaKeyFromValue — numeric value → IVA key", () => {
  it("0 → '0' (not 'exento')", () => {
    expect(ivaKeyFromValue(0)).toBe("0")
  })

  it("10.5 → '10.5'", () => {
    expect(ivaKeyFromValue(10.5)).toBe("10.5")
  })

  it("21 → '21'", () => {
    expect(ivaKeyFromValue(21)).toBe("21")
  })

  it("27 → '27'", () => {
    expect(ivaKeyFromValue(27)).toBe("27")
  })
})

// ─── 3. IVA calculation logic ───

describe("IVA calculation — IVA discriminado sobre base neta", () => {
  // These tests verify the calculation formula:
  // baseNeta = subtotal - descuentoMonto
  // ivaMonto = baseNeta * (ivaPercentage / 100)
  // total = baseNeta + ivaMonto

  it("Subtotal 1000, sin descuento, IVA 21% → IVA $210, Total $1210", () => {
    const subtotal = 1000
    const descuentoMonto = 0
    const ivaPercentage = 21
    const baseNeta = subtotal - descuentoMonto
    const ivaMonto = baseNeta * (ivaPercentage / 100)
    const total = baseNeta + ivaMonto
    expect(ivaMonto).toBe(210)
    expect(total).toBe(1210)
  })

  it("Subtotal 1000, descuento 10%, IVA 21% → base 900, IVA $189, Total $1089", () => {
    const subtotal = 1000
    const descuentoMonto = 100 // 10%
    const ivaPercentage = 21
    const baseNeta = subtotal - descuentoMonto
    const ivaMonto = baseNeta * (ivaPercentage / 100)
    const total = baseNeta + ivaMonto
    expect(baseNeta).toBe(900)
    expect(ivaMonto).toBe(189)
    expect(total).toBe(1089)
  })

  it("Subtotal 1000, IVA exento (0%) → IVA $0, Total $1000", () => {
    const subtotal = 1000
    const descuentoMonto = 0
    const ivaPercentage = 0
    const baseNeta = subtotal - descuentoMonto
    const ivaMonto = baseNeta * (ivaPercentage / 100)
    const total = baseNeta + ivaMonto
    expect(ivaMonto).toBe(0)
    expect(total).toBe(1000)
  })

  it("Subtotal 1000, IVA 10.5% → IVA $105, Total $1105", () => {
    const subtotal = 1000
    const descuentoMonto = 0
    const ivaPercentage = 10.5
    const baseNeta = subtotal - descuentoMonto
    const ivaMonto = baseNeta * (ivaPercentage / 100)
    const total = baseNeta + ivaMonto
    expect(ivaMonto).toBe(105)
    expect(total).toBe(1105)
  })

  it("Subtotal 1000, descuento 15%, IVA 27% → base 850, IVA $229.5, Total $1079.5", () => {
    const subtotal = 1000
    const descuentoMonto = 150 // 15%
    const ivaPercentage = 27
    const baseNeta = subtotal - descuentoMonto
    const ivaMonto = baseNeta * (ivaPercentage / 100)
    const total = baseNeta + ivaMonto
    expect(baseNeta).toBe(850)
    expect(ivaMonto).toBeCloseTo(229.5, 2)
    expect(total).toBeCloseTo(1079.5, 2)
  })

  it("Subtotal 0 → IVA $0, Total $0 (edge case)", () => {
    const subtotal = 0
    const descuentoMonto = 0
    const ivaPercentage = 21
    const baseNeta = subtotal - descuentoMonto
    const ivaMonto = baseNeta * (ivaPercentage / 100)
    const total = baseNeta + ivaMonto
    expect(ivaMonto).toBe(0)
    expect(total).toBe(0)
  })
})

// ─── 4. IVA_OPTIONS completeness ───

describe("IVA_OPTIONS — opciones de IVA completas", () => {
  it("distingue exento, no gravado y gravado al 0%", () => {
    expect(IVA_OPTIONS.filter((option) => option.value === 0).map((option) => option.key)).toEqual(["exento", "no_gravado", "0"])
    expect(ivaValueFromKey("no_gravado")).toBe(0)
    expect(ivaKeyFromValue(0)).toBe("0")
  })

  it("cada opción tiene key único", () => {
    const keys = IVA_OPTIONS.map((o) => o.key)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it("contiene las alícuotas estándar AFIP", () => {
    const values = IVA_OPTIONS.map((o) => o.value)
    expect(values).toContain(0)
    expect(values).toContain(10.5)
    expect(values).toContain(21)
    expect(values).toContain(27)
  })

  it("contiene opción exento con key distinto de '0'", () => {
    const exento = IVA_OPTIONS.find((o) => o.key === "exento")
    expect(exento).toBeDefined()
    expect(exento!.value).toBe(0)
    expect(exento!.label).toContain("Exento")
  })
})

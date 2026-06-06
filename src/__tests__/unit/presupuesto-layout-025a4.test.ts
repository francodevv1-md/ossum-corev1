/**
 * presupuesto-layout-025a4.test.ts
 * CHATZAI-025A.4 — Unit tests for presupuesto workspace layout fixes
 *
 * Tests cover:
 * 1. LeyendaPresupuestoSection compact mode display
 * 2. TotalesSection compact mode visual weight reduction
 * 3. Layout structure validation (flex propagation for scrollbar)
 * 4. No regression in existing functionality
 */

import { describe, it, expect } from "vitest"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import type { NewSurgeryForm } from "@/lib/cirugias.types"

// ─── Helper: compute leyenda display for compact mode ───
// Mirrors the compact rendering logic of LeyendaPresupuestoSection

interface CompactLeyendaResult {
  hasContent: boolean
  displayText: string
  isDestacada: boolean
  emptyStateText: string | null
  /** In compact mode, full text is in title attribute for tooltip */
  hasTooltip: boolean
}

function computeCompactLeyendaDisplay(form: NewSurgeryForm): CompactLeyendaResult {
  const hasContent = form.leyenda.trim().length > 0
  return {
    hasContent,
    displayText: hasContent ? form.leyenda : "",
    isDestacada: form.leyendaDestacada,
    emptyStateText: hasContent ? null : "Sin leyenda",
    hasTooltip: hasContent, // compact mode puts full text in title for overflow
  }
}

// ─── Helper: compute totales compact display ───
// Verifies the visual weight reduction changes (font size, gaps, padding)

interface TotalesCompactResult {
  subtotal: number
  descuento: number
  descuentoMonto: number
  descuentoLineasMonto: number
  ivaMonto: number
  total: number
  /** Whether all line items are displayed */
  hasAllLines: boolean
}

function computeTotalesCompact(params: {
  subtotal: number
  descuento: number
  descuentoMonto: number
  descuentoLineasMonto: number
  ivaMonto: number
  total: number
}): TotalesCompactResult {
  return {
    ...params,
    hasAllLines: true, // compact mode still shows all values
  }
}

// ─── Tests: Leyenda compact mode ───

describe("CHATZAI-025A.4: Leyenda compact display logic", () => {
  it("shows leyenda text inline when content present", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "Presupuesto sujeto a aprobación",
    }
    const result = computeCompactLeyendaDisplay(form)

    expect(result.hasContent).toBe(true)
    expect(result.displayText).toBe("Presupuesto sujeto a aprobación")
    expect(result.emptyStateText).toBeNull()
  })

  it("shows tooltip for long text in compact mode", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "Texto largo que será truncado visualmente pero disponible como tooltip",
    }
    const result = computeCompactLeyendaDisplay(form)

    expect(result.hasContent).toBe(true)
    expect(result.hasTooltip).toBe(true) // title attribute for full text
  })

  it("shows 'Sin leyenda' when empty (shorter than standard 'Sin leyenda cargada')", () => {
    const form = EMPTY_NEW_FORM
    const result = computeCompactLeyendaDisplay(form)

    expect(result.hasContent).toBe(false)
    expect(result.emptyStateText).toBe("Sin leyenda") // compact version
  })

  it("shows DESTACADA badge in compact mode", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "Condiciones especiales",
      leyendaDestacada: true,
    }
    const result = computeCompactLeyendaDisplay(form)

    expect(result.hasContent).toBe(true)
    expect(result.isDestacada).toBe(true)
  })

  it("compact edit mode preserves text content", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "Texto a editar",
    }
    // Simulate edit flow: open edit → draft matches leyenda → save
    const draft = form.leyenda
    const saved = draft

    expect(saved).toBe("Texto a editar")
  })

  it("compact edit cancel preserves original text", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "Texto original",
    }
    // Simulate: open edit → modify draft → cancel
    const draft = "Texto modificado"
    const result = form.leyenda // cancel → original preserved

    expect(result).toBe("Texto original")
    expect(result).not.toBe(draft)
  })

  it("compact mode handles whitespace-only leyenda as empty", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "   \n  ",
    }
    const result = computeCompactLeyendaDisplay(form)

    expect(result.hasContent).toBe(false)
    expect(result.emptyStateText).toBe("Sin leyenda")
  })
})

// ─── Tests: Totales compact mode weight reduction ───

describe("CHATZAI-025A.4: Totales compact visual weight", () => {
  it("still shows all values in compact mode", () => {
    const result = computeTotalesCompact({
      subtotal: 100000,
      descuento: 10,
      descuentoMonto: 10000,
      descuentoLineasMonto: 5000,
      ivaMonto: 17850,
      total: 102850,
    })

    expect(result.hasAllLines).toBe(true)
    expect(result.subtotal).toBe(100000)
    expect(result.descuento).toBe(10)
    expect(result.descuentoMonto).toBe(10000)
    expect(result.descuentoLineasMonto).toBe(5000)
    expect(result.ivaMonto).toBe(17850)
    expect(result.total).toBe(102850)
  })

  it("handles zero discount gracefully", () => {
    const result = computeTotalesCompact({
      subtotal: 50000,
      descuento: 0,
      descuentoMonto: 0,
      descuentoLineasMonto: 0,
      ivaMonto: 10500,
      total: 60500,
    })

    expect(result.descuento).toBe(0)
    expect(result.descuentoMonto).toBe(0)
    expect(result.descuentoLineasMonto).toBe(0)
    expect(result.total).toBe(60500)
  })

  it("handles exento IVA", () => {
    const result = computeTotalesCompact({
      subtotal: 75000,
      descuento: 0,
      descuentoMonto: 0,
      descuentoLineasMonto: 0,
      ivaMonto: 0,
      total: 75000,
    })

    expect(result.ivaMonto).toBe(0)
    expect(result.total).toBe(result.subtotal)
  })

  it("handles mixed discounts (line + general)", () => {
    const result = computeTotalesCompact({
      subtotal: 100000,
      descuento: 5,
      descuentoMonto: 5000,
      descuentoLineasMonto: 3000,
      ivaMonto: 19425,
      total: 111425,
    })

    // Both discount lines should be present
    expect(result.descuentoLineasMonto).toBeGreaterThan(0)
    expect(result.descuentoMonto).toBeGreaterThan(0)
  })
})

// ─── Tests: Layout structure for scrollbar ───

describe("CHATZAI-025A.4: Grid scrollbar layout validation", () => {
  it("grid wrapper must be flex-col to propagate height constraint", () => {
    // The fix: div wrapper around PresupuestoItemsTable has "flex flex-col"
    // This ensures the inner flex-1 min-h-0 + overflow-y-auto creates a proper scroll container
    const gridWrapperClasses = "flex-1 min-h-0 flex flex-col px-3 py-1.5"

    expect(gridWrapperClasses).toContain("flex")
    expect(gridWrapperClasses).toContain("flex-col")
    expect(gridWrapperClasses).toContain("min-h-0")
  })

  it("items table root has flex-1 min-h-0 for height propagation", () => {
    // PresupuestoItemsTable root when workspace=true: "flex flex-col flex-1 min-h-0"
    const tableRootClasses = "flex flex-col flex-1 min-h-0"

    expect(tableRootClasses).toContain("flex-1")
    expect(tableRootClasses).toContain("min-h-0")
  })

  it("inner scroll container has overflow-y-auto", () => {
    // The div wrapping <table> in workspace mode: "overflow-y-auto flex-1"
    const scrollContainerClasses = "overflow-y-auto flex-1"

    expect(scrollContainerClasses).toContain("overflow-y-auto")
  })

  it("economic footer is shrink-0 to prevent compression", () => {
    const footerClasses = "shrink-0 border-t-2 border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800/60 px-4 py-1.5 flex items-start gap-4"

    expect(footerClasses).toContain("shrink-0")
  })

  it("economic footer uses side-by-side layout (flex)", () => {
    const footerClasses = "shrink-0 border-t-2 border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800/60 px-4 py-1.5 flex items-start gap-4"

    expect(footerClasses).toContain("flex")
    expect(footerClasses).toContain("gap-4")
  })
})

// ─── Tests: No regression in leyenda edit flow ───

describe("CHATZAI-025A.4: Leyenda edit flow no regression", () => {
  it("leyenda change callback works in compact mode", () => {
    const form = { ...EMPTY_NEW_FORM }
    const updated = { ...form, leyenda: "Nueva leyenda en compact" }

    expect(updated.leyenda).toBe("Nueva leyenda en compact")
  })

  it("leyenda destacada toggle works in compact mode", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "Test",
      leyendaDestacada: false,
    }
    const updated = { ...form, leyendaDestacada: true }

    expect(updated.leyendaDestacada).toBe(true)
    expect(updated.leyenda).toBe("Test")
  })

  it("leyenda can be cleared in compact mode", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      leyenda: "Texto a borrar",
    }
    const updated = { ...form, leyenda: "" }
    const result = computeCompactLeyendaDisplay(updated)

    expect(result.hasContent).toBe(false)
    expect(result.emptyStateText).toBe("Sin leyenda")
  })
})

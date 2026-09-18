/**
 * wizard-validation.test.ts
 * CHATZAI-017D — Unit tests for wizard step validation logic
 *
 * Tests that validation functions correctly block advancing
 * when required fields are missing.
 */

import { describe, it, expect } from "vitest"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import type { NewSurgeryForm } from "@/lib/cirugias.types"

// ─── Replicate Step 0 validation logic (same as NewSurgeryDialog) ───
function validateStep0(form: NewSurgeryForm): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.patient.trim()) errs.patient = "Paciente es obligatorio"
  if (!form.surgeon.trim()) errs.surgeon = "Médico es obligatorio"
  if (!form.institution.trim()) errs.institution = "Institución es obligatoria"
  if (!form.client) errs.client = "Cliente / Pagador es obligatorio"
  return errs
}

// ─── Replicate Step 1 (Presupuesto) validation logic ───
interface PRFormLike {
  fechaEmision: string
  vigencia: string
  listaPrecios: string
  items: { name: string; unitPrice: number }[]
}

function validateStep1(prForm: PRFormLike, createPRNow: boolean): Record<string, string> {
  if (!createPRNow) return {} // "Sin presupuesto" → no validation
  const errs: Record<string, string> = {}
  if (!prForm.fechaEmision) errs.fechaEmision = "Fecha emisión es obligatoria"
  if (!prForm.vigencia) errs.vigencia = "Vigencia es obligatoria"
  if (!prForm.listaPrecios) errs.listaPrecios = "Lista de precios es obligatoria"
  if (prForm.items.length === 0) {
    errs.items = "Debe agregar al menos un artículo"
  } else {
    const itemErrs: string[] = []
    prForm.items.forEach((item, idx) => {
      if (!item.name.trim()) itemErrs.push(`Art. ${idx + 1}: nombre requerido`)
      if (item.unitPrice <= 0) itemErrs.push(`Art. ${idx + 1}: precio > 0`)
    })
    if (itemErrs.length > 0) errs.items = itemErrs.join("; ")
  }
  return errs
}

describe("Wizard Step 0 validation", () => {
  it("fails when all fields are empty (default form)", () => {
    const errs = validateStep0(EMPTY_NEW_FORM)
    expect(errs.patient).toBeTruthy()
    expect(errs.surgeon).toBeTruthy()
    expect(errs.institution).toBeTruthy()
    expect(errs.client).toBeTruthy()
  })

  it("fails when only patient is filled", () => {
    const form = { ...EMPTY_NEW_FORM, patient: "Juan Pérez" }
    const errs = validateStep0(form)
    expect(errs.patient).toBeUndefined()
    expect(errs.surgeon).toBeTruthy()
    expect(errs.institution).toBeTruthy()
    expect(errs.client).toBeTruthy()
  })

  it("passes when all required fields are filled", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      patient: "Juan Pérez",
      surgeon: "Dr. Gómez",
      institution: "Hospital Italiano",
      client: "OSDE",
    }
    const errs = validateStep0(form)
    expect(Object.keys(errs).length).toBe(0)
  })

  it("does not require optional fields (provincia, vendedor, etc.)", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      patient: "Juan Pérez",
      surgeon: "Dr. Gómez",
      institution: "Hospital Italiano",
      client: "OSDE",
      // provincia, localidad, vendedor, etc. left as defaults
    }
    const errs = validateStep0(form)
    expect(Object.keys(errs).length).toBe(0)
  })
})

describe("Wizard Step 1 (Presupuesto) validation", () => {
  it("passes when 'Sin presupuesto' is selected", () => {
    const errs = validateStep1(
      { fechaEmision: "", vigencia: "", listaPrecios: "", items: [] },
      false // createPRNow = false
    )
    expect(Object.keys(errs).length).toBe(0)
  })

  it("fails when 'Crear presupuesto ahora' but no conditions filled", () => {
    const errs = validateStep1(
      { fechaEmision: "", vigencia: "", listaPrecios: "", items: [] },
      true
    )
    expect(errs.fechaEmision).toBeTruthy()
    expect(errs.vigencia).toBeTruthy()
    expect(errs.listaPrecios).toBeTruthy()
    expect(errs.items).toBeTruthy()
  })

  it("fails when conditions filled but no items", () => {
    const errs = validateStep1(
      { fechaEmision: "2026-05-16", vigencia: "30 días", listaPrecios: "LP-OSDE-2026-04", items: [] },
      true
    )
    expect(errs.fechaEmision).toBeUndefined()
    expect(errs.vigencia).toBeUndefined()
    expect(errs.listaPrecios).toBeUndefined()
    expect(errs.items).toBeTruthy()
  })

  it("fails when items exist but have empty names", () => {
    const errs = validateStep1(
      { fechaEmision: "2026-05-16", vigencia: "30 días", listaPrecios: "LP-OSDE-2026-04", items: [{ name: "", unitPrice: 100 }] },
      true
    )
    expect(errs.items).toContain("nombre requerido")
  })

  it("fails when items exist but have zero prices", () => {
    const errs = validateStep1(
      { fechaEmision: "2026-05-16", vigencia: "30 días", listaPrecios: "LP-OSDE-2026-04", items: [{ name: "Implante", unitPrice: 0 }] },
      true
    )
    expect(errs.items).toContain("precio > 0")
  })

  it("passes when all conditions and valid items are present", () => {
    const errs = validateStep1(
      { fechaEmision: "2026-05-16", vigencia: "30 días", listaPrecios: "LP-OSDE-2026-04", items: [{ name: "Implante femoral", unitPrice: 2850000 }] },
      true
    )
    expect(Object.keys(errs).length).toBe(0)
  })
})

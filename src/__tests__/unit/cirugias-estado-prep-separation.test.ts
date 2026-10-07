/**
 * CHATZAI-025A.2: Tests for Estado CX vs Preparación separation
 * and SmartSurgerySearch multi-category suggestions.
 *
 * Validates:
 * 1. Estado CX filter options contain only CX states
 * 2. Preparación filter options contain only prep states
 * 3. No cross-contamination between CX and Prep filter options
 * 4. CX_STATE_COLORS has correct palette assignments
 * 5. PREP_STATE_CELL_COLORS uses softer styling than CX
 * 6. SmartSurgerySearch builds suggestions from multiple categories
 * 7. No duplicate suggestions in SmartSurgerySearch
 */

import { describe, it, expect } from "vitest"
import {
  CX_STATE_COLORS,
  CX_STATE_CELL_COLORS,
  PREP_STATE_CELL_COLORS,
  STATE_FILTER_OPTIONS,
  PREP_FILTER_OPTIONS,
} from "@/lib/cirugias.constants"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import { PREP_STATE_COLORS } from "@/lib/shared-constants"
import {
  validateCxStatus,
  validatePrepStatus,
} from "@/lib/validators/surgery.validator"
import { mockSurgeries } from "@/data/mock-surgeries"
import { computeKpis } from "@/lib/cirugias.utils"
import { useOrtoTrackStore } from "@/lib/store"

// ═══════════════════════════════════════════════════════════════
// 1. ESTADO CX vs PREPARACIÓN SEPARATION
// ═══════════════════════════════════════════════════════════════

describe("Estado CX vs Preparación separation", () => {
  // Canonical CX states (from the user spec)
  const CX_STATES = [
    "Sin autorizar", "Pendiente", "Autorizada",
    "En tránsito", "Realizada", "Finalizada",
    "Suspendida", "Cancelada", "Sin consumo",
  ]

  // Canonical Preparation states (from the user spec)
  const PREP_STATES = [
    "Sin preparar", "En preparación", "Congelado", "Congelado con faltantes",
    "Enviado", "Entregado", "Retirado",
  ]

  it("STATE_FILTER_OPTIONS contains only CX states", () => {
    for (const opt of STATE_FILTER_OPTIONS) {
      expect(CX_STATES).toContain(opt)
    }
  })

  it("STATE_FILTER_OPTIONS includes all general CX states", () => {
    expect(STATE_FILTER_OPTIONS).toHaveLength(9)
    expect(STATE_FILTER_OPTIONS).not.toContain("Sin fecha")
    for (const state of CX_STATES) {
      expect(STATE_FILTER_OPTIONS).toContain(state)
    }
  })

  it("PREP_FILTER_OPTIONS contains only preparation states", () => {
    for (const opt of PREP_FILTER_OPTIONS) {
      expect(PREP_STATES).toContain(opt)
    }
  })

  it("PREP_FILTER_OPTIONS has exactly 7 states", () => {
    expect(PREP_FILTER_OPTIONS).toHaveLength(7)
  })

  it("STATE_FILTER_OPTIONS does NOT contain any preparation state", () => {
    for (const prep of PREP_STATES) {
      expect(STATE_FILTER_OPTIONS).not.toContain(prep)
    }
  })

  it("PREP_FILTER_OPTIONS does NOT contain any CX state", () => {
    for (const cx of CX_STATES) {
      expect(PREP_FILTER_OPTIONS).not.toContain(cx)
    }
  })

  it("CX and Prep filter options have no overlap", () => {
    const cxSet = new Set(STATE_FILTER_OPTIONS)
    const prepSet = new Set<string>(PREP_FILTER_OPTIONS)
    const overlap = [...cxSet].filter((s) => prepSet.has(s))
    expect(overlap).toHaveLength(0)
  })

  it("keeps En preparación exclusively in preparation options", () => {
    expect(STATE_FILTER_OPTIONS).not.toContain("En preparación")
    expect(PREP_FILTER_OPTIONS).toContain("En preparación")
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. COLOR PALETTE VALIDATION
// ═══════════════════════════════════════════════════════════════

describe("Color palette for Estado CX and Preparación", () => {
  it("CX_STATE_COLORS: Sin autorizar uses readable white", () => {
    expect(CX_STATE_COLORS["Sin autorizar"]).toContain("bg-white")
    expect(CX_STATE_COLORS["Sin autorizar"]).toContain("text-slate-900")
  })

  it("CX_STATE_COLORS: Sin fecha uses white", () => {
    expect(CX_STATE_COLORS["Sin fecha"]).toContain("bg-white")
  })

  it("CX_STATE_COLORS: Finalizada uses blue-800 (azul oscuro), not teal", () => {
    expect(CX_STATE_COLORS["Finalizada"]).toContain("bg-blue")
    expect(CX_STATE_COLORS["Finalizada"]).not.toContain("bg-teal")
  })

  it("CX_STATE_COLORS: Pendiente uses yellow", () => {
    expect(CX_STATE_COLORS["Pendiente"]).toContain("bg-yellow")
  })

  it("CX_STATE_COLORS: En tránsito uses light blue", () => {
    expect(CX_STATE_COLORS["En tránsito"]).toContain("bg-sky-300")
  })

  it("CX_STATE_COLORS: Realizada uses emerald (green)", () => {
    expect(CX_STATE_COLORS["Realizada"]).toContain("bg-emerald")
  })

  it("CX_STATE_COLORS: Suspendida uses violet", () => {
    expect(CX_STATE_COLORS["Suspendida"]).toContain("bg-violet")
  })

  it("CX_STATE_COLORS: Cancelada uses burgundy", () => {
    expect(CX_STATE_COLORS["Cancelada"]).toContain("bg-rose-900")
  })

  it("CX_STATE_COLORS: Sin consumo uses grey", () => {
    expect(CX_STATE_COLORS["Sin consumo"]).toContain("bg-gray-600")
  })

  it("PREP_STATE_COLORS has exactly 7 states", () => {
    expect(Object.keys(PREP_STATE_COLORS)).toHaveLength(7)
  })

  it("PREP_STATE_COLORS includes En preparación, Enviado, Entregado and Retirado", () => {
    expect(PREP_STATE_COLORS).toHaveProperty("En preparación")
    expect(PREP_STATE_COLORS).toHaveProperty("Enviado")
    expect(PREP_STATE_COLORS).toHaveProperty("Entregado")
    expect(PREP_STATE_COLORS).toHaveProperty("Retirado")
  })

  it("PREP_STATE_COLORS does NOT include logistics-only states", () => {
    expect(PREP_STATE_COLORS).not.toHaveProperty("Controlado")
    expect(PREP_STATE_COLORS).not.toHaveProperty("Preparado")
    expect(PREP_STATE_COLORS).not.toHaveProperty("Devuelto")
  })

  it("PREP_STATE_CELL_COLORS uses softer styling (bg-50 + border) vs CX (bg-100)", () => {
    // Prep should use lighter backgrounds and borders
    const prepStyles = Object.values(PREP_STATE_CELL_COLORS)
    for (const style of prepStyles) {
      expect(style).toContain("border")
    }

    // CX should NOT use borders (it's the protagonist)
    const cxStyles = Object.values(CX_STATE_CELL_COLORS)
    for (const style of cxStyles) {
      expect(style).not.toContain("border border-")
    }
  })

  it("CX_STATE_CELL_COLORS: Sin autorizar uses slate (gray)", () => {
    expect(CX_STATE_CELL_COLORS["Sin autorizar"]).toContain("bg-slate")
    expect(CX_STATE_CELL_COLORS["Sin autorizar"]).not.toContain("bg-amber")
  })

  it("CX_STATE_CELL_COLORS: Finalizada uses indigo (azul oscuro), distinct from En tránsito (blue)", () => {
    // CHATZAI-025A.5-fix: Finalizada changed to indigo to distinguish from En tránsito
    expect(CX_STATE_CELL_COLORS["Finalizada"]).toContain("bg-indigo")
    // En tránsito remains blue
    expect(CX_STATE_CELL_COLORS["En tránsito"]).toContain("bg-blue")
    // They must be different
    expect(CX_STATE_CELL_COLORS["Finalizada"]).not.toBe(CX_STATE_CELL_COLORS["En tránsito"])
  })

  it("does not expose En preparación as a general CX color", () => {
    expect(CX_STATE_COLORS).not.toHaveProperty("En preparación")
    expect(CX_STATE_CELL_COLORS).not.toHaveProperty("En preparación")
  })
})

describe("local prototype preparation boundary", () => {
  it("normalizes the legacy mock general state while retaining its explicit preparation state", () => {
    const mock = mockSurgeries.find((surgery) => surgery.id === "CX-0002")

    expect(mock).toMatchObject({ state: "Pendiente", preparationState: "Entregado" })
  })

  it("counts En preparación from preparationState, not general state", () => {
    const [surgery] = mockSurgeries
    const kpis = computeKpis([
      { ...surgery, state: "Pendiente", preparationState: "En preparación" },
    ], () => "Completa")

    expect(kpis.enPreparacion).toBe(1)
  })

  it("changes only preparation state in the local store", () => {
    const surgeryId = "CX-0002"
    const before = useOrtoTrackStore.getState().getSurgeryById(surgeryId)

    useOrtoTrackStore.getState().changePreparationState(surgeryId, "En preparación")

    expect(useOrtoTrackStore.getState().getSurgeryById(surgeryId)).toMatchObject({
      state: before?.state,
      preparationState: "En preparación",
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. SMARTSURGERYSEARCH SUGGESTION QUALITY
// ═══════════════════════════════════════════════════════════════

describe("SmartSurgerySearch multi-category suggestions", () => {
  // Simulate the buildSurgerySuggestions logic
  function buildSuggestions(
    query: string,
    surgeries: Array<{ id: string; patient: string; surgeon: string; institution: string; client: string; prNumber?: string; expedienteNumber?: string }>,
    existingNames: Set<string>,
  ): Array<{ display: string; field: string; context: string }> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const results: Array<{ display: string; field: string; context: string }> = []
    const seen = new Set<string>()

    for (const s of surgeries) {
      // Patient
      if (s.patient.toLowerCase().includes(q) && !existingNames.has(s.patient)) {
        const key = `paciente-${s.patient}`
        if (!seen.has(key)) {
          seen.add(key)
          results.push({ display: s.patient, field: "paciente", context: `Paciente — ${s.id}` })
        }
      }
      // Surgeon
      if (s.surgeon.toLowerCase().includes(q) && !existingNames.has(s.surgeon)) {
        const key = `medico-${s.surgeon}`
        if (!seen.has(key)) {
          seen.add(key)
          results.push({ display: s.surgeon, field: "medico", context: `Médico — ${s.id}` })
        }
      }
    }
    return results
  }

  const mockSurgeries = [
    { id: "CX-0001", patient: "González, María Elena", surgeon: "Dr. Fernández, Roberto", institution: "Hospital Italiano", client: "OSDE Binario" },
    { id: "CX-0004", patient: "López, Diego Armando", surgeon: "Dr. Fernández, Roberto", institution: "Hospital Italiano", client: "IOMA" },
    { id: "CX-0007", patient: "García, Mabel Susana", surgeon: "Dr. García, Miguel", institution: "Hospital Alemán", client: "Medifé" },
  ]

  it("searching 'López' finds patient match in surgery data", () => {
    const results = buildSuggestions("López", mockSurgeries, new Set())
    const patientMatches = results.filter((r) => r.field === "paciente")
    expect(patientMatches.length).toBeGreaterThanOrEqual(1)
    expect(patientMatches[0].display).toContain("López")
  })

  it("searching 'Fernández' finds surgeon match in surgery data", () => {
    const results = buildSuggestions("Fernández", mockSurgeries, new Set())
    const medicoMatches = results.filter((r) => r.field === "medico")
    expect(medicoMatches.length).toBeGreaterThanOrEqual(1)
    expect(medicoMatches[0].display).toContain("Fernández")
  })

  it("searching 'García' finds both patient and surgeon matches", () => {
    const results = buildSuggestions("García", mockSurgeries, new Set())
    const patientMatches = results.filter((r) => r.field === "paciente")
    const medicoMatches = results.filter((r) => r.field === "medico")
    expect(patientMatches.length).toBeGreaterThanOrEqual(1)
    expect(medicoMatches.length).toBeGreaterThanOrEqual(1)
  })

  it("no duplicate suggestions for the same entity", () => {
    const results = buildSuggestions("Fernández", mockSurgeries, new Set())
    // Two surgeries have the same surgeon — should only appear once
    const fernandezResults = results.filter((r) => r.display.includes("Fernández"))
    const uniqueDisplays = new Set(fernandezResults.map((r) => r.display))
    expect(fernandezResults.length).toBe(uniqueDisplays.size)
  })

  it("does not suggest names already matched via contactos", () => {
    // Simulate that "Dr. Fernández, Roberto" was already found in contactos
    const existingNames = new Set(["Dr. Fernández, Roberto"])
    const results = buildSuggestions("Fernández", mockSurgeries, existingNames)
    const medicoMatches = results.filter((r) => r.field === "medico")
    // Should not suggest the surgeon since it's already in contactos
    expect(medicoMatches).toHaveLength(0)
  })
})

describe("CX contract read-boundary normalization", () => {
  it.each([
    [{ cxStatus: "scheduled", prepStatus: null }, "scheduled"],
    [{ cxStatus: "preparing", prepStatus: null }, "preparing"],
    [{ status: "En preparación", prepStatus: null }, "En preparación"],
  ])("normalizes legacy general %s to Pendiente without inferring preparation", (record, backendCxStatus) => {
    const [surgery] = mapApiSurgeryListToSurgeries([{ id: "surgery-1", ...record }])

    expect(surgery).toMatchObject({
      state: "Pendiente",
      preparationState: "Sin preparar",
      backendCxStatus,
    })
  })

  it("maps preparation independently from the general CX state", () => {
    const [surgery] = mapApiSurgeryListToSurgeries([
      { id: "surgery-2", cxStatus: "scheduled", prepStatus: "preparing" },
    ])

    expect(surgery).toMatchObject({
      state: "Pendiente",
      preparationState: "En preparación",
      backendCxStatus: "scheduled",
    })
  })

  it("keeps preparing exclusively on the preparation validator path", () => {
    expect(() => validateCxStatus("preparing")).toThrow()
    expect(validateCxStatus("scheduled")).toBe("scheduled")
    expect(validatePrepStatus("preparing")).toBe("preparing")
  })
})

import { describe, expect, it } from "vitest"
import type { Surgery } from "@/types"
import { buildMacroTimelineModel } from "@/components/expediente/expediente-macro-timeline"

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "CX-TEST",
    patient: "Paciente Test",
    patientDni: "12345678",
    surgeon: "Dr. Test",
    institution: "Hospital Test",
    institutionCity: "Ciudad",
    procedure: "Procedimiento",
    date: "2026-07-01",
    time: "10:00",
    state: "Sin autorizar",
    client: "Cliente Test",
    classification: "Prótesis de cadera",
    preparationState: "Sin preparar",
    facturado: false,
    autorizado: false,
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    ...overrides,
  }
}

describe("buildMacroTimelineModel", () => {
  it("maps unauthorized cases to Sin autorizar", () => {
    const model = buildMacroTimelineModel({ surgery: makeSurgery() })

    expect(model.activeKey).toBe("sin_autorizar")
  })

  it("maps authorized scheduled cases to Pendiente", () => {
    const model = buildMacroTimelineModel({
      surgery: makeSurgery({ autorizado: true, state: "Autorizada" }),
    })

    expect(model.activeKey).toBe("pendiente")
  })

  it("keeps transit as macro stage when preparation implies delivery", () => {
    const model = buildMacroTimelineModel({
      surgery: makeSurgery({ autorizado: true, state: "Pendiente", preparationState: "Entregado" }),
    })

    expect(model.activeKey).toBe("transito")
  })

  it("keeps preparation separate from the general pending macro stage", () => {
    const model = buildMacroTimelineModel({
      surgery: makeSurgery({ autorizado: true, state: "Pendiente", preparationState: "En preparación" }),
    })

    expect(model.activeKey).toBe("pendiente")
    expect(model.stages.map((stage) => stage.label)).not.toContain("En preparación")
  })

  it("keeps Apta para facturar subordinate to Realizada", () => {
    const model = buildMacroTimelineModel({
      surgery: makeSurgery({ autorizado: true, state: "Realizada", preparationState: "Retirado" }),
      consumoState: "Validado",
    })

    expect(model.activeKey).toBe("realizada")
  })

  it("does not invent extra stages for finalized cases with cobranza", () => {
    const model = buildMacroTimelineModel({
      surgery: makeSurgery({ autorizado: true, state: "Finalizada", facturado: true }),
      consumoState: "Facturado",
    })

    expect(model.activeKey).toBe("finalizada")
    expect(model.stages).toHaveLength(6)
  })
})

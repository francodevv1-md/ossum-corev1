import { describe, expect, it } from "vitest"
import { buildExpedienteHeaderModel } from "@/components/expediente/expediente-header.model"
import type { Surgery } from "@/types"

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "surgery-technical-1",
    visibleNumber: "CX-0042",
    patient: "Paciente Test",
    patientDni: "12345678",
    surgeon: "Dr. Test",
    institution: "Hospital Test",
    institutionCity: "Ciudad",
    procedure: "Procedimiento",
    date: "2026-07-06",
    time: "10:00",
    state: "Pendiente",
    client: "Cliente Test",
    classification: "Artroscopía",
    preparationState: "Sin preparar",
    facturado: false,
    autorizado: false,
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    ...overrides,
  }
}

function buildModel(surgery: Surgery) {
  return buildExpedienteHeaderModel({
    surgery,
    docStatus: "Incompleta",
    facturacionStatus: "pending",
    cobrosTotal: 0,
    pendiente: { text: "Sin pendientes", color: "" },
  })
}

describe("buildExpedienteHeaderModel", () => {
  it("prioriza visibleNumber y deja las referencias como secundarias", () => {
    const model = buildModel(makeSurgery({ expedienteNumber: "EXP-12" }))

    expect(model.identity.idCx).toBe("CX-0042")
    expect(model.references).toContainEqual(expect.objectContaining({ key: "expediente", value: "EXP-12" }))
  })

  it("usa solo el fallback legacy o el texto explícito cuando falta el número visible", () => {
    expect(buildModel(makeSurgery({ visibleNumber: "", id: "legacy-1" })).identity.idCx).toBe("CX legacy-1")
    expect(buildModel(makeSurgery({ visibleNumber: "", id: "" })).identity.idCx).toBe("CX sin número visible")
  })

  it("expone fecha argentina válida y el fallback exacto para fecha ausente o inválida", () => {
    expect(buildModel(makeSurgery()).identity.dateFormatted).toBe("06/07/2026")
    expect(buildModel(makeSurgery({ date: "" })).identity.dateFormatted).toBe("Fecha CX sin definir")
    expect(buildModel(makeSurgery({ date: "2026-02-30" })).identity.dateFormatted).toBe("Fecha CX sin definir")
  })
})

import { describe, expect, it } from "vitest"

import { buildSurgeryCreateContactPayload } from "@/hooks/useCirugiaActions"

describe("buildSurgeryCreateContactPayload", () => {
  it("preserves the selected form name while enriching with store snapshot data", () => {
    const payload = buildSurgeryCreateContactPayload(
      {
        id: "contact-1",
        codigoContacto: "C-0001",
        tipoPersona: "fisica",
        nombre: "Nombre Viejo",
        dni: "30123456",
        estado: "activo",
        roles: ["cliente"],
        groups: ["pacientes"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      { id: "contact-1", nombre: "Paciente Exacto" }
    )

    expect(payload).toEqual(
      expect.objectContaining({
        id: "contact-1",
        nombre: "Paciente Exacto",
        dni: "30123456",
        groups: ["pacientes"],
      })
    )
  })

  it("builds a minimal payload from fallback data when the store contact is missing", () => {
    const payload = buildSurgeryCreateContactPayload(undefined, {
      id: "frontend-only-1",
      nombre: "Paciente Frontend",
    })

    expect(payload).toEqual({
      id: "frontend-only-1",
      nombre: "Paciente Frontend",
      tipoPersona: "fisica",
      razonSocial: undefined,
      cuit: undefined,
      dni: undefined,
      email: undefined,
      telefonos: undefined,
      provincia: undefined,
      localidad: undefined,
      groups: [],
    })
  })
})

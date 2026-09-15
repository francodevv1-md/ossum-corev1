import { describe, expect, it } from "vitest"

import { mapContactoToApiPayload } from "@/lib/api/contact-adapter"

describe("mapContactoToApiPayload", () => {
  it("maps juridical nombre to legalName when razonSocial is empty", () => {
    const payload = mapContactoToApiPayload({
      tipoPersona: "juridica",
      nombre: "Hospital Italiano",
      razonSocial: "   ",
      codigoContacto: "C-0007",
    })

    expect(payload).toEqual(
      expect.objectContaining({
        isCompany: true,
        legalName: "Hospital Italiano",
      })
    )
    expect(payload).not.toHaveProperty("firstName")
    expect(payload).not.toHaveProperty("lastName")
  })

  it("preserves razonSocial over nombre for juridical contacts", () => {
    const payload = mapContactoToApiPayload({
      tipoPersona: "juridica",
      nombre: "Nombre visible",
      razonSocial: "Razón Social SA",
    })

    expect(payload.legalName).toBe("Razón Social SA")
  })

  it("does not use codigoContacto as an identifiable field", () => {
    const payload = mapContactoToApiPayload({
      tipoPersona: "juridica",
      codigoContacto: "C-0008",
    })

    expect(payload).toEqual({
      isCompany: true,
      codigo: "C-0008",
    })
    expect(payload).not.toHaveProperty("legalName")
  })

  it("does not synthesize an address for a group-only update", () => {
    expect(mapContactoToApiPayload({ groups: ["medicos"] })).not.toHaveProperty("mainAddress")
  })

  it("omits geography unless a form action explicitly changes it", () => {
    const payload = mapContactoToApiPayload({ domicilio: "Calle 1" })

    expect(payload.mainAddress).not.toHaveProperty("geo")
    expect(mapContactoToApiPayload({ domicilio: "Calle 1" }, null).mainAddress).toMatchObject({ geo: null })
  })
})

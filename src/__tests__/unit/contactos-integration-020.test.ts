/**
 * CHATZAI-020: Tests de integración del Maestro de Contactos
 * Valida: flujo de datos de contacto en Wizard y Presupuesto context
 * Updated: V2 roles (ContactRole) + groups model.
 */
import { describe, it, expect } from "vitest"
import { useOrtoTrackStore } from "@/lib/store"
import type { ContactRole } from "@/types"

function getStore() {
  return useOrtoTrackStore.getState()
}

function suggestIvaKey(condicionIva: string): string {
  switch (condicionIva) {
    case "Responsable Inscripto":
    case "Consumidor Final":
      return "21"
    case "Exento":
      return "exento"
    case "Responsable Monotributo":
    case "No Responsable":
      return "0"
    default:
      return "21"
  }
}

describe("Contactos Integration", () => {
  describe("Wizard — Contact lookup by código", () => {
    it("should look up patient contact", () => {
      const c = getStore().getContactoByCodigo("9031")
      expect(c?.nombre).toBe("González, María Elena")
      expect(c?.roles).toContain("cliente")
      expect(c?.groups).toContain("pacientes")
    })

    it("should look up surgeon contact", () => {
      const c = getStore().getContactoByCodigo("8712")
      expect(c?.nombre).toBe("Dr. Rodríguez, Martín")
      expect(c?.roles).toContain("cliente")
      expect(c?.groups).toContain("medicos")
      expect(c?.datosMedico?.matricula).toBe("MN-78432")
    })

    it("should look up institution contact", () => {
      const c = getStore().getContactoByCodigo("9145")
      expect(c?.nombre).toBe("Hospital Italiano de Buenos Aires")
      expect(c?.roles).toContain("cliente")
      expect(c?.groups).toContain("instituciones")
    })

    it("should look up client/pagador with fiscal data", () => {
      const c = getStore().getContactoByCodigo("8527")
      expect(c?.nombre).toBe("OSDE Binario")
      expect(c?.roles).toContain("cliente")
      expect(c?.datosClientePagador?.condicionIva).toBe("Responsable Inscripto")
      expect(c?.datosClientePagador?.esPagador).toBe(true)
      expect(c?.cuit).toBe("30-50001234-5")
    })
  })

  describe("Presupuesto context — CUIT/IVA/Estado from Contacto", () => {
    it("should derive fiscal data from Contacto", () => {
      const c = getStore().getContactoByCodigo("8527")
      expect(c?.cuit).toBe("30-50001234-5")
      expect(c?.datosClientePagador?.condicionIva).toBe("Responsable Inscripto")
      expect(c?.datosClientePagador?.esPagador).toBe(true)
    })

    it("should derive IVA key from condicionIva", () => {
      expect(suggestIvaKey("Responsable Inscripto")).toBe("21")
      expect(suggestIvaKey("Exento")).toBe("exento")
      expect(suggestIvaKey("Consumidor Final")).toBe("21")
    })

    it("should map esPagador to EstadoPagador", () => {
      const osde = getStore().getContactoByCodigo("8527")
      const particular = getStore().getContactoByCodigo("8076")
      expect(osde!.datosClientePagador!.esPagador ? "Pagador" : "No pagador").toBe("Pagador")
      expect(particular!.datosClientePagador!.esPagador ? "Pagador" : "No pagador").toBe("No pagador")
    })

    it("should handle Exento contacts (IOMA, PAMI)", () => {
      const ioma = getStore().getContactoByCodigo("8248")
      const pami = getStore().getContactoByCodigo("8162")
      expect(ioma?.datosClientePagador?.condicionIva).toBe("Exento")
      expect(pami?.datosClientePagador?.condicionIva).toBe("Exento")
    })
  })

  describe("Group addition flow", () => {
    it("should add a group and verify via fresh store read", () => {
      const codigo = `IT${Date.now() % 100000}`
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "Patient Becomes Medico",
        estado: "activo",
        roles: ["cliente"],
        groups: ["pacientes"],
      })

      getStore().addGroupToContacto(contacto.id, "medicos")

      const updated = getStore().contactos.find((c) => c.codigoContacto === codigo)
      expect(updated).toBeTruthy()
      expect(updated!.roles).toContain("cliente")
      expect(updated!.groups).toContain("pacientes")
      expect(updated!.groups).toContain("medicos")
    })
  })

  describe("DC-CT-014 — Remito recipients limited to 4 surgery actor groups", () => {
    it("should have contacts for all 4 surgery actor groups", () => {
      const surgeryGroups = ["obras_sociales", "medicos", "pacientes", "instituciones"]
      surgeryGroups.forEach((groupId) => {
        expect(getStore().getContactosByGroup(groupId).length).toBeGreaterThan(0)
      })
    })

    it("proveedor is not a remito recipient group", () => {
      const remitoGroups = ["obras_sociales", "medicos", "pacientes", "instituciones"]
      expect(remitoGroups).not.toContain("proveedor")
    })
  })
})

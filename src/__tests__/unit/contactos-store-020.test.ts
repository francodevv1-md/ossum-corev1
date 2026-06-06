/**
 * CHATZAI-020: Tests del store de Contactos
 * Valida: CRUD, código único, roles, búsqueda, filtros
 *
 * Key: After store mutations, re-read getState() for fresh snapshot.
 * Updated: V2 roles (ContactRole) + groups model.
 */
import { describe, it, expect } from "vitest"
import { useOrtoTrackStore } from "@/lib/store"
import type { ContactRole } from "@/types"

// Re-read store after mutations
function getStore() {
  return useOrtoTrackStore.getState()
}

let _testSeq = Date.now() % 100000
function nextCodigo(): string {
  _testSeq++
  return `T${_testSeq}`
}

describe("Contactos Store", () => {
  describe("createContacto", () => {
    it("should create a contacto with generated id and timestamps", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "Test Contact",
        estado: "activo",
        roles: ["cliente"],
        groups: ["pacientes"],
      })

      expect(contacto.id).toBeTruthy()
      expect(contacto.codigoContacto).toBe(codigo)
      expect(contacto.nombre).toBe("Test Contact")
      expect(contacto.estado).toBe("activo")
      expect(contacto.roles).toEqual(["cliente"])
      expect(contacto.groups).toEqual(["pacientes"])
      expect(contacto.createdAt).toBeTruthy()
      expect(contacto.updatedAt).toBeTruthy()

      // Verify persistence
      const fresh = getStore()
      const found = fresh.contactos.find((c) => c.codigoContacto === codigo)
      expect(found).toBeTruthy()
      expect(found!.nombre).toBe("Test Contact")
    })

    it("should create a contacto with all optional fields", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "juridica",
        nombre: "Test Corp",
        razonSocial: "Test Corp S.A.",
        cuit: "30-99999999-9",
        estado: "activo",
        roles: ["cliente"],
        groups: ["obras_sociales"],
        datosClientePagador: {
          esPagador: true,
          condicionIva: "Responsable Inscripto",
          condicionPago: "30 días",
        },
        domicilio: "Test Address 123",
        email: "test@corp.com",
      })

      expect(contacto.razonSocial).toBe("Test Corp S.A.")
      expect(contacto.datosClientePagador?.esPagador).toBe(true)
    })
  })

  describe("código único", () => {
    it("should detect existing codigoContacto as unavailable", () => {
      expect(getStore().isCodigoContactoDisponible("8527")).toBe(false)
      expect(getStore().isCodigoContactoDisponible("ZZZZZZZZZZZ")).toBe(true)
    })
  })

  describe("updateContacto", () => {
    it("should update a contacto and change updatedAt", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "Original Name",
        estado: "activo",
        roles: ["cliente"],
        groups: ["pacientes"],
      })

      getStore().updateContacto(contacto.id, { nombre: "Updated Name" })

      const fresh = getStore()
      const found = fresh.contactos.find((c) => c.codigoContacto === codigo)
      expect(found?.nombre).toBe("Updated Name")
    })
  })

  describe("inactivateContacto / reactivateContacto", () => {
    it("should inactivate a contacto", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "To Inactivate",
        estado: "activo",
        roles: ["cliente"],
        groups: ["pacientes"],
      })

      getStore().inactivateContacto(contacto.id)

      const found = getStore().contactos.find((c) => c.codigoContacto === codigo)
      expect(found?.estado).toBe("inactivo")
    })

    it("should reactivate a contacto", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "To Reactivate",
        estado: "activo",
        roles: ["cliente"],
        groups: ["pacientes"],
      })

      getStore().inactivateContacto(contacto.id)
      getStore().reactivateContacto(contacto.id)

      const found = getStore().contactos.find((c) => c.codigoContacto === codigo)
      expect(found?.estado).toBe("activo")
    })
  })

  describe("getContactoByCodigo", () => {
    it("should find mock contactos by código", () => {
      const found = getStore().getContactoByCodigo("8527")
      expect(found).toBeTruthy()
      expect(found?.nombre).toBe("OSDE Binario")
    })

    it("should return undefined for non-existent código", () => {
      expect(getStore().getContactoByCodigo("NONEXISTENT")).toBeUndefined()
    })

    it("should NOT return inactive contactos (CHATZAI-020A BUG-001 fix)", () => {
      // CONT-0014 has código "7800" but is inactive
      expect(getStore().getContactoByCodigo("7800")).toBeUndefined()
    })
  })

  describe("getContactosByRole", () => {
    it("should return only active contactos with the specified role", () => {
      const clientes = getStore().getContactosByRole("cliente")
      expect(clientes.length).toBeGreaterThan(0)
      clientes.forEach((c) => {
        expect(c.roles).toContain("cliente")
        expect(c.estado).toBe("activo")
      })
    })

    it("should not return inactive contactos", () => {
      const clientes = getStore().getContactosByRole("cliente")
      const inactiveFound = clientes.find((c) => c.id === "CONT-0014")
      expect(inactiveFound).toBeUndefined()
    })
  })

  describe("searchContactos", () => {
    it("should search by código", () => {
      expect(getStore().searchContactos("8527").some((c) => c.codigoContacto === "8527")).toBe(true)
    })

    it("should search by nombre", () => {
      expect(getStore().searchContactos("OSDE").some((c) => c.nombre.includes("OSDE"))).toBe(true)
    })

    it("should search by CUIT", () => {
      expect(getStore().searchContactos("30-50001234").length).toBeGreaterThan(0)
    })

    it("should filter by role when specified", () => {
      getStore().searchContactos("", "cliente").forEach((c) => {
        expect(c.roles).toContain("cliente")
      })
    })

    it("should return only active contactos", () => {
      getStore().searchContactos("").forEach((c) => {
        expect(c.estado).toBe("activo")
      })
    })
  })

  describe("addGroupToContacto", () => {
    it("should add a new group to an existing contacto", () => {
      const codigo = nextCodigo()
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
      expect(updated?.roles).toContain("cliente")
      expect(updated?.groups).toContain("pacientes")
      expect(updated?.groups).toContain("medicos")
    })

    it("should initialize role-specific defaults when adding cliente role (CHATZAI-020A BUG-002 fix)", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "Becomes Client",
        estado: "activo",
        roles: ["interno"],
        groups: ["coordinadores"],
      })

      getStore().addRoleToContacto(contacto.id, "cliente")

      const updated = getStore().contactos.find((c) => c.codigoContacto === codigo)
      expect(updated?.datosClientePagador).toBeTruthy()
      expect(updated?.datosClientePagador?.esPagador).toBe(true)
      expect(updated?.datosClientePagador?.condicionIva).toBe("Consumidor Final")
    })

    it("should initialize group-specific defaults when adding medicos group (CHATZAI-020A BUG-002 fix)", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "Becomes Medico",
        estado: "activo",
        roles: ["cliente"],
        groups: ["pacientes"],
      })

      getStore().addGroupToContacto(contacto.id, "medicos")

      const updated = getStore().contactos.find((c) => c.codigoContacto === codigo)
      expect(updated?.datosMedico).toBeTruthy()
    })

    it("should initialize group-specific defaults when adding instituciones group (CHATZAI-020A BUG-002 fix)", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "juridica",
        nombre: "Becomes Institution",
        estado: "activo",
        roles: ["cliente"],
        groups: ["obras_sociales"],
        datosClientePagador: { esPagador: true, condicionIva: "Responsable Inscripto" },
      })

      getStore().addGroupToContacto(contacto.id, "instituciones")

      const updated = getStore().contactos.find((c) => c.codigoContacto === codigo)
      expect(updated?.datosInstitucion).toBeTruthy()
      // Should NOT overwrite existing datosClientePagador
      expect(updated?.datosClientePagador?.condicionIva).toBe("Responsable Inscripto")
    })

    it("should not duplicate an existing group", () => {
      const codigo = nextCodigo()
      const contacto = getStore().createContacto({
        codigoContacto: codigo,
        tipoPersona: "fisica",
        nombre: "Already Medico",
        estado: "activo",
        roles: ["cliente"],
        groups: ["medicos"],
      })

      getStore().addGroupToContacto(contacto.id, "medicos")

      const updated = getStore().contactos.find((c) => c.codigoContacto === codigo)
      expect(updated?.groups.filter((g) => g === "medicos").length).toBe(1)
    })
  })

  describe("multirol canónico (CONT-0005)", () => {
    it("should have cliente role with medicos + instituciones groups", () => {
      const multi = getStore().getContactoById("CONT-0005")
      expect(multi).toBeTruthy()
      expect(multi?.roles).toContain("cliente")
      expect(multi?.groups).toContain("medicos")
      expect(multi?.groups).toContain("instituciones")
      expect(multi?.datosMedico).toBeTruthy()
      expect(multi?.datosClientePagador).toBeTruthy()
      expect(multi?.datosInstitucion).toBeTruthy()
    })
  })
})

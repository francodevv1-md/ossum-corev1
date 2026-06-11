/**
 * contact-adapter — OSSUM COR
 *
 * Maps Prisma Contact entities (returned by the API via ContactCompanyLink)
 * into the frontend's Contacto domain type.
 *
 * The API returns flattened objects with:
 *   Prisma Contact fields: id, firstName, lastName, legalName, isCompany,
 *     email, phone, documentType, documentNumber, contactType, isActive,
 *     createdAt, updatedAt
 *   Link fields: linkRole, linkIsActive
 */

import type { Contacto, ContactRole } from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────

function buildCodigoContacto(id: string): string {
  return id.slice(0, 6)
}

function buildNombre(api: Record<string, unknown>): string {
  const firstName = (api.firstName as string | null)?.trim()
  const lastName = (api.lastName as string | null)?.trim()
  if (firstName && lastName) return `${firstName} ${lastName}`
  const legalName = (api.legalName as string | null)?.trim()
  if (legalName) return legalName
  return "Sin nombre"
}

function resolveContactRole(linkRole: unknown): ContactRole {
  if (typeof linkRole !== "string") return "cliente"
  const r = linkRole.toLowerCase()
  if (r === "cliente" || r === "proveedor" || r === "interno") {
    return r as ContactRole
  }
  // Map detail roles to the three canonical roles
  if (r === "admin" || r === "operator") return "interno"
  // doctor, patient, institution, payer, and anything else → cliente
  return "cliente"
}

// ─── Single-contact mapper ────────────────────────────────────────────

export function mapApiContactToContacto(
  apiContact: Record<string, unknown>
): Contacto {
  const id = apiContact.id as string
  const isCompany = Boolean(apiContact.isCompany)
  const documentType = (apiContact.documentType as string | undefined) ?? ""
  const documentNumber = (apiContact.documentNumber as string | undefined)
  const email = (apiContact.email as string | undefined)
  const phone = (apiContact.phone as string | undefined)
  const linkIsActive = Boolean(apiContact.linkIsActive)

  // Determine CUIT vs DNI
  const cuit = documentType === "CUIT" ? documentNumber : undefined
  const dni = documentType === "DNI" ? documentNumber : undefined

  // Resolve role(s) — single linkRole for now
  const linkRole = apiContact.linkRole
  const role: ContactRole = resolveContactRole(linkRole)

  return {
    id,
    codigoContacto: buildCodigoContacto(id),
    tipoPersona: isCompany ? "juridica" : "fisica",
    nombre: buildNombre(apiContact),
    nombreFantasia: undefined,
    razonSocial: isCompany ? ((apiContact.legalName as string) ?? undefined) : undefined,
    cuit,
    dni,
    estado: linkIsActive ? "activo" : "inactivo",
    roles: [role],
    groups: [],
    email,
    telefonos: phone ? [phone] : undefined,
    domicilio: undefined,
    provincia: undefined,
    localidad: undefined,
    codigoPostal: undefined,
    createdAt: (apiContact.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (apiContact.updatedAt as string) ?? new Date().toISOString(),
  }
}

// ─── List mapper ──────────────────────────────────────────────────────

export function mapApiContactListToContactos(
  apiContacts: Array<Record<string, unknown>>
): Contacto[] {
  return apiContacts.map(mapApiContactToContacto)
}

// ─── Form → API payload mapper ────────────────────────────────────────

/**
 * Converts frontend Contacto form data into an API payload for POST/PATCH.
 * Maps domain fields (tipoPersona, nombre, cuit, dni, roles, telefonos)
 * to Prisma Contact fields (isCompany, legalName, firstName, lastName, etc.).
 *
 * Fields NOT mapped (kept only in Zustand/local):
 *   codigoContacto, nombreFantasia, domicilio, provincia, localidad,
 *   codigoPostal, observaciones, datosClientePagador, datosMedico,
 *   datosInstitucion, groups
 */
export function mapContactoToApiPayload(
  formData: Partial<Contacto>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  // Person type → isCompany + name split
  if (formData.tipoPersona === "juridica") {
    payload.isCompany = true
    if (formData.razonSocial?.trim()) {
      payload.legalName = formData.razonSocial.trim()
    }
  } else {
    payload.isCompany = false
    const fullName = formData.nombre?.trim()
    if (fullName) {
      const spaceIdx = fullName.indexOf(" ")
      if (spaceIdx > 0) {
        payload.firstName = fullName.slice(0, spaceIdx)
        payload.lastName = fullName.slice(spaceIdx + 1)
      } else {
        payload.firstName = fullName
      }
    }
  }

  // Email
  if (formData.email?.trim()) {
    payload.email = formData.email.trim()
  }

  // Phone (first phone from the array)
  if (formData.telefonos?.[0]?.trim()) {
    payload.phone = formData.telefonos[0].trim()
  }

  // Document: CUIT takes precedence over DNI
  if (formData.cuit?.trim()) {
    payload.documentType = "CUIT"
    payload.documentNumber = formData.cuit.trim()
  } else if (formData.dni?.trim()) {
    payload.documentType = "DNI"
    payload.documentNumber = formData.dni.trim()
  }

  // Role → contactType + role
  const firstRole = formData.roles?.[0]
  if (firstRole) {
    payload.contactType = firstRole
    payload.role = firstRole
  }

  return payload
}

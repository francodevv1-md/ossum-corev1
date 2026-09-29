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

import type { CondicionIvaCliente, Contacto, ContactRole } from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Resolve the company-scoped Contacto code from the API response.
 * Legacy fallback: a deterministic transient label that CANNOT collide
 *   with the canonical C-\d{4,} regex (uses "C-T" prefix), and is
 *   clearly flagged as transient for migration.
 */
function resolveContactoCodigo(api: Record<string, unknown>): string {
  const candidate = api.code ?? api.codigo
  const real = typeof candidate === "string" ? candidate.trim() : ""
  if (real) return real
  // Transient fallback: deterministic but obviously non-canonical.
  const id = (api.id as string) ?? ""
  const suffix = id.replace(/[^A-Za-z0-9]/g, "").slice(-4) || "0000"
  return `C-T${suffix}` // intentionally fails ^C-\d{4,}$ — won't pollute counter
}

function buildNombre(api: Record<string, unknown>): string {
  const firstName = (api.firstName as string | null)?.trim()
  const lastName = (api.lastName as string | null)?.trim()
  if (firstName && lastName) return `${firstName} ${lastName}`
  const legalName = (api.legalName as string | null)?.trim()
  if (legalName) return legalName
  if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(" ")
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

  const rawRoles = apiContact.roles
  const roles = Array.isArray(rawRoles)
    ? rawRoles.filter((role): role is ContactRole => role === "cliente" || role === "proveedor" || role === "interno")
    : [resolveContactRole(apiContact.linkRole)]
  const groupSlugs = Array.isArray(apiContact.groupSlugs)
    ? apiContact.groupSlugs.filter((group): group is string => typeof group === "string")
    : []
  const mainAddress = apiContact.mainAddress && typeof apiContact.mainAddress === "object"
    ? apiContact.mainAddress as Record<string, unknown>
    : undefined
  const street = typeof mainAddress?.street === "string" ? mainAddress.street : ""
  const number = typeof mainAddress?.number === "string" ? mainAddress.number : ""
  const domicilio = [street, number].filter(Boolean).join(" ") || undefined
  const usualDiscount = typeof apiContact.usualDiscount === "number"
    ? apiContact.usualDiscount
    : typeof apiContact.usualDiscount === "string"
      ? Number(apiContact.usualDiscount)
      : undefined

  return {
    id,
    codigoContacto: resolveContactoCodigo(apiContact),
    tipoPersona: isCompany ? "juridica" : "fisica",
    nombre: buildNombre(apiContact),
    nombreFantasia: (apiContact.tradeName as string | undefined) || undefined,
    razonSocial: isCompany ? ((apiContact.legalName as string) ?? undefined) : undefined,
    cuit,
    dni,
    estado: linkIsActive ? "activo" : "inactivo",
    observaciones: (apiContact.notes as string | undefined) || undefined,
    roles,
    groups: groupSlugs,
    email,
    telefonos: phone ? [phone] : undefined,
    domicilio,
    provincia: (mainAddress?.state as string | undefined) || undefined,
    localidad: (mainAddress?.city as string | undefined) || undefined,
    codigoPostal: (mainAddress?.zipCode as string | undefined) || undefined,
    datosClientePagador: roles.includes("cliente") ? {
      esPagador: typeof apiContact.isPayer === "boolean" ? apiContact.isPayer : true,
      condicionIva: (apiContact.vatCondition as CondicionIvaCliente | undefined) || "Consumidor Final",
      condicionPago: (apiContact.paymentTerms as string | undefined) || undefined,
      listaPreciosDefault: (apiContact.defaultPriceList as string | undefined) || undefined,
      descuentoHabitual: Number.isFinite(usualDiscount) ? usualDiscount : undefined,
    } : undefined,
    datosMedico: groupSlugs.includes("medicos") || apiContact.doctorLicense || apiContact.specialty ? {
      matricula: (apiContact.doctorLicense as string | undefined) || undefined,
      especialidad: (apiContact.specialty as string | undefined) || undefined,
    } : undefined,
    datosInstitucion: groupSlugs.includes("instituciones") || apiContact.deliveryNotes ? {
      observacionEntrega: (apiContact.deliveryNotes as string | undefined) || undefined,
    } : undefined,
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
 * All persisted Contacto form fields are flattened into the API contract.
 */
export function mapContactoToApiPayload(
  formData: Partial<Contacto>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  // Person type → isCompany + name split
  if (formData.tipoPersona === "juridica") {
    payload.isCompany = true
    const legal = formData.razonSocial?.trim() || formData.nombre?.trim()
    if (legal) {
      payload.legalName = legal
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

  if ("nombreFantasia" in formData) payload.tradeName = formData.nombreFantasia?.trim() || null
  if ("observaciones" in formData) payload.notes = formData.observaciones?.trim() || null

  if ("email" in formData) payload.email = formData.email?.trim() || null

  // Phone (first phone from the array)
  if ("telefonos" in formData) payload.phone = formData.telefonos?.[0]?.trim() || null

  // Document: CUIT takes precedence over DNI
  if (formData.cuit?.trim()) {
    payload.documentType = "CUIT"
    payload.documentNumber = formData.cuit.trim()
  } else if (formData.dni?.trim()) {
    payload.documentType = "DNI"
    payload.documentNumber = formData.dni.trim()
  } else if ("cuit" in formData || "dni" in formData) {
    payload.documentType = null
    payload.documentNumber = null
  }

  // Role → contactType + role
  if ("roles" in formData) {
    payload.roles = formData.roles ?? []
  }
  if ("groups" in formData) payload.groupSlugs = formData.groups ?? []

  if (["domicilio", "provincia", "localidad", "codigoPostal"].some((key) => key in formData)) {
    payload.mainAddress = {
      street: formData.domicilio?.trim() || null,
      city: formData.localidad?.trim() || null,
      state: formData.provincia?.trim() || null,
      zipCode: formData.codigoPostal?.trim() || null,
      country: "AR",
    }
  }

  if ("datosClientePagador" in formData) {
    payload.isPayer = formData.datosClientePagador?.esPagador ?? null
    payload.vatCondition = formData.datosClientePagador?.condicionIva ?? null
    payload.paymentTerms = formData.datosClientePagador?.condicionPago?.trim() || null
    payload.defaultPriceList = formData.datosClientePagador?.listaPreciosDefault?.trim() || null
    payload.usualDiscount = formData.datosClientePagador?.descuentoHabitual ?? null
  }
  if ("datosMedico" in formData) {
    payload.doctorLicense = formData.datosMedico?.matricula?.trim() || null
    payload.specialty = formData.datosMedico?.especialidad?.trim() || null
  }
  if ("datosInstitucion" in formData) {
    payload.deliveryNotes = formData.datosInstitucion?.observacionEntrega?.trim() || null
  }

  const codigo = formData.codigoContacto?.trim()
  if (codigo) {
    payload.codigo = codigo
  }

  return payload
}

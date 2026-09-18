/**
 * CHATZAI-025A.1: Constantes del sistema de Contactos
 *
 * Modelo: Roles generales + Grupos de contacto + Contextos de búsqueda reutilizables.
 * DC-CT-015: Roles principales = Cliente, Proveedor, Interno (con multirol)
 * DC-CT-016: Grupos clasifican contactos dentro de un rol
 * DC-CT-017: Modal reutilizable configurable por contexto
 * DC-CT-018: Sin duplicación por función
 */

import type { ContactRole, ContactGroup } from "@/types"

// ═══════════════════════════════════════════════════════════════
// ROLES GENERALES (DC-CT-015)
// ═══════════════════════════════════════════════════════════════

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  cliente: "Cliente",
  proveedor: "Proveedor",
  interno: "Interno",
}

export const CONTACT_ROLE_BADGE_COLORS: Record<ContactRole, string> = {
  cliente: "bg-emerald-100 text-emerald-800 border-emerald-200",
  proveedor: "bg-orange-100 text-orange-800 border-orange-200",
  interno: "bg-sky-100 text-sky-800 border-sky-200",
}

export const ALL_CONTACT_ROLES: ContactRole[] = ["cliente", "proveedor", "interno"]

// ═══════════════════════════════════════════════════════════════
// GRUPOS DE CONTACTO (DC-CT-016)
// ═══════════════════════════════════════════════════════════════

export const CONTACT_GROUPS: ContactGroup[] = [
  // ─── Rol: Cliente ───
  { id: "medicos", nombre: "Médicos", role: "cliente", activo: true },
  { id: "pacientes", nombre: "Pacientes", role: "cliente", activo: true },
  { id: "instituciones", nombre: "Instituciones", role: "cliente", activo: true },
  { id: "obras_sociales", nombre: "Obras Sociales", role: "cliente", activo: true },
  { id: "art", nombre: "ART", role: "cliente", activo: true },
  { id: "particulares", nombre: "Particulares", role: "cliente", activo: true },
  { id: "prepagas", nombre: "Prepagas", role: "cliente", activo: true },
  { id: "otros_clientes", nombre: "Otros clientes", role: "cliente", activo: true },

  // ─── Rol: Proveedor ───
  { id: "instrumentadores", nombre: "Instrumentadores", role: "proveedor", activo: true },
  { id: "prov_implantes", nombre: "Proveedores de implantes", role: "proveedor", activo: true },
  { id: "prov_insumos", nombre: "Proveedores de insumos quirúrgicos", role: "proveedor", activo: true },
  { id: "prov_descartables", nombre: "Proveedores de descartables", role: "proveedor", activo: true },
  { id: "servicios_tecnicos", nombre: "Servicios técnicos", role: "proveedor", activo: true },
  { id: "otros_proveedores", nombre: "Otros proveedores", role: "proveedor", activo: true },

  // ─── Rol: Interno ───
  { id: "coordinadores", nombre: "Coordinadores", role: "interno", activo: true },
  { id: "vendedores", nombre: "Vendedores", role: "interno", activo: true },
  { id: "deposito", nombre: "Depósito", role: "interno", activo: true },
  { id: "administracion", nombre: "Administración", role: "interno", activo: true },
  { id: "logistica", nombre: "Logística", role: "interno", activo: true },
  { id: "direccion", nombre: "Dirección", role: "interno", activo: true },
  { id: "otros_internos", nombre: "Otros internos", role: "interno", activo: true },
]

/** Get groups for a specific role */
export function getGroupsForRole(role: ContactRole): ContactGroup[] {
  return CONTACT_GROUPS.filter((g) => g.role === role && g.activo)
}

/** Get group by ID */
export function getGroupById(id: string): ContactGroup | undefined {
  return CONTACT_GROUPS.find((g) => g.id === id)
}

/** Get label for a group ID */
export function getGroupLabel(groupId: string): string {
  return getGroupById(groupId)?.nombre ?? groupId
}

/** Validate that a group is compatible with at least one of the given roles */
export function isGroupCompatibleWithRoles(groupId: string, roles: ContactRole[]): boolean {
  const group = getGroupById(groupId)
  if (!group) return false
  return roles.includes(group.role)
}

// ═══════════════════════════════════════════════════════════════
// CONTEXTOS DE BÚSQUEDA (DC-CT-017)
// ═══════════════════════════════════════════════════════════════

export interface ContactSearchContext {
  /** Título del modal */
  title: string
  /** Rol(es) preferidos — se priorizan en los resultados */
  preferredRoles: ContactRole[]
  /** Grupo(s) preferidos — se priorizan en los resultados */
  preferredGroups: string[]
  /** Rol(es) permitidos (si se omite, se permiten todos) */
  allowedRoles?: ContactRole[]
  /** Grupo(s) permitidos (si se omite, se permiten todos) */
  allowedGroups?: string[]
  /** Permitir búsqueda ampliada fuera del contexto preferido */
  allowExpandedSearch?: boolean
  /** Permitir alta rápida de contacto */
  allowCreate?: boolean
  /** Defaults para alta rápida */
  createDefaults?: {
    roles: ContactRole[]
    groups: string[]
  }
}

// ─── Contextos predefinidos para cada campo del sistema ───

export const CONTEXT_COORDINADOR: ContactSearchContext = {
  title: "Buscar Coordinador",
  preferredRoles: ["interno"],
  preferredGroups: ["coordinadores"],
  allowedRoles: ["interno"],
  allowCreate: true,
  createDefaults: { roles: ["interno"], groups: ["coordinadores"] },
}

export const CONTEXT_INSTRUMENTADOR: ContactSearchContext = {
  title: "Buscar Instrumentador",
  preferredRoles: ["proveedor"],
  preferredGroups: ["instrumentadores"],
  allowedRoles: ["proveedor"],
  allowCreate: true,
  createDefaults: { roles: ["proveedor"], groups: ["instrumentadores"] },
}

export const CONTEXT_VENDEDOR: ContactSearchContext = {
  title: "Buscar Vendedor",
  preferredRoles: ["interno"],
  preferredGroups: ["vendedores"],
  allowedRoles: ["interno"],
  allowCreate: true,
  createDefaults: { roles: ["interno"], groups: ["vendedores"] },
}

export const CONTEXT_CLIENTE_PAGADOR: ContactSearchContext = {
  title: "Buscar Cliente / Pagador",
  preferredRoles: ["cliente"],
  preferredGroups: ["obras_sociales", "art", "particulares", "prepagas", "instituciones"],
  allowedRoles: ["cliente"],
  allowCreate: true,
  createDefaults: { roles: ["cliente"], groups: [] },
}

export const CONTEXT_PACIENTE: ContactSearchContext = {
  title: "Buscar Paciente",
  preferredRoles: ["cliente"],
  preferredGroups: ["pacientes"],
  allowedRoles: ["cliente"],
  allowCreate: true,
  createDefaults: { roles: ["cliente"], groups: ["pacientes"] },
}

export const CONTEXT_MEDICO: ContactSearchContext = {
  title: "Buscar Médico",
  preferredRoles: ["cliente"],
  preferredGroups: ["medicos"],
  allowedRoles: ["cliente"],
  allowCreate: true,
  createDefaults: { roles: ["cliente"], groups: ["medicos"] },
}

export const CONTEXT_INSTITUCION: ContactSearchContext = {
  title: "Buscar Institución",
  preferredRoles: ["cliente"],
  preferredGroups: ["instituciones"],
  allowedRoles: ["cliente"],
  allowCreate: true,
  createDefaults: { roles: ["cliente"], groups: ["instituciones"] },
}

/** Mapa de contextos por campo del Wizard */
export const WIZARD_SEARCH_CONTEXTS: Record<string, ContactSearchContext> = {
  client: CONTEXT_CLIENTE_PAGADOR,
  patient: CONTEXT_PACIENTE,
  surgeon: CONTEXT_MEDICO,
  institution: CONTEXT_INSTITUCION,
  coordinadorCx: CONTEXT_COORDINADOR,
  vendedor: CONTEXT_VENDEDOR,
  instrumentador: CONTEXT_INSTRUMENTADOR,
}

// ═══════════════════════════════════════════════════════════════
// MAPEO DE COMPATIBILIDAD V1 → V2
// ═══════════════════════════════════════════════════════════════

/**
 * Mapeo de roles V1 (ContactoRol) a roles V2 (ContactRole) + grupos.
 * Usado para migración de mocks y capa de compatibilidad.
 */
export const V1_TO_V2_ROLE_MAP: Record<string, { role: ContactRole; group: string }> = {
  cliente_pagador: { role: "cliente", group: "obras_sociales" },
  proveedor: { role: "proveedor", group: "otros_proveedores" },
  medico: { role: "cliente", group: "medicos" },
  paciente: { role: "cliente", group: "pacientes" },
  institucion: { role: "cliente", group: "instituciones" },
}

/**
 * Para compatibilidad temporal: mapear V1 requiredRole a contexto V2.
 * Permite que código existente siga funcionando mientras se migra.
 */
export const V1_ROLE_TO_CONTEXT: Record<string, ContactSearchContext> = {
  cliente_pagador: CONTEXT_CLIENTE_PAGADOR,
  proveedor: { title: "Buscar Proveedor", preferredRoles: ["proveedor"], preferredGroups: [], allowedRoles: ["proveedor"], allowCreate: true, createDefaults: { roles: ["proveedor"], groups: [] } },
  medico: CONTEXT_MEDICO,
  paciente: CONTEXT_PACIENTE,
  institucion: CONTEXT_INSTITUCION,
}

// ═══════════════════════════════════════════════════════════════
// GRUPO BADGE COLORS (por rol asociado)
// ═══════════════════════════════════════════════════════════════

export const GROUP_BADGE_COLORS: Record<ContactRole, string> = {
  cliente: "bg-emerald-50 text-emerald-700 border-emerald-200",
  proveedor: "bg-orange-50 text-orange-700 border-orange-200",
  interno: "bg-sky-50 text-sky-700 border-sky-200",
}

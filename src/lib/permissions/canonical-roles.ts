// OSSUM COR — Canonical RBAC Roles and Aliases.
// Single authoritative definition of roles across the system.

export const CANONICAL_ROLES = [
  "admin",
  "coordinator",
  "logistics",
  "billing",
  "commercial",
  "technician",
  "viewer",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

export interface RoleMetadata {
  role: CanonicalRole;
  label: string;
  description: string;
  badgeClass: string;
}

export const CANONICAL_ROLE_METADATA: Record<CanonicalRole, RoleMetadata> = {
  admin: {
    role: "admin",
    label: "Administrador",
    description: "Acceso total a configuración, usuarios, finanzas y operaciones",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
  coordinator: {
    role: "coordinator",
    label: "Coordinador",
    description: "Gestión integral de cirugías, expedientes, remitos y seguimiento",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  },
  logistics: {
    role: "logistics",
    label: "Logística / Depósito",
    description: "Operaciones de stock, recepciones, remitos, despacho y consumos",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  billing: {
    role: "billing",
    label: "Facturación",
    description: "Gestión de facturas, notas de crédito/débito, cobros y contactos",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  commercial: {
    role: "commercial",
    label: "Comercial / Ventas",
    description: "Gestión comercial, presupuestos, clientes y consultas operativas",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  },
  technician: {
    role: "technician",
    label: "Instrumentador",
    description: "Asistencia técnica en cirugías, control de cajas e instrumental",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
  },
  viewer: {
    role: "viewer",
    label: "Solo lectura",
    description: "Visualización de tableros, reportes y consultas sin permisos de edición",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

/**
 * Legacy aliases mapping to canonical roles.
 * Case-insensitive lookup dictionary.
 */
const ROLE_ALIASES: Record<string, CanonicalRole> = {
  // admin
  admin: "admin",
  administrador: "admin",
  superadmin: "admin",
  administración: "admin",
  administracion: "admin",

  // coordinator
  coordinator: "coordinator",
  coordinador: "coordinator",

  // logistics
  logistics: "logistics",
  logística: "logistics",
  logistica: "logistics",
  depósito: "logistics",
  deposito: "logistics",
  operador: "logistics",
  operator: "logistics",

  // billing
  billing: "billing",
  facturación: "billing",
  facturacion: "billing",

  // commercial
  commercial: "commercial",
  vendedor: "commercial",
  compras: "commercial",

  // technician
  technician: "technician",
  instrumentador: "technician",
  matrona: "technician",

  // viewer
  viewer: "viewer",
  "solo lectura": "viewer",
  solalectura: "viewer",
  gerencia: "viewer",
};

/**
 * Check if a string is a canonical role.
 */
export function isCanonicalRole(role: unknown): role is CanonicalRole {
  return typeof role === "string" && CANONICAL_ROLES.includes(role as CanonicalRole);
}

/**
 * Resolves any legacy alias or canonical role string into its canonical representation.
 * Returns null if the role string cannot be resolved (deny-by-default).
 */
export function resolveCanonicalRole(rawRole: string | null | undefined): CanonicalRole | null {
  if (!rawRole) return null;
  const normalized = rawRole.trim().toLowerCase();
  return ROLE_ALIASES[normalized] ?? null;
}

/**
 * Validates and returns the canonical role, throwing an error if invalid.
 */
export function assertCanonicalRole(rawRole: string | null | undefined): CanonicalRole {
  const resolved = resolveCanonicalRole(rawRole);
  if (!resolved) {
    throw new Error(`Invalid or unmapped role: "${rawRole}"`);
  }
  return resolved;
}

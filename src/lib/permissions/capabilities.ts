// OSSUM COR — Capability Matrix and Authorization Engine.
// Enforces deny-by-default role-based capabilities.

import {
  type CanonicalRole,
  CANONICAL_ROLES,
  resolveCanonicalRole,
} from "./canonical-roles";

export const APP_CAPABILITIES = [
  // Stock / Recepción
  "stock:read",
  "stock:mutate",
  "stock:critical",

  // Cirugías / Expediente
  "cirugias:read",
  "cirugias:mutate",
  "cirugias:critical",

  // Remitos / Despacho
  "remitos:read",
  "remitos:mutate",
  "remitos:critical",

  // Consumo / Devolución
  "consumo_devolucion:read",
  "consumo_devolucion:mutate",
  "consumo_devolucion:critical",

  // Facturación / Cobros
  "billing:read",
  "billing:mutate",
  "billing:critical",

  // Contactos
  "contacts:read",
  "contacts:mutate",
  "contacts:critical",

  // Usuarios / Membresías
  "users_memberships:read",
  "users_memberships:mutate",
  "users_memberships:critical",

  // Compras / Aprovisionamiento
  "purchases:read",
  "purchases:mutate",
  "purchases:critical",
] as const;

export type AppCapability = (typeof APP_CAPABILITIES)[number];

/**
 * Capability Matrix mapping each capability to authorized canonical roles.
 */
export const CAPABILITY_ROLE_GRANTS: Record<AppCapability, readonly CanonicalRole[]> = {
  // Stock / Recepción: read=members, mutate=admin|logistics, critical=admin|logistics
  "stock:read": CANONICAL_ROLES,
  "stock:mutate": ["admin", "logistics"],
  "stock:critical": ["admin", "logistics"],

  // Cirugías / Expediente: read=members, mutate=admin|coordinator, critical=admin|coordinator
  "cirugias:read": CANONICAL_ROLES,
  "cirugias:mutate": ["admin", "coordinator"],
  "cirugias:critical": ["admin", "coordinator"],

  // Remitos / Despacho: read=members, mutate=admin|coordinator|logistics, critical=admin|coordinator|logistics
  "remitos:read": CANONICAL_ROLES,
  "remitos:mutate": ["admin", "coordinator", "logistics"],
  "remitos:critical": ["admin", "coordinator", "logistics"],

  // Consumo / Devolución: read=members, mutate=admin|coordinator|logistics, critical=admin|logistics
  "consumo_devolucion:read": CANONICAL_ROLES,
  "consumo_devolucion:mutate": ["admin", "coordinator", "logistics"],
  "consumo_devolucion:critical": ["admin", "logistics"],

  // Facturación / Cobros: read=admin|billing|coordinator|viewer, mutate=admin|billing, critical=admin|billing
  "billing:read": ["admin", "billing", "coordinator", "viewer"],
  "billing:mutate": ["admin", "billing"],
  "billing:critical": ["admin", "billing"],

  // Contactos: read=members, mutate=admin|coordinator|billing, critical=admin|coordinator|billing
  "contacts:read": CANONICAL_ROLES,
  "contacts:mutate": ["admin", "coordinator", "billing"],
  "contacts:critical": ["admin", "coordinator", "billing"],

  // Usuarios / Membresías: read=admin (non-admin can only read own profile), mutate=admin, critical=admin
  "users_memberships:read": ["admin"],
  "users_memberships:mutate": ["admin"],
  "users_memberships:critical": ["admin"],

  // Compras: read=todos los roles canónicos, mutate=admin|coordinator|logistics, critical=admin|coordinator
  "purchases:read": CANONICAL_ROLES,
  "purchases:mutate": ["admin", "coordinator", "logistics"],
  "purchases:critical": ["admin", "coordinator"],
};

/**
 * Check if a role (canonical or alias) has a specific capability.
 * Deny-by-default: returns false if role is invalid or unauthorized.
 */
export function hasCapability(
  rawRole: string | null | undefined,
  capability: AppCapability
): boolean {
  const canonicalRole = resolveCanonicalRole(rawRole);
  if (!canonicalRole) return false;
  const allowedRoles = CAPABILITY_ROLE_GRANTS[capability];
  return allowedRoles ? allowedRoles.includes(canonicalRole) : false;
}

/**
 * Returns all capabilities granted to a role.
 */
export function getRoleCapabilities(rawRole: string | null | undefined): readonly AppCapability[] {
  const canonicalRole = resolveCanonicalRole(rawRole);
  if (!canonicalRole) return [];
  return APP_CAPABILITIES.filter((cap) =>
    CAPABILITY_ROLE_GRANTS[cap].includes(canonicalRole)
  );
}

/**
 * Check if a role has admin privileges.
 */
export function isRoleAdmin(rawRole: string | null | undefined): boolean {
  return resolveCanonicalRole(rawRole) === "admin";
}

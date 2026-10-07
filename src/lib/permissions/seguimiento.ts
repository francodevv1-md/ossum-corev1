export const SEGUIMIENTO_EVENT_MUTATION_ALLOWED_ROLES = ["admin"] as const
export const SEGUIMIENTO_CREATE_ALLOWED_ROLES = ["admin", "coordinator", "operator"] as const

export function canMutateSeguimientoEvents(role: string | null | undefined): boolean {
  return SEGUIMIENTO_EVENT_MUTATION_ALLOWED_ROLES.some((allowedRole) => allowedRole === role)
}

export function canCreateSeguimientoEntry(role: string | null | undefined): boolean {
  return SEGUIMIENTO_CREATE_ALLOWED_ROLES.some((allowedRole) => allowedRole === role)
}

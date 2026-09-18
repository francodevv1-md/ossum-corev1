export const SEGUIMIENTO_EVENT_MUTATION_ALLOWED_ROLES = ["admin"] as const

export function canMutateSeguimientoEvents(role: string | null | undefined): boolean {
  return SEGUIMIENTO_EVENT_MUTATION_ALLOWED_ROLES.some((allowedRole) => allowedRole === role)
}

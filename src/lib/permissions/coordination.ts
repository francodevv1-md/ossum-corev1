export const GLOBAL_COORDINATION_ROLES = ["admin", "coordinator"] as const

export function canAccessGlobalCoordination(role: string | null | undefined): boolean {
  return role === "admin" || role === "coordinator"
}

export function getCoordinationDestination(role: string | null | undefined): string {
  return canAccessGlobalCoordination(role)
    ? "/coordinadores"
    : "/coordinadores/mi-bandeja"
}

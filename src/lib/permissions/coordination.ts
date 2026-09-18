export const GLOBAL_COORDINATION_ROLES = ["admin", "operator"] as const

export function canAccessGlobalCoordination(role: string | null | undefined): boolean {
  return role === "admin" || role === "operator"
}

export function getCoordinationDestination(role: string | null | undefined): string {
  return canAccessGlobalCoordination(role)
    ? "/coordinadores"
    : "/coordinadores/mi-bandeja"
}

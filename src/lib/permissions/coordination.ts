export const GLOBAL_COORDINATION_ROLES = ["admin", "coordinator"] as const
export const COORDINATION_MANAGEMENT_ROLES = ["admin", "manager", "coordinator", "owner", "super_admin"] as const

export function canManageCoordination(role: string | null | undefined): boolean {
  return COORDINATION_MANAGEMENT_ROLES.some((allowed) => allowed === role)
}

export function canAccessGlobalCoordination(role: string | null | undefined): boolean {
  return role === "admin" || role === "coordinator"
}

export function getCoordinationDestination(role: string | null | undefined): string {
  return canAccessGlobalCoordination(role)
    ? "/coordinadores"
    : "/coordinadores/mi-bandeja"
}

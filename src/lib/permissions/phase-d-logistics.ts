import { forbidden } from "@/lib/api/errors"

export const PHASE_D_ACTIONS = ["CONSUME", "REGISTER_RETURN", "RECEIVE_CONTROL", "CLOSE_RECONCILIATION"] as const
export type PhaseDAction = (typeof PHASE_D_ACTIONS)[number]

export async function requirePhaseDAction(prisma: { cajasPhaseDActionGrant: { findFirst: Function } }, companyId: string, actorId: string, action: PhaseDAction) {
  const grant = await prisma.cajasPhaseDActionGrant.findFirst({ where: { companyId, userId: actorId, action } })
  if (!grant) throw forbidden("Phase D action permission denied", "phase_d_action_denied")
}

export function requirePhaseDAdmin(role: string) {
  if (role !== "admin") throw forbidden("Phase D reconciliation reopen requires admin", "phase_d_reopen_denied")
}

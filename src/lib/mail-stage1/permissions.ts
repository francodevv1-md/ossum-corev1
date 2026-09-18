import type { MailStage1Permissions } from "./types"

export const MAIL_STAGE1_VIEW_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
  "operator",
] as const

export const MAIL_STAGE1_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const

export const MAIL_STAGE1_UNLINK_ROLES = [
  "admin",
  "manager",
  "owner",
  "super_admin",
] as const

export const MAIL_STAGE1_VIEW_AUDIENCE = [
  "coordinadores",
  "manager de cirugías",
  "ingresos",
  "ventas",
  "depósito",
]

export const MAIL_STAGE1_MUTATION_AUDIENCE = [
  "coordinadores",
  "manager de cirugías",
  "ingresos",
]

export function resolveMailStage1Permissions(role: string): MailStage1Permissions {
  const canView = MAIL_STAGE1_VIEW_ROLES.includes(role as (typeof MAIL_STAGE1_VIEW_ROLES)[number])
  const canMutate = MAIL_STAGE1_MUTATION_ROLES.includes(role as (typeof MAIL_STAGE1_MUTATION_ROLES)[number])
  const canUnlink = MAIL_STAGE1_UNLINK_ROLES.includes(role as (typeof MAIL_STAGE1_UNLINK_ROLES)[number])

  return {
    role,
    canView,
    canAttach: canMutate,
    canRefresh: canMutate,
    canPersistAttachments: canMutate,
    canUnlink,
    viewAudienceLabels: MAIL_STAGE1_VIEW_AUDIENCE,
    mutationAudienceLabels: MAIL_STAGE1_MUTATION_AUDIENCE,
  }
}

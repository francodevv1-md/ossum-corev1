import { apiFetch } from "@/lib/api/client"

export type InternalNotificationListItem = {
  id: string
  companyId: string
  recipientUserId: string
  actorUserId: string
  surgeryId: string | null
  sourceEntityId: string
  domain: string
  severity: string
  linkHref: string | null
  type: string
  title: string
  body: string | null
  metadata: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
  updatedAt: string
  actorName: string
  patientName?: string | null
}

export type InternalNotificationCategoryCounts = {
  all: number
  mention: number
  operational: number
  cirugias: number
  logistica: number
  stock: number
  consumos: number
  comparativa: number
  cobros: number
}

export type InternalNotificationCategory = keyof InternalNotificationCategoryCounts

export type InternalNotificationsListResponse = {
  items: InternalNotificationListItem[]
  unreadCount: number
  totalCount: number
  categoryCounts: InternalNotificationCategoryCounts
}

export type InternalNotificationsUnreadCountResponse = {
  unreadCount: number
  categoryCounts: InternalNotificationCategoryCounts
}

export type MarkAllInternalNotificationsReadResponse = {
  updatedCount: number
  readAt: string
}

export type NotificationCatalogItem = {
  type: string
  domain: string
  defaultSeverity: string
  label: string
  description: string
  defaultRoles: string[]
}

export type NotificationRolePolicyItem = {
  role: string
  notificationType: string
  domain: string
  label: string
  description: string
  inAppEnabled: boolean
  isDefault: boolean
}

export type NotificationUserPrefItem = {
  notificationType: string
  domain: string
  label: string
  description: string
  roleEnabled: boolean
  inAppMuted: boolean
}

export type NotificationPoliciesResponse = {
  isAdmin: boolean
  userRole: string
  rolePolicies: NotificationRolePolicyItem[]
  userPreferences: NotificationUserPrefItem[]
  catalog: NotificationCatalogItem[]
}

export async function fetchInternalNotifications(
  companyId: string,
  take = 20,
  unreadOnly = false,
  category: InternalNotificationCategory = "all"
) {
  const params = new URLSearchParams()
  params.set("take", String(take))
  params.set("category", category)
  if (unreadOnly) {
    params.set("unreadOnly", "1")
  }

  return apiFetch<InternalNotificationsListResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications?${params.toString()}`
  )
}

export async function fetchInternalNotificationsUnreadCount(companyId: string) {
  return apiFetch<InternalNotificationsUnreadCountResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications/unread-count`
  )
}

export async function markInternalNotificationAsRead(companyId: string, notificationId: string) {
  return apiFetch<InternalNotificationListItem>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" }
  )
}

export async function markAllInternalNotificationsAsRead(companyId: string) {
  return apiFetch<MarkAllInternalNotificationsReadResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications/read-all`,
    { method: "PATCH" }
  )
}

export async function fetchNotificationPolicies(companyId: string) {
  return apiFetch<NotificationPoliciesResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications/policies`
  )
}

export async function updateRoleNotificationPolicyApi(
  companyId: string,
  payload: { role: string; notificationType: string; inAppEnabled: boolean }
) {
  return apiFetch<{ success: boolean }>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications/policies/role`,
    { method: "PUT", body: JSON.stringify(payload) }
  )
}

export async function updateUserNotificationPrefApi(
  companyId: string,
  payload: { notificationType: string; inAppMuted: boolean }
) {
  return apiFetch<{ success: boolean }>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications/policies/user`,
    { method: "PUT", body: JSON.stringify(payload) }
  )
}

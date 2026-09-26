import { apiFetch } from "@/lib/api/client"

export type InternalNotificationListItem = {
  id: string
  companyId: string
  recipientUserId: string
  actorUserId: string
  surgeryId: string
  sourceEntityId: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
  updatedAt: string
  actorName: string
  patientName: string | null
}

export type InternalNotificationCategoryCounts = {
  all: number
  mention: number
  operational: number
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

export async function fetchInternalNotifications(
  companyId: string,
  take = 8,
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
    {
      method: "PATCH",
    }
  )
}

export async function markAllInternalNotificationsAsRead(companyId: string) {
  return apiFetch<MarkAllInternalNotificationsReadResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/notifications/read-all`,
    {
      method: "PATCH",
    }
  )
}

import { apiFetch } from "@/lib/api/client"
import type { OperationalInternalNotificationEventType } from "@/lib/services/internal-notifications.service"

export type EmitOperationalNotificationInput = {
  sourceEntityId: string
  eventType: OperationalInternalNotificationEventType
  coordinatorName?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  previousScheduledDate?: string | null
  previousScheduledTime?: string | null
}

export type EmitOperationalNotificationResponse = {
  createdCount: number
  attemptedCount: number
}

export async function emitOperationalNotification(
  companyId: string,
  surgeryId: string,
  input: EmitOperationalNotificationInput
) {
  return apiFetch<EmitOperationalNotificationResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/notifications/operational`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
}

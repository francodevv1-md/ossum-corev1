import { badRequest } from "@/lib/api/errors"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { created, errorResponse } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import {
  emitOperationalInternalNotifications,
  type EmitOperationalInternalNotificationsInput,
  type OperationalInternalNotificationEventType,
} from "@/lib/services/internal-notifications.service"

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>
}

const SURGERY_NOTIFICATION_MUTATION_ROLES = ["admin", "coordinator", "operator"] as const
const OPERATIONAL_EVENT_TYPES = new Set<OperationalInternalNotificationEventType>([
  "coordinator_assigned",
  "surgery_date_assigned",
  "surgery_rescheduled",
  "surgery_marked_urgent",
])

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body")
  }
}

function optionalString(value: unknown, field: string) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") {
    throw badRequest(`Field ${field} must be a string`, "invalid_operational_notification_body")
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function validateBody(body: unknown): Omit<EmitOperationalInternalNotificationsInput, "companyId" | "surgeryId" | "actorUserId"> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Invalid operational notification body", "invalid_operational_notification_body")
  }

  const record = body as Record<string, unknown>
  const sourceEntityId = optionalString(record.sourceEntityId, "sourceEntityId")
  const eventType = optionalString(record.eventType, "eventType") as OperationalInternalNotificationEventType | undefined

  if (!sourceEntityId) {
    throw badRequest("sourceEntityId is required", "missing_source_entity_id")
  }

  if (!eventType || !OPERATIONAL_EVENT_TYPES.has(eventType)) {
    throw badRequest("eventType is invalid", "invalid_operational_notification_event")
  }

  return {
    sourceEntityId,
    eventType,
    coordinatorName: optionalString(record.coordinatorName, "coordinatorName"),
    scheduledDate: optionalString(record.scheduledDate, "scheduledDate"),
    scheduledTime: optionalString(record.scheduledTime, "scheduledTime"),
    previousScheduledDate: optionalString(record.previousScheduledDate, "previousScheduledDate"),
    previousScheduledTime: optionalString(record.previousScheduledTime, "previousScheduledTime"),
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params
    const ctx = await getApiAuthContext(request, companyId)

    requireCompanyMutationAccess(ctx, SURGERY_NOTIFICATION_MUTATION_ROLES)

    const body = validateBody(await parseJsonBody(request))
    const realSurgeryId = (await resolveCompanySurgery(ctx.companyId, surgeryId)).id

    const result = await emitOperationalInternalNotifications(prisma, {
      companyId: ctx.companyId,
      surgeryId: realSurgeryId,
      actorUserId: ctx.actorUserId,
      ...body,
    })

    return created(result)
  } catch (error) {
    return errorResponse(error)
  }
}

import { InternalNotificationType, Prisma, PrismaClient } from "@prisma/client"
import type { MentionRef } from "@/lib/mentions/types"
import { conflict, notFound } from "@/lib/api/errors"

type NotificationDbClient = PrismaClient | Prisma.TransactionClient

export type InternalNotificationListItem = {
  id: string
  companyId: string
  recipientUserId: string
  actorUserId: string
  surgeryId: string
  sourceEntityId: string
  type: InternalNotificationType
  title: string
  body: string | null
  metadata: Prisma.JsonValue | null
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
  actorName: string
  patientName: string | null
}

export type InternalNotificationCategoryCounts = {
  all: number
  mention: number
  operational: number
}

export type InternalNotificationCategory = keyof InternalNotificationCategoryCounts

export interface EmitSeguimientoMentionNotificationsInput {
  companyId: string
  surgeryId: string
  sourceEntityId: string
  actorUserId: string
  actorDisplayName: string
  entryType: string
  content: string
  mentions?: MentionRef[]
  trigger: "create" | "patch_added"
}

export interface ListInternalNotificationsInput {
  companyId: string
  recipientUserId: string
  take?: number
  unreadOnly?: boolean
  category?: InternalNotificationCategory
}

export interface MarkInternalNotificationReadInput {
  companyId: string
  recipientUserId: string
  notificationId: string
}

export interface MarkAllInternalNotificationsReadInput {
  companyId: string
  recipientUserId: string
}

export type OperationalInternalNotificationEventType =
  | "coordinator_assigned"
  | "surgery_date_requested"
  | "surgery_date_assigned"
  | "surgery_rescheduled"
  | "surgery_marked_urgent"

const OPERATIONAL_NOTIFICATION_EVENT_TYPES: OperationalInternalNotificationEventType[] = [
  "coordinator_assigned",
  "surgery_date_requested",
  "surgery_date_assigned",
  "surgery_rescheduled",
  "surgery_marked_urgent",
]

export interface EmitOperationalInternalNotificationsInput {
  companyId: string
  surgeryId: string
  sourceEntityId: string
  actorUserId: string
  eventType: OperationalInternalNotificationEventType
  coordinatorName?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  previousScheduledDate?: string | null
  previousScheduledTime?: string | null
}

export interface EmitAvailabilityActionableNotificationsInput {
  tx: Prisma.TransactionClient
  companyId: string
  surgeryId: string
  requestId: string
  actorUserId: string
  correlationId: string
  recipientUserIds: string[]
  requesterDisplayName: string
  surgeryVisibleNumber: string | null
}

export interface EmitAvailabilityRequesterCompletionNotificationInput {
  tx: Prisma.TransactionClient
  companyId: string
  surgeryId: string
  requestId: string
  actorUserId: string
  correlationId: string
  requesterUserId: string
  completerDisplayName: string
  date: string
}

export interface EmitAvailabilityPivotTransferNotificationsInput {
  tx: Prisma.TransactionClient
  companyId: string
  actorUserId: string
  correlationId: string
  formerPivotUserId: string
  newPivotUserId: string
  requests: Array<{
    requestId: string
    surgeryId: string
    recipientReasons: Array<"creator" | "pivot">
  }>
}

function buildActorDisplayName(firstName: string, lastName: string, email: string) {
  return `${firstName} ${lastName}`.trim() || email
}

function buildPatientDisplayName(
  contact: { firstName: string | null; lastName: string | null; legalName: string | null } | null
): string | null {
  if (!contact) return null
  const legal = contact.legalName?.trim()
  if (legal) return legal
  const full = [contact.firstName, contact.lastName]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
    .join(" ")
  return full || null
}

function buildPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim()
  if (!normalized) return null
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized
}

function normalizeMentions(mentions: MentionRef[] | undefined, actorUserId: string) {
  const unique = new Map<string, MentionRef>()

  for (const mention of mentions ?? []) {
    if (!mention?.userId || mention.userId === actorUserId) continue
    unique.set(mention.userId, mention)
  }

  return Array.from(unique.values())
}

function buildMentionEventKey(sourceEntityId: string, recipientUserId: string) {
  return `${InternalNotificationType.seguimiento_mention}:${sourceEntityId}:${recipientUserId}`
}

function buildOperationalEventKey(
  eventType: OperationalInternalNotificationEventType,
  sourceEntityId: string,
  recipientUserId: string
) {
  return `operational:${eventType}:${sourceEntityId}:${recipientUserId}`
}

function buildAvailabilityEventKey(
  requestId: string,
  event: "actionable" | "completed" | "pivot-reassigned" | "pivot-revoked",
  recipientUserId: string,
  episode?: string
) {
  return ["availability", "request", requestId, event, recipientUserId, episode]
    .filter(Boolean)
    .join(":")
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function formatDateLabel(value: string | null | undefined) {
  const normalized = value?.trim()
  if (!normalized) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
  if (!match) return normalized

  return `${match[3]}/${match[2]}/${match[1]}`
}

function formatScheduledLabel(date: string | null | undefined, time: string | null | undefined) {
  const dateLabel = formatDateLabel(date)
  const timeLabel = time?.trim() || null

  if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`
  return dateLabel ?? timeLabel
}

async function getActorDisplayName(prisma: NotificationDbClient, actorUserId: string) {
  const actor = await prisma.user.findUniqueOrThrow({
    where: { id: actorUserId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  })

  return buildActorDisplayName(actor.firstName, actor.lastName, actor.email)
}

async function resolveAdminRecipients(prisma: NotificationDbClient, companyId: string) {
  return prisma.userCompanyAccess.findMany({
    where: {
      companyId,
      isActive: true,
      role: "admin",
      user: { isActive: true },
    },
    select: {
      userId: true,
    },
  })
}

async function resolveCoordinatorRecipient(
  prisma: NotificationDbClient,
  companyId: string,
  coordinatorName: string | null | undefined
) {
  const normalizedTarget = normalizeSearchText(coordinatorName ?? "")
  if (!normalizedTarget || normalizedTarget === "sin asignar") {
    return [] as Array<{ userId: string }>
  }

  const accesses = await prisma.userCompanyAccess.findMany({
    where: {
      companyId,
      isActive: true,
      user: { isActive: true },
    },
    select: {
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  const matches = accesses.filter((access) => {
    const displayName = buildActorDisplayName(
      access.user.firstName,
      access.user.lastName,
      access.user.email
    )
    const normalizedDisplayName = normalizeSearchText(displayName)
    const normalizedFirstName = normalizeSearchText(access.user.firstName)
    const normalizedLastName = normalizeSearchText(access.user.lastName)

    return (
      normalizedDisplayName === normalizedTarget ||
      normalizedFirstName === normalizedTarget ||
      normalizedLastName === normalizedTarget ||
      normalizedDisplayName.split(" ").includes(normalizedTarget)
    )
  })

  return matches.length === 1 ? [{ userId: matches[0].userId }] : []
}

function buildOperationalNotificationCopy(
  input: EmitOperationalInternalNotificationsInput,
  actorDisplayName: string
) {
  switch (input.eventType) {
    case "coordinator_assigned":
      return {
        title: `${actorDisplayName} te asignó una cirugía`,
        body: `Caso ${input.surgeryId}${input.coordinatorName ? ` · Coordinador ${input.coordinatorName}` : ""}`,
        metadata: {
          channel: "operational",
          eventType: input.eventType,
          sourceEntityType: "surgery",
          actorDisplayName,
          coordinatorName: input.coordinatorName ?? null,
        } satisfies Prisma.InputJsonValue,
      }
    case "surgery_date_assigned": {
      const scheduledLabel = formatScheduledLabel(input.scheduledDate, input.scheduledTime)
      return {
        title: `${actorDisplayName} asignó fecha de cirugía`,
        body: scheduledLabel ? `Caso ${input.surgeryId} · ${scheduledLabel}` : `Caso ${input.surgeryId}`,
        metadata: {
          channel: "operational",
          eventType: input.eventType,
          sourceEntityType: "seguimiento_entry",
          actorDisplayName,
          scheduledDate: input.scheduledDate ?? null,
          scheduledTime: input.scheduledTime ?? null,
        } satisfies Prisma.InputJsonValue,
      }
    }
    case "surgery_date_requested":
      return {
        title: `${actorDisplayName} solicitó definir fecha de cirugía`,
        body: `Caso ${input.surgeryId}${input.coordinatorName ? ` · Coordinador ${input.coordinatorName}` : ""}`,
        metadata: {
          channel: "operational",
          eventType: input.eventType,
          sourceEntityType: "seguimiento_entry",
          actorDisplayName,
          coordinatorName: input.coordinatorName ?? null,
        } satisfies Prisma.InputJsonValue,
      }
    case "surgery_rescheduled": {
      const previousLabel = formatScheduledLabel(input.previousScheduledDate, input.previousScheduledTime)
      const nextLabel = formatScheduledLabel(input.scheduledDate, input.scheduledTime)
      return {
        title: `${actorDisplayName} registró una reprogramación`,
        body:
          previousLabel || nextLabel
            ? `Caso ${input.surgeryId}${nextLabel ? ` · Nueva fecha ${nextLabel}` : ""}${previousLabel ? ` · Antes ${previousLabel}` : ""}`
            : `Caso ${input.surgeryId}`,
        metadata: {
          channel: "operational",
          eventType: input.eventType,
          sourceEntityType: "seguimiento_entry",
          actorDisplayName,
          scheduledDate: input.scheduledDate ?? null,
          scheduledTime: input.scheduledTime ?? null,
          previousScheduledDate: input.previousScheduledDate ?? null,
          previousScheduledTime: input.previousScheduledTime ?? null,
        } satisfies Prisma.InputJsonValue,
      }
    }
    case "surgery_marked_urgent":
      return {
        title: `${actorDisplayName} marcó la gestión como urgente`,
        body: `Caso ${input.surgeryId} marcado como urgente`,
        metadata: {
          channel: "operational",
          eventType: input.eventType,
          sourceEntityType: "seguimiento_entry",
          actorDisplayName,
        } satisfies Prisma.InputJsonValue,
      }
  }
}

function mapNotificationRow(
  row: Prisma.InternalNotificationGetPayload<{
    include: {
      actor: { select: { firstName: true; lastName: true; email: true } }
      surgery: { select: { patient: { select: { firstName: true; lastName: true; legalName: true } } } }
    }
  }>
): InternalNotificationListItem {
  return {
    id: row.id,
    companyId: row.companyId,
    recipientUserId: row.recipientUserId,
    actorUserId: row.actorUserId,
    surgeryId: row.surgeryId,
    sourceEntityId: row.sourceEntityId,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata,
    readAt: row.readAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    actorName: buildActorDisplayName(row.actor.firstName, row.actor.lastName, row.actor.email),
    patientName: buildPatientDisplayName(row.surgery?.patient ?? null),
  }
}

function buildOperationalCategoryWhere(
  baseWhere: Prisma.InternalNotificationWhereInput
): Prisma.InternalNotificationWhereInput {
  return {
    AND: [
      baseWhere,
      buildOperationalCategoryMatcher(),
    ],
  }
}

function buildOperationalCategoryMatcher(): Prisma.InternalNotificationWhereInput {
  return {
    OR: [
      { metadata: { path: ["channel"], equals: "operational" } },
      ...OPERATIONAL_NOTIFICATION_EVENT_TYPES.map((eventType) => ({
        metadata: { path: ["eventType"], equals: eventType },
      })),
    ],
  }
}

function buildMentionCategoryWhere(
  baseWhere: Prisma.InternalNotificationWhereInput
): Prisma.InternalNotificationWhereInput {
  return {
    AND: [baseWhere, { NOT: buildOperationalCategoryMatcher() }],
  }
}

function buildListCategoryWhere(
  baseWhere: Prisma.InternalNotificationWhereInput,
  category: InternalNotificationCategory
): Prisma.InternalNotificationWhereInput {
  switch (category) {
    case "mention":
      return buildMentionCategoryWhere(baseWhere)
    case "operational":
      return buildOperationalCategoryWhere(baseWhere)
    case "all":
    default:
      return baseWhere
  }
}

async function getInternalNotificationCategoryCounts(
  prisma: NotificationDbClient,
  baseWhere: Prisma.InternalNotificationWhereInput
): Promise<InternalNotificationCategoryCounts> {
  const [all, operational] = await Promise.all([
    prisma.internalNotification.count({ where: baseWhere }),
    prisma.internalNotification.count({ where: buildOperationalCategoryWhere(baseWhere) }),
  ])

  return {
    all,
    operational,
    mention: Math.max(0, all - operational),
  }
}

export async function emitSeguimientoMentionNotifications(
  prisma: NotificationDbClient,
  input: EmitSeguimientoMentionNotificationsInput
) {
  const recipients = normalizeMentions(input.mentions, input.actorUserId)

  if (recipients.length === 0) {
    return { createdCount: 0, attemptedCount: 0 }
  }

  const recipientAccesses = await prisma.userCompanyAccess.findMany({
    where: {
      companyId: input.companyId,
      isActive: true,
      userId: { in: recipients.map((mention) => mention.userId) },
      user: { isActive: true },
    },
    select: {
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  if (recipientAccesses.length === 0) {
    return { createdCount: 0, attemptedCount: recipients.length }
  }

  const mentionByUserId = new Map(recipients.map((mention) => [mention.userId, mention]))
  const preview = buildPreview(input.content)

  const result = await prisma.internalNotification.createMany({
    data: recipientAccesses.map((access) => {
      const mention = mentionByUserId.get(access.userId)
      const recipientDisplayName = buildActorDisplayName(
        access.user.firstName,
        access.user.lastName,
        access.user.email
      )

      return {
        companyId: input.companyId,
        recipientUserId: access.userId,
        actorUserId: input.actorUserId,
        surgeryId: input.surgeryId,
        sourceEntityId: input.sourceEntityId,
        type: InternalNotificationType.seguimiento_mention,
        eventKey: buildMentionEventKey(input.sourceEntityId, access.userId),
        title: `${input.actorDisplayName} te mencionó en Seguimiento`,
        body: preview,
        metadata: {
          trigger: input.trigger,
          sourceEntityType: "seguimiento_entry",
          entryType: input.entryType,
          actorDisplayName: input.actorDisplayName,
          recipientDisplayName,
          mentionDisplayName: mention?.displayName ?? recipientDisplayName,
        } satisfies Prisma.InputJsonValue,
      }
    }),
    skipDuplicates: true,
  })

  return {
    createdCount: result.count,
    attemptedCount: recipientAccesses.length,
  }
}

export async function emitOperationalInternalNotifications(
  prisma: NotificationDbClient,
  input: EmitOperationalInternalNotificationsInput
) {
  const actorDisplayName = await getActorDisplayName(prisma, input.actorUserId)

  const recipients =
    input.eventType === "coordinator_assigned" || input.eventType === "surgery_date_requested"
      ? await resolveCoordinatorRecipient(prisma, input.companyId, input.coordinatorName)
      : await resolveAdminRecipients(prisma, input.companyId)

  if (recipients.length === 0) {
    return { createdCount: 0, attemptedCount: 0 }
  }

  const copy = buildOperationalNotificationCopy(input, actorDisplayName)
  const result = await prisma.internalNotification.createMany({
    data: recipients.map((recipient) => ({
      companyId: input.companyId,
      recipientUserId: recipient.userId,
      actorUserId: input.actorUserId,
      surgeryId: input.surgeryId,
      sourceEntityId: input.sourceEntityId,
      type: InternalNotificationType.seguimiento_mention,
      eventKey: buildOperationalEventKey(input.eventType, input.sourceEntityId, recipient.userId),
      title: copy.title,
      body: copy.body,
      metadata: copy.metadata,
    })),
    skipDuplicates: true,
  })

  return {
    createdCount: result.count,
    attemptedCount: recipients.length,
  }
}

/** Transaction-bound delivery projection. Request state and assignments remain authoritative. */
export async function emitAvailabilityActionableNotifications(
  input: EmitAvailabilityActionableNotificationsInput
): Promise<void> {
  const recipientUserIds = [...new Set(input.recipientUserIds)]
  if (recipientUserIds.length === 0) return

  const assignments = await input.tx.availabilityRequestRecipientAssignment.findMany({
    where: {
      availabilityRequestId: input.requestId,
      companyId: input.companyId,
      userId: { in: recipientUserIds },
      revokedAt: null,
    },
    select: { userId: true, reason: true },
  })
  const reasonsByUserId = new Map<string, Set<"creator" | "pivot">>()
  for (const assignment of assignments) {
    const reasons = reasonsByUserId.get(assignment.userId) ?? new Set<"creator" | "pivot">()
    reasons.add(assignment.reason === "CREATOR" ? "creator" : "pivot")
    reasonsByUserId.set(assignment.userId, reasons)
  }
  if (recipientUserIds.some((recipientUserId) => !reasonsByUserId.has(recipientUserId))) {
    throw conflict(
      "Availability notification recipient has no active assignment",
      "availability_notification_recipient_invariant"
    )
  }

  await input.tx.internalNotification.createMany({
    data: recipientUserIds.map((recipientUserId) => ({
      companyId: input.companyId,
      recipientUserId,
      actorUserId: input.actorUserId,
      surgeryId: input.surgeryId,
      sourceEntityId: input.requestId,
      availabilityRequestId: input.requestId,
      type: InternalNotificationType.availability_request_actionable,
      eventKey: buildAvailabilityEventKey(
        input.requestId,
        "actionable",
        recipientUserId
      ),
      title: "Fecha de disponibilidad solicitada",
      body: `${input.requesterDisplayName} pidió informar cuándo estará disponible el material para la cirugía ${input.surgeryVisibleNumber ?? input.surgeryId}.`,
      metadata: {
        channel: "operational",
        eventType: "availability_request_actionable",
        availabilityRequestId: input.requestId,
        correlationId: input.correlationId,
        recipientReasons: [...reasonsByUserId.get(recipientUserId)!],
        href: `/notificaciones?accion=informar-disponibilidad&solicitud=${encodeURIComponent(input.requestId)}`,
        actionable: true,
      } satisfies Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  })
}

/** Informational projection only; it never grants correction or completion authority. */
export async function emitAvailabilityRequesterCompletionNotification(
  input: EmitAvailabilityRequesterCompletionNotificationInput
): Promise<void> {
  await input.tx.internalNotification.createMany({
    data: [
      {
        companyId: input.companyId,
        recipientUserId: input.requesterUserId,
        actorUserId: input.actorUserId,
        surgeryId: input.surgeryId,
        sourceEntityId: input.requestId,
        availabilityRequestId: input.requestId,
        type: InternalNotificationType.availability_request_completed,
        eventKey: buildAvailabilityEventKey(
          input.requestId,
          "completed",
          input.requesterUserId
        ),
        title: `Disponibilidad informada: ${formatDateLabel(input.date) ?? input.date}`,
        body: `${input.completerDisplayName} informó la disponibilidad del material.`,
        metadata: {
          channel: "operational",
          eventType: "availability_request_completed",
          availabilityRequestId: input.requestId,
          correlationId: input.correlationId,
          href: `/notificaciones?solicitud=${encodeURIComponent(input.requestId)}`,
          actionable: false,
        } satisfies Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  })
}

/** Updates the canonical action and emits one former-PÍVOT informational row per request. */
export async function emitAvailabilityPivotTransferNotifications(
  input: EmitAvailabilityPivotTransferNotificationsInput
): Promise<void> {
  const requests = [...new Map(input.requests.map((request) => [request.requestId, request])).values()]
  if (requests.length === 0) return

  for (const request of requests) {
    const recipientReasons = [...new Set(request.recipientReasons)]
    const eventKey = buildAvailabilityEventKey(
      request.requestId,
      "actionable",
      input.newPivotUserId
    )
    const metadata = {
      channel: "operational",
      eventType: "availability_request_actionable",
      availabilityRequestId: request.requestId,
      correlationId: input.correlationId,
      recipientReasons,
      href: `/notificaciones?accion=informar-disponibilidad&solicitud=${encodeURIComponent(request.requestId)}`,
      actionable: true,
    } satisfies Prisma.InputJsonValue
    const projection = {
      recipientUserId: input.newPivotUserId,
      actorUserId: input.actorUserId,
      surgeryId: request.surgeryId,
      sourceEntityId: request.requestId,
      availabilityRequestId: request.requestId,
      type: InternalNotificationType.availability_request_actionable,
      title: "Solicitud de disponibilidad reasignada",
      body: "Ahora sos PÍVOT responsable de informar la disponibilidad del material.",
      metadata,
    }

    await input.tx.internalNotification.upsert({
      where: {
        companyId_eventKey: {
          companyId: input.companyId,
          eventKey,
        },
      },
      create: {
        companyId: input.companyId,
        eventKey,
        ...projection,
      },
      update: projection,
    })
  }

  await input.tx.internalNotification.createMany({
    data: requests.map((request) => ({
      companyId: input.companyId,
      recipientUserId: input.formerPivotUserId,
      actorUserId: input.actorUserId,
      surgeryId: request.surgeryId,
      sourceEntityId: request.requestId,
      availabilityRequestId: request.requestId,
      type: InternalNotificationType.availability_pivot_reassigned,
      eventKey: buildAvailabilityEventKey(
        request.requestId,
        "pivot-revoked",
        input.formerPivotUserId,
        input.correlationId
      ),
      title: "Solicitud de disponibilidad reasignada",
      body: "La responsabilidad de PÍVOT fue reasignada. Esta notificación es informativa.",
      metadata: {
        channel: "operational",
        eventType: "availability_pivot_revoked",
        availabilityRequestId: request.requestId,
        correlationId: input.correlationId,
        actionable: false,
      } satisfies Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  })
}

export async function listInternalNotifications(
  prisma: NotificationDbClient,
  input: ListInternalNotificationsInput
) {
  const take = Math.min(Math.max(input.take ?? 20, 1), 100)
  const category = input.category ?? "all"
  const baseWhere = {
    companyId: input.companyId,
    recipientUserId: input.recipientUserId,
    ...(input.unreadOnly ? { readAt: null } : {}),
  } satisfies Prisma.InternalNotificationWhereInput
  const listWhere = buildListCategoryWhere(baseWhere, category)

  const unreadWhere = {
    companyId: input.companyId,
    recipientUserId: input.recipientUserId,
    readAt: null,
  } satisfies Prisma.InternalNotificationWhereInput

  const [items, unreadCount, categoryCounts] = await Promise.all([
    prisma.internalNotification.findMany({
      where: listWhere,
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        surgery: {
          select: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
                legalName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.internalNotification.count({ where: unreadWhere }),
    getInternalNotificationCategoryCounts(prisma, baseWhere),
  ])

  return {
    items: items.map(mapNotificationRow),
    unreadCount,
    totalCount: categoryCounts[category],
    categoryCounts,
  }
}

export async function getUnreadInternalNotificationsCount(
  prisma: NotificationDbClient,
  companyId: string,
  recipientUserId: string
) {
  return getInternalNotificationCategoryCounts(prisma, {
    companyId,
    recipientUserId,
    readAt: null,
  })
}

export async function markInternalNotificationRead(
  prisma: NotificationDbClient,
  input: MarkInternalNotificationReadInput
) {
  const existing = await prisma.internalNotification.findFirst({
    where: {
      id: input.notificationId,
      companyId: input.companyId,
      recipientUserId: input.recipientUserId,
    },
    include: {
      actor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      surgery: {
        select: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              legalName: true,
            },
          },
        },
      },
    },
  })

  if (!existing) {
    throw notFound("Notification not found", "notification_not_found")
  }

  if (existing.readAt) {
    return mapNotificationRow(existing)
  }

  const updated = await prisma.internalNotification.update({
    where: { id: input.notificationId },
    data: { readAt: new Date() },
    include: {
      actor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      surgery: {
        select: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              legalName: true,
            },
          },
        },
      },
    },
  })

  return mapNotificationRow(updated)
}

export async function markAllInternalNotificationsRead(
  prisma: NotificationDbClient,
  input: MarkAllInternalNotificationsReadInput
) {
  const now = new Date()

  const result = await prisma.internalNotification.updateMany({
    where: {
      companyId: input.companyId,
      recipientUserId: input.recipientUserId,
      readAt: null,
    },
    data: {
      readAt: now,
    },
  })

  return {
    updatedCount: result.count,
    readAt: now,
  }
}

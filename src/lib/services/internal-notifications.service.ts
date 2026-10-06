import { InternalNotificationType, Prisma, PrismaClient } from "@prisma/client"
import type { MentionRef } from "@/lib/mentions/types"
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors"
import { createAuditEvent } from "@/lib/audit"
import { resolveCanonicalRole, type CanonicalRole } from "@/lib/permissions/canonical-roles"
import { buildNotificationExpedienteLink } from "@/lib/expediente-navigation"

type NotificationDbClient = PrismaClient | Prisma.TransactionClient

export type NotificationDomain =
  | "CIRUGIAS"
  | "LOGISTICA"
  | "STOCK"
  | "CONSUMOS"
  | "COMPARATIVA"
  | "COBROS"
  | "SISTEMA"

export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL" | "SUCCESS"

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
  type: InternalNotificationType
  title: string
  body: string | null
  metadata: Prisma.JsonValue | null
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
  actorName: string
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

export type NotificationTypeCatalogItem = {
  type: InternalNotificationType
  domain: NotificationDomain
  defaultSeverity: NotificationSeverity
  label: string
  description: string
  defaultRoles: string[]
}

export const NOTIFICATION_TYPE_CATALOG: Record<InternalNotificationType, NotificationTypeCatalogItem> = {
  seguimiento_mention: {
    type: InternalNotificationType.seguimiento_mention,
    domain: "CIRUGIAS",
    defaultSeverity: "INFO",
    label: "Mención en Seguimiento",
    description: "Notificación directa cuando otro usuario te etiqueta en el muro del expediente.",
    defaultRoles: ["admin", "coordinator", "logistics", "billing", "commercial", "technician", "viewer"],
  },
  availability_request_actionable: {
    type: InternalNotificationType.availability_request_actionable,
    domain: "CIRUGIAS",
    defaultSeverity: "WARNING",
    label: "Solicitud de disponibilidad",
    description: "Requerimiento de fecha y confirmación de disponibilidad de material quirúrgico.",
    defaultRoles: ["admin", "coordinator"],
  },
  availability_request_completed: {
    type: InternalNotificationType.availability_request_completed,
    domain: "CIRUGIAS",
    defaultSeverity: "SUCCESS",
    label: "Disponibilidad informada",
    description: "Confirmación de fecha de disponibilidad completada por el pívot responsable.",
    defaultRoles: ["admin", "coordinator"],
  },
  availability_pivot_reassigned: {
    type: InternalNotificationType.availability_pivot_reassigned,
    domain: "CIRUGIAS",
    defaultSeverity: "INFO",
    label: "Pívot reasignado",
    description: "Aviso de reasignación de responsabilidad operativa sobre disponibilidad.",
    defaultRoles: ["admin", "coordinator"],
  },
  surgery_critical_change: {
    type: InternalNotificationType.surgery_critical_change,
    domain: "CIRUGIAS",
    defaultSeverity: "CRITICAL",
    label: "Cambio crítico de cirugía",
    description: "Suspensión, cancelación, reactivación o cambio de estado troncal del caso.",
    defaultRoles: ["admin", "coordinator"],
  },
  surgery_reassigned: {
    type: InternalNotificationType.surgery_reassigned,
    domain: "CIRUGIAS",
    defaultSeverity: "INFO",
    label: "Reasignación de cirugía",
    description: "Asignación de coordinador principal o equipo quirúrgico al expediente.",
    defaultRoles: ["admin", "coordinator"],
  },
  surgery_date_assigned: {
    type: InternalNotificationType.surgery_date_assigned,
    domain: "CIRUGIAS",
    defaultSeverity: "INFO",
    label: "Fecha quirúrgica fijada",
    description: "Fijación o confirmación de fecha y hora para la intervención.",
    defaultRoles: ["admin", "coordinator", "logistics", "technician"],
  },
  surgery_authorized: {
    type: InternalNotificationType.surgery_authorized,
    domain: "CIRUGIAS",
    defaultSeverity: "SUCCESS",
    label: "Cirugía autorizada",
    description: "Aprobación médica/técnica que habilita la preparación y despacho de material.",
    defaultRoles: ["admin", "coordinator", "billing"],
  },
  surgery_blocked: {
    type: InternalNotificationType.surgery_blocked,
    domain: "CIRUGIAS",
    defaultSeverity: "CRITICAL",
    label: "Cirugía bloqueada",
    description: "Incidencia o falta de documentación/material que frena la operación.",
    defaultRoles: ["admin", "coordinator"],
  },
  remito_prepared: {
    type: InternalNotificationType.remito_prepared,
    domain: "LOGISTICA",
    defaultSeverity: "INFO",
    label: "Remito preparado en depósito",
    description: "Cajas y artículos controlados listos para su despacho.",
    defaultRoles: ["admin", "coordinator", "logistics"],
  },
  remito_dispatched: {
    type: InternalNotificationType.remito_dispatched,
    domain: "LOGISTICA",
    defaultSeverity: "INFO",
    label: "Remito despachado en tránsito",
    description: "Material en viaje hacia la institución médica con trazabilidad activa.",
    defaultRoles: ["admin", "coordinator", "logistics"],
  },
  remito_delivered: {
    type: InternalNotificationType.remito_delivered,
    domain: "LOGISTICA",
    defaultSeverity: "SUCCESS",
    label: "Remito entregado en destino",
    description: "Confirmación de recepción física en clínica o quirófano.",
    defaultRoles: ["admin", "coordinator", "logistics", "billing"],
  },
  logistics_incident: {
    type: InternalNotificationType.logistics_incident,
    domain: "LOGISTICA",
    defaultSeverity: "CRITICAL",
    label: "Incidencia logística",
    description: "Retraso, diferencia en caja o problema en entrega de materiales.",
    defaultRoles: ["admin", "coordinator", "logistics"],
  },
  stock_receipt_confirmed: {
    type: InternalNotificationType.stock_receipt_confirmed,
    domain: "STOCK",
    defaultSeverity: "SUCCESS",
    label: "Recepción de stock confirmada",
    description: "Ingreso al inventario de mercadería desde compras con lotes y vencimientos.",
    defaultRoles: ["admin", "logistics", "commercial"],
  },
  stock_low: {
    type: InternalNotificationType.stock_low,
    domain: "STOCK",
    defaultSeverity: "WARNING",
    label: "Stock bajo mínimo",
    description: "Artículo ha caído por debajo del umbral de reposición definido.",
    defaultRoles: ["admin", "logistics", "commercial"],
  },
  stock_expiry: {
    type: InternalNotificationType.stock_expiry,
    domain: "STOCK",
    defaultSeverity: "WARNING",
    label: "Alerta de vencimiento",
    description: "Lote próximo a expirar (< 60 días) o vencido en depósito.",
    defaultRoles: ["admin", "logistics"],
  },
  stock_difference: {
    type: InternalNotificationType.stock_difference,
    domain: "STOCK",
    defaultSeverity: "WARNING",
    label: "Ajuste / diferencia de stock",
    description: "Ajuste manual de inventario registrado con motivo auditable.",
    defaultRoles: ["admin", "logistics"],
  },
  consumo_pending_validation: {
    type: InternalNotificationType.consumo_pending_validation,
    domain: "CONSUMOS",
    defaultSeverity: "INFO",
    label: "Consumo pendiente de validar",
    description: "Hoja de consumo quirúrgico cargada pendiente de revisión técnica.",
    defaultRoles: ["admin", "coordinator", "billing"],
  },
  consumo_validated: {
    type: InternalNotificationType.consumo_validated,
    domain: "CONSUMOS",
    defaultSeverity: "SUCCESS",
    label: "Consumo quirúrgico validado",
    description: "Consumo final confirmado y cerrado para facturación.",
    defaultRoles: ["admin", "coordinator", "billing"],
  },
  devolucion_confirmed: {
    type: InternalNotificationType.devolucion_confirmed,
    domain: "CONSUMOS",
    defaultSeverity: "INFO",
    label: "Devolución confirmada en depósito",
    description: "Reintegro físico de sobrante de cirugía auditado en stock.",
    defaultRoles: ["admin", "coordinator", "logistics"],
  },
  consumo_incident: {
    type: InternalNotificationType.consumo_incident,
    domain: "CONSUMOS",
    defaultSeverity: "CRITICAL",
    label: "Diferencia o incidencia en consumo",
    description: "Faltante de material no devuelto ni justificado en el consumo.",
    defaultRoles: ["admin", "coordinator", "logistics", "billing"],
  },
  comparativa_deviation: {
    type: InternalNotificationType.comparativa_deviation,
    domain: "COMPARATIVA",
    defaultSeverity: "CRITICAL",
    label: "Desvío crítico en comparativa",
    description: "Diferencia cuantitativa o económica entre presupuesto, remito y consumo.",
    defaultRoles: ["admin", "billing", "coordinator"],
  },
  comparativa_pending_review: {
    type: InternalNotificationType.comparativa_pending_review,
    domain: "COMPARATIVA",
    defaultSeverity: "WARNING",
    label: "Comparativa pendiente de revisión",
    description: "Expediente listo para cierre económico y control pre-facturación.",
    defaultRoles: ["admin", "billing"],
  },
  payment_recorded: {
    type: InternalNotificationType.payment_recorded,
    domain: "COBROS",
    defaultSeverity: "SUCCESS",
    label: "Cobro registrado",
    description: "Ingreso de pago imputado a facturas de clientes.",
    defaultRoles: ["admin", "billing", "commercial"],
  },
  payment_cancelled: {
    type: InternalNotificationType.payment_cancelled,
    domain: "COBROS",
    defaultSeverity: "WARNING",
    label: "Cobro anulado",
    description: "Anulación auditable de recibo con reversión de saldos.",
    defaultRoles: ["admin", "billing"],
  },
  invoice_due: {
    type: InternalNotificationType.invoice_due,
    domain: "COBROS",
    defaultSeverity: "INFO",
    label: "Factura por vencer / con saldo",
    description: "Aviso de saldo adeudado próximo a término o en mora.",
    defaultRoles: ["admin", "billing"],
  },
}

// ─── Canonical Role Normalizer ────────────────────────────────────────

export function normalizeRole(role: string | null | undefined): string {
  const r = (role ?? "").toLowerCase().trim()
  if (r === "admin" || r === "administrador" || r === "superadmin" || r === "administración") return "admin"
  if (r === "coordinator" || r === "coordinador") return "coordinator"
  if (r === "logistics" || r === "logistica" || r === "depósito" || r === "operador" || r === "operator") return "logistics"
  if (r === "billing" || r === "facturación" || r === "facturacion") return "billing"
  if (r === "commercial" || r === "vendedor" || r === "compras") return "commercial"
  if (r === "technician" || r === "instrumentador" || r === "matrona") return "technician"
  if (r === "viewer" || r === "solo lectura" || r === "gerencia") return "viewer"
  return r || "viewer"
}

// ─── Cross-Domain Emitter ─────────────────────────────────────────────

export interface EmitCrossDomainNotificationInput {
  companyId: string
  actorUserId: string
  type: InternalNotificationType
  domain?: NotificationDomain
  severity?: NotificationSeverity
  title: string
  body?: string | null
  metadata?: Prisma.InputJsonValue
  linkHref?: string | null
  surgeryId?: string | null
  sourceEntityId: string
  eventKeyPrefix?: string
  explicitRecipientUserIds?: string[]
  recipientRoles?: CanonicalRole[]
}

export async function emitCrossDomainNotification(
  prisma: NotificationDbClient,
  input: EmitCrossDomainNotificationInput
) {
  const catalogItem = NOTIFICATION_TYPE_CATALOG[input.type]
  const domain = input.domain ?? catalogItem?.domain ?? "CIRUGIAS"
  const severity = input.severity ?? catalogItem?.defaultSeverity ?? "INFO"
  const defaultRoles = input.recipientRoles ?? catalogItem?.defaultRoles ?? ["admin"]
  const recipientRole = input.recipientRoles ? resolveCanonicalRole : normalizeRole

  // Guard against minimal mocks in unit tests
  if (!prisma.userCompanyAccess?.findMany || !prisma.internalNotification?.createMany) {
    if (input.recipientRoles) throw new Error("Scoped notification persistence is unavailable")
    return { createdCount: 0, attemptedCount: 0 }
  }

  // 1. Fetch active company members
  const memberAccesses = await prisma.userCompanyAccess.findMany({
    where: {
      companyId: input.companyId,
      isActive: true,
      user: { isActive: true },
      ...(input.explicitRecipientUserIds && input.explicitRecipientUserIds.length > 0
        ? { userId: { in: input.explicitRecipientUserIds } }
        : {}),
    },
    select: {
      userId: true,
      role: true,
    },
  })

  if (memberAccesses.length === 0) {
    return { createdCount: 0, attemptedCount: 0 }
  }

  // 2. Fetch role policies and user preferences for this company & notification type
  const [rolePolicies, userPreferences] = await Promise.all([
    prisma.notificationRolePolicy?.findMany
      ? prisma.notificationRolePolicy.findMany({
          where: {
            companyId: input.companyId,
            notificationType: input.type,
          },
        })
      : Promise.resolve([]),
    prisma.notificationUserPreference?.findMany
      ? prisma.notificationUserPreference.findMany({
          where: {
            companyId: input.companyId,
            notificationType: input.type,
          },
        })
      : Promise.resolve([]),
  ])

  const rolePolicyMap = new Map<string, boolean>(
    rolePolicies.map((p): [string, boolean] => [recipientRole(p.role) ?? "", p.inAppEnabled])
  )
  const userMutedSet = new Set(
    userPreferences.filter((p) => p.inAppMuted).map((p) => p.userId)
  )

  // 3. Resolve eligible recipients
  const eligibleRecipients = memberAccesses.filter((access) => {
    // 1. Never notify actor themselves
    if (access.userId === input.actorUserId) return false

    // 2. Explicit recipient list, if provided, narrows down the candidate pool
    if (input.explicitRecipientUserIds && input.explicitRecipientUserIds.length > 0) {
      if (!input.explicitRecipientUserIds.includes(access.userId)) {
        return false
      }
    }

    const normalized = recipientRole(access.role)
    if (!normalized || (input.recipientRoles && !input.recipientRoles.includes(normalized as CanonicalRole))) return false

    // 3. Check company role policy (overrides default roles)
    const policyEnabled = rolePolicyMap.get(normalized)
    const isRoleEligible = policyEnabled !== undefined
      ? policyEnabled
      : defaultRoles.includes(normalized)

    if (!isRoleEligible) return false

    // 4. Check personal user preference mute
    if (userMutedSet.has(access.userId)) return false

    return true
  })

  if (eligibleRecipients.length === 0) {
    return { createdCount: 0, attemptedCount: memberAccesses.length }
  }

  const eventPrefix = input.eventKeyPrefix || input.type

  const result = await prisma.internalNotification.createMany({
    data: eligibleRecipients.map((recipient) => ({
      companyId: input.companyId,
      recipientUserId: recipient.userId,
      actorUserId: input.actorUserId,
      surgeryId: input.surgeryId ?? null,
      sourceEntityId: input.sourceEntityId,
      domain,
      severity,
      linkHref: input.linkHref ?? null,
      type: input.type,
      eventKey: `${eventPrefix}:${input.sourceEntityId}:${recipient.userId}`,
      title: input.title,
      body: input.body ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  })

  return {
    createdCount: result.count,
    attemptedCount: eligibleRecipients.length,
  }
}

// ─── Legacy Emitters (Maintained for backward compatibility) ──────────
export type SurgeryReschedulingChange = { dateType: "surgery" | "shipping"; previousDate: string | null; newDate: string | null }

export async function emitSurgeryReschedulingNotifications(prisma: NotificationDbClient, input: {
  companyId: string; surgeryId: string; surgeryVisibleNumber?: string | null; sourceEntityId: string; actorUserId: string;
  changes: SurgeryReschedulingChange[]; previousTimeSpecified?: boolean | null; newTimeSpecified?: boolean | null;
}) {
  if (!input.changes.length) return { createdCount: 0, attemptedCount: 0 }
  const actorDisplayName = await getActorDisplayName(prisma, input.actorUserId)
  const dateLabel = (value: string | null, dateType: SurgeryReschedulingChange["dateType"], timeSpecified?: boolean | null) => value ? new Intl.DateTimeFormat("es-AR", {
    timeZone: dateType === "shipping" ? "UTC" : "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
    ...(dateType === "surgery" && timeSpecified === true ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).format(new Date(value)) : "Sin fecha"
  return emitCrossDomainNotification(prisma, {
    companyId: input.companyId, actorUserId: input.actorUserId, type: InternalNotificationType.surgery_critical_change,
    domain: "CIRUGIAS", severity: "WARNING", surgeryId: input.surgeryId, sourceEntityId: input.sourceEntityId,
    eventKeyPrefix: "rescheduling", recipientRoles: ["admin", "logistics"], linkHref: buildNotificationExpedienteLink({ surgeryId: input.surgeryId }),
    title: `${actorDisplayName} registró una reprogramación`,
    body: `Caso ${input.surgeryVisibleNumber || input.surgeryId} · ${input.changes.map((change) => `${change.dateType === "surgery" ? "Fecha de cirugía" : "Fecha de envío de material"}: ${dateLabel(change.previousDate, change.dateType, input.previousTimeSpecified)} → ${dateLabel(change.newDate, change.dateType, input.newTimeSpecified)}`).join(" · ")}`,
    metadata: { channel: "operational", eventType: "surgery_rescheduled", sourceEntityType: "audit_event", actorUserId: input.actorUserId, actorDisplayName, changes: input.changes },
  })
}

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

export type OperationalInternalNotificationEventType =
  | "coordinator_assigned"
  | "surgery_date_assigned"
  | "surgery_rescheduled"
  | "surgery_marked_urgent"

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

function buildActorDisplayName(firstName: string | null, lastName: string | null, email: string) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || email
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
    select: { firstName: true, lastName: true, email: true },
  })
  return buildActorDisplayName(actor.firstName, actor.lastName, actor.email)
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

export async function emitSeguimientoMentionNotifications(
  prisma: NotificationDbClient,
  input: EmitSeguimientoMentionNotificationsInput
) {
  const recipients = normalizeMentions(input.mentions, input.actorUserId)
  if (recipients.length === 0) {
    return { createdCount: 0, attemptedCount: 0 }
  }

  return emitCrossDomainNotification(prisma, {
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    type: InternalNotificationType.seguimiento_mention,
    domain: "CIRUGIAS",
    severity: "INFO",
    surgeryId: input.surgeryId,
    sourceEntityId: input.sourceEntityId,
    linkHref: `/cirugias/${encodeURIComponent(input.surgeryId)}`,
    title: `${input.actorDisplayName} te mencionó en Seguimiento`,
    body: buildPreview(input.content),
    explicitRecipientUserIds: recipients.map((r) => r.userId),
    metadata: {
      trigger: input.trigger,
      sourceEntityType: "seguimiento_entry",
      entryType: input.entryType,
      actorDisplayName: input.actorDisplayName,
    },
  })
}

export async function emitOperationalInternalNotifications(
  prisma: NotificationDbClient,
  input: EmitOperationalInternalNotificationsInput
) {
  const actorDisplayName = await getActorDisplayName(prisma, input.actorUserId)
  let title = `${actorDisplayName} realizó una acción en Cirugías`
  let body = `Caso ${input.surgeryId}`
  let severity: NotificationSeverity = "INFO"
  let notifType: InternalNotificationType = InternalNotificationType.surgery_critical_change

  if (input.eventType === "coordinator_assigned") {
    title = `${actorDisplayName} asignó coordinador`
    body = `Coordinador asignado a cirugía ${input.surgeryId}`
    notifType = InternalNotificationType.surgery_reassigned
  } else if (input.eventType === "surgery_date_assigned") {
    title = `${actorDisplayName} definió fecha de cirugía`
    const dateLabel = formatScheduledLabel(input.scheduledDate, input.scheduledTime)
    body = `Caso ${input.surgeryId}${dateLabel ? ` · Fecha ${dateLabel}` : ""}`
    notifType = InternalNotificationType.surgery_date_assigned
  } else if (input.eventType === "surgery_rescheduled") {
    title = `${actorDisplayName} registró una reprogramación`
    const nextLabel = formatScheduledLabel(input.scheduledDate, input.scheduledTime)
    body = `Caso ${input.surgeryId}${nextLabel ? ` · Nueva fecha ${nextLabel}` : ""}`
    severity = "WARNING"
    notifType = InternalNotificationType.surgery_critical_change
  } else if (input.eventType === "surgery_marked_urgent") {
    title = `${actorDisplayName} marcó la gestión como urgente`
    body = `Caso ${input.surgeryId} marcado como urgente`
    severity = "CRITICAL"
    notifType = InternalNotificationType.surgery_critical_change
  }

  return emitCrossDomainNotification(prisma, {
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    type: notifType,
    domain: "CIRUGIAS",
    severity,
    surgeryId: input.surgeryId,
    sourceEntityId: input.sourceEntityId,
    linkHref: `/cirugias/${encodeURIComponent(input.surgeryId)}`,
    title,
    body,
    metadata: {
      channel: "operational",
      eventType: input.eventType,
      sourceEntityType: "seguimiento_entry",
      actorDisplayName,
    },
  })
}

export async function emitAvailabilityActionableNotifications(
  input: EmitAvailabilityActionableNotificationsInput
): Promise<void> {
  const recipientUserIds = [...new Set(input.recipientUserIds)]
  if (recipientUserIds.length === 0) return

  await input.tx.internalNotification.createMany({
    data: recipientUserIds.map((recipientUserId) => ({
      companyId: input.companyId,
      recipientUserId,
      actorUserId: input.actorUserId,
      surgeryId: input.surgeryId,
      sourceEntityId: input.requestId,
      domain: "CIRUGIAS",
      severity: "WARNING",
      linkHref: `/notificaciones?accion=informar-disponibilidad&solicitud=${encodeURIComponent(input.requestId)}`,
      availabilityRequestId: input.requestId,
      type: InternalNotificationType.availability_request_actionable,
      eventKey: buildAvailabilityEventKey(input.requestId, "actionable", recipientUserId),
      title: "Fecha de disponibilidad solicitada",
      body: `${input.requesterDisplayName} solicitó fecha de disponibilidad de material.`,
      metadata: {
        channel: "operational",
        eventType: "availability_request_actionable",
        availabilityRequestId: input.requestId,
        correlationId: input.correlationId,
        actionable: true,
      } satisfies Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  })
}

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
        domain: "CIRUGIAS",
        severity: "SUCCESS",
        linkHref: `/notificaciones?solicitud=${encodeURIComponent(input.requestId)}`,
        availabilityRequestId: input.requestId,
        type: InternalNotificationType.availability_request_completed,
        eventKey: buildAvailabilityEventKey(input.requestId, "completed", input.requesterUserId),
        title: `Disponibilidad informada: ${formatDateLabel(input.date) ?? input.date}`,
        body: `${input.completerDisplayName} informó la disponibilidad del material.`,
        metadata: {
          channel: "operational",
          eventType: "availability_request_completed",
          availabilityRequestId: input.requestId,
          correlationId: input.correlationId,
          actionable: false,
        } satisfies Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  })
}

export async function emitAvailabilityPivotTransferNotifications(
  input: EmitAvailabilityPivotTransferNotificationsInput
): Promise<void> {
  const requests = [...new Map(input.requests.map((request) => [request.requestId, request])).values()]
  if (requests.length === 0) return

  for (const request of requests) {
    const eventKey = buildAvailabilityEventKey(request.requestId, "actionable", input.newPivotUserId)
    const projection = {
      recipientUserId: input.newPivotUserId,
      actorUserId: input.actorUserId,
      surgeryId: request.surgeryId,
      sourceEntityId: request.requestId,
      domain: "CIRUGIAS",
      severity: "WARNING",
      linkHref: `/notificaciones?accion=informar-disponibilidad&solicitud=${encodeURIComponent(request.requestId)}`,
      availabilityRequestId: request.requestId,
      type: InternalNotificationType.availability_request_actionable,
      title: "Solicitud de disponibilidad reasignada",
      body: "Ahora sos PÍVOT responsable de informar la disponibilidad del material.",
      metadata: {
        channel: "operational",
        eventType: "availability_request_actionable",
        availabilityRequestId: request.requestId,
        correlationId: input.correlationId,
        actionable: true,
      } satisfies Prisma.InputJsonValue,
    }

    await input.tx.internalNotification.upsert({
      where: {
        companyId_eventKey: { companyId: input.companyId, eventKey },
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
      domain: "CIRUGIAS",
      severity: "INFO",
      linkHref: `/notificaciones?solicitud=${encodeURIComponent(request.requestId)}`,
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

// ─── Query / List / Mark Operations ───────────────────────────────────

function mapNotificationRow(
  row: Prisma.InternalNotificationGetPayload<{
    include: { actor: { select: { firstName: true; lastName: true; email: true } } }
  }>
): InternalNotificationListItem {
  return {
    id: row.id,
    companyId: row.companyId,
    recipientUserId: row.recipientUserId,
    actorUserId: row.actorUserId,
    surgeryId: row.surgeryId,
    sourceEntityId: row.sourceEntityId,
    domain: row.domain,
    severity: row.severity,
    linkHref: row.linkHref,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata,
    readAt: row.readAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    actorName: buildActorDisplayName(row.actor.firstName, row.actor.lastName, row.actor.email),
  }
}

export interface ListInternalNotificationsInput {
  companyId: string
  recipientUserId: string
  take?: number
  unreadOnly?: boolean
  category?: InternalNotificationCategory
  domain?: NotificationDomain
  severity?: NotificationSeverity
}

export async function listInternalNotifications(
  prisma: NotificationDbClient,
  input: ListInternalNotificationsInput
) {
  const take = Math.min(Math.max(input.take ?? 20, 1), 100)
  const category = input.category ?? "all"

  const baseWhere: Prisma.InternalNotificationWhereInput = {
    companyId: input.companyId,
    recipientUserId: input.recipientUserId,
    ...(input.unreadOnly ? { readAt: null } : {}),
    ...(input.domain ? { domain: input.domain } : {}),
    ...(input.severity ? { severity: input.severity } : {}),
  }

  let listWhere: Prisma.InternalNotificationWhereInput = baseWhere
  if (category === "cirugias") {
    listWhere = { ...baseWhere, domain: "CIRUGIAS" }
  } else if (category === "logistica") {
    listWhere = { ...baseWhere, domain: "LOGISTICA" }
  } else if (category === "stock") {
    listWhere = { ...baseWhere, domain: "STOCK" }
  } else if (category === "consumos") {
    listWhere = { ...baseWhere, domain: "CONSUMOS" }
  } else if (category === "comparativa") {
    listWhere = { ...baseWhere, domain: "COMPARATIVA" }
  } else if (category === "cobros") {
    listWhere = { ...baseWhere, domain: "COBROS" }
  } else if (category === "mention") {
    listWhere = { ...baseWhere, type: InternalNotificationType.seguimiento_mention }
  } else if (category === "operational") {
    listWhere = { ...baseWhere, type: { not: InternalNotificationType.seguimiento_mention } }
  }

  const unreadBaseWhere: Prisma.InternalNotificationWhereInput = {
    companyId: input.companyId,
    recipientUserId: input.recipientUserId,
    readAt: null,
  }

  const [
    items,
    unreadCount,
    allCount,
    cirugiasCount,
    logisticaCount,
    stockCount,
    consumosCount,
    comparativaCount,
    cobrosCount,
    mentionCount,
  ] = await Promise.all([
    prisma.internalNotification.findMany({
      where: listWhere,
      include: {
        actor: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.internalNotification.count({ where: unreadBaseWhere }),
    prisma.internalNotification.count({ where: baseWhere }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "CIRUGIAS" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "LOGISTICA" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "STOCK" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "CONSUMOS" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "COMPARATIVA" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "COBROS" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, type: InternalNotificationType.seguimiento_mention } }),
  ])

  const categoryCounts: InternalNotificationCategoryCounts = {
    all: allCount,
    cirugias: cirugiasCount,
    logistica: logisticaCount,
    stock: stockCount,
    consumos: consumosCount,
    comparativa: comparativaCount,
    cobros: cobrosCount,
    mention: mentionCount,
    operational: Math.max(0, allCount - mentionCount),
  }

  return {
    items: items.map(mapNotificationRow),
    unreadCount,
    totalCount: categoryCounts[category] ?? allCount,
    categoryCounts,
  }
}

export async function getUnreadInternalNotificationsCount(
  prisma: NotificationDbClient,
  companyId: string,
  recipientUserId: string
): Promise<InternalNotificationCategoryCounts> {
  const baseWhere: Prisma.InternalNotificationWhereInput = {
    companyId,
    recipientUserId,
    readAt: null,
  }

  const [
    allCount,
    cirugiasCount,
    logisticaCount,
    stockCount,
    consumosCount,
    comparativaCount,
    cobrosCount,
    mentionCount,
  ] = await Promise.all([
    prisma.internalNotification.count({ where: baseWhere }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "CIRUGIAS" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "LOGISTICA" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "STOCK" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "CONSUMOS" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "COMPARATIVA" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, domain: "COBROS" } }),
    prisma.internalNotification.count({ where: { ...baseWhere, type: InternalNotificationType.seguimiento_mention } }),
  ])

  return {
    all: allCount,
    cirugias: cirugiasCount,
    logistica: logisticaCount,
    stock: stockCount,
    consumos: consumosCount,
    comparativa: comparativaCount,
    cobros: cobrosCount,
    mention: mentionCount,
    operational: Math.max(0, allCount - mentionCount),
  }
}

export async function markInternalNotificationRead(
  prisma: NotificationDbClient,
  input: { companyId: string; recipientUserId: string; notificationId: string }
) {
  const existing = await prisma.internalNotification.findFirst({
    where: {
      id: input.notificationId,
      companyId: input.companyId,
      recipientUserId: input.recipientUserId,
    },
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
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
      actor: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  return mapNotificationRow(updated)
}

export async function markAllInternalNotificationsRead(
  prisma: NotificationDbClient,
  input: { companyId: string; recipientUserId: string }
) {
  const now = new Date()
  const result = await prisma.internalNotification.updateMany({
    where: {
      companyId: input.companyId,
      recipientUserId: input.recipientUserId,
      readAt: null,
    },
    data: { readAt: now },
  })

  return { updatedCount: result.count, readAt: now }
}

// ─── Policies & Preferences Administration ────────────────────────────

export interface CompanyRolePolicyView {
  role: string
  notificationType: InternalNotificationType
  domain: NotificationDomain
  label: string
  description: string
  inAppEnabled: boolean
  isDefault: boolean
}

export async function getCompanyNotificationPolicies(
  prisma: NotificationDbClient,
  companyId: string
): Promise<CompanyRolePolicyView[]> {
  const dbPolicies = await prisma.notificationRolePolicy.findMany({
    where: { companyId },
  })

  const policyMap = new Map(
    dbPolicies.map((p) => [`${normalizeRole(p.role)}:${p.notificationType}`, p.inAppEnabled])
  )

  const roles = ["admin", "coordinator", "logistics", "billing", "commercial", "technician", "viewer"]
  const allTypes = Object.values(InternalNotificationType)
  const results: CompanyRolePolicyView[] = []

  for (const role of roles) {
    for (const type of allTypes) {
      const catalog = NOTIFICATION_TYPE_CATALOG[type]
      if (!catalog) continue

      const key = `${role}:${type}`
      const isConfigured = policyMap.has(key)
      const inAppEnabled = isConfigured
        ? Boolean(policyMap.get(key))
        : catalog.defaultRoles.includes(role)

      results.push({
        role,
        notificationType: type,
        domain: catalog.domain,
        label: catalog.label,
        description: catalog.description,
        inAppEnabled,
        isDefault: !isConfigured,
      })
    }
  }

  return results
}

export async function updateNotificationRolePolicy(
  prisma: NotificationDbClient,
  input: {
    companyId: string
    actorUserId: string
    role: string
    notificationType: InternalNotificationType
    inAppEnabled: boolean
  }
) {
  const normalizedRole = normalizeRole(input.role)
  const policy = await prisma.notificationRolePolicy.upsert({
    where: {
      companyId_role_notificationType: {
        companyId: input.companyId,
        role: normalizedRole,
        notificationType: input.notificationType,
      },
    },
    create: {
      companyId: input.companyId,
      role: normalizedRole,
      notificationType: input.notificationType,
      inAppEnabled: input.inAppEnabled,
    },
    update: {
      inAppEnabled: input.inAppEnabled,
    },
  })

  await createAuditEvent({
    prisma: prisma as any,
    companyId: input.companyId,
    userId: input.actorUserId,
    action: "NOTIFICATION_ROLE_POLICY_UPDATED",
    module: "NOTIFICATIONS",
    entityType: "NotificationRolePolicy",
    entityId: policy.id,
    metadata: {
      role: normalizedRole,
      notificationType: input.notificationType,
      inAppEnabled: input.inAppEnabled,
    },
  })

  return policy
}

export interface UserNotificationPreferenceView {
  notificationType: InternalNotificationType
  domain: NotificationDomain
  label: string
  description: string
  roleEnabled: boolean
  inAppMuted: boolean
}

export async function getUserNotificationPreferences(
  prisma: NotificationDbClient,
  input: { companyId: string; userId: string; userRole: string }
): Promise<UserNotificationPreferenceView[]> {
  const normalized = normalizeRole(input.userRole)

  const [dbPolicies, dbPrefs] = await Promise.all([
    prisma.notificationRolePolicy.findMany({
      where: { companyId: input.companyId, role: normalized },
    }),
    prisma.notificationUserPreference.findMany({
      where: { companyId: input.companyId, userId: input.userId },
    }),
  ])

  const rolePolicyMap = new Map(dbPolicies.map((p) => [p.notificationType, p.inAppEnabled]))
  const userPrefMap = new Map(dbPrefs.map((p) => [p.notificationType, p.inAppMuted]))

  const allTypes = Object.values(InternalNotificationType)
  const results: UserNotificationPreferenceView[] = []

  for (const type of allTypes) {
    const catalog = NOTIFICATION_TYPE_CATALOG[type]
    if (!catalog) continue

    const policyVal = rolePolicyMap.get(type)
    const roleEnabled = policyVal !== undefined
      ? policyVal
      : catalog.defaultRoles.includes(normalized)

    // Only show types enabled for this user's role
    if (roleEnabled || normalized === "admin") {
      results.push({
        notificationType: type,
        domain: catalog.domain,
        label: catalog.label,
        description: catalog.description,
        roleEnabled,
        inAppMuted: Boolean(userPrefMap.get(type)),
      })
    }
  }

  return results
}

export async function updateUserNotificationPreference(
  prisma: NotificationDbClient,
  input: {
    companyId: string
    userId: string
    userRole: string
    notificationType: InternalNotificationType
    inAppMuted: boolean
  }
) {
  const catalog = NOTIFICATION_TYPE_CATALOG[input.notificationType]
  if (!catalog) throw badRequest("Invalid notification type", "invalid_notification_type")

  const normalized = normalizeRole(input.userRole)

  // 1. Check if the notification type is enabled for this user's role in this company
  const rolePolicy = await prisma.notificationRolePolicy.findUnique({
    where: {
      companyId_role_notificationType: {
        companyId: input.companyId,
        role: normalized,
        notificationType: input.notificationType,
      },
    },
  })

  const isRoleEnabled = rolePolicy !== null
    ? rolePolicy.inAppEnabled
    : catalog.defaultRoles.includes(normalized)

  if (!isRoleEnabled && normalized !== "admin") {
    throw badRequest(
      "El tipo de notificación no está habilitado para el rol del usuario en esta empresa.",
      "role_policy_disabled"
    )
  }

  const pref = await prisma.notificationUserPreference.upsert({
    where: {
      companyId_userId_notificationType: {
        companyId: input.companyId,
        userId: input.userId,
        notificationType: input.notificationType,
      },
    },
    create: {
      companyId: input.companyId,
      userId: input.userId,
      notificationType: input.notificationType,
      inAppMuted: input.inAppMuted,
    },
    update: {
      inAppMuted: input.inAppMuted,
    },
  })

  return pref
}

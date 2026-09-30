import {
  AtSign,
  Bell,
  CalendarClock,
  Clock3,
  Siren,
  UserRoundPlus,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Scale,
  Activity,
  AlertCircle,
  Undo2,
  Boxes,
} from "lucide-react"

type NotificationMetadata = Record<string, unknown>

export type NotificationCategory =
  | "all"
  | "mention"
  | "operational"
  | "cirugias"
  | "logistica"
  | "stock"
  | "consumos"
  | "comparativa"
  | "cobros"

export type NotificationAppearance = {
  label: string
  summary: string | null
  actionLabel: string
  icon: typeof Bell
  labelClassName: string
  badgeClassName: string
  iconClassName: string
  unreadCardClassName: string
  unreadIndicatorClassName: string
}

type NotificationTone = Pick<
  NotificationAppearance,
  "labelClassName" | "badgeClassName" | "iconClassName" | "unreadCardClassName" | "unreadIndicatorClassName"
>

const NOTIFICATION_TONES: Record<"mention" | "assignment" | "scheduled" | "rescheduled" | "urgent" | "success" | "warning" | "info" | "critical", NotificationTone> = {
  mention: {
    labelClassName: "text-emerald-700",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconClassName: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
    unreadCardClassName: "border-primary/20 bg-primary/5",
    unreadIndicatorClassName: "bg-primary",
  },
  assignment: {
    labelClassName: "text-violet-700",
    badgeClassName: "border-violet-200 bg-violet-50 text-violet-700",
    iconClassName: "border-violet-200/70 bg-violet-50/80 text-violet-700",
    unreadCardClassName: "border-violet-200/70 bg-violet-50/45",
    unreadIndicatorClassName: "bg-violet-500",
  },
  scheduled: {
    labelClassName: "text-sky-700",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
    iconClassName: "border-sky-200/70 bg-sky-50/80 text-sky-700",
    unreadCardClassName: "border-sky-200/70 bg-sky-50/45",
    unreadIndicatorClassName: "bg-sky-500",
  },
  rescheduled: {
    labelClassName: "text-amber-700",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    iconClassName: "border-amber-200/70 bg-amber-50/80 text-amber-700",
    unreadCardClassName: "border-amber-200/70 bg-amber-50/45",
    unreadIndicatorClassName: "bg-amber-500",
  },
  urgent: {
    labelClassName: "text-red-700",
    badgeClassName: "border-red-200 bg-red-50 text-red-700",
    iconClassName: "border-red-200/70 bg-red-50/80 text-red-700",
    unreadCardClassName: "border-red-200/70 bg-red-50/45",
    unreadIndicatorClassName: "bg-red-500",
  },
  critical: {
    labelClassName: "text-red-700",
    badgeClassName: "border-red-200 bg-red-50 text-red-700",
    iconClassName: "border-red-200/70 bg-red-50/80 text-red-700",
    unreadCardClassName: "border-red-200/70 bg-red-50/45",
    unreadIndicatorClassName: "bg-red-600",
  },
  warning: {
    labelClassName: "text-amber-700",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    iconClassName: "border-amber-200/70 bg-amber-50/80 text-amber-700",
    unreadCardClassName: "border-amber-200/70 bg-amber-50/45",
    unreadIndicatorClassName: "bg-amber-500",
  },
  success: {
    labelClassName: "text-emerald-700",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconClassName: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
    unreadCardClassName: "border-emerald-200/70 bg-emerald-50/45",
    unreadIndicatorClassName: "bg-emerald-500",
  },
  info: {
    labelClassName: "text-blue-700",
    badgeClassName: "border-blue-200 bg-blue-50 text-blue-700",
    iconClassName: "border-blue-200/70 bg-blue-50/80 text-blue-700",
    unreadCardClassName: "border-blue-200/70 bg-blue-50/45",
    unreadIndicatorClassName: "bg-blue-500",
  },
}

export function getNotificationPreview(summary: string | null, body: string | null) {
  if (summary && body && body !== summary) {
    return `${summary} · ${body}`
  }
  return summary ?? body
}

function asNotificationMetadata(value: unknown): NotificationMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as NotificationMetadata
}

export function getNotificationEntryId(notification: { sourceEntityId: string; metadata: unknown }) {
  const metadata = asNotificationMetadata(notification.metadata)
  if (!metadata) {
    return notification.sourceEntityId
  }
  if (metadata.eventType === "surgery_rescheduled") {
    return undefined
  }
  return metadata.sourceEntityType === "seguimiento_entry" ? notification.sourceEntityId : undefined
}

export function isCoordinatorAssignmentNotification(notification: { metadata: unknown }) {
  const metadata = asNotificationMetadata(notification.metadata)
  return metadata?.eventType === "coordinator_assigned" || metadata?.eventType === "surgery_date_requested"
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function readAvailabilityRequestCandidate(value: unknown) {
  const candidate = readString(value)
  return candidate && candidate.length <= 200 ? candidate : null
}

export function getAvailabilityRequestCandidate(notification: { metadata: unknown }) {
  const metadata = asNotificationMetadata(notification.metadata)
  if (
    metadata?.channel !== "operational" ||
    metadata.eventType !== "availability_request_actionable"
  ) return null
  return readAvailabilityRequestCandidate(metadata.availabilityRequestId)
}

export function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60_000)
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" })

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute")
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour")
  }

  const diffDays = Math.round(diffHours / 24)
  return formatter.format(diffDays, "day")
}

export function getNotificationAppearance(
  notification: {
    type?: string
    domain?: string
    severity?: string
    metadata: unknown
    body: string | null
    surgeryId?: string | null
  },
  availabilityRequestsEnabled: boolean
): NotificationAppearance {
  const metadata = asNotificationMetadata(notification.metadata)
  const eventType = readString(metadata?.eventType) || notification.type
  const body = readString(notification.body)

  switch (eventType) {
    case "availability_request_actionable":
      if (availabilityRequestsEnabled && getAvailabilityRequestCandidate(notification)) {
        return {
          label: "Disponibilidad",
          summary: body,
          actionLabel: "Informar disponibilidad",
          icon: CalendarClock,
          ...NOTIFICATION_TONES.scheduled,
        }
      }
      break
    case "coordinator_assigned":
    case "surgery_reassigned": {
      const coordinatorName = readString(metadata?.coordinatorName)
      return {
        label: "Reasignación",
        summary: coordinatorName ? `Coordinador ${coordinatorName}` : body,
        actionLabel: "Abrir caso",
        icon: UserRoundPlus,
        ...NOTIFICATION_TONES.assignment,
      }
    }
    case "surgery_date_assigned": {
      return {
        label: "Fecha fijada",
        summary: body,
        actionLabel: "Ver caso",
        icon: CalendarClock,
        ...NOTIFICATION_TONES.scheduled,
      }
    }
    case "surgery_rescheduled":
      return {
        label: "Reprogramación",
        summary: body,
        actionLabel: "Abrir caso",
        icon: Clock3,
        ...NOTIFICATION_TONES.rescheduled,
      }
    case "surgery_marked_urgent":
    case "surgery_blocked":
      return {
        label: "Urgencia / Bloqueo",
        summary: body ?? `Caso requiere atención inmediata.`,
        actionLabel: "Ver caso",
        icon: Siren,
        ...NOTIFICATION_TONES.urgent,
      }
    case "remito_prepared":
    case "remito_dispatched":
      return {
        label: "Logística / Despacho",
        summary: body,
        actionLabel: "Ver remito",
        icon: Truck,
        ...NOTIFICATION_TONES.info,
      }
    case "remito_delivered":
      return {
        label: "Remito entregado",
        summary: body,
        actionLabel: "Ver entrega",
        icon: CheckCircle2,
        ...NOTIFICATION_TONES.success,
      }
    case "logistics_incident":
      return {
        label: "Incidencia logística",
        summary: body,
        actionLabel: "Ver detalle",
        icon: AlertCircle,
        ...NOTIFICATION_TONES.critical,
      }
    case "stock_receipt_confirmed":
      return {
        label: "Recepción de Stock",
        summary: body,
        actionLabel: "Ver inventario",
        icon: Package,
        ...NOTIFICATION_TONES.success,
      }
    case "stock_low":
    case "stock_expiry":
    case "stock_difference":
      return {
        label: "Alerta de Stock",
        summary: body,
        actionLabel: "Ver stock",
        icon: Boxes,
        ...NOTIFICATION_TONES.warning,
      }
    case "consumo_pending_validation":
    case "consumo_validated":
    case "devolucion_confirmed":
      return {
        label: "Consumo / Devolución",
        summary: body,
        actionLabel: "Ver consumo",
        icon: FileCheck,
        ...NOTIFICATION_TONES.success,
      }
    case "consumo_incident":
      return {
        label: "Incidencia en consumo",
        summary: body,
        actionLabel: "Revisar caso",
        icon: AlertTriangle,
        ...NOTIFICATION_TONES.critical,
      }
    case "comparativa_deviation":
    case "comparativa_pending_review":
      return {
        label: "Comparativa económica",
        summary: body,
        actionLabel: "Ver comparativa",
        icon: Scale,
        ...NOTIFICATION_TONES.warning,
      }
    case "payment_recorded":
      return {
        label: "Cobro registrado",
        summary: body,
        actionLabel: "Ver cobros",
        icon: CreditCard,
        ...NOTIFICATION_TONES.success,
      }
    case "payment_cancelled":
    case "invoice_due":
      return {
        label: "Cobros / Facturas",
        summary: body,
        actionLabel: "Ver facturación",
        icon: AlertTriangle,
        ...NOTIFICATION_TONES.warning,
      }
    default:
      break
  }

  return {
    label: "Notificación",
    summary: body,
    actionLabel: "Ver detalle",
    icon: AtSign,
    ...NOTIFICATION_TONES.info,
  }
}

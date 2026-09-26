import {
  AtSign,
  Bell,
  CalendarClock,
  Clock3,
  Siren,
  UserRoundPlus,
} from "lucide-react"

type NotificationMetadata = Record<string, unknown>

export type NotificationCategory = "mention" | "operational"

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

const NOTIFICATION_TONES: Record<"mention" | "assignment" | "scheduled" | "rescheduled" | "urgent", NotificationTone> = {
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

export function getNotificationCategory(notification: { metadata: unknown }) : NotificationCategory {
  const metadata = asNotificationMetadata(notification.metadata)
  const eventType = readString(metadata?.eventType)
  const channel = readString(metadata?.channel)

  if (channel === "operational") {
    return "operational"
  }

  switch (eventType) {
    case "coordinator_assigned":
    case "surgery_date_assigned":
    case "surgery_rescheduled":
    case "surgery_marked_urgent":
      return "operational"
    default:
      return "mention"
  }
}

function formatDateLabel(value: string | null) {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${match[3]}/${match[2]}/${match[1]}`
}

function formatScheduleLabel(dateValue: unknown, timeValue: unknown) {
  const dateLabel = formatDateLabel(readString(dateValue))
  const timeLabel = readString(timeValue)

  if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`
  return dateLabel ?? timeLabel
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

export function getNotificationAppearance(notification: {
  metadata: unknown
  body: string | null
  surgeryId: string
}, availabilityRequestsEnabled: boolean): NotificationAppearance {
  const metadata = asNotificationMetadata(notification.metadata)
  const eventType = readString(metadata?.eventType)
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
    case "coordinator_assigned": {
      const coordinatorName = readString(metadata?.coordinatorName)
      return {
        label: "Asignación",
        summary: coordinatorName ? `Coordinador ${coordinatorName}` : body,
        actionLabel: "Abrir caso",
        icon: UserRoundPlus,
        ...NOTIFICATION_TONES.assignment,
      }
    }
    case "surgery_date_assigned": {
      const scheduledLabel = formatScheduleLabel(metadata?.scheduledDate, metadata?.scheduledTime)
      return {
        label: "Fecha asignada",
        summary: scheduledLabel ? `Programada ${scheduledLabel}` : body,
        actionLabel: "Ver seguimiento",
        icon: CalendarClock,
        ...NOTIFICATION_TONES.scheduled,
      }
    }
    case "surgery_rescheduled": {
      const nextLabel = formatScheduleLabel(metadata?.scheduledDate, metadata?.scheduledTime)
      const previousLabel = formatScheduleLabel(metadata?.previousScheduledDate, metadata?.previousScheduledTime)
      return {
        label: "Reprogramación",
        summary: nextLabel
          ? `Nueva fecha ${nextLabel}${previousLabel ? ` · Antes ${previousLabel}` : ""}`
          : body,
        actionLabel: "Abrir caso",
        icon: Clock3,
        ...NOTIFICATION_TONES.rescheduled,
      }
    }
    case "surgery_marked_urgent":
      return {
        label: "Gestión urgente",
        summary: body ?? `Caso ${notification.surgeryId} requiere atención prioritaria.`,
        actionLabel: "Ver seguimiento",
        icon: Siren,
        ...NOTIFICATION_TONES.urgent,
      }
    default:
      break
  }

  return {
    label: "Mención",
    summary: body,
    actionLabel: "Ver en el expediente",
    icon: AtSign,
    ...NOTIFICATION_TONES.mention,
  }
}

import type { ComponentType } from "react"
import { CheckCircle2, PackageCheck, Truck } from "lucide-react"
import { formatDate } from "@/lib/formatters"
import type { Box, HistoryEntry, LogisticsDetail, Surgery } from "@/types"
import {
  compareCoordinationSurgeriesBySchedule,
  deriveCoordinatorBucket,
  filterPersonalCoordinatorCases,
  resolveSubjectAssignmentSlaBasis,
} from "@/components/coordinadores/coordination-filtering"

export type CoordinatorBucketKey = "autorizado" | "transito" | "finalizado"
export type AuthorizedSubgroupKey =
  | "nueva-asignacion"
  | "pendiente-coordinar"
  | "programada-sin-preparar"
  | "congelada"
  | "congelada-con-faltantes"

export type SlaTone = "ok" | "warning" | "overdue" | "missing"

export type AssignmentSlaBasis =
  | {
      status: "valid"
      assignmentId: string
      contactId: string
      createdAt: string
      epochMs: number
    }
  | {
      status: "missing"
      assignmentId?: string
      contactId: string
      diagnosticCode: "assignment_created_at_missing" | "resolved_assignment_row_missing"
    }
  | {
      status: "invalid"
      assignmentId?: string
      contactId: string
      diagnosticCode: "assignment_created_at_invalid" | "multiple_resolved_assignment_rows"
    }

export type CoordinatorCase = {
  surgery: Surgery
  logistics?: LogisticsDetail
  history: HistoryEntry[]
  box?: Box
  bucket: CoordinatorBucketKey | null
  subgroup: AuthorizedSubgroupKey | null
  materialAvailabilityDate?: string
  materialAvailabilityLabel: string
  materialAvailabilityDefined: boolean
  sla: {
    tone: SlaTone
    label: string
    hoursElapsed: number | null
    baseDate?: string
  }
  resolvedAssignmentSlaBasis?: AssignmentSlaBasis
}

export type CoordinatorCardMetadata = {
  date: string
  doctor: string
  place: string
  client: string
}

export type CoordinatorClosureSignals = {
  documentationIncomplete: boolean
  consumptionAbsent: boolean
  invoiceAbsent: boolean
}

export const BUCKET_CONFIG: Record<CoordinatorBucketKey, { title: string; description: string; tone: string; icon: ComponentType<{ className?: string }> }> = {
  autorizado: {
    title: "Autorizado",
    description: "Casos con gestión operativa pendiente o activa del coordinador.",
    tone: "border-sky-200 bg-sky-50/70 text-sky-900",
    icon: PackageCheck,
  },
  transito: {
    title: "En tránsito",
    description: "Material o preparación ya encaminados hacia la institución.",
    tone: "border-violet-200 bg-violet-50/70 text-violet-900",
    icon: Truck,
  },
  finalizado: {
    title: "Finalizado",
    description: "Casos realizados o cerrados para seguimiento operativo global.",
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    icon: CheckCircle2,
  },
}

export const AUTHORIZED_SUBGROUP_CONFIG: Record<AuthorizedSubgroupKey, { title: string; description: string }> = {
  "nueva-asignacion": {
    title: "Nueva asignación / recién autorizada",
    description: "Autorizadas recientes o todavía sin coordinador/fecha definida.",
  },
  "pendiente-coordinar": {
    title: "Pendiente de coordinar",
    description: "Tiene coordinador asignado pero todavía no tiene fecha de cirugía.",
  },
  "programada-sin-preparar": {
    title: "Programada sin preparar",
    description: "Ya tiene fecha de CX, pero el material todavía no entró en preparación.",
  },
  congelada: {
    title: "Congelada",
    description: "Material operativo congelado/listo para continuar.",
  },
  "congelada-con-faltantes": {
    title: "Congelada con faltantes",
    description: "Hay avance, pero siguen faltando materiales o definiciones.",
  },
}

export const AUTHORIZED_SECTION_CONFIG = [
  {
    key: "pendiente-coordinar",
    title: "Pendiente de coordinar",
    description: "Incluye casos sin asignar o todavía sin fecha quirúrgica confirmada.",
    matches: new Set<AuthorizedSubgroupKey>(["nueva-asignacion", "pendiente-coordinar"]),
  },
  {
    key: "programada-sin-preparar",
    title: AUTHORIZED_SUBGROUP_CONFIG["programada-sin-preparar"].title,
    description: AUTHORIZED_SUBGROUP_CONFIG["programada-sin-preparar"].description,
    matches: new Set<AuthorizedSubgroupKey>(["programada-sin-preparar"]),
  },
  {
    key: "congelada",
    title: AUTHORIZED_SUBGROUP_CONFIG.congelada.title,
    description: AUTHORIZED_SUBGROUP_CONFIG.congelada.description,
    matches: new Set<AuthorizedSubgroupKey>(["congelada"]),
  },
  {
    key: "congelada-con-faltantes",
    title: AUTHORIZED_SUBGROUP_CONFIG["congelada-con-faltantes"].title,
    description: AUTHORIZED_SUBGROUP_CONFIG["congelada-con-faltantes"].description,
    matches: new Set<AuthorizedSubgroupKey>(["congelada-con-faltantes"]),
  },
] as const

export function getSortValue(date?: string) {
  return date && date.trim() ? date : "9999-12-31"
}

export function sortSurgeriesBySchedule(a: Surgery, b: Surgery) {
  return compareCoordinationSurgeriesBySchedule(a, b)
}

export function parseDateSafe(value?: string) {
  if (!value?.trim()) return null
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isTodayDate(value?: string) {
  const parsed = parseDateSafe(value)
  if (!parsed) return false

  const today = new Date()
  return (
    parsed.getFullYear() === today.getFullYear() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getDate() === today.getDate()
  )
}

export function hasScheduledDate(surgery: Surgery) {
  return Boolean(surgery.date?.trim())
}

export function hasAssignedCoordinator(surgery: Surgery) {
  if (surgery.coordinatorAssignmentState === "ambiguous") return false
  if (surgery.coordinadorContactId?.trim()) return true
  const coordinator = surgery.coordinadorCx?.trim()
  return Boolean(coordinator && coordinator !== "Sin asignar")
}

export function getCoordinatorLabel(surgery: Surgery) {
  if (surgery.coordinatorAssignmentState === "ambiguous") return "Asignación ambigua"
  return surgery.coordinadorCx || "Sin asignar"
}

export function filterCoordinatorCasesByContactId(entries: CoordinatorCase[], contactId: string | null | undefined) {
  return filterPersonalCoordinatorCases(entries, contactId)
}

export function getResolvedAssignmentSlaBasis(
  surgery: Surgery,
  subjectContactId: string,
): AssignmentSlaBasis {
  return resolveSubjectAssignmentSlaBasis(surgery, subjectContactId)
}

export function getPreparationSignals(surgery: Surgery, logistics?: LogisticsDetail, box?: Box) {
  return [
    surgery.preparationState,
    logistics?.preparation,
    logistics?.ida,
    logistics?.cajaState,
    box?.state,
  ].filter(Boolean) as string[]
}

export function getCoordinatorAssignmentBaseDate(surgery: Surgery, history: HistoryEntry[]) {
  const futureReady = surgery as Surgery & Partial<Record<"coordinadorAssignedAt" | "assignedAt", string>>
  if (futureReady.coordinadorAssignedAt?.trim()) return futureReady.coordinadorAssignedAt
  if (futureReady.assignedAt?.trim()) return futureReady.assignedAt

  const assignmentEvent = [...history]
    .reverse()
    .find((entry) => /coordin/i.test(entry.action) || /coordin/i.test(entry.details))

  if (assignmentEvent) {
    return `${assignmentEvent.date}${assignmentEvent.time ? `T${assignmentEvent.time}` : ""}`
  }

  return surgery.fechaAutorizacion
}

export function getSlaMeta(baseDate?: string): CoordinatorCase["sla"] {
  const parsed = parseDateSafe(baseDate)
  if (!parsed) {
    return { tone: "missing", label: "SLA sin base", hoursElapsed: null, baseDate }
  }

  const diffMs = Date.now() - parsed.getTime()
  const hoursElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))

  if (hoursElapsed < 24) {
    return { tone: "ok", label: "<24 hs", hoursElapsed, baseDate }
  }
  if (hoursElapsed < 48) {
    return { tone: "warning", label: "24–47 hs", hoursElapsed, baseDate }
  }
  return { tone: "overdue", label: ">=48 hs", hoursElapsed, baseDate }
}

export function getSlaDisplayLabel(tone: SlaTone) {
  if (tone === "ok") return "Dentro de las 48 h"
  if (tone === "warning") return "Quedan menos de 24 h"
  if (tone === "overdue") return "Fuera de las 48 h"
  return "Sin referencia de 48 h"
}

export function getMaterialAvailability(surgery: Surgery, logistics?: LogisticsDetail, box?: Box) {
  void logistics
  void box
  const match = parseDateSafe(surgery.materialAvailabilityDate)
    ? surgery.materialAvailabilityDate
    : undefined
  const normalized = match?.split("T")[0]?.split(" ")[0]

  return {
    date: normalized,
    defined: Boolean(normalized),
    label: normalized ? formatDate(normalized) : "Disponibilidad sin definir",
  }
}

export function requiresCoordinatorManagement(surgery: Surgery, logistics?: LogisticsDetail, box?: Box) {
  const signals = getPreparationSignals(surgery, logistics, box)
  const scheduled = hasScheduledDate(surgery)

  if (!scheduled) return true
  if (signals.includes("Sin preparar")) return true
  if (signals.includes("Congelado")) return true
  if (signals.includes("Congelado con faltantes")) return true

  return false
}

export function getCoordinatorBucket(surgery: Surgery, _logistics?: LogisticsDetail, _box?: Box): CoordinatorBucketKey | null {
  void _logistics
  void _box
  return deriveCoordinatorBucket(surgery)
}

export function getAuthorizedSubgroup(surgery: Surgery, logistics?: LogisticsDetail, box?: Box): AuthorizedSubgroupKey | null {
  if (!requiresCoordinatorManagement(surgery, logistics, box)) return null
  if (hasAssignedCoordinator(surgery) && !hasScheduledDate(surgery)) return "pendiente-coordinar"

  const signals = getPreparationSignals(surgery, logistics, box)
  if (signals.includes("Congelado con faltantes")) return "congelada-con-faltantes"
  if (signals.includes("Congelado")) return "congelada"
  if (hasScheduledDate(surgery) && signals.includes("Sin preparar")) return "programada-sin-preparar"

  return "nueva-asignacion"
}

export function getSlaBadgeClass(tone: SlaTone) {
  if (tone === "ok") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700"
  if (tone === "overdue") return "border-red-200 bg-red-50 text-red-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

export function getSlaDotClass(tone: SlaTone) {
  if (tone === "ok") return "bg-emerald-500"
  if (tone === "warning") return "bg-amber-500"
  if (tone === "overdue") return "bg-red-500"
  return "bg-slate-400"
}

export function getIncidentReasons(entry: CoordinatorCase) {
  const reasons: string[] = []

  if (entry.sla.tone === "overdue") reasons.push("SLA vencido")
  else if (entry.sla.tone === "warning") reasons.push("Próxima a vencer")
  if (!hasAssignedCoordinator(entry.surgery)) reasons.push("Sin asignar")
  if (!entry.materialAvailabilityDefined) reasons.push("Sin disponibilidad")
  if (entry.surgery.urgente) reasons.push("Urgente")

  return reasons
}

export function getCoordinatorCardMetadata(surgery: Surgery): CoordinatorCardMetadata {
  const scheduledDate = hasScheduledDate(surgery) ? formatDate(surgery.date) : "Sin fecha"

  return {
    date: hasScheduledDate(surgery) && surgery.time?.trim()
      ? `${scheduledDate} · ${surgery.time.trim()}`
      : scheduledDate,
    doctor: surgery.surgeon?.trim() || "Médico sin definir",
    place: surgery.institution?.trim() || "Lugar sin definir",
    client: surgery.financiador?.trim() || surgery.obraSocial?.trim() || surgery.client?.trim() || "Cliente sin definir",
  }
}

export function getCoordinatorCardAlertDisplay(entry: CoordinatorCase) {
  const [highestPriorityRisk, ...hiddenAlerts] = getIncidentReasons(entry)
  return { highestPriorityRisk, hiddenAlerts }
}

export function getPendingClosureItems(signals: CoordinatorClosureSignals) {
  const missingItems: string[] = []
  if (signals.documentationIncomplete) missingItems.push("Documentación")
  if (signals.consumptionAbsent) missingItems.push("Consumo")
  if (signals.invoiceAbsent) missingItems.push("Facturación")
  return missingItems
}

export function isIncidentCase(entry: CoordinatorCase) {
  return getIncidentReasons(entry).length > 0
}

export function getAlertToneClass(kind: "critical" | "warning" | "neutral") {
  if (kind === "critical") return "border-red-200 bg-red-50 text-red-900"
  if (kind === "warning") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-slate-200 bg-slate-50 text-slate-800"
}

function getCoordinatorMessageBase(entry: CoordinatorCase) {
  const { surgery } = entry
  return {
    clientLabel: surgery.financiador || surgery.obraSocial || surgery.client || "Sin definir",
    instrumentadorLabel: surgery.instrumentador || "Sin definir",
    surgeryDateLabel: hasScheduledDate(surgery) ? formatDate(surgery.date) : "Sin definir",
    surgeryTimeLabel: surgery.time || "Sin definir",
    shippingDateLabel: surgery.fechaEnvioMaterial ? formatDate(surgery.fechaEnvioMaterial) : "Sin definir",
    surgeryTypeLabel: surgery.procedure || surgery.classification || "Sin definir",
    surgeonLabel: surgery.surgeon || "Sin definir",
    institutionLabel: surgery.institution || "Sin definir",
  }
}

export function buildCoordinatorDoctorMessage(entry: CoordinatorCase) {
  const { surgery } = entry
  const { clientLabel, surgeonLabel, institutionLabel } = getCoordinatorMessageBase(entry)

  return [
    `Hola Dr. ${surgeonLabel !== "Sin definir" ? surgeonLabel : ""}, buen día. Le escribo desde Coordinación de Cirugías.`,
    "",
    "📋 *Ingresó autorización de paciente:*",
    `• *Paciente:* ${surgery.patient}`,
    `• *Cobertura:* ${clientLabel}`,
    `• *Institución:* ${institutionLabel}`,
    `• *Procedimiento:* ${surgery.procedure || surgery.classification || "A coordinar"}`,
    "",
    `📦 *Disponibilidad de material en nosocomio:* ${entry.materialAvailabilityLabel}`,
    "",
    "¿Qué fecha y horario tentativo de quirófano le queda mejor para programarla?",
  ].join("\n")
}

export function buildCoordinatorConfirmationMessage(entry: CoordinatorCase) {
  const { surgery } = entry
  const { clientLabel, surgeonLabel, institutionLabel, surgeryDateLabel, surgeryTimeLabel, shippingDateLabel } = getCoordinatorMessageBase(entry)

  return [
    `Dr. ${surgeonLabel !== "Sin definir" ? surgeonLabel : ""}, confirmamos la coordinación de la cirugía:`,
    "",
    `📅 *Fecha de Cirugía:* ${surgeryDateLabel} ${surgeryTimeLabel !== "Sin definir" ? `a las ${surgeryTimeLabel} hs` : ""}`,
    `🏥 *Institución:* ${institutionLabel}`,
    `👤 *Paciente:* ${surgery.patient} (${clientLabel})`,
    `🚚 *Envío de materiales programado:* ${shippingDateLabel}`,
    "",
    "Los materiales e instrumental llegarán en tiempo y forma al quirófano.",
    "Cualquier cambio o requerimiento adicional, quedamos a total disposición.",
  ].join("\n")
}

export function buildCoordinatorUrgentMessage(entry: CoordinatorCase) {
  const { surgery } = entry
  const { clientLabel, surgeonLabel, institutionLabel } = getCoordinatorMessageBase(entry)

  return [
    `🚨 *ATENCIÓN - CASO PRIORITARIO / URGENCIA*`,
    "",
    `Estimado Dr. ${surgeonLabel !== "Sin definir" ? surgeonLabel : ""},`,
    `Nos comunicamos por la cirugía de *${surgery.patient}* (${clientLabel}) en *${institutionLabel}*.`,
    "",
    "⚠️ *Requerimos con urgencia definir la fecha de quirófano* para asegurar la reserva y despacho de materiales.",
    `📦 *Disponibilidad estimada:* ${entry.materialAvailabilityLabel}`,
    "",
    "Por favor indíquenos a la brevedad fecha y horario asignados.",
  ].join("\n")
}

export function buildCoordinatorFormalMessage(entry: CoordinatorCase) {
  const { surgery } = entry
  const { clientLabel, instrumentadorLabel, surgeryDateLabel, surgeryTimeLabel, shippingDateLabel, surgeryTypeLabel, surgeonLabel, institutionLabel } = getCoordinatorMessageBase(entry)

  return [
    "📝 *REPORTE DE COORDINACIÓN DE CIRUGÍA*",
    "",
    "Estimados, adjuntamos los detalles operativos de la cirugía:",
    "",
    `👤 *Paciente:* ${surgery.patient}`,
    `👨‍⚕️ *Médico Tratante:* ${surgeonLabel}`,
    `🧰 *Instrumentador Asignado:* ${instrumentadorLabel}`,
    `🛑 *Cliente / Cobertura:* ${clientLabel}`,
    `📅 *Fecha de Cirugía:* ${surgeryDateLabel}`,
    `🕒 *Hora Quirófano:* ${surgeryTimeLabel}`,
    `🚚 *Fecha de Envío de Material:* ${shippingDateLabel}`,
    `🏥 *Institución / Sede:* ${institutionLabel}`,
    `📂 *Identificador CX:* ${surgery.visibleNumber || surgery.id}`,
    `🩺 *Procedimiento:* ${surgeryTypeLabel}`,
    `📆 *Disponibilidad de Material:* ${entry.materialAvailabilityLabel}`,
    "",
    "Saludos cordiales,",
    "Área de Coordinación Quirúrgica.",
  ].join("\n")
}

export function buildCoordinatorCaseMessage(entry: CoordinatorCase) {
  return buildCoordinatorFormalMessage(entry)
}

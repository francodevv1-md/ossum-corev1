import type { CoordinationSurgeryRow } from "@/lib/services/coordination-view.service"
import {
  getAuthorizedSubgroup,
  getCoordinatorAssignmentBaseDate,
  getCoordinatorBucket,
  getCoordinatorLabel,
  getIncidentReasons,
  getMaterialAvailability,
  getSlaDisplayLabel,
  getSlaMeta,
  hasScheduledDate,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import { deriveCxOperationsDisplay } from "@/lib/cx-operations-derived"

function textDate(value: unknown) {
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return ""
}

function contactLabel(contact: CoordinationSurgeryRow["patient"]) {
  if (!contact) return "Sin definir"
  return contact.legalName?.trim() || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Sin definir"
}

function normalizeCxState(value: string | null): CoordinatorCase["surgery"]["state"] {
  const status = value?.trim().toLowerCase().replaceAll("_", " ") || ""
  if (status.includes("final")) return "Finalizada"
  if (status.includes("transit") || status.includes("tránsito")) return "En tránsito"
  if (status.includes("author") || status.includes("autor")) return "Autorizada"
  if (status.includes("suspend")) return "Suspendida"
  if (status.includes("cancel")) return "Cancelada"
  return "Pendiente"
}

function normalizePreparationState(value: string | null): CoordinatorCase["surgery"]["preparationState"] | undefined {
  const status = value?.trim().toLowerCase().replaceAll("_", " ")
  if (!status) return undefined
  if (status === "frozen with missing" || status === "congelado con faltantes" || status === "con faltantes") return "Congelado con faltantes"
  if (status === "frozen" || status === "congelado") return "Congelado"
  if (status === "preparing" || status === "en preparación") return "En preparación"
  if (status === "shipped" || status === "enviado") return "Enviado"
  if (status === "delivered" || status === "entregado") return "Entregado"
  if (status === "withdrawn" || status === "retirado") return "Retirado"
  if (status === "unprepared" || status === "sin preparar") return "Sin preparar"
  return undefined
}

function coordinatorAssignmentDate(row: CoordinationSurgeryRow) {
  if (row.coordinatorAssignment.status !== "resolved") return undefined
  const contactId = row.coordinatorAssignment.resolved.contactId
  return row.coordinatorAssignments
    .filter((assignment) => assignment.contactId === contactId)
    .map((assignment) => textDate(assignment.createdAt))
    .filter(Boolean)
    .sort()[0]
}

export type CoordinationPreviewPresentation = {
  row: CoordinationSurgeryRow
  entry: CoordinatorCase
  preparationLabel: string
  incidentReasons: string[]
  nextActionLabel: string
  responsibleAreaLabel: string
}

export function sortCoordinationPreviewRecentFinalized(a: CoordinationSurgeryRow, b: CoordinationSurgeryRow) {
  const aTime = new Date(textDate(a.performedDate || a.surgeryDate || a.updatedAt)).getTime() || 0
  const bTime = new Date(textDate(b.performedDate || b.surgeryDate || b.updatedAt)).getTime() || 0
  return bTime - aTime || a.id.localeCompare(b.id)
}

export function deriveCoordinationPreviewPresentation(row: CoordinationSurgeryRow): CoordinationPreviewPresentation {
  const state = normalizeCxState(row.cxStatus)
  const coordinator = row.coordinatorAssignment.status === "resolved" ? row.coordinatorAssignment.resolved : null
  const preparationState = normalizePreparationState(row.prepStatus)
  const assignmentDate = coordinatorAssignmentDate(row)
  const surgery = {
    id: row.visibleNumber?.trim() || row.id,
    backendId: row.id,
    visibleNumber: row.visibleNumber || undefined,
    patient: contactLabel(row.patient),
    surgeon: contactLabel(row.doctor),
    institution: contactLabel(row.institution),
    procedure: row.description || "",
    date: textDate(row.surgeryDate || row.scheduledDate || row.probableDate).slice(0, 10),
    state,
    preparationState,
    autorizado: state === "Autorizada",
    urgente: ["urgent", "urgente", "high", "alta"].includes(row.priority?.trim().toLowerCase() || ""),
    coordinadorContactId: coordinator?.contactId,
    coordinadorCx: coordinator?.label || undefined,
    coordinatorAssignmentState: row.coordinatorAssignment.status,
    fechaAutorizacion: assignmentDate,
  } as CoordinatorCase["surgery"]
  const materialAvailability = getMaterialAvailability(surgery)
  const bucket = getCoordinatorBucket(surgery)
  const subgroup = bucket === "autorizado" ? getAuthorizedSubgroup(surgery) : null
  const entry: CoordinatorCase = {
    surgery,
    history: [],
    bucket,
    subgroup,
    materialAvailabilityDate: materialAvailability.date,
    materialAvailabilityDefined: materialAvailability.defined,
    materialAvailabilityLabel: materialAvailability.label,
    sla: getSlaMeta(getCoordinatorAssignmentBaseDate(surgery, [])),
  }
  const operations = deriveCxOperationsDisplay(entry, {
    documentationIncomplete: false,
    consumptionAbsent: false,
    invoiceAbsent: false,
  })

  return {
    row,
    entry,
    preparationLabel: preparationState || "Preparación sin informar",
    incidentReasons: getIncidentReasons(entry),
    nextActionLabel: operations.nextActionLabel,
    responsibleAreaLabel: operations.responsibleAreaLabel,
  }
}

export function CoordinationPreviewCaseRow({ row }: { row: CoordinationSurgeryRow }) {
  const presentation = deriveCoordinationPreviewPresentation(row)
  const { entry } = presentation
  const { surgery } = entry
  const reference = row.visibleNumber?.trim() || `CX ${row.id}`

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-3" data-preview-case-id={row.id}>
      <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-950">{surgery.patient}</h3><span className="text-xs text-slate-500">{reference}</span></div>
          <p className="mt-1 text-xs text-slate-500">Dr. {surgery.surgeon} · {surgery.institution}</p>
        </div>
        <div className="text-xs text-slate-600">
          <p>{getCoordinatorLabel(surgery)}</p>
          <p>{hasScheduledDate(surgery) ? surgery.date : "Sin fecha CX"} · {getSlaDisplayLabel(entry.sla.tone)}</p>
          <p>{presentation.preparationLabel} · {entry.materialAvailabilityLabel}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{entry.bucket === "transito" ? "En tránsito" : entry.bucket === "finalizado" ? "Finalizado" : entry.subgroup ? entry.subgroup : "Coordinación"}</span>
      </div>
      {presentation.incidentReasons.length > 0 && <p className="mt-2 text-xs font-medium text-amber-700">Atención: {presentation.incidentReasons.join(" · ")}</p>}
      <details className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver resumen del caso</summary>
        <dl className="grid gap-1 pb-2 sm:grid-cols-2">
          <div><dt className="font-medium">Estado CX</dt><dd>{surgery.state}</dd></div>
          <div><dt className="font-medium">Próxima acción</dt><dd>{presentation.nextActionLabel}</dd></div>
          <div><dt className="font-medium">Área sugerida</dt><dd>{presentation.responsibleAreaLabel}</dd></div>
          <div><dt className="font-medium">Descripción</dt><dd>{row.description || "Sin detalle"}</dd></div>
        </dl>
      </details>
    </article>
  )
}

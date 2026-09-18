import { formatCurrency, formatDate } from "@/lib/formatters"
import { getFacturacionBadgeLabel } from "@/lib/cirugias.utils"
import type { PendientePrincipal } from "@/lib/cirugias.types"
import type { ConsumoState, Surgery } from "@/types"
import { buildMacroTimelineModel, type MacroTimelineModel } from "./expediente-macro-timeline"

export interface ExpedienteHeaderModelInput {
  surgery: Surgery
  docStatus: string
  presupuestoId?: string
  remitoId?: string
  fvNumber?: string
  consumoState?: ConsumoState
  facturacionStatus: string
  cobrosTotal: number
  pendiente: PendientePrincipal
}

export interface HeaderChipModel {
  key: string
  label: string
  value: string
  colorMap?: Record<string, string>
  tone?: "neutral"
}

export interface ReferenceItemModel {
  key: string
  label: string
  value: string
  detail?: string
  tone?: "success" | "neutral"
}

export interface ExpedienteHeaderModel {
  identity: {
    idCx: string
    expedienteNumber?: string
    patient: string
    patientDni?: string
    surgeon?: string
    institution?: string
    clientFinanciador?: string
    dateLabel: string
    dateFormatted: string
    timeLabel?: string
    classification?: string
    coordinador: string
    vendedor?: string
    instrumentador?: string
    urgente: boolean
  }
  chips: HeaderChipModel[]
  references: ReferenceItemModel[]
  macroTimeline: MacroTimelineModel
  alerts: {
    sinAutorizacion: boolean
    pendiente: PendientePrincipal
    urgente: boolean
  }
}

function joinClientFinanciador(surgery: Surgery) {
  const values = [surgery.client, surgery.financiador, surgery.obraSocial]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index) as string[]

  return values.join(" · ") || undefined
}

function getVisibleCxReference(surgery: Surgery) {
  if (surgery.visibleNumber?.trim()) return surgery.visibleNumber.trim()
  if (surgery.id?.trim()) return `CX ${surgery.id}`
  return "CX sin número visible"
}

function getExactCxDate(date?: string) {
  if (!date?.trim()) return "Fecha CX sin definir"

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return "Fecha CX sin definir"

  const [, year, month, day] = match
  const parsed = new Date(`${date}T00:00:00`)
  const isExactDate = !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === Number(year)
    && parsed.getMonth() + 1 === Number(month)
    && parsed.getDate() === Number(day)

  return isExactDate ? formatDate(date) : "Fecha CX sin definir"
}

export function buildExpedienteHeaderModel(input: ExpedienteHeaderModelInput): ExpedienteHeaderModel {
  const { surgery, docStatus, presupuestoId, remitoId, fvNumber, consumoState, facturacionStatus, cobrosTotal, pendiente } = input
  const facturacionLabel = surgery.facturado ? "Facturada" : getFacturacionBadgeLabel(facturacionStatus)

  const chips: HeaderChipModel[] = [
    { key: "estado-cx", label: "Estado CX", value: surgery.state, colorMap: undefined },
    { key: "preparacion", label: "Preparación", value: surgery.preparationState, colorMap: undefined },
    { key: "documentacion", label: "Documentación", value: docStatus, colorMap: undefined },
    { key: "facturacion", label: "Facturación", value: facturacionLabel, colorMap: undefined },
  ]

  if (consumoState) {
    chips.push({ key: "consumo", label: "Consumo", value: consumoState, colorMap: undefined })
  }

  if (cobrosTotal > 0) {
    chips.push({ key: "cobranza", label: "Cobranza", value: formatCurrency(cobrosTotal), tone: "neutral" })
  }

  const references: ReferenceItemModel[] = []

  if (presupuestoId) references.push({ key: "pr", label: "PR", value: presupuestoId })
  if (remitoId) references.push({ key: "nr", label: "NR", value: remitoId })
  if (fvNumber) references.push({ key: "fv", label: "FV", value: fvNumber })
  if (cobrosTotal > 0) references.push({ key: "cobro", label: "Cobro", value: formatCurrency(cobrosTotal), tone: "success" })
  if (surgery.expedienteNumber) references.push({ key: "expediente", label: "Exp.", value: surgery.expedienteNumber })

  for (const ref of surgery.referenciasAdministrativas ?? []) {
    if (!ref.valor) continue
    references.push({
      key: `admin-${ref.id}`,
      label: ref.tipo,
      value: ref.valor,
      detail: ref.observacion,
    })
  }

  return {
    identity: {
      idCx: getVisibleCxReference(surgery),
      expedienteNumber: surgery.expedienteNumber,
      patient: surgery.patient,
      patientDni: surgery.patientDni || undefined,
      surgeon: surgery.surgeon || undefined,
      institution: surgery.institution || undefined,
      clientFinanciador: joinClientFinanciador(surgery),
      dateLabel: [getExactCxDate(surgery.date), surgery.time].filter(Boolean).join(" "),
      dateFormatted: getExactCxDate(surgery.date),
      timeLabel: surgery.time || undefined,
      classification: surgery.classification || undefined,
      coordinador: surgery.coordinadorCx || "Sin asignar",
      vendedor: surgery.vendedor || undefined,
      instrumentador: surgery.instrumentador || undefined,
      urgente: surgery.urgente,
    },
    chips,
    references,
    macroTimeline: buildMacroTimelineModel({ surgery, consumoState }),
    alerts: {
      sinAutorizacion: !surgery.autorizado,
      pendiente,
      urgente: surgery.urgente,
    },
  }
}

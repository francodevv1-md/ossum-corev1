/**
 * cirugias.constants.ts
 * Constantes del módulo Cirugías: estados, colores, columnas, tabs.
 * Extraídas del componente monolítico original para reutilización.
 *
 * CHATZAI-001: Constantes transversales migradas a shared-constants.ts.
 * Este archivo re-exporta desde shared-constants para compatibilidad
 * con imports existentes. Las constantes propias del módulo Cirugías
 * permanecen aquí.
 */

import type { PreparationState, SurgeryState, SurgeryClassification } from "@/types"
import {
  FileText, Receipt, Activity, BookOpen, MapPin,
  Stethoscope, History, Mail,
  StickyNote,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS from shared-constants.ts (backward compatible)
// ═══════════════════════════════════════════════════════════════
export {
  CX_STATE_COLORS,
  CX_STATE_BAR_COLORS,
  PREP_STATE_COLORS,
  ACTIVE_STATES,
  PIPELINE_COLUMNS,
  PIPELINE_STATES,
  CLASSIFICATION_COLORS,
  COORDINADOR_CX_OPTIONS,
  COORDINADOR_COLORS,
  PIPELINE_BAR_COLORS,
  LOGISTICS_STATE_OUTLINED_COLORS,
} from "@/lib/shared-constants"
export type { PipelineColumn } from "@/lib/shared-constants"

// ═══════════════════════════════════════════════════════════════
// PANEL STATES
// ═══════════════════════════════════════════════════════════════

export type PanelState = "list" | "expanded"

// ═══════════════════════════════════════════════════════════════
// SURGERY STATES (module-specific)
// ═══════════════════════════════════════════════════════════════

export const ALL_STATES: SurgeryState[] = [
  "Sin autorizar", "Sin fecha", "Pendiente", "Autorizada",
  "En tránsito", "Realizada", "Finalizada",
  "Suspendida", "Cancelada", "Sin consumo",
]

export const CLASSIFICATIONS: SurgeryClassification[] = [
  "Reemplazo total de rodilla", "Prótesis de cadera", "Osteosíntesis",
  "Artroscopía", "Columna", "Tobillo", "Hombro", "Descartable", "Otro",
]

export const FACTURACION_OPTIONS = [
  { value: "sin_facturar", label: "Sin facturar" },
  { value: "autorizada_fv", label: "Autorizada para facturar" },
  { value: "facturada", label: "Facturada" },
  { value: "pendiente_cobro", label: "Pendiente de cobro" },
  { value: "vencida", label: "Vencida" },
] as const

/** Shared base className for standard table cells. Enforces consistent min-height and alignment. */
export const CELL_BASE = "px-2.5 py-1.5 min-h-[34px] align-middle"
export const CELL_BASE_COMPACT = "px-2 py-1 min-h-[28px] align-middle"
export const TABLE_GROUP_HEADER_BASE = "border-r border-slate-300 px-2.5 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 last:border-r-0 dark:border-slate-700 dark:text-slate-200"
export const TABLE_GROUP_HEADER_COMPACT = "border-r border-slate-300 px-2 py-1 text-left text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600 last:border-r-0 dark:border-slate-700 dark:text-slate-200"
export const TABLE_COLUMN_HEADER_BASE = "whitespace-nowrap border-r border-slate-200 px-2.5 py-2 text-left text-[11px] font-semibold text-slate-900 last:border-r-0"
export const TABLE_COLUMN_HEADER_COMPACT = "whitespace-nowrap border-r border-slate-200 px-2 py-1.5 text-left text-[10px] font-semibold text-slate-900 last:border-r-0"

// ═══════════════════════════════════════════════════════════════
// STATE COLOR MAPS — CX_STATE_COLORS and PREP_STATE_COLORS
// are now in shared-constants.ts (re-exported above).
// Module-specific color maps remain here:
// ═══════════════════════════════════════════════════════════════

export const DOC_STATUS_COLORS: Record<string, string> = {
  "Incompleta": "bg-red-500 text-white",
  "Pendiente": "bg-amber-500 text-white",
  "Observada": "bg-orange-500 text-white",
  "Completa": "bg-sky-500 text-white",
  "Apta para facturar": "bg-emerald-600 text-white",
}

export const FACTURACION_COLORS: Record<string, string> = {
  "No facturada": "bg-gray-400 text-white",
  "Facturada": "bg-emerald-600 text-white",
  "Pendiente de cobro": "bg-amber-500 text-white",
  "Vencida": "bg-red-500 text-white",
}

export const CONSUMO_STATE_COLORS: Record<string, string> = {
  "Pendiente": "bg-amber-500 text-white",
  "Validado": "bg-emerald-600 text-white",
  "Facturado": "bg-green-700 text-white",
}

/** Estado CX cell colors — protagonist cromático. Strong saturated backgrounds. */
export const CX_STATE_CELL_COLORS: Record<string, string> = {
  "Sin autorizar": "bg-slate-100 text-slate-700",      // gris (was amber)
  "Sin fecha": "bg-slate-100 text-slate-600",           // gris más claro (was slate-700)
  "Pendiente": "bg-yellow-100 text-yellow-800",
  "Autorizada": "bg-sky-100 text-sky-800",
  "En tránsito": "bg-blue-100 text-blue-800",
  "Realizada": "bg-emerald-100 text-emerald-800",
  "Finalizada": "bg-indigo-100 text-indigo-800",       // azul oscuro — distinct from En tránsito
  "Suspendida": "bg-violet-100 text-violet-800",
  "Cancelada": "bg-red-100 text-red-800",
  "Sin consumo": "bg-amber-200 text-amber-900",
}

/** Preparación subestado cell colors — softer, subordinated to Estado CX */
export const PREP_STATE_CELL_COLORS: Record<PreparationState, string> = {
  "Sin preparar": "bg-gray-50 text-gray-500 border border-gray-200",
  "En preparación": "bg-cyan-50 text-cyan-700 border border-cyan-200",
  "Congelado": "bg-amber-50 text-amber-600 border border-amber-200",
  "Congelado con faltantes": "bg-orange-50 text-orange-600 border border-orange-200",
  "Enviado": "bg-blue-50 text-blue-700 border border-blue-200",
  "Entregado": "bg-teal-50 text-teal-600 border border-teal-200",
  "Retirado": "bg-slate-50 text-slate-500 border border-slate-200",
}

// ═══════════════════════════════════════════════════════════════
// EXPEDIENTE TABS
// ═══════════════════════════════════════════════════════════════

export type ExpTab =
  | "ficha" | "novedades" | "comercial" | "consumo" | "documentacion"
  | "logistica" | "correo" | "instrumentador" | "historial"

export const EXPEDIENTE_TABS: readonly { value: ExpTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "ficha", label: "Ficha", icon: FileText },
  { value: "novedades", label: "Seguimiento", icon: StickyNote },
  { value: "comercial", label: "Comprobantes", icon: Receipt },
  { value: "consumo", label: "Consumo", icon: Activity },
  { value: "documentacion", label: "Doc. y trazab.", icon: BookOpen },
  { value: "logistica", label: "Logística", icon: MapPin },
  { value: "correo", label: "Correo", icon: Mail },
]

export const EXPEDIENTE_MORE_TABS: readonly { value: ExpTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "instrumentador", label: "Instrumentador", icon: Stethoscope },
  { value: "historial", label: "Historial", icon: History },
]

// ═══════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ═══════════════════════════════════════════════════════════════

// COORDINADOR_CX_OPTIONS — now in shared-constants.ts (re-exported above)

export const CIRUGIAS_COLUMNS = [
  { key: "state", label: "Estado CX" },                        // Protagonist status
  { key: "date", label: "Fecha CX" },
  { key: "probableDate", label: "Fecha probable" },
  { key: "fechaLogistica", label: "Fecha logística" },
  { key: "fechaEnvio", label: "Fecha envío" },
  { key: "patient", label: "Paciente" },
  { key: "surgeon", label: "Médico" },
  { key: "institution", label: "Institución" },
  { key: "id", label: "ID CX" },                              // Master identifier
  { key: "prNumber", label: "PR Nº" },                         // Associated document
  { key: "expedienteNumber", label: "Expediente" },             // Associated document
  { key: "preparationState", label: "Preparación" },           // Subestado
  { key: "doc", label: "Doc" },                                 // Neutral indicator
  { key: "consumo", label: "Consumo" },                          // Neutral indicator
  { key: "facturado", label: "Fact" },                           // Neutral indicator
  { key: "circuitProgress", label: "Circuito" },
  { key: "clientOs", label: "Cliente / OS" },
  { key: "coordinadorCx", label: "Coordinador" },
  { key: "classification", label: "Clasificación" },
  { key: "urgente", label: "Urgente" },
  { key: "vendedor", label: "Vendedor" },
  { key: "instrumentador", label: "Instrumentador" },
  { key: "provincia", label: "Provincia" },
  { key: "actions", label: "Acciones" },
] as const

export const CIRUGIAS_COLUMN_GROUPS = [
  {
    key: "identificacion",
    label: "Identificación",
    className: "bg-slate-100 text-slate-700",
    columns: ["state", "patient", "surgeon", "institution", "id", "prNumber", "expedienteNumber", "classification", "urgente"],
  },
  {
    key: "fechas",
    label: "Fechas",
    className: "bg-blue-50 text-blue-700",
    columns: ["date", "probableDate", "fechaLogistica", "fechaEnvio"],
  },
  {
    key: "operativo",
    label: "Operativo",
    className: "bg-amber-50 text-amber-700",
    columns: ["preparationState", "circuitProgress", "coordinadorCx", "instrumentador", "vendedor", "provincia"],
  },
  {
    key: "doc-comercial",
    label: "Doc / Comercial",
    className: "bg-emerald-50 text-emerald-700",
    columns: ["clientOs", "doc", "consumo", "facturado", "actions"],
  },
] as const

export const DEFAULT_VISIBLE_COLS: Record<string, boolean> = {
  id: true, prNumber: true, expedienteNumber: true, state: true, date: true, probableDate: true, fechaLogistica: true, fechaEnvio: true,
  patient: true, surgeon: true, institution: true, coordinadorCx: false, clientOs: true,
  classification: true, urgente: true, provincia: false, vendedor: false,
  instrumentador: false, preparationState: true, doc: true,
  consumo: true, facturado: true, circuitProgress: true, actions: true,
}

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  state: 120,
  date: 132,
  probableDate: 132,
  fechaLogistica: 124,
  fechaEnvio: 124,
  patient: 150,
  surgeon: 140,
  institution: 148,
  id: 75,
  prNumber: 75,
  expedienteNumber: 90,
  preparationState: 134,
  doc: 96,
  consumo: 96,
  facturado: 96,
  circuitProgress: 148,
  clientOs: 148,
  coordinadorCx: 148,
  classification: 148,
  urgente: 96,
  vendedor: 148,
  instrumentador: 148,
  provincia: 148,
  actions: 96,
}

export const PINNABLE_LEFT_COLUMN_KEYS = [
  "state",
  "date",
  "patient",
  "surgeon",
  "institution",
  "id",
  "prNumber",
  "expedienteNumber",
] as const

export const DEFAULT_FIXED_LEFT_COLUMNS = ["state", "date", "patient"] as const

/** Columns that should not be sortable */
export const NON_SORTABLE_KEYS = ["actions", "doc", "facturado", "consumo", "coordinadorCx", "circuitProgress", "probableDate", "fechaLogistica", "fechaEnvio"]

// ═══════════════════════════════════════════════════════════════
// FILTER OPTIONS
// ═══════════════════════════════════════════════════════════════

export const STATE_FILTER_OPTIONS = [
  "Sin autorizar", "Sin fecha", "Pendiente", "Autorizada",
  "En tránsito", "Realizada", "Finalizada",
  "Suspendida", "Cancelada", "Sin consumo",
]

export const PREP_FILTER_OPTIONS = [
  "Sin preparar", "En preparación", "Congelado", "Congelado con faltantes",
  "Enviado", "Entregado", "Retirado",
] satisfies PreparationState[]

export const DOC_FILTER_OPTIONS = [
  "Completa", "Incompleta", "Observada", "Apta para facturar",
]

export const FACT_FILTER_OPTIONS = [
  { value: "sin_facturar", label: "No facturada" },
  { value: "autorizada_fv", label: "Autorizada FV" },
  { value: "facturada", label: "Facturada" },
  { value: "pendiente_cobro", label: "Pendiente de cobro" },
  { value: "vencida", label: "Vencida" },
]

export const PROVINCIA_FILTER_OPTIONS = [
  "", "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
]

export const VENDEDOR_FILTER_OPTIONS = ["", "Andrea Ruiz", "Pablo Herrera", "Sin asignar"]

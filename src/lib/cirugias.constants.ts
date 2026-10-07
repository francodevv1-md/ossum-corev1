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
import { getCxStateColorKey } from "@/lib/shared-constants"
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
  "Sin autorizar", "Pendiente", "Autorizada",
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
export const TABLE_COLUMN_HEADER_BASE = "whitespace-nowrap border-r border-slate-200/80 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 last:border-r-0"
export const TABLE_COLUMN_HEADER_COMPACT = "whitespace-nowrap border-r border-slate-200/80 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 last:border-r-0"

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
  "Autorizada": "bg-emerald-100 text-emerald-800",
  "En tránsito": "bg-blue-100 text-blue-800",
  "Realizada": "bg-emerald-100 text-emerald-800",
  "Finalizada": "bg-indigo-100 text-indigo-800",       // azul oscuro — distinct from En tránsito
  "Suspendida": "bg-violet-100 text-violet-800",
  "Cancelada": "bg-red-100 text-red-800",
  "Sin consumo": "bg-amber-200 text-amber-900",
}

// ═══════════════════════════════════════════════════════════════
// ESTADO CX MULTI-VARIANTE (A: Celda, B: Barra 4px, C: Dot)
// Conforme al prototipo de alta densidad
// ═══════════════════════════════════════════════════════════════

export type CxStatusVariant = "a" | "b" | "c" | "d"

export interface CxStatusStyle {
  barColor: string
  cellBg: string
  dotColor: string
  textColor: string
}

// ═══════════════════════════════════════════════════════════════
// SISTEMA VISUAL CANÓNICO DE ESTADOS CX (ADDENDUM OFICIAL)
// ═══════════════════════════════════════════════════════════════

export interface CxStateVisual {
  strong: string        // Hex oficial para Estado CX fuerte
  rowTint: string       // Hex oficial para el tinte suave de la fila
  hoverTint: string     // Hex para el hover sutil de la fila
  darkRowTint?: string  // Hex para el tinte suave de la fila en modo oscuro
  darkHoverTint?: string // Hex para el hover sutil de la fila en modo oscuro
  strongClass: string   // Clases Tailwind para badge / celda fuerte con texto legible
  barClass: string      // Clases Tailwind para barra 4px
  dotClass: string      // Clases Tailwind para dot
  textClass: string     // Clases Tailwind para texto semántico
}

export const CX_STATE_VISUALS: Record<string, CxStateVisual> = {
  "Pendiente": {
    strong: "#FACC15",
    rowTint: "#FFFDF6",
    hoverTint: "#FEF7E2",
    darkRowTint: "#18140c",
    darkHoverTint: "#261e10",
    strongClass: "bg-yellow-400 text-slate-900 font-bold",
    barClass: "bg-yellow-400",
    dotClass: "bg-yellow-400",
    textClass: "text-yellow-800 dark:text-yellow-300 font-semibold",
  },
  "Autorizada": {
    strong: "#10B981",
    rowTint: "#F2FBF6",
    hoverTint: "#E5F7ED",
    darkRowTint: "#051c17",
    darkHoverTint: "#092b23",
    strongClass: "bg-emerald-500 text-slate-900 font-bold",
    barClass: "bg-emerald-500",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-300 font-semibold",
  },
  "En tránsito": {
    strong: "#7DD3FC",
    rowTint: "#F5FAFF",
    hoverTint: "#E8F4FD",
    darkRowTint: "#051624",
    darkHoverTint: "#09243a",
    strongClass: "bg-sky-300 text-slate-900 font-bold",
    barClass: "bg-sky-300",
    dotClass: "bg-sky-300",
    textClass: "text-sky-800 dark:text-sky-300 font-semibold",
  },
  "Realizada": {
    strong: "#047857",
    rowTint: "#F2FBF6",
    hoverTint: "#E5F7ED",
    darkRowTint: "#051c17",
    darkHoverTint: "#092b23",
    strongClass: "bg-emerald-700 text-white font-bold",
    barClass: "bg-emerald-700",
    dotClass: "bg-emerald-700",
    textClass: "text-emerald-700 dark:text-emerald-300 font-semibold",
  },
  "Finalizada": {
    strong: "#1E40AF",
    rowTint: "#F4F8FE",
    hoverTint: "#E8F1FC",
    darkRowTint: "#07162d",
    darkHoverTint: "#0b2348",
    strongClass: "bg-blue-800 text-white font-bold",
    barClass: "bg-blue-800",
    dotClass: "bg-blue-800",
    textClass: "text-blue-800 dark:text-blue-300 font-semibold",
  },
  "Sin autorizar": {
    strong: "#FFFFFF",
    rowTint: "#FFFFFF",
    hoverTint: "#F8FAFC",
    darkRowTint: "#0d131d",
    darkHoverTint: "#151e2e",
    strongClass: "bg-white text-slate-900 font-bold border border-slate-300 dark:border-slate-700",
    barClass: "bg-white border border-slate-300 dark:border-slate-700",
    dotClass: "bg-white border border-slate-300 dark:border-slate-700",
    textClass: "text-slate-700 dark:text-slate-300 font-semibold",
  },
  "Suspendida": {
    strong: "#7C3AED",
    rowTint: "#FAF7FF",
    hoverTint: "#F3EDFE",
    darkRowTint: "#140c26",
    darkHoverTint: "#20133c",
    strongClass: "bg-violet-600 text-white font-bold",
    barClass: "bg-violet-600",
    dotClass: "bg-violet-600",
    textClass: "text-violet-700 dark:text-violet-300 font-semibold",
  },
  "Cancelada": {
    strong: "#881337",
    rowTint: "#FFF6F7",
    hoverTint: "#FEEDEF",
    darkRowTint: "#1d0910",
    darkHoverTint: "#2d0e19",
    strongClass: "bg-rose-900 text-white font-bold",
    barClass: "bg-rose-900",
    dotClass: "bg-rose-900",
    textClass: "text-rose-900 dark:text-rose-300 font-semibold",
  },
  "Sin consumo": {
    strong: "#4B5563",
    rowTint: "#F8F8FA",
    hoverTint: "#F0F0F3",
    darkRowTint: "#111418",
    darkHoverTint: "#1a1f26",
    strongClass: "bg-gray-600 text-white font-bold",
    barClass: "bg-gray-600",
    dotClass: "bg-gray-600",
    textClass: "text-gray-700 dark:text-gray-300 font-semibold",
  },
  // Presentation-only key for an undated case; not a SurgeryState.
  "Sin fecha": {
    strong: "#FFFFFF",
    rowTint: "#FFFFFF",
    hoverTint: "#F8FAFC",
    darkRowTint: "#0d131d",
    darkHoverTint: "#151e2e",
    strongClass: "bg-white text-slate-900 font-bold border border-slate-300 dark:border-slate-700",
    barClass: "bg-white border border-slate-300 dark:border-slate-700",
    dotClass: "bg-white border border-slate-300 dark:border-slate-700",
    textClass: "text-slate-600 dark:text-slate-300 font-medium",
  },
}

export const DEFAULT_CX_STATE_VISUAL: CxStateVisual = {
  strong: "#64748B",
  rowTint: "#F8FAFC",
  hoverTint: "#F1F5F9",
  darkRowTint: "#0d131d",
  darkHoverTint: "#151e2e",
  strongClass: "bg-slate-500 text-white font-bold",
  barClass: "bg-slate-500",
  dotClass: "bg-slate-500",
  textClass: "text-slate-600 dark:text-slate-300 font-medium",
}

export function getCxStateVisual(state: string, date?: string | null): CxStateVisual {
  return CX_STATE_VISUALS[getCxStateColorKey(state, date)] || DEFAULT_CX_STATE_VISUAL
}

export interface CxFullTableRowColor {
  strongBg: string
  rowBg: string
  rowHoverBg: string
  stickyBg: string
  stickyHoverBg: string
}

export const DEFAULT_FULL_TABLE_ROW_COLORS: CxFullTableRowColor = {
  strongBg: DEFAULT_CX_STATE_VISUAL.strongClass,
  rowBg: DEFAULT_CX_STATE_VISUAL.rowTint,
  rowHoverBg: DEFAULT_CX_STATE_VISUAL.hoverTint,
  stickyBg: DEFAULT_CX_STATE_VISUAL.rowTint,
  stickyHoverBg: DEFAULT_CX_STATE_VISUAL.hoverTint,
}

export const CX_FULL_TABLE_ROW_COLORS: Record<string, CxFullTableRowColor> = Object.fromEntries(
  Object.entries(CX_STATE_VISUALS).map(([k, v]) => [
    k,
    {
      strongBg: v.strongClass,
      rowBg: v.rowTint,
      rowHoverBg: v.hoverTint,
      stickyBg: v.rowTint,
      stickyHoverBg: v.hoverTint,
    },
  ])
)

export const CX_STATE_VARIANTS_CONFIG: Record<string, CxStatusStyle> = Object.fromEntries(
  Object.entries(CX_STATE_VISUALS).map(([k, v]) => [
    k,
    {
      barColor: v.barClass,
      cellBg: v.strongClass,
      dotColor: v.dotClass,
      textColor: v.textClass,
    },
  ])
)

/** Preparación subestado cell colors — softer, subordinated to Estado CX */
export const PREP_STATE_CELL_COLORS: Record<PreparationState, string> = {
  "Sin preparar": "bg-white/80 text-slate-600 border border-slate-200/90 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800",
  "En preparación": "bg-cyan-50/90 text-cyan-800 border border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60",
  "Congelado": "bg-amber-50/90 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
  "Congelado con faltantes": "bg-orange-50/90 text-orange-800 border border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60",
  "Enviado": "bg-blue-50/90 text-blue-800 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
  "Entregado": "bg-teal-50/90 text-teal-800 border border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60",
  "Retirado": "bg-slate-50/90 text-slate-600 border border-slate-200/80 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800/60",
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
  { key: "id", label: "ID CX" },                              // Master identifier (Sticky 1)
  { key: "state", label: "Estado CX" },                        // Protagonist status (Sticky 2)
  { key: "patient", label: "Paciente" },                       // Primary patient anchor (Sticky 3)
  { key: "clientOs", label: "Cliente / OS" },
  { key: "institution", label: "Institución" },
  { key: "surgeon", label: "Médico" },
  { key: "classification", label: "Clasificación" },
  { key: "preparationState", label: "Preparación" },           // Subestado
  { key: "date", label: "Fecha CX" },
  { key: "time", label: "Hora" },
  { key: "fechaEnvio", label: "Fecha envío" },
  { key: "prNumber", label: "Remito" },                        // Remito / PR
  { key: "expedienteNumber", label: "Expediente" },             // Associated document
  { key: "doc", label: "Doc" },                                 // Indicador documental
  { key: "consumo", label: "Consumo" },                          // Indicador consumo
  { key: "facturado", label: "Fact" },                           // Indicador facturación
  { key: "probableDate", label: "Fecha probable" },
  { key: "fechaLogistica", label: "Fecha logística" },
  { key: "circuitProgress", label: "Circuito" },
  { key: "coordinadorCx", label: "Coordinador" },
  { key: "urgente", label: "Urgente" },
  { key: "vendedor", label: "Vendedor" },
  { key: "instrumentador", label: "Instrumentador" },
  { key: "provincia", label: "Provincia" },
  { key: "actions", label: "Acciones" },                       // Primary contextual action (Sticky right)
] as const

/** 15 Columnas Operativas — Preajuste optimizado para flujo diario de alta densidad */
export const PRESET_COLUMNS_15_OPS: string[] = [
  "id",
  "state",
  "patient",
  "clientOs",
  "institution",
  "surgeon",
  "classification",
  "preparationState",
  "date",
  "time",
  "fechaEnvio",
  "prNumber",
  "actions",
]

/** 22 Columnas Extremo — Preajuste completo para auditoría y trazabilidad exhaustiva */
export const PRESET_COLUMNS_22_EXTREMO: string[] = [
  "id",
  "state",
  "patient",
  "clientOs",
  "institution",
  "surgeon",
  "classification",
  "preparationState",
  "date",
  "time",
  "probableDate",
  "fechaLogistica",
  "fechaEnvio",
  "prNumber",
  "expedienteNumber",
  "doc",
  "consumo",
  "facturado",
  "circuitProgress",
  "coordinadorCx",
  "urgente",
  "actions",
]

export const CIRUGIAS_COLUMN_GROUPS = [
  {
    key: "identificacion",
    label: "Identificación",
    className: "bg-slate-100 text-slate-700",
    columns: ["id", "state", "patient", "institution", "clientOs", "surgeon", "classification", "urgente"],
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
    columns: ["prNumber", "expedienteNumber", "doc", "consumo", "facturado", "actions"],
  },
] as const

export const DEFAULT_VISIBLE_COLS: Record<string, boolean> = {
  id: true, state: true, patient: true, clientOs: true, institution: true,
  surgeon: true, classification: true, preparationState: true, date: true, time: true,
  fechaEnvio: false, prNumber: true, actions: true, expedienteNumber: true,
  doc: true, consumo: true, facturado: true, probableDate: false, fechaLogistica: false,
  circuitProgress: true, coordinadorCx: false, urgente: false, provincia: false, vendedor: false,
  instrumentador: false,
}

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  id: 88,
  state: 115,
  patient: 170,
  clientOs: 135,
  institution: 135,
  surgeon: 125,
  classification: 130,
  preparationState: 115,
  date: 105,
  time: 68,
  fechaEnvio: 105,
  prNumber: 90,
  expedienteNumber: 85,
  doc: 70,
  consumo: 75,
  facturado: 70,
  probableDate: 110,
  fechaLogistica: 110,
  circuitProgress: 125,
  coordinadorCx: 115,
  urgente: 70,
  vendedor: 115,
  instrumentador: 115,
  provincia: 110,
  actions: 105,
}

export const PINNABLE_LEFT_COLUMN_KEYS = [
  "id",
  "state",
  "patient",
  "clientOs",
  "institution",
  "surgeon",
  "classification",
  "preparationState",
  "date",
  "time",
  "probableDate",
  "fechaLogistica",
  "fechaEnvio",
  "prNumber",
  "expedienteNumber",
  "doc",
  "consumo",
  "facturado",
  "circuitProgress",
  "coordinadorCx",
  "urgente",
  "provincia",
  "vendedor",
  "instrumentador",
] as const

export const DEFAULT_FIXED_LEFT_COLUMNS = ["id", "state", "patient"] as const

/** Columns that should not be sortable */
export const NON_SORTABLE_KEYS = ["actions", "doc", "facturado", "consumo", "coordinadorCx", "circuitProgress", "probableDate", "fechaLogistica", "fechaEnvio"]

// ═══════════════════════════════════════════════════════════════
// FILTER OPTIONS
// ═══════════════════════════════════════════════════════════════

export const STATE_FILTER_OPTIONS = [
  "Sin autorizar", "Pendiente", "Autorizada",
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

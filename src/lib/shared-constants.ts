/**
 * shared-constants.ts
 * Constantes compartidas transversales del proyecto OSSUM COR.
 * Fuente única de verdad para colores de estado, pipeline kanban,
 * clasificaciones y listas de estados activos usados en múltiples módulos.
 *
 * REGLA: Si un valor se usa en 2+ archivos de páginas o componentes,
 * debe vivir aquí. Si solo se usa en un módulo, permanece en su constants local.
 *
 * CHATZAI-001: Extracción de Constantes Compartidas (2026-05-13)
 */

import type { SurgeryState, SurgeryClassification, LogisticsState, TipoReferencia } from "@/types"

// ═══════════════════════════════════════════════════════════════
// SURGERY STATE COLORS — Badge pill style (bg + text)
// Canonical source. DO NOT duplicate in page files.
// ═══════════════════════════════════════════════════════════════

export const CX_STATE_COLORS: Record<string, string> = {
  "Sin autorizar": "bg-slate-500 text-white",       // gris (was amber)
  "Sin fecha": "bg-slate-400 text-white",            // gris más claro
  "Pendiente": "bg-yellow-500 text-white",           // amarillo
  "Autorizada": "bg-sky-500 text-white",             // azul claro
  "En preparación": "bg-cyan-500 text-white",        // cyan
  "En tránsito": "bg-blue-500 text-white",           // azul
  "Realizada": "bg-emerald-500 text-white",          // verde
  "Finalizada": "bg-blue-800 text-white",            // azul oscuro (was teal-700)
  "Suspendida": "bg-violet-600 text-white",          // violeta
  "Cancelada": "bg-red-600 text-white",              // rojo
  "Sin consumo": "bg-amber-800 text-white",          // marrón
}

/**
 * Derived: bg-only colors (for bar charts, progress bars, etc.)
 * Extracts the first CSS class from CX_STATE_COLORS.
 */
export const CX_STATE_BAR_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(CX_STATE_COLORS).map(([key, val]) => [key, val.split(" ")[0]])
)

// ═══════════════════════════════════════════════════════════════
// PREPARATION / LOGISTICS STATE COLORS
// ═══════════════════════════════════════════════════════════════

/** Badge pill style (solid bg + white text) — matches cirugias.constants PREP_STATE_COLORS */
export const PREP_STATE_COLORS: Record<string, string> = {
  "Sin preparar": "bg-gray-400 text-white",
  "Congelado": "bg-amber-500 text-white",
  "Congelado con faltantes": "bg-orange-600 text-white",
  "Entregado": "bg-teal-500 text-white",
  "Retirado": "bg-slate-500 text-white",
}

/** Outlined/soft style for panels — bg-100 text-800 border-300 */
export const LOGISTICS_STATE_OUTLINED_COLORS: Record<string, string> = {
  "Sin preparar": "bg-gray-100 text-gray-700 border-gray-300",
  "Congelado": "bg-amber-100 text-amber-800 border-amber-300",
  "Congelado con faltantes": "bg-orange-100 text-orange-800 border-orange-300",
  "Preparado": "bg-sky-100 text-sky-800 border-sky-300",
  "Enviado": "bg-blue-100 text-blue-800 border-blue-300",
  "Retirado": "bg-teal-100 text-teal-800 border-teal-300",
  "Devuelto": "bg-orange-100 text-orange-800 border-orange-300",
  "Controlado": "bg-green-100 text-green-800 border-green-300",
}

// ═══════════════════════════════════════════════════════════════
// ACTIVE STATES — Surgeries that are in the operational pipeline
// ═══════════════════════════════════════════════════════════════

export const ACTIVE_STATES: SurgeryState[] = [
  "Sin autorizar", "Sin fecha", "Pendiente", "Autorizada",
  "En preparación", "En tránsito", "Realizada", "Sin consumo",
]

// ═══════════════════════════════════════════════════════════════
// PIPELINE / KANBAN COLUMN DEFINITIONS
// Single source for all kanban/pipeline views.
// ═══════════════════════════════════════════════════════════════

export interface PipelineColumn {
  id: string
  label: string
  color: string              // border color class (e.g. "border-slate-400")
  bgColor: string            // background class (e.g. "bg-slate-50 dark:bg-slate-900/30")
  headerBg: string           // header background class
  states: SurgeryState[]     // which surgery states belong to this column
}

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "ingreso",
    label: "Ingreso",
    color: "border-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
    headerBg: "bg-slate-200 dark:bg-slate-800",
    states: ["Sin autorizar", "Sin fecha", "Pendiente"],
  },
  {
    id: "autorizada",
    label: "Autorizada",
    color: "border-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    headerBg: "bg-blue-200 dark:bg-blue-800",
    states: ["Autorizada"],
  },
  {
    id: "preparacion",
    label: "Preparación",
    color: "border-teal-500",
    bgColor: "bg-teal-50 dark:bg-teal-900/20",
    headerBg: "bg-teal-200 dark:bg-teal-800",
    states: ["En preparación", "En tránsito"],
  },
  {
    id: "realizada",
    label: "Realizada",
    color: "border-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    headerBg: "bg-purple-200 dark:bg-purple-800",
    states: ["Realizada"],
  },
  {
    id: "finalizada",
    label: "Finalizada",
    color: "border-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    headerBg: "bg-emerald-200 dark:bg-emerald-800",
    states: ["Finalizada", "Sin consumo"],
  },
  {
    id: "suspendida",
    label: "Suspendida/Cancelada",
    color: "border-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    headerBg: "bg-red-200 dark:bg-red-800",
    states: ["Suspendida", "Cancelada"],
  },
]

/**
 * Flat list of pipeline states in visual order.
 * Used by Coordinadores page for flat pipeline view.
 */
export const PIPELINE_STATES: SurgeryState[] = [
  "Sin autorizar", "Pendiente", "Autorizada",
  "En preparación", "En tránsito", "Realizada",
  "Finalizada", "Suspendida", "Cancelada",
]

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION COLORS — Bar chart color per classification
// ═══════════════════════════════════════════════════════════════

export const CLASSIFICATION_COLORS: Record<string, string> = {
  "Reemplazo total de rodilla": "bg-blue-500",
  "Prótesis de cadera": "bg-emerald-500",
  "Osteosíntesis": "bg-amber-500",
  "Artroscopía": "bg-purple-500",
  "Columna": "bg-teal-500",
  "Tobillo": "bg-rose-500",
  "Hombro": "bg-sky-500",
  "Descartable": "bg-slate-500",
  "Otro": "bg-gray-400",
}

// ═══════════════════════════════════════════════════════════════
// COORDINADOR OPTIONS — Canonical list
// ═══════════════════════════════════════════════════════════════

export const COORDINADOR_CX_OPTIONS = [
  "Sin asignar",
  "Nelson",
  "Ezequiel",
] as const

/** Coordinator color map for charts/visual indicators */
export const COORDINADOR_COLORS: Record<string, string> = {
  "Nelson": "bg-blue-500",
  "Ezequiel": "bg-teal-500",
  "Sin asignar": "bg-slate-400",
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE BAR COLORS — For chart bars by pipeline column id
// ═══════════════════════════════════════════════════════════════

export const PIPELINE_BAR_COLORS: Record<string, string> = {
  ingreso: "bg-slate-400",
  autorizada: "bg-blue-500",
  preparacion: "bg-teal-500",
  realizada: "bg-purple-500",
  finalizada: "bg-emerald-500",
  suspendida: "bg-red-500",
}

// ═══════════════════════════════════════════════════════════════
// VENDEDORES OPTIONS — Canonical list
// ═══════════════════════════════════════════════════════════════

export const VENDEDORES_OPTIONS = ["Andrea Ruiz", "Pablo Herrera", "Sin asignar"] as const

// ═══════════════════════════════════════════════════════════════
// TIPO REFERENCIA OPTIONS — For referencias administrativas
// ═══════════════════════════════════════════════════════════════

export const TIPO_REFERENCIA_OPTIONS: { value: TipoReferencia; label: string }[] = [
  { value: "Autorización", label: "Autorización" },
  { value: "DNI", label: "DNI" },
  { value: "Expediente", label: "Expediente" },
  { value: "Siniestro", label: "Siniestro" },
  { value: "Concurso", label: "Concurso" },
  { value: "Afiliado", label: "Afiliado" },
  { value: "CM", label: "CM" },
  { value: "HC", label: "HC" },
  { value: "Orden", label: "Orden" },
  { value: "Ref", label: "Ref" },
  { value: "Otro", label: "Otro" },
]

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

import type { SurgeryState, SurgeryClassification } from "@/types"
import {
  Scissors, FileText, Receipt, Truck, Activity, Link2,
  BookOpen, MapPin, ArrowRightLeft, Stethoscope, StickyNote, History, Search,
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
  "En preparación", "En tránsito", "Realizada", "Finalizada",
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
  "En preparación": "bg-cyan-100 text-cyan-800",
  "En tránsito": "bg-blue-100 text-blue-800",
  "Realizada": "bg-emerald-100 text-emerald-800",
  "Finalizada": "bg-indigo-100 text-indigo-800",       // azul oscuro — distinct from En tránsito
  "Suspendida": "bg-violet-100 text-violet-800",
  "Cancelada": "bg-red-100 text-red-800",
  "Sin consumo": "bg-amber-200 text-amber-900",
}

/** Preparación subestado cell colors — softer, subordinated to Estado CX */
export const PREP_STATE_CELL_COLORS: Record<string, string> = {
  "Sin preparar": "bg-gray-50 text-gray-500 border border-gray-200",
  "Congelado": "bg-amber-50 text-amber-600 border border-amber-200",
  "Congelado con faltantes": "bg-orange-50 text-orange-600 border border-orange-200",
  "Entregado": "bg-teal-50 text-teal-600 border border-teal-200",
  "Retirado": "bg-slate-50 text-slate-500 border border-slate-200",
}

// ═══════════════════════════════════════════════════════════════
// EXPEDIENTE TABS
// ═══════════════════════════════════════════════════════════════

export const EXPEDIENTE_TABS = [
  { value: "resumen", label: "Resumen", icon: FileText },
  { value: "cirugia", label: "Cirugía", icon: Scissors },
  { value: "presupuesto", label: "Presupuesto", icon: Receipt },
  { value: "remitos", label: "Remitos", icon: Truck },
  { value: "consumo", label: "Consumo", icon: Activity },
  { value: "comprobantes", label: "Comprobantes", icon: Link2 },
  { value: "documentacion", label: "Doc.", icon: BookOpen },
  { value: "logistica", label: "Logística", icon: MapPin },
  { value: "transito", label: "Mat. Tránsito", icon: ArrowRightLeft },
  { value: "instrumentador", label: "Instrumentador", icon: Stethoscope },
  { value: "notas", label: "Notas", icon: StickyNote },
  { value: "historial", label: "Historial", icon: History },
  { value: "trazabilidad", label: "Trazabilidad", icon: Search },
] as const

export const COMPACT_TABS = [
  { value: "resumen", label: "Resumen", icon: FileText },
  { value: "presupuesto", label: "PR", icon: Receipt },
  { value: "remitos", label: "NR", icon: Truck },
  { value: "consumo", label: "Cons.", icon: Activity },
  { value: "documentacion", label: "Doc", icon: BookOpen },
  { value: "comprobantes", label: "Comp.", icon: Link2 },
  { value: "logistica", label: "Log.", icon: MapPin },
  { value: "notas", label: "Notas", icon: StickyNote },
  { value: "historial", label: "Hist.", icon: History },
] as const

// ═══════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ═══════════════════════════════════════════════════════════════

// COORDINADOR_CX_OPTIONS — now in shared-constants.ts (re-exported above)

export const CIRUGIAS_COLUMNS = [
  { key: "id", label: "ID CX" },                              // Master identifier
  { key: "prNumber", label: "PR Nº" },                         // Associated document
  { key: "expedienteNumber", label: "Expediente" },             // Associated document
  { key: "state", label: "Estado CX" },                        // Protagonist status
  { key: "date", label: "Fecha CX" },
  { key: "patient", label: "Paciente" },
  { key: "surgeon", label: "Médico" },
  { key: "institution", label: "Institución" },
  { key: "coordinadorCx", label: "Coordinador" },
  { key: "clientOs", label: "Cliente / OS" },
  { key: "classification", label: "Clasificación" },
  { key: "urgente", label: "Urgente" },
  { key: "provincia", label: "Provincia" },
  { key: "vendedor", label: "Vendedor" },
  { key: "instrumentador", label: "Instrumentador" },
  { key: "preparationState", label: "Preparación" },           // Subestado
  { key: "doc", label: "Doc" },                                 // Neutral indicator
  { key: "consumo", label: "Consumo" },                          // Neutral indicator
  { key: "facturado", label: "Fact" },                           // Neutral indicator
  { key: "actions", label: "Acciones" },
] as const

export const DEFAULT_VISIBLE_COLS: Record<string, boolean> = {
  id: true, prNumber: true, expedienteNumber: true, state: true, date: true,
  patient: true, surgeon: true, institution: true, coordinadorCx: false, clientOs: true,
  classification: true, urgente: true, provincia: false, vendedor: false,
  instrumentador: false, preparationState: true, doc: true,
  consumo: true, facturado: true, actions: true,
}

/** Columns that should not be sortable */
export const NON_SORTABLE_KEYS = ["actions", "doc", "facturado", "consumo", "coordinadorCx"]

// ═══════════════════════════════════════════════════════════════
// FILTER OPTIONS
// ═══════════════════════════════════════════════════════════════

export const STATE_FILTER_OPTIONS = [
  "Sin autorizar", "Sin fecha", "Pendiente", "Autorizada",
  "En preparación", "En tránsito", "Realizada", "Finalizada",
  "Suspendida", "Cancelada", "Sin consumo",
]

export const PREP_FILTER_OPTIONS = [
  "Sin preparar", "Congelado", "Congelado con faltantes",
  "Entregado", "Retirado",
]

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

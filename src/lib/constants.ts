/**
 * constants.ts
 * Constantes compartidas transversales del proyecto OSSUM COR.
 * Extraídas de los módulos monolíticos (Coordinadores, Calendario, Tableros Operativos)
 * para eliminar duplicación y preparar el terreno para modularización.
 *
 * Fuente de verdad para: pipeline states, columnas Kanban, nombres de días/meses,
 * slots horarios, colores de clasificación y barras de estado.
 */

import type { SurgeryState } from "@/types"

// ═══════════════════════════════════════════════════════════════
// PIPELINE STATES — Orden del pipeline quirúrgico
// ═══════════════════════════════════════════════════════════════

/** Orden de estados para la vista pipeline (Kanban simple por estado) */
export const PIPELINE_STATES: SurgeryState[] = [
  "Sin autorizar",
  "Pendiente",
  "Autorizada",
  "En tránsito",
  "Realizada",
  "Finalizada",
  "Suspendida",
  "Cancelada",
]

// ═══════════════════════════════════════════════════════════════
// PIPELINE COLUMNS — Columnas Kanban agrupadas (Tableros Operativos)
// ═══════════════════════════════════════════════════════════════

export interface PipelineColumn {
  id: string
  label: string
  color: string
  bgColor: string
  headerBg: string
  states: SurgeryState[]
}

/** Columnas del pipeline agrupadas por fase operativa */
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

// ═══════════════════════════════════════════════════════════════
// CALENDAR CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Nombres cortos de días de la semana (lunes a domingo) */
export const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const

/** Nombres de meses en español */
export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const

/** Slots horarios de 07:00 a 21:00 para vista semanal */
export const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7
  return `${String(hour).padStart(2, "0")}:00`
}) as readonly string[]

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION COLORS — Colores por clasificación quirúrgica
// ═══════════════════════════════════════════════════════════════

/** Colores de fondo (bg class only) para barras de clasificación */
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
// STATE BAR COLORS — Colores de fondo para barras Progress
// ═══════════════════════════════════════════════════════════════

/** Colores de fondo (bg class only) para barras de progreso por estado */
export const STATE_BAR_COLORS: Record<string, string> = {
  "Autorizada": "bg-blue-500",
  "Pendiente": "bg-blue-400",
  "En tránsito": "bg-teal-500",
  "Realizada": "bg-emerald-500",
  "Finalizada": "bg-green-700",
  "Suspendida": "bg-red-400",
  "Cancelada": "bg-red-600",
  "Sin autorizar": "bg-amber-400",
  "Sin consumo": "bg-amber-600",
  "Sin fecha": "bg-slate-400",
}

/**
 * coordinadores.constants.ts
 * Constantes y definiciones de columnas para el módulo de Coordinadores.
 */

export const COORDINADORES_COLUMNS = [
  { key: "date", label: "Fecha / Hito" },
  { key: "cx", label: "ID CX" },
  { key: "patient", label: "Paciente" },
  { key: "surgeon", label: "Médico" },
  { key: "institution", label: "Institución" },
  { key: "provincia", label: "Provincia / Localidad" },
  { key: "clientOs", label: "Obra Social / Financiador" },
  { key: "coordinadorCx", label: "Coordinador" },
  { key: "state", label: "Estado & Prep" },
  { key: "pendientes", label: "Pendiente / Alerta" },
  { key: "quick_actions", label: "Acciones Rápidas" },
  { key: "actions", label: "Gestión" },
] as const

export type CoordinadorColumnKey = (typeof COORDINADORES_COLUMNS)[number]["key"]

export const DEFAULT_COORDINADORES_VISIBLE_COLS: Record<string, boolean> = {
  date: true,
  cx: true,
  patient: true,
  surgeon: true,
  institution: true,
  provincia: true,
  clientOs: false,
  coordinadorCx: true,
  state: true,
  pendientes: true,
  quick_actions: true,
  actions: true,
}

export const DEFAULT_COORDINADORES_COLUMN_ORDER: string[] = [
  "date",
  "cx",
  "patient",
  "surgeon",
  "institution",
  "provincia",
  "clientOs",
  "coordinadorCx",
  "state",
  "pendientes",
  "quick_actions",
  "actions",
]

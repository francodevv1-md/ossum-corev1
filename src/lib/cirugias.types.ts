/**
 * cirugias.types.ts
 * Tipos específicos del módulo Cirugías.
 * No repite tipos que ya están en @/types.
 */

import type { Surgery, SurgeryState, SurgeryClassification, ReferenciaAdministrativa } from "@/types"

// ═══════════════════════════════════════════════════════════════
// FILTER TYPES
// ═══════════════════════════════════════════════════════════════

export interface FilterChip {
  key: string
  label: string
  onClear: () => void
}

// ═══════════════════════════════════════════════════════════════
// DATE FILTER TYPES (CHATZAI-025: Enhanced Date Filters)
// ═══════════════════════════════════════════════════════════════

export type DateFilterType = 'fecha_cirugia' | 'fecha_probable' | 'fecha_material' | 'fecha_envio'

export interface DateFilter {
  id: string
  type: DateFilterType
  from: string
  to: string
  label: string  // auto-generated from type + dates
}

export const DATE_FILTER_TYPE_LABELS: Record<DateFilterType, string> = {
  fecha_cirugia: 'Cirugía',
  fecha_probable: 'Probable',
  fecha_material: 'Material',
  fecha_envio: 'Envío',
} as const

// ═══════════════════════════════════════════════════════════════
// SEARCH CHIP TYPES (CHATZAI-025: Smart Search)
// ═══════════════════════════════════════════════════════════════

export type SearchChipField = "medico" | "paciente" | "cliente" | "institucion" | "general"

export interface SearchChip {
  id: string
  field: SearchChipField
  value: string        // contact ID for legacy chips, search text when match is "text"
  match?: "text"      // explicit text matching; omitted on legacy contact chips
  label: string        // display text e.g. "Médico: Dr. Sosa"
}

export interface CirugiasFilterState {
  search: string
  stateFilters: string[]
  classFilters: string[]
  clientFilters: string[]
  institutionFilters: string[]
  prepFilters: string[]
  docFilters: string[]
  factFilters: string[]
  coordinadorFilters: string[]
  urgenteFilter: boolean | null
  provinciaFilters: string[]
  vendedorFilters: string[]
  dateFrom: string
  dateTo: string
  kpiFilter: string | null
  // Extended search fields
  searchInMedico: boolean
  searchInInstitucion: boolean
  searchInCliente: boolean
  searchInPR: boolean
  searchInExpediente: boolean
  searchInNR: boolean
  searchInFV: boolean
}

// ═══════════════════════════════════════════════════════════════
// SORT TYPES
// ═══════════════════════════════════════════════════════════════

export interface SortState {
  sortKey: string
  sortDir: "asc" | "desc"
}

// ═══════════════════════════════════════════════════════════════
// KPI TYPES
// ═══════════════════════════════════════════════════════════════

export interface CirugiasKpis {
  totalActivas: number
  sinAutorizar: number
  autorizadas: number
  enPreparacion: number
  enTransito: number
  realizadas: number
  docIncompleta: number
  pendFacturar: number
}

// ═══════════════════════════════════════════════════════════════
// NEW SURGERY WIZARD TYPES
// ═══════════════════════════════════════════════════════════════

export interface NewSurgeryForm {
  patient: string
  surgeon: string
  institution: string
  institutionCity: string
  date: string
  time: string
  client: string
  classification: SurgeryClassification | ""
  provincia: string
  instrumentador: string
  vendedor: string
  coordinadorCx: string
  notes: string
  urgente: boolean
  localidad: string
  leyenda: string
  leyendaDestacada: boolean
  probableDate: string
  fechaEnvioMaterial: string
  referenciasAdministrativas: ReferenciaAdministrativa[]
  // CHATZAI-020: Contact references
  clientContactId?: string
  surgeonContactId?: string
  patientContactId?: string
  institutionContactId?: string
  // CHATZAI-025: Additional contact references
  vendedorContactId?: string
  instrumentadorContactId?: string
  coordinadorContactId?: string
}

// NOTE: obraSocial, financiador, and patientDni are NOT in the wizard form anymore.
// They still exist on the Surgery model for backward compat and other modules.
// patientDni can be populated from referenciasAdministrativas where tipo === "DNI".

export const EMPTY_NEW_FORM: NewSurgeryForm = {
  patient: "", surgeon: "", institution: "",
  institutionCity: "Buenos Aires", date: "", time: "",
  client: "", classification: "",
  provincia: "", instrumentador: "Sin asignar", vendedor: "Sin asignar", coordinadorCx: "Sin asignar",
  notes: "",
  urgente: false,
  localidad: "",
  leyenda: "",
  leyendaDestacada: false,
  probableDate: "",
  fechaEnvioMaterial: "",
  referenciasAdministrativas: [],
  // CHATZAI-025: Additional contact ID fields
  vendedorContactId: undefined,
  instrumentadorContactId: undefined,
  coordinadorContactId: undefined,
}

// ═══════════════════════════════════════════════════════════════
// DIALOG TYPES
// ═══════════════════════════════════════════════════════════════

export type NoteType = "General" | "Urgente" | "Logística" | "Facturación" | "Interna"
export type NotePriority = "Baja" | "Media" | "Alta"

// ═══════════════════════════════════════════════════════════════
// PENDIENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export interface PendientePrincipal {
  text: string
  color: string
}

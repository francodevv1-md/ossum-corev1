import type { Surgery, SurgeryState, PreparationState } from "@/types"

export type CoordinadorViewMode = "day" | "week" | "month"

export type IncidentFilterKey =
  | "fuera-plazo"
  | "poner-fecha"
  | "en-transito"
  | "sin-asignar"
  | "coordinadas"

export type CoordinadorModalTab = "gestion" | "seguimiento" | "adjuntos" | "comprobantes" | "reportes"

export interface CoordinadoresFilterState {
  search: string
  selectedCoordinators: string[]
  selectedStates: string[]
  selectedPreps: string[]
  soloIncidencias: boolean
  activeIncidentFilter: IncidentFilterKey | null
}

export interface IncidentMetric {
  key: IncidentFilterKey
  label: string
  count: number
  tone: "danger" | "warning" | "info" | "neutral" | "success"
}

export interface MonthDayCell {
  date: Date
  dateString: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  count: number
  alertCount: number
  loadLevel: "none" | "low" | "medium" | "high"
  surgeries: Surgery[]
}

export interface WeekDayGroup {
  date: Date
  dateString: string // YYYY-MM-DD
  dayName: string // Lunes, Martes...
  dayNumber: number
  formattedDate: string // 23 Sep
  isToday: boolean
  surgeries: Surgery[]
  alertCount: number
}

export interface SurgeryGestionFormData {
  date: string
  time: string
  fechaEnvioMaterial: string
  horaEnvio: string
  coordinadorCx: string
  state: SurgeryState
  preparationState: PreparationState
  materialAvailabilityDate: string
  materialTransport: string
  instrumentador: string
  urgente: boolean
  leyenda: string
  notes: string
  procedure?: string
  boxId?: string
  remitoId?: string
}


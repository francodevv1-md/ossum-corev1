import type { SurgeryState } from "@/types"

const STATE_ADVANCE_MAP: Partial<Record<SurgeryState, SurgeryState>> = {
  "Sin autorizar": "Pendiente",
  "Pendiente": "Autorizada",
  "En tránsito": "Realizada",
  "Realizada": "Finalizada",
  "Sin consumo": "Finalizada",
}

export const TERMINAL_STATES: ReadonlySet<SurgeryState> = new Set<SurgeryState>([
  "Suspendida",
  "Cancelada",
  "Finalizada",
])

export function getNextState(current: SurgeryState): SurgeryState | null {
  if (TERMINAL_STATES.has(current)) return null
  return STATE_ADVANCE_MAP[current] || null
}

export function runAutomations(
  changeStatus: (id: string, newState: SurgeryState) => void,
  surgeryId: string,
  currentState: SurgeryState
): boolean {
  if (TERMINAL_STATES.has(currentState)) return false
  const next = STATE_ADVANCE_MAP[currentState]
  if (!next) return false
  changeStatus(surgeryId, next)
  return true
}

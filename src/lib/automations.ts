import type { SurgeryState } from "@/types"

const STATE_ADVANCE_MAP: Record<string, SurgeryState> = {
  "Sin autorizar": "Pendiente",
  "Sin fecha": "Pendiente",
  "Pendiente": "Autorizada",
  "Autorizada": "En preparación",
  "En preparación": "En tránsito",
  "En tránsito": "Realizada",
  "Realizada": "Finalizada",
  "Sin consumo": "Finalizada",
}

export function getNextState(current: SurgeryState): SurgeryState | null {
  return (STATE_ADVANCE_MAP[current] as SurgeryState) || null
}

export function runAutomations(
  changeStatus: (id: string, newState: SurgeryState) => void,
  surgeryId: string,
  currentState: SurgeryState
): boolean {
  const next = getNextState(currentState)
  if (!next) return false
  changeStatus(surgeryId, next)
  return true
}

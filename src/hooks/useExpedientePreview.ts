/**
 * useExpedientePreview.ts
 * LEGACY — ya no se usa en la vista principal de Cirugías.
 * El preview lateral fijo fue eliminado (Paso 7).
 * Se conserva el archivo para no romper posibles imports externos.
 *
 * La lógica de expanded/list ahora se maneja directamente
 * en page.tsx con selection.panelState === "expanded".
 */

import type { PanelState } from "@/lib/cirugias.constants"

export interface ExpedientePreviewState {
  panelState: PanelState
  setPanelState: (state: PanelState) => void
  isExpanded: boolean
}

export function useExpedientePreview(
  panelState: PanelState,
  setPanelState: (state: PanelState) => void,
): ExpedientePreviewState {
  return {
    panelState,
    setPanelState,
    isExpanded: panelState === "expanded",
  }
}

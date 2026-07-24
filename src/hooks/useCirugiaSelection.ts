/**
 * useCirugiaSelection.ts
 * Hook para manejar la selección de cirugías y el estado del panel.
 * Simplificado: sin preview lateral.
 * - list: vista de tabla (selección visual de fila)
 * - expanded: vista completa del expediente
 */

import { useState, useCallback, useMemo, useEffect } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { PanelState } from "@/lib/cirugias.constants"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

export function useCirugiaSelection() {
  const store = useOrtoTrackStore()

  const [panelState, setPanelState] = useState<PanelState>("list")
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string | null>(null)
  const [expTab, setExpTab] = useState("ficha")

  // ── Derived data ──
  const selectedSurgery = selectedSurgeryId ? store.getSurgeryById(selectedSurgeryId) : null
  const selPresupuestos = selectedSurgeryId ? store.getPresupuestosBySurgeryId(selectedSurgeryId) : []
  const selComprobantes = selectedSurgeryId ? store.getComprobantesBySurgeryId(selectedSurgeryId) : []
  const selRemitos = selectedSurgeryId ? store.getRemitosBySurgeryId(selectedSurgeryId) : []
  const selConsumo = selectedSurgeryId ? store.getConsumoBySurgeryId(selectedSurgeryId) : undefined
  const selNotes = selectedSurgeryId ? store.getNotesBySurgeryId(selectedSurgeryId) : []
  const selHistory = selectedSurgeryId ? store.getHistoryBySurgeryId(selectedSurgeryId) : []
  const selDocChecklist = selectedSurgeryId ? store.getDocumentChecklistBySurgeryId(selectedSurgeryId) : undefined
  const selLogistics = selectedSurgeryId ? store.getLogisticsBySurgeryId(selectedSurgeryId) : undefined
  const selDocStatus = selectedSurgeryId ? store.getDocStatus(selectedSurgeryId) : "Incompleta"
  const selMaterialTransito = selectedSurgeryId ? store.getMaterialTransitoBySurgeryId(selectedSurgeryId) : []
  const selInstrumentadorSurgery = selectedSurgeryId ? store.getInstrumentadorSurgeryBySurgeryId(selectedSurgeryId) : undefined
  const selBox = selectedSurgeryId ? store.getBoxBySurgeryId(selectedSurgeryId) : undefined

  // ── V2: Resumen de cobranza ──
  const selResumenCobranza: ResumenCobranzaSurgery = useMemo(
    () => selectedSurgeryId ? store.getResumenCobranzaBySurgeryId(selectedSurgeryId) : { totalFacturado: 0, totalCobrado: 0, saldoPendiente: 0, facturas: [] },
    [selectedSurgeryId, store]
  )

  useEffect(() => {
    if (!selectedSurgeryId) return
    if (store.getSurgeryById(selectedSurgeryId)) return

    setSelectedSurgeryId(null)
    setPanelState("list")
  }, [selectedSurgeryId, store, store.surgeries])

  // ── Click on row: just select (visual highlight), no panel ──
  const selectSurgery = useCallback((id: string) => {
    setSelectedSurgeryId(id)
  }, [])

  // ── Deselect: clear selection ──
  const deselectSurgery = useCallback(() => {
    setSelectedSurgeryId(null)
  }, [])

  // ── Open full expediente view ──
  const openExpediente = useCallback((id: string) => {
    setSelectedSurgeryId(id)
    setPanelState("expanded")
    setExpTab("ficha")
  }, [])

  // ── Close expediente, back to table ──
  const closeExpediente = useCallback(() => {
    setPanelState("list")
  }, [])

  return {
    // State
    panelState, setPanelState,
    selectedSurgeryId, setSelectedSurgeryId,
    expTab, setExpTab,
    // Derived
    selectedSurgery,
    selPresupuestos,
    selComprobantes,
    selRemitos,
    selConsumo,
    selNotes,
    selHistory,
    selDocChecklist,
    selLogistics,
    selDocStatus,
    selMaterialTransito,
    selInstrumentadorSurgery,
    selBox,
    selResumenCobranza, // V2 ResumenCobranzaSurgery
    // Actions
    selectSurgery,
    deselectSurgery,
    openExpediente,
    closeExpediente,
  }
}

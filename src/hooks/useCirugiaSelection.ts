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
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { toLegacyPresupuestoProjection } from "@/lib/api/presupuestos"

export function useCirugiaSelection() {
  const store = useOrtoTrackStore()

  const [panelState, setPanelState] = useState<PanelState>("list")
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string | null>(null)
  const [expTab, setExpTab] = useState("ficha")

  // ── Derived data ──
  const selectedSurgery = selectedSurgeryId ? store.getSurgeryById(selectedSurgeryId) : null
  const presupuestoAuthority = usePresupuestos(
    { surgeryId: selectedSurgery?.backendId ?? selectedSurgery?.id, take: 100 },
    Boolean(selectedSurgery),
  )
  const selPresupuestos = useMemo(
    () => presupuestoAuthority.presupuestos.map(toLegacyPresupuestoProjection),
    [presupuestoAuthority.presupuestos],
  )
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

    // The external store removed the selected entity; clear the now-invalid UI selection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

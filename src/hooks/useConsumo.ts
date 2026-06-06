"use client"

import { useCallback, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { canValidateConsumo } from "@/lib/consumoValidation"
import type { Consumo, ConsumoItem, ValidationIssue } from "@/types"

export function useConsumo(surgeryId: string) {
  const store = useOrtoTrackStore()

  const consumo = useMemo(
    () => store.getConsumoBySurgeryId(surgeryId),
    [store, surgeryId]
  )

  const remitos = useMemo(
    () => store.getRemitosBySurgeryId(surgeryId),
    [store, surgeryId]
  )

  const presupuestoVigente = useMemo(
    () => store.getPresupuestoVigenteBySurgeryId(surgeryId),
    [store, surgeryId]
  )

  const validationIssues: ValidationIssue[] = useMemo(
    () => consumo ? canValidateConsumo(consumo, remitos).issues : [],
    [consumo, remitos]
  )

  const canValidate = useMemo(() => {
    if (!consumo || consumo.state !== "Pendiente") return false
    return canValidateConsumo(consumo, remitos).allowed
  }, [consumo, remitos])

  const canEdit = useMemo(() => consumo?.state === "Pendiente", [consumo])

  const hasValidationIssues = useMemo(
    () => validationIssues.filter((i) => i.severity === "error").length > 0,
    [validationIssues]
  )

  const isFromRemito = consumo?.origen === "remito"
  const isManual = consumo?.origen === "manual"
  const hasPresupuesto = !!presupuestoVigente

  const faltantes = useMemo(() => {
    if (!consumo || !remitos.length) return []
    const sentMap = new Map<string, number>()
    for (const r of remitos) {
      for (const item of r.items) {
        const prev = sentMap.get(item.stockItemId) ?? 0
        sentMap.set(item.stockItemId, prev + item.sentQuantity)
      }
    }
    return consumo.items
      .filter((item) => {
        const sent = sentMap.get(item.stockItemId) ?? 0
        return sent > item.consumed + item.returned
      })
      .map((item) => ({
        stockItemId: item.stockItemId,
        name: item.name,
        sent: sentMap.get(item.stockItemId) ?? 0,
        consumed: item.consumed,
        returned: item.returned,
        difference: (sentMap.get(item.stockItemId) ?? 0) - item.consumed - item.returned,
      }))
  }, [consumo, remitos])

  // Actions
  const createFromRemito = useCallback(
    (remitoId: string): Consumo => {
      return store.createConsumptionFromDeliveryNote(remitoId)
    },
    [store]
  )

  const createManual = useCallback(
    (items: ConsumoItem[], justificacion: string): Consumo => {
      return store.createConsumoManual(surgeryId, items, justificacion)
    },
    [store, surgeryId]
  )

  const updateItem = useCallback(
    (stockItemId: string, updates: Partial<ConsumoItem>) => {
      if (!consumo) return
      store.updateConsumoItem(consumo.id, stockItemId, updates)
    },
    [store, consumo]
  )

  const saveEdits = useCallback(
    (edits: Record<string, { consumed: number; returned: number }>) => {
      if (!consumo) return
      for (const [stockItemId, values] of Object.entries(edits)) {
        store.updateConsumoItem(consumo.id, stockItemId, values)
      }
    },
    [store, consumo]
  )

  const validate = useCallback((): { success: boolean; issues?: ValidationIssue[] } => {
    if (!consumo) return { success: false, issues: [] }
    const result = canValidateConsumo(consumo, remitos)
    if (!result.allowed) return { success: false, issues: result.issues }
    store.validateConsumption(consumo.id)
    return { success: true }
  }, [store, consumo, remitos])

  return {
    consumo,
    consumoState: consumo?.state,
    presupuestoVigente,
    validationIssues,
    remitos,
    // Actions
    createFromRemito,
    createManual,
    updateItem,
    saveEdits,
    validate,
    // Helpers
    canValidate,
    canEdit,
    hasValidationIssues,
    isFromRemito,
    isManual,
    hasPresupuesto,
    faltantes,
  }
}

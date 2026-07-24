"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import {
  createRemito,
  emitirRemito,
  fetchRemito,
  fetchRemitos,
  registrarRemitoDevolucion,
  updateRemitoDraft,
  updateRemitoState,
  type CreateRemitoPayload,
  type ListRemitosParams,
  type RemitoApiRow,
  type RemitoState,
  type UpdateRemitoDraftPayload,
} from "@/lib/api/remitos"

export function useRemitos(filters?: ListRemitosParams) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const [remitos, setRemitos] = useState<RemitoApiRow[]>([])
  const [selectedRemito, setSelectedRemito] = useState<RemitoApiRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const companyId = activeCompany?.id
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters])

  const refresh = useCallback(async () => {
    if (isLoading || (isAuthenticated && currentUserLoading)) {
      setLoading(false)
      setReady(false)
      setError(null)
      return
    }

    if (!companyId) {
      setLoading(false)
      setReady(true)
      setRemitos([])
      setSelectedRemito(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchRemitos(companyId, filters)
      setRemitos(data)
      setSelectedRemito((current) => {
        if (!current) return data[0] ?? null
        return data.find((remito) => remito.id === current.id) ?? data[0] ?? null
      })
      setReady(true)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudieron cargar los remitos"
      setError(message)
      setRemitos([])
      setSelectedRemito(null)
      setReady(true)
    } finally {
      setLoading(false)
    }
  }, [companyId, currentUserLoading, filters, isAuthenticated, isLoading])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, filtersKey])

  const selectRemito = useCallback(async (remito: RemitoApiRow) => {
    if (!companyId) return
    setSelectedRemito(remito)
    setError(null)
    try {
      const detail = await fetchRemito(companyId, remito.id)
      setSelectedRemito(detail)
      setRemitos((current) => current.map((row) => (row.id === detail.id ? detail : row)))
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo cargar el detalle del remito"
      setError(message)
    }
  }, [companyId])

  const runMutation = useCallback(async (remitoId: string, action: () => Promise<RemitoApiRow>) => {
    setMutatingId(remitoId)
    setError(null)
    try {
      const updated = await action()
      // Some mutation routes return a compact Remito shape. Refetch the list/detail
      // before exposing the selected row again so the page always renders `items`.
      await refresh()
      return updated
    } catch (err) {
      const message = err instanceof ApiClientError && err.status === 409 && err.code === "remito_update_conflict"
        ? "El remito fue actualizado por otro usuario. Actualizá la vista antes de guardar para no perder cambios."
        : err instanceof ApiClientError ? err.message : "No se pudo actualizar el remito"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [refresh])

  const emit = useCallback((remitoId: string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(remitoId, () => emitirRemito(companyId, remitoId))
  }, [companyId, runMutation])

  const transition = useCallback((remitoId: string, state: RemitoState | string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(remitoId, () => updateRemitoState(companyId, remitoId, state))
  }, [companyId, runMutation])

  const devolucion = useCallback((remitoId: string, items: Array<{ itemId: string; returnedQuantity: string | number }>) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(remitoId, () => registrarRemitoDevolucion(companyId, remitoId, items))
  }, [companyId, runMutation])

  const createDraft = useCallback(async (payload: CreateRemitoPayload) => {
    if (!companyId) throw new Error("No hay empresa activa")
    setMutatingId("__create__")
    setError(null)
    try {
      const created = await createRemito(companyId, payload)
      await refresh()
      const detail = await fetchRemito(companyId, created.id)
      setSelectedRemito(detail)
      setRemitos((current) => [detail, ...current.filter((row) => row.id !== detail.id)])
      return detail
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo crear el remito"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [companyId, refresh])

  const updateDraft = useCallback((remitoId: string, payload: UpdateRemitoDraftPayload) => {
    if (!companyId) throw new Error("No hay empresa activa")
    const expectedUpdatedAt = payload.expectedUpdatedAt ?? remitos.find((remito) => remito.id === remitoId)?.updatedAt ?? selectedRemito?.updatedAt
    return runMutation(remitoId, () => updateRemitoDraft(companyId, remitoId, { ...payload, expectedUpdatedAt }))
  }, [companyId, remitos, runMutation, selectedRemito?.updatedAt])

  return {
    companyId,
    remitos,
    selectedRemito,
    setSelectedRemito,
    loading,
    ready,
    error,
    mutatingId,
    refresh,
    selectRemito,
    emit,
    transition,
    devolucion,
    createDraft,
    updateDraft,
    blocked: ready && !companyId,
  }
}

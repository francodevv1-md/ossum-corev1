"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import {
  createConsumo,
  deleteConsumo,
  emitirConsumo,
  fetchConsumo,
  fetchConsumos,
  updateConsumoState,
  validateConsumo,
  type ConsumoApiRow,
  type ConsumoState,
  type CreateConsumoPayload,
  type ListConsumosParams,
} from "@/lib/api/consumos"

export function useConsumos(filters?: ListConsumosParams) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const [consumos, setConsumos] = useState<ConsumoApiRow[]>([])
  const [selectedConsumo, setSelectedConsumo] = useState<ConsumoApiRow | null>(null)
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
      setConsumos([])
      setSelectedConsumo(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchConsumos(companyId, filters)
      setConsumos(data)
      setSelectedConsumo((current) => {
        if (!current) return data[0] ?? null
        return data.find((consumo) => consumo.id === current.id) ?? data[0] ?? null
      })
      setReady(true)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudieron cargar los consumos"
      setError(message)
      setConsumos([])
      setSelectedConsumo(null)
      setReady(true)
    } finally {
      setLoading(false)
    }
  }, [companyId, currentUserLoading, filters, isAuthenticated, isLoading])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, filtersKey])

  const selectConsumo = useCallback(async (consumo: ConsumoApiRow) => {
    if (!companyId) return
    setSelectedConsumo(consumo)
    setError(null)
    try {
      const detail = await fetchConsumo(companyId, consumo.id)
      setSelectedConsumo(detail)
      setConsumos((current) => current.map((row) => (row.id === detail.id ? detail : row)))
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo cargar el detalle del consumo"
      setError(message)
    }
  }, [companyId])

  const runMutation = useCallback(async (consumoId: string, action: () => Promise<ConsumoApiRow>) => {
    setMutatingId(consumoId)
    setError(null)
    try {
      const updated = await action()
      // Mutation routes may return compact rows without items. Refetch before UI consumption.
      await refresh()
      return updated
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo actualizar el consumo"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [refresh])

  const transition = useCallback((consumoId: string, newState: ConsumoState | string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(consumoId, () => updateConsumoState(companyId, consumoId, newState))
  }, [companyId, runMutation])

  const validate = useCallback((consumoId: string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(consumoId, () => validateConsumo(companyId, consumoId))
  }, [companyId, runMutation])

  const emit = useCallback((consumoId: string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(consumoId, () => emitirConsumo(companyId, consumoId))
  }, [companyId, runMutation])

  const createDraft = useCallback(async (payload: CreateConsumoPayload) => {
    if (!companyId) throw new Error("No hay empresa activa")
    setMutatingId("__create__")
    setError(null)
    try {
      const created = await createConsumo(companyId, payload)
      await refresh()
      const detail = await fetchConsumo(companyId, created.id)
      setSelectedConsumo(detail)
      setConsumos((current) => [detail, ...current.filter((row) => row.id !== detail.id)])
      return detail
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo crear el consumo"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [companyId, refresh])

  const removeDraft = useCallback(async (consumoId: string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    setMutatingId(consumoId)
    setError(null)
    try {
      const deleted = await deleteConsumo(companyId, consumoId)
      await refresh()
      setSelectedConsumo((current) => (current?.id === consumoId ? null : current))
      return deleted
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo eliminar el consumo"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [companyId, refresh])

  return {
    companyId,
    consumos,
    selectedConsumo,
    setSelectedConsumo,
    loading,
    ready,
    error,
    mutatingId,
    refresh,
    selectConsumo,
    transition,
    emit,
    validate,
    createDraft,
    removeDraft,
    blocked: ready && !companyId,
  }
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import {
  confirmDevolucion,
  createDevolucion,
  deleteDevolucion,
  fetchDevolucion,
  fetchDevoluciones,
  updateDevolucionState,
  type CreateDevolucionPayload,
  type DevolucionApiRow,
  type DevolucionState,
  type ListDevolucionesParams,
} from "@/lib/api/devoluciones"

export function useDevoluciones(filters?: ListDevolucionesParams) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const [devoluciones, setDevoluciones] = useState<DevolucionApiRow[]>([])
  const [selectedDevolucion, setSelectedDevolucion] = useState<DevolucionApiRow | null>(null)
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
      setDevoluciones([])
      setSelectedDevolucion(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchDevoluciones(companyId, filters)
      setDevoluciones(data)
      setSelectedDevolucion((current) => {
        if (!current) return data[0] ?? null
        return data.find((devolucion) => devolucion.id === current.id) ?? data[0] ?? null
      })
      setReady(true)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudieron cargar las devoluciones"
      setError(message)
      setDevoluciones([])
      setSelectedDevolucion(null)
      setReady(true)
    } finally {
      setLoading(false)
    }
  }, [companyId, currentUserLoading, filters, isAuthenticated, isLoading])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, filtersKey])

  const selectDevolucion = useCallback(async (devolucion: DevolucionApiRow) => {
    if (!companyId) return
    setSelectedDevolucion(devolucion)
    setError(null)
    try {
      const detail = await fetchDevolucion(companyId, devolucion.id)
      setSelectedDevolucion(detail)
      setDevoluciones((current) => current.map((row) => (row.id === detail.id ? detail : row)))
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo cargar el detalle de la devolución"
      setError(message)
    }
  }, [companyId])

  const runMutation = useCallback(async (devolucionId: string, action: () => Promise<DevolucionApiRow>) => {
    setMutatingId(devolucionId)
    setError(null)
    try {
      const updated = await action()
      // Mutation routes may return compact rows without items. Refetch before UI consumption.
      await refresh()
      return updated
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo actualizar la devolución"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [refresh])

  const transition = useCallback((devolucionId: string, newState: DevolucionState | string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(devolucionId, () => updateDevolucionState(companyId, devolucionId, newState))
  }, [companyId, runMutation])

  const confirm = useCallback((devolucionId: string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(devolucionId, () => confirmDevolucion(companyId, devolucionId))
  }, [companyId, runMutation])

  const createDraft = useCallback(async (payload: CreateDevolucionPayload) => {
    if (!companyId) throw new Error("No hay empresa activa")
    setMutatingId("__create__")
    setError(null)
    try {
      const created = await createDevolucion(companyId, payload)
      await refresh()
      const detail = await fetchDevolucion(companyId, created.id)
      setSelectedDevolucion(detail)
      setDevoluciones((current) => [detail, ...current.filter((row) => row.id !== detail.id)])
      return detail
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo crear la devolución"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [companyId, refresh])

  const removeDraft = useCallback(async (devolucionId: string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    setMutatingId(devolucionId)
    setError(null)
    try {
      const deleted = await deleteDevolucion(companyId, devolucionId)
      await refresh()
      setSelectedDevolucion((current) => (current?.id === devolucionId ? null : current))
      return deleted
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo eliminar la devolución"
      setError(message)
      throw err
    } finally {
      setMutatingId(null)
    }
  }, [companyId, refresh])

  return {
    companyId,
    devoluciones,
    selectedDevolucion,
    setSelectedDevolucion,
    loading,
    ready,
    error,
    mutatingId,
    refresh,
    selectDevolucion,
    transition,
    confirm,
    validate: confirm,
    createDraft,
    removeDraft,
    blocked: ready && !companyId,
  }
}

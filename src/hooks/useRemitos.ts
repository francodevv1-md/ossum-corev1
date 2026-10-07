"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { isTechnicalId } from "@/lib/api/ids"
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
  const { activeCompany, currentUser, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const [remitos, setRemitos] = useState<RemitoApiRow[]>([])
  const [selectedRemito, setSelectedRemito] = useState<RemitoApiRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const companyId = activeCompany?.id
  const { state, origin, salidaReason, branchId, surgeryId, take, skip } = filters ?? {}
  // Defence in depth: callers that pass a non-technical id (visible number, store id)
  // must not send it to the backend. R9 closed the TabPaneSeguimiento/CaseDetail
  // fallback, but this hook still trusts the input.
  const safeSurgeryId = isTechnicalId(surgeryId) ? surgeryId : undefined
  const stableFilters = useMemo(() => ({ state, origin, salidaReason, branchId, surgeryId: safeSurgeryId, take, skip }),
    [state, origin, salidaReason, branchId, safeSurgeryId, take, skip])
  const scopeKey = JSON.stringify([companyId, currentUser?.id, isLoading, currentUserLoading, isAuthenticated, stableFilters])
  // Object identity invalidates old requests even after company/filter A -> B -> A.
  const scopeRef = useRef({ key: scopeKey, list: 0, detail: 0, initialized: false })
  const returnCommand = useRef<{ scope: typeof scopeRef.current; content: string; key: string; pending?: Promise<RemitoApiRow> } | null>(null)
  if (scopeRef.current.key !== scopeKey) scopeRef.current = { key: scopeKey, list: 0, detail: 0, initialized: false }
  const [dataScope, setDataScope] = useState(scopeRef.current)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const refresh = useCallback(async () => {
    const scope = scopeRef.current
    if (scope.key !== scopeKey || !mounted.current) return
    const request = ++scope.list
    const selection = scope.detail
    const isCurrent = () => mounted.current && scopeRef.current === scope && scope.list === request
    if (!scope.initialized) {
      scope.initialized = true
      setRemitos([])
      setSelectedRemito(null)
      setReady(false)
      setMutatingId(null)
      setDataScope(scope)
    }
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
      const data = await fetchRemitos(companyId, stableFilters)
      if (!isCurrent()) return
      setRemitos(data)
      if (scope.detail === selection) setSelectedRemito((current) => {
        if (!current) return data[0] ?? null
        return data.find((remito) => remito.id === current.id) ?? data[0] ?? null
      })
      setReady(true)
    } catch (err) {
      if (!isCurrent()) return
      const message = err instanceof ApiClientError ? err.message : "No se pudieron cargar los remitos"
      setError(message)
      setRemitos([])
      setSelectedRemito(null)
      setReady(true)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [companyId, currentUserLoading, stableFilters, isAuthenticated, isLoading, scopeKey])

  useEffect(() => {
    void refresh()
    const scope = scopeRef.current
    return () => { scope.list += 1; scope.detail += 1 }
  }, [refresh])

  const selectRemito = useCallback(async (remito: RemitoApiRow) => {
    const scope = scopeRef.current
    if (!companyId || !mounted.current || scope.key !== scopeKey || isLoading || (isAuthenticated && currentUserLoading)) return
    const request = ++scope.detail
    const isCurrent = () => mounted.current && scopeRef.current === scope && scope.detail === request
    setSelectedRemito(remito)
    setError(null)
    try {
      const detail = await fetchRemito(companyId, remito.id)
      if (!isCurrent()) return
      setSelectedRemito(detail)
      setRemitos((current) => current.map((row) => (row.id === detail.id ? detail : row)))
    } catch (err) {
      if (!isCurrent()) return
      const message = err instanceof ApiClientError ? err.message : "No se pudo cargar el detalle del remito"
      setError(message)
    }
  }, [companyId, scopeKey, isLoading, isAuthenticated, currentUserLoading])

  const runMutation = useCallback(async (remitoId: string, action: () => Promise<RemitoApiRow>) => {
    const scope = scopeRef.current
    if (scope.key !== scopeKey || !mounted.current) throw new Error("La vista de remitos cambió. Actualizá antes de continuar.")
    const isCurrent = () => mounted.current && scopeRef.current === scope
    // Reads started before a write must never replace the refreshed document.
    scope.list += 1
    scope.detail += 1
    setLoading(false)
    setMutatingId(remitoId)
    setError(null)
    try {
      const updated = await action()
      // Refresh the authoritative list instead of reconstructing filtered rows locally.
      if (isCurrent()) await refresh()
      return updated
    } catch (err) {
      if (!isCurrent()) throw err
      const message = err instanceof ApiClientError && err.status === 409 && err.code === "remito_update_conflict"
        ? "El remito fue actualizado por otro usuario. Actualizá la vista antes de guardar para no perder cambios."
        : err instanceof ApiClientError ? err.message : "No se pudo actualizar el remito"
      setError(message)
      throw err
    } finally {
      if (isCurrent()) setMutatingId(null)
    }
  }, [refresh, scopeKey])

  const emit = useCallback((remitoId: string, intent?: import("@/lib/validators/remito").RemitoEmitInput) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(remitoId, () => emitirRemito(companyId, remitoId, intent))
  }, [companyId, runMutation])

  const transition = useCallback((remitoId: string, state: RemitoState | string) => {
    if (!companyId) throw new Error("No hay empresa activa")
    return runMutation(remitoId, () => updateRemitoState(companyId, remitoId, state))
  }, [companyId, runMutation])

  const devolucion = useCallback((remitoId: string, items: Array<{ itemId: string; returnedQuantity: string | number }>) => {
    if (!companyId) throw new Error("No hay empresa activa")
    const scope = scopeRef.current
    if (scope.key !== scopeKey || !mounted.current) return Promise.reject(new Error("La vista de remitos cambió. Actualizá antes de continuar."))
    const content = JSON.stringify([remitoId, items])
    if (returnCommand.current?.scope !== scope || returnCommand.current.content !== content) {
      returnCommand.current = { scope, content, key: crypto.randomUUID() }
    }
    const command = returnCommand.current
    if (command.pending) return command.pending
    command.pending = runMutation(remitoId, () => registrarRemitoDevolucion(companyId, remitoId, items, command.key)).then((updated) => {
      if (returnCommand.current === command) returnCommand.current = null
      return updated
    }, (error: unknown) => {
      command.pending = undefined
      throw error
    })
    return command.pending
  }, [companyId, runMutation, scopeKey])

  const createDraft = useCallback(async (payload: CreateRemitoPayload) => {
    if (!companyId) throw new Error("No hay empresa activa")
    const scope = scopeRef.current
    if (scope.key !== scopeKey || !mounted.current) throw new Error("La vista de remitos cambió. Actualizá antes de continuar.")
    const isCurrent = () => mounted.current && scopeRef.current === scope
    scope.list += 1
    scope.detail += 1
    setLoading(false)
    setMutatingId("__create__")
    setError(null)
    try {
      const created = await createRemito(companyId, payload)
      if (!isCurrent()) return created
      await refresh()
      if (!isCurrent()) return created
      const selection = scope.detail
      const detail = await fetchRemito(companyId, created.id)
      if (isCurrent()) {
        if (scope.detail === selection) setSelectedRemito(detail)
        setRemitos((current) => [detail, ...current.filter((row) => row.id !== detail.id)])
      }
      return detail
    } catch (err) {
      if (!isCurrent()) throw err
      const message = err instanceof ApiClientError ? err.message : "No se pudo crear el remito"
      setError(message)
      throw err
    } finally {
      if (isCurrent()) setMutatingId(null)
    }
  }, [companyId, refresh, scopeKey])

  const updateDraft = useCallback((remitoId: string, payload: UpdateRemitoDraftPayload) => {
    if (!companyId) throw new Error("No hay empresa activa")
    const expectedUpdatedAt = payload.expectedUpdatedAt ?? remitos.find((remito) => remito.id === remitoId)?.updatedAt ?? selectedRemito?.updatedAt
    return runMutation(remitoId, () => updateRemitoDraft(companyId, remitoId, { ...payload, expectedUpdatedAt }))
  }, [companyId, remitos, runMutation, selectedRemito?.updatedAt])

  const visible = dataScope === scopeRef.current
  return {
    companyId,
    remitos: visible ? remitos : [],
    selectedRemito: visible ? selectedRemito : null,
    setSelectedRemito,
    loading: visible ? loading : Boolean(companyId),
    ready: visible && ready,
    error: visible ? error : null,
    mutatingId: visible ? mutatingId : null,
    refresh,
    selectRemito,
    emit,
    transition,
    devolucion,
    createDraft,
    updateDraft,
    blocked: visible && ready && !companyId,
  }
}

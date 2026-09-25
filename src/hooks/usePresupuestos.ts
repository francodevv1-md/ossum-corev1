"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import {
  createPresupuesto,
  createPresupuestoRevision,
  deletePresupuestoDraft,
  emitPresupuesto,
  fetchPresupuestos,
  replacePresupuestoDraft,
  transitionPresupuesto,
  type CreatePresupuestoPayload,
  type ListPresupuestosParams,
  type PresupuestoApiRow,
  type ReplacePresupuestoPayload,
} from "@/lib/api/presupuestos"

export function usePresupuestos(filters?: ListPresupuestosParams, enabled = true) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const filtersKey = JSON.stringify(filters ?? {})
  const scopeKey = `${companyId ?? ""}:${enabled}:${filtersKey}`
  const [storedPresupuestos, setStoredPresupuestos] = useState<{ scopeKey: string; rows: PresupuestoApiRow[] }>({ scopeKey, rows: [] })
  const presupuestos = useMemo(
    () => storedPresupuestos.scopeKey === scopeKey ? storedPresupuestos.rows : [],
    [scopeKey, storedPresupuestos],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const refreshRequestRef = useRef(0)
  const mutationRequestRef = useRef(0)
  const scope = useMemo(() => ({ key: scopeKey, companyId }), [companyId, scopeKey])
  const activeScopeRef = useRef(scope)

  useLayoutEffect(() => {
    activeScopeRef.current = scope
    refreshRequestRef.current += 1
  }, [scope])

  const refresh = useCallback(async () => {
    if (activeScopeRef.current !== scope) return
    const requestId = ++refreshRequestRef.current
    if (!companyId || !enabled) {
      setStoredPresupuestos({ scopeKey, rows: [] })
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchPresupuestos(companyId, filters)
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) setStoredPresupuestos({ scopeKey, rows })
    } catch (cause) {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) {
        setStoredPresupuestos({ scopeKey, rows: [] })
        setError(cause instanceof ApiClientError ? cause.message : "No se pudieron cargar los presupuestos")
      }
    } finally {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, enabled, filtersKey, scope])

  useEffect(() => {
    // Fetching is the external synchronization this effect owns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return () => { refreshRequestRef.current += 1 }
  }, [refresh])

  const mutate = useCallback(async <T,>(id: string, mutationCompanyId: string, action: () => Promise<T>) => {
    if (activeScopeRef.current !== scope || scope.companyId !== mutationCompanyId) throw new Error("La empresa activa cambió")
    const mutationId = ++mutationRequestRef.current
    setMutatingId(id)
    setError(null)
    try {
      const result = await action()
      if (activeScopeRef.current === scope) await refresh()
      return result
    } catch (cause) {
      if (activeScopeRef.current === scope) {
        setError(cause instanceof ApiClientError ? cause.message : "No se pudo actualizar el presupuesto")
      }
      throw cause
    } finally {
      if (mutationId === mutationRequestRef.current) setMutatingId(null)
    }
  }, [refresh, scope])

  const requireCompany = useCallback(() => {
    if (!companyId) throw new Error("No hay empresa activa")
    return companyId
  }, [companyId])

  return {
    companyId,
    presupuestos,
    current: useMemo(() => presupuestos.find((item) => item.slot === "CURRENT") ?? null, [presupuestos]),
    draft: useMemo(() => presupuestos.find((item) => item.slot === "DRAFT") ?? null, [presupuestos]),
    history: useMemo(() => presupuestos.filter((item) => item.slot === "HISTORY"), [presupuestos]),
    loading,
    error,
    mutatingId,
    refresh,
    create: (payload: CreatePresupuestoPayload) => { const scopeCompanyId = requireCompany(); return mutate("__create__", scopeCompanyId, () => createPresupuesto(scopeCompanyId, payload)) },
    replaceDraft: (id: string, payload: ReplacePresupuestoPayload) => { const scopeCompanyId = requireCompany(); return mutate(id, scopeCompanyId, () => replacePresupuestoDraft(scopeCompanyId, id, payload)) },
    deleteDraft: (id: string, revision: number) => { const scopeCompanyId = requireCompany(); return mutate(id, scopeCompanyId, () => deletePresupuestoDraft(scopeCompanyId, id, revision)) },
    revise: (id: string, revision: number) => { const scopeCompanyId = requireCompany(); return mutate(id, scopeCompanyId, () => createPresupuestoRevision(scopeCompanyId, id, revision)) },
    emit: (id: string, revision: number) => { const scopeCompanyId = requireCompany(); return mutate(id, scopeCompanyId, () => emitPresupuesto(scopeCompanyId, id, revision)) },
    transition: (id: string, command: "approve" | "reject" | "expire" | "annul", revision: number) => { const scopeCompanyId = requireCompany(); return mutate(id, scopeCompanyId, () => transitionPresupuesto(scopeCompanyId, id, command, revision)) },
  }
}

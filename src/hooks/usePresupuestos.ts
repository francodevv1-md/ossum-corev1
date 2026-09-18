"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  createPresupuesto, createPresupuestoRevision, deletePresupuestoDraft, emitPresupuesto,
  fetchPresupuestos, replacePresupuestoDraft, transitionPresupuesto,
  type CreatePresupuestoPayload, type ListPresupuestosParams, type PresupuestoApiRow, type ReplacePresupuestoPayload,
} from "@/lib/api/presupuestos"

export function usePresupuestos(filters?: ListPresupuestosParams, enabled = true) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const filtersKey = JSON.stringify(filters ?? {})
  const scopeKey = `${companyId ?? ""}:${enabled}:${filtersKey}`
  const scope = useMemo(() => ({ key: scopeKey, companyId }), [companyId, scopeKey])
  const activeScopeRef = useRef(scope)
  const refreshRequestRef = useRef(0)
  const inFlightRef = useRef<object | null>(null)
  const [stored, setStored] = useState<{ scopeKey: string; rows: PresupuestoApiRow[] }>({ scopeKey, rows: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const presupuestos = useMemo(() => stored.scopeKey === scopeKey ? stored.rows : [], [stored, scopeKey])

  useLayoutEffect(() => {
    activeScopeRef.current = scope
    refreshRequestRef.current += 1
    inFlightRef.current = null
    // A new tenant scope cannot inherit another tenant's errors or busy state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    setRefreshWarning(null)
    setMutatingId(null)
    return () => { activeScopeRef.current = { key: "unmounted", companyId: undefined } }
  }, [scope])

  const refresh = useCallback(async () => {
    if (activeScopeRef.current !== scope) return false
    const requestId = ++refreshRequestRef.current
    if (!companyId || !enabled) {
      setStored({ scopeKey, rows: [] })
      setLoading(false)
      return true
    }
    setLoading(true)
    setError(null)
    try {
      const rows: PresupuestoApiRow[] = []
      const take = Math.max(1, filters?.take ?? 100)
      for (let skip = filters?.skip ?? 0; ; skip += take) {
        const page = await fetchPresupuestos(companyId, { ...filters, take, skip })
        if (requestId !== refreshRequestRef.current || activeScopeRef.current !== scope) return false
        rows.push(...page)
        if (page.length < take) break
      }
      setStored({ scopeKey, rows })
      setRefreshWarning(null)
      return true
    } catch (cause) {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) {
        setStored({ scopeKey, rows: [] })
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar los presupuestos")
      }
      return false
    } finally {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, enabled, filtersKey, scope])

  useEffect(() => {
    // Fetching is the external synchronization this effect owns (source hook pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return () => { refreshRequestRef.current += 1 }
  }, [refresh])

  const mutate = useCallback(async <T,>(id: string, action: (companyId: string) => Promise<T>) => {
    if (!companyId || activeScopeRef.current !== scope || !enabled) throw new Error("La empresa activa cambió")
    if (inFlightRef.current) throw new Error("Hay una operación en curso")
    const token = {}
    inFlightRef.current = token
    setMutatingId(id)
    setError(null)
    try {
      const result = await action(companyId)
      // A failed GET must never turn an accepted POST into a retryable failed save.
      if (activeScopeRef.current === scope && !await refresh() && activeScopeRef.current === scope) {
        setRefreshWarning("Operación guardada. No se pudo actualizar la lista; reintentá Actualizar, no la operación.")
      }
      return result
    } catch (cause) {
      if (activeScopeRef.current === scope) setError(cause instanceof Error ? cause.message : "No se pudo actualizar el presupuesto")
      throw cause
    } finally {
      if (inFlightRef.current === token) {
        inFlightRef.current = null
        setMutatingId(null)
      }
    }
  }, [companyId, enabled, refresh, scope])

  return {
    companyId, presupuestos, loading, error, refreshWarning, mutatingId, refresh,
    current: presupuestos.find((item) => item.slot === "CURRENT") ?? null,
    draft: presupuestos.find((item) => item.slot === "DRAFT") ?? null,
    history: presupuestos.filter((item) => item.slot === "HISTORY"),
    create: (payload: CreatePresupuestoPayload) => mutate("__create__", (id) => createPresupuesto(id, payload)),
    replaceDraft: (id: string, payload: ReplacePresupuestoPayload) => mutate(id, (company) => replacePresupuestoDraft(company, id, payload)),
    deleteDraft: (id: string, revision: number) => mutate(id, (company) => deletePresupuestoDraft(company, id, revision)),
    revise: (id: string, revision: number) => mutate(id, (company) => createPresupuestoRevision(company, id, revision)),
    emit: (id: string, revision: number) => mutate(id, (company) => emitPresupuesto(company, id, revision)),
    transition: (id: string, command: "approve" | "reject" | "expire" | "annul", revision: number) => mutate(id, (company) => transitionPresupuesto(company, id, command, revision)),
  }
}

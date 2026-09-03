"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import {
  createManualInvoiceDraft,
  createInvoiceDraftFromSource,
  emitInvoice,
  fetchAllInvoices,
  fetchInvoices,
  type CreateManualInvoiceDraftPayload,
  type CreateInvoiceFromSourcePayload,
  type InvoiceApiRow,
  type ListInvoicesParams,
} from "@/lib/api/invoices"

export function useInvoices(filters?: ListInvoicesParams, enabled = true) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const filtersKey = JSON.stringify(filters ?? {})
  const scopeKey = `${companyId ?? ""}:${enabled}:${filtersKey}`
  const [stored, setStored] = useState<{ scopeKey: string; rows: InvoiceApiRow[] }>({ scopeKey, rows: [] })
  const invoices = useMemo(() => stored.scopeKey === scopeKey ? stored.rows : [], [scopeKey, stored])
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
      setStored({ scopeKey, rows: [] })
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { take, skip, ...allFilters } = filters ?? {}
      const rows = take !== undefined || skip !== undefined
        ? await fetchInvoices(companyId, filters)
        : await fetchAllInvoices(companyId, allFilters)
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) setStored({ scopeKey, rows })
    } catch (cause) {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) {
        setStored({ scopeKey, rows: [] })
        setError(cause instanceof ApiClientError ? cause.message : "No se pudieron cargar las facturas")
      }
    } finally {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, enabled, filtersKey, scope])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return () => { refreshRequestRef.current += 1 }
  }, [refresh])

  const mutate = useCallback(async <T,>(id: string, action: (scopeCompanyId: string) => Promise<T>) => {
    if (!companyId) throw new Error("No hay empresa activa")
    if (activeScopeRef.current !== scope) throw new Error("La empresa activa cambió")
    const mutationId = ++mutationRequestRef.current
    setMutatingId(id)
    setError(null)
    try {
      const result = await action(companyId)
      if (activeScopeRef.current !== scope) throw new Error("La empresa activa cambió")
      await refresh()
      return result
    } catch (cause) {
      if (activeScopeRef.current === scope) setError(cause instanceof ApiClientError ? cause.message : "No se pudo actualizar la factura")
      throw cause
    } finally {
      if (mutationId === mutationRequestRef.current) setMutatingId(null)
    }
  }, [companyId, refresh, scope])

  return {
    companyId,
    invoices,
    loading,
    error,
    mutatingId,
    refresh,
    create: (payload: CreateManualInvoiceDraftPayload) => mutate("__create__", (id) => createManualInvoiceDraft(id, payload)),
    createFromSource: (payload: CreateInvoiceFromSourcePayload) => mutate("__create_source__", (id) => createInvoiceDraftFromSource(id, payload)),
    emit: (invoiceId: string) => mutate(invoiceId, (id) => emitInvoice(id, invoiceId)),
  }
}

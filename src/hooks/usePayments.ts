"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import {
  cancelPayment,
  createInvoicePayment,
  createPayment,
  fetchAllPayments,
  fetchPayments,
  type CreateInvoicePaymentPayload,
  type CreatePaymentPayload,
  type ListPaymentsParams,
  type PaymentApiRow,
} from "@/lib/api/payments"

export function usePayments(filters?: ListPaymentsParams, enabled = true) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const filtersKey = JSON.stringify(filters ?? {})
  const scopeKey = `${companyId ?? ""}:${enabled}:${filtersKey}`
  const [stored, setStored] = useState<{ scopeKey: string; rows: PaymentApiRow[] }>({ scopeKey, rows: [] })
  const payments = useMemo(() => (stored.scopeKey === scopeKey ? stored.rows : []), [scopeKey, stored])
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
      const rows =
        take !== undefined || skip !== undefined
          ? await fetchPayments(companyId, filters)
          : await fetchAllPayments(companyId, allFilters)
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) setStored({ scopeKey, rows })
    } catch (cause) {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) {
        setStored({ scopeKey, rows: [] })
        setError(cause instanceof ApiClientError ? cause.message : "No se pudieron cargar los cobros")
      }
    } finally {
      if (requestId === refreshRequestRef.current && activeScopeRef.current === scope) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, enabled, filtersKey, scope])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return () => {
      refreshRequestRef.current += 1
    }
  }, [refresh])

  const mutate = useCallback(
    async <T,>(id: string, action: (scopeCompanyId: string) => Promise<T>) => {
      if (!companyId) throw new Error("No hay empresa activa")
      if (activeScopeRef.current !== scope) throw new Error("La empresa activa cambió")
      const mutationId = ++mutationRequestRef.current
      setMutatingId(id)
      setError(null)
      try {
        const result = await action(companyId)
        if (activeScopeRef.current === scope) await refresh()
        return result
      } catch (cause) {
        if (activeScopeRef.current === scope)
          setError(cause instanceof ApiClientError ? cause.message : "No se pudo actualizar el cobro")
        throw cause
      } finally {
        if (mutationId === mutationRequestRef.current) setMutatingId(null)
      }
    },
    [companyId, refresh, scope]
  )

  return {
    companyId,
    payments,
    loading,
    error,
    mutatingId,
    refresh,
    createPayment: (payload: CreatePaymentPayload) =>
      mutate("__create__", (id) => createPayment(id, payload)),
    create: (payload: CreateInvoicePaymentPayload) =>
      mutate("__create__", (id) => createInvoicePayment(id, payload)),
    cancel: (paymentId: string) => mutate(paymentId, (id) => cancelPayment(id, paymentId)),
  }
}

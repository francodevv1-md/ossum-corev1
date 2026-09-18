"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import { fetchSurgeryTrace, type FetchTraceParams, type TraceResponse } from "@/lib/api/trazabilidad"

type TraceFailureReason = "technical_id_missing" | "request_failed" | null

export function useTrazabilidad(surgeryBackendId?: string, params?: FetchTraceParams) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const [trace, setTrace] = useState<TraceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failureReason, setFailureReason] = useState<TraceFailureReason>(null)
  const requestSequence = useRef(0)

  const companyId = activeCompany?.id
  const technicalId = surgeryBackendId?.trim() || undefined
  const requestParams = useMemo<FetchTraceParams>(() => ({
    includeAudit: params?.includeAudit,
    includeItems: params?.includeItems,
    includeSources: params?.includeSources,
    from: params?.from,
    to: params?.to,
  }), [params?.from, params?.includeAudit, params?.includeItems, params?.includeSources, params?.to])

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current
    if (isLoading || (isAuthenticated && currentUserLoading)) {
      setLoading(false)
      setReady(false)
      setTrace(null)
      setError(null)
      setFailureReason(null)
      return
    }

    if (!companyId || !technicalId) {
      setLoading(false)
      setReady(true)
      setTrace(null)
      setError(null)
      setFailureReason(!technicalId ? "technical_id_missing" : null)
      return
    }

    setLoading(true)
    setReady(false)
    setTrace(null)
    setError(null)
    setFailureReason(null)

    try {
      const data = await fetchSurgeryTrace(companyId, technicalId, requestParams)
      if (requestSequence.current !== requestId) return
      setTrace(data)
      setReady(true)
    } catch (err) {
      if (requestSequence.current !== requestId) return
      const message = err instanceof ApiClientError ? err.message : "No se pudo cargar la trazabilidad"
      setError(message)
      setTrace(null)
      setReady(true)
      setFailureReason("request_failed")
    } finally {
      if (requestSequence.current === requestId) setLoading(false)
    }
  }, [companyId, currentUserLoading, isAuthenticated, isLoading, requestParams, technicalId])

  useEffect(() => {
    void refresh()
    return () => {
      requestSequence.current += 1
    }
  }, [refresh])

  return {
    companyId,
    trace,
    loading,
    ready,
    error,
    failureReason,
    refresh,
    blocked: ready && (!companyId || !technicalId),
  }
}

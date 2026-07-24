"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import { fetchSurgeryTrace, type FetchTraceParams, type TraceResponse } from "@/lib/api/trazabilidad"

export function useTrazabilidad(surgeryId?: string, params?: FetchTraceParams) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const [trace, setTrace] = useState<TraceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const companyId = activeCompany?.id
  const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params])

  const refresh = useCallback(async () => {
    if (isLoading || (isAuthenticated && currentUserLoading)) {
      setLoading(false)
      setReady(false)
      setError(null)
      return
    }

    if (!companyId || !surgeryId) {
      setLoading(false)
      setReady(true)
      setTrace(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchSurgeryTrace(companyId, surgeryId, params)
      setTrace(data)
      setReady(true)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "No se pudo cargar la trazabilidad"
      setError(message)
      setTrace(null)
      setReady(true)
    } finally {
      setLoading(false)
    }
  }, [companyId, currentUserLoading, isAuthenticated, isLoading, params, surgeryId])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, paramsKey])

  return {
    companyId,
    trace,
    loading,
    ready,
    error,
    refresh,
    blocked: ready && (!companyId || !surgeryId),
  }
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import {
  fetchSurgeryComparativa,
  type SurgeryComparativaResponse,
} from "@/lib/api/comparativa"

export function useComparativa(surgeryId?: string | null) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading } = useAuth()
  const [comparativa, setComparativa] = useState<SurgeryComparativaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)

  const companyId = activeCompany?.id
  const targetSurgeryId = surgeryId?.trim() || undefined

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current
    if (isLoading || (isAuthenticated && currentUserLoading)) {
      setLoading(false)
      setReady(false)
      setError(null)
      return
    }

    if (!companyId || !targetSurgeryId) {
      setLoading(false)
      setReady(true)
      setComparativa(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchSurgeryComparativa(companyId, targetSurgeryId)
      if (requestSequence.current !== requestId) return
      setComparativa(data)
      setReady(true)
    } catch (err) {
      if (requestSequence.current !== requestId) return
      const message =
        err instanceof ApiClientError
          ? err.message
          : "No se pudo cargar la comparativa de la cirugía"
      setError(message)
      setComparativa(null)
      setReady(true)
    } finally {
      if (requestSequence.current === requestId) setLoading(false)
    }
  }, [companyId, currentUserLoading, isAuthenticated, isLoading, targetSurgeryId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return () => {
      requestSequence.current += 1
    }
  }, [refresh])

  return {
    companyId,
    surgeryId: targetSurgeryId,
    comparativa,
    loading,
    ready,
    error,
    refresh,
    blocked: ready && (!companyId || !targetSurgeryId),
  }
}

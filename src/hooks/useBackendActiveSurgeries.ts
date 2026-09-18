import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries"
import { useOrtoTrackStore } from "@/lib/store"

const DEFAULT_COMPANY_ID = process.env.NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID

export type BackendActiveSurgeriesContext = {
  mode?: "production" | "dev-preview"
  subjectContactId?: string | null
  blocked?: boolean
  previewDenied?: boolean
}

export function useBackendActiveSurgeries(context: BackendActiveSurgeriesContext = {}) {
  const {
    activeCompany,
    currentUserLoading,
    isAuthenticated,
    isLoading,
    user,
  } = useAuth()
  const hydrateBackendSurgeries = useOrtoTrackStore((state) => state.hydrateBackendSurgeries)
  const clearBackendSurgeries = useOrtoTrackStore((state) => state.clearBackendSurgeries)
  const companyId = activeCompany?.id ?? DEFAULT_COMPANY_ID ?? null
  const shouldWait = isLoading || (isAuthenticated && currentUserLoading && !companyId)
  const mode = context.mode ?? "production"
  const subjectContactId = context.subjectContactId?.trim() || null
  const isBlocked = context.blocked === true
  const isPreviewDenied = context.previewDenied === true
  const actorId = user?.id ?? (isAuthenticated ? "authenticated" : "anonymous")
  const trustContextKey = useMemo(
    () => [actorId, companyId ?? "no-company", mode, subjectContactId ?? "no-subject"].join(":"),
    [actorId, companyId, mode, subjectContactId],
  )
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successfulContextKey, setSuccessfulContextKey] = useState<string | null>(null)
  const activeContextKeyRef = useRef<string | null>(null)
  const requestSequenceRef = useRef(0)
  const initialExistingSurgeriesRef = useRef<{
    contextKey: string
    surgeries: ReturnType<typeof useOrtoTrackStore.getState>["surgeries"]
  } | null>(null)

  const refresh = useCallback(async () => {
    const contextChanged = activeContextKeyRef.current !== trustContextKey

    if (contextChanged) {
      initialExistingSurgeriesRef.current = {
        contextKey: trustContextKey,
        surgeries: useOrtoTrackStore.getState().surgeries,
      }
      activeContextKeyRef.current = trustContextKey
      requestSequenceRef.current += 1
      clearBackendSurgeries()
      setSuccessfulContextKey(null)
      setReady(false)
      setError(null)
    }

    if (shouldWait) {
      setLoading(false)
      setReady(false)
      setError(null)
      return
    }

    if (isBlocked || isPreviewDenied || mode === "dev-preview") {
      setLoading(false)
      setReady(false)
      setError(null)
      clearBackendSurgeries()
      setSuccessfulContextKey(null)
      initialExistingSurgeriesRef.current = null
      return
    }

    if (!companyId) {
      setLoading(false)
      setReady(true)
      setError("No hay empresa activa disponible para cargar cirugías")
      return
    }

    setLoading(true)
    setError(null)
    const requestSequence = ++requestSequenceRef.current
    const requestContextKey = trustContextKey
    const initialExistingSurgeries = initialExistingSurgeriesRef.current
    const existingSurgeries = initialExistingSurgeries?.contextKey === requestContextKey
      ? initialExistingSurgeries.surgeries
      : useOrtoTrackStore.getState().surgeries

    try {
      const surgeries = await fetchBackendActiveSurgeries(
        companyId,
        existingSurgeries,
      )

      if (
        requestSequenceRef.current !== requestSequence
        || activeContextKeyRef.current !== requestContextKey
      ) return

      hydrateBackendSurgeries(surgeries)
      initialExistingSurgeriesRef.current = null
      setSuccessfulContextKey(requestContextKey)
      setReady(true)
    } catch (err) {
      if (
        requestSequenceRef.current !== requestSequence
        || activeContextKeyRef.current !== requestContextKey
      ) return

      setError(err instanceof Error ? err.message : "No se pudo cargar cirugías desde backend")
      setReady(true)
    } finally {
      if (
        requestSequenceRef.current === requestSequence
        && activeContextKeyRef.current === requestContextKey
      ) {
        setLoading(false)
      }
    }
  }, [
    clearBackendSurgeries,
    companyId,
    hydrateBackendSurgeries,
    isBlocked,
    isPreviewDenied,
    mode,
    shouldWait,
    trustContextKey,
  ])

  useEffect(() => {
    // Immediate invalidation prevents stale actor/company/subject/mode data from remaining visible.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const hasSuccessfulData = successfulContextKey === trustContextKey

  return {
    loading,
    ready,
    error,
    refresh,
    hasSuccessfulData,
    isInitialLoading: loading && !hasSuccessfulData,
    isRefreshing: loading && hasSuccessfulData,
    isInitialError: Boolean(error) && !hasSuccessfulData,
    isRefreshError: Boolean(error) && hasSuccessfulData,
    trustContextKey,
  }
}

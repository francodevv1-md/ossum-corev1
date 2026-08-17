import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { fetchCoordinationView } from "@/lib/api/coordination-view"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import type { CoordinationViewResponse } from "@/lib/services/coordination-view.service"
import type { CoordinatorSubject } from "@/lib/services/personal-coordinator-resolver.service"
import { useOrtoTrackStore } from "@/lib/store"

export type CoordinationSurface = "personal" | "global"

type CoordinationViewOptions = {
  surface: CoordinationSurface
  discoverPreview?: boolean
}

const COORDINATION_PAGE_SIZE = 50

function appendUniqueRows(
  current: CoordinationViewResponse["surgeries"],
  next: CoordinationViewResponse["surgeries"],
) {
  const seen = new Set(current.map((row) => row.id))
  return [...current, ...next.filter((row) => !seen.has(row.id))]
}

function isPreviewDenial(error: unknown) {
  if (!error || typeof error !== "object") return false
  const candidate = error as { status?: number; code?: string }
  return candidate.status === 403 || candidate.status === 404 ||
    candidate.code === "coordination_preview_denied" ||
    candidate.code === "coordination_preview_target_not_found"
}

export function useCoordinationView({ surface: productionSurface, discoverPreview = false }: CoordinationViewOptions) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading, user } = useAuth()
  const hydrateBackendSurgeries = useOrtoTrackStore((state) => state.hydrateBackendSurgeries)
  const clearBackendSurgeries = useOrtoTrackStore((state) => state.clearBackendSurgeries)
  const companyId = activeCompany?.id ?? null
  const actorId = user?.id ?? (isAuthenticated ? "authenticated" : "anonymous")
  const waitingForAuth = isLoading || (isAuthenticated && currentUserLoading && !companyId)
  const [mode, setMode] = useState<"probing" | "production" | "dev-preview">(
    discoverPreview ? "probing" : "production",
  )
  const [surface, setSurface] = useState<CoordinationSurface>(productionSurface)
  const [selectedTarget, setSelectedTarget] = useState<CoordinatorSubject | null>(null)
  const [response, setResponse] = useState<CoordinationViewResponse | null>(null)
  const [previewRows, setPreviewRows] = useState<CoordinationViewResponse["surgeries"]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [previewDenied, setPreviewDenied] = useState(false)
  const [successfulContextKey, setSuccessfulContextKey] = useState<string | null>(null)
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null)
  const successfulContextKeyRef = useRef<string | null>(null)
  const activeContextKeyRef = useRef<string | null>(null)
  const inFlightContextKeyRef = useRef<string | null>(null)
  const requestSequenceRef = useRef(0)

  const trustContextKey = useMemo(
    () => [actorId, companyId ?? "no-company", mode, surface, selectedTarget?.contactId ?? "no-subject"].join(":"),
    [actorId, companyId, mode, selectedTarget?.contactId, surface],
  )

  const runRequest = useCallback(async (requestMode = mode, options?: { append?: boolean }) => {
    if (waitingForAuth) return
    if (!companyId) {
      setError("No hay empresa activa disponible para cargar Coordinación")
      return
    }

    const requestSequence = ++requestSequenceRef.current
    const requestContextKey = [actorId, companyId, requestMode, surface, selectedTarget?.contactId ?? "no-subject"].join(":")
    inFlightContextKeyRef.current = requestContextKey
    const contextChanged = activeContextKeyRef.current !== requestContextKey
    const currentRows = response?.surgeries ?? []
    const append = options?.append === true && !contextChanged && successfulContextKeyRef.current === requestContextKey && response !== null
    if (contextChanged) {
      activeContextKeyRef.current = requestContextKey
      successfulContextKeyRef.current = null
      setSuccessfulContextKey(null)
      setAcceptedAt(null)
      setResponse(null)
      setError(null)
      setLoadMoreError(null)
      setPreviewDenied(false)
      if (requestMode === "dev-preview" || requestMode === "probing") setPreviewRows([])
      if (requestMode === "production") clearBackendSurgeries()
    }

    if (append) {
      setLoadingMore(true)
      setLoadMoreError(null)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      let nextResponse: CoordinationViewResponse
      let nextMode = requestMode
      let nextSurface = surface
      let nextTarget = selectedTarget
      const pagination = {
        take: COORDINATION_PAGE_SIZE,
        skip: append
          ? response?.pagination
            ? response.pagination.skip + response.pagination.take
            : currentRows.length
          : 0,
      }

      if (requestMode === "probing") {
        try {
          const capabilityResponse = await fetchCoordinationView(companyId, { surface: "global", preview: true, ...pagination })
          const capability = capabilityResponse.previewCapability
          if (capability?.enabled !== true) throw Object.assign(new Error("preview denied"), { status: 403 })

          nextMode = "dev-preview"
          if (productionSurface === "personal") {
            const firstTarget = capability.targets[0]
            if (!firstTarget) throw Object.assign(new Error("preview denied"), { status: 403 })
            nextTarget = firstTarget
            nextSurface = "personal"
            nextResponse = await fetchCoordinationView(companyId, {
              surface: "personal",
              preview: true,
              target: firstTarget,
              ...pagination,
            })
          } else {
            nextSurface = "global"
            nextResponse = capabilityResponse
          }
        } catch (probeError) {
          if (!isPreviewDenial(probeError)) throw probeError
          nextMode = "production"
          nextSurface = productionSurface
          nextTarget = null
          nextResponse = await fetchCoordinationView(companyId, { surface: productionSurface, ...pagination })
        }
      } else if (requestMode === "dev-preview") {
        nextResponse = surface === "personal" && selectedTarget
          ? await fetchCoordinationView(companyId, { surface: "personal", preview: true, target: selectedTarget, ...pagination })
          : await fetchCoordinationView(companyId, { surface: "global", preview: true, ...pagination })
      } else {
        nextResponse = await fetchCoordinationView(companyId, { surface: productionSurface, ...pagination })
      }

      if (requestSequenceRef.current !== requestSequence) return

      setMode(nextMode)
      setSurface(nextSurface)
      setSelectedTarget(nextTarget)
      const acceptedResponse = append
        ? { ...nextResponse, surgeries: appendUniqueRows(currentRows, nextResponse.surgeries) }
        : nextResponse
      setResponse(acceptedResponse)
      setLoadMoreError(null)
      setPreviewDenied(false)
      const completedContextKey = [
        actorId,
        companyId,
        nextMode,
        nextSurface,
        nextTarget?.contactId ?? "no-subject",
      ].join(":")
      activeContextKeyRef.current = completedContextKey
      successfulContextKeyRef.current = completedContextKey
      setSuccessfulContextKey(completedContextKey)
      setAcceptedAt(Date.now())

      if (nextMode === "dev-preview") {
        setPreviewRows([...acceptedResponse.surgeries])
      } else {
        const existing = useOrtoTrackStore.getState().surgeries
        hydrateBackendSurgeries(mapApiSurgeryListToSurgeries(acceptedResponse.surgeries, existing))
        setPreviewRows([])
      }
    } catch (requestError) {
      if (requestSequenceRef.current !== requestSequence) return
      if ((requestMode === "dev-preview" || mode === "dev-preview") && isPreviewDenial(requestError)) {
        setPreviewRows([])
        setResponse(null)
        successfulContextKeyRef.current = null
        setSuccessfulContextKey(null)
        setAcceptedAt(null)
        setPreviewDenied(true)
      } else {
        const message = requestError instanceof Error ? requestError.message : "No se pudo cargar Coordinación"
        if (append) setLoadMoreError(message)
        else setError(message)
      }
    } finally {
      if (requestSequenceRef.current === requestSequence) {
        inFlightContextKeyRef.current = null
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [
    actorId,
    clearBackendSurgeries,
    companyId,
    hydrateBackendSurgeries,
    mode,
    productionSurface,
    response,
    selectedTarget,
    surface,
    waitingForAuth,
  ])

  useEffect(() => {
    if (successfulContextKeyRef.current === trustContextKey) return
    if (inFlightContextKeyRef.current === trustContextKey) return
    void runRequest()
  }, [runRequest, successfulContextKey, trustContextKey])

  const changePreviewSurface = useCallback((nextSurface: CoordinationSurface) => {
    if (mode !== "dev-preview" || nextSurface === surface) return
    const nextTarget = nextSurface === "personal"
      ? selectedTarget ?? response?.previewCapability?.targets[0] ?? null
      : selectedTarget
    if (nextSurface === "personal" && !nextTarget) return
    requestSequenceRef.current += 1
    setPreviewRows([])
    setResponse(null)
    successfulContextKeyRef.current = null
    setSuccessfulContextKey(null)
    setAcceptedAt(null)
    setPreviewDenied(false)
    setSurface(nextSurface)
    setSelectedTarget(nextTarget)
  }, [mode, response?.previewCapability?.targets, selectedTarget, surface])

  const changePreviewTarget = useCallback((contactId: string) => {
    if (mode !== "dev-preview") return
    const target = response?.previewCapability?.targets.find((candidate) => candidate.contactId === contactId)
    if (!target || target.contactId === selectedTarget?.contactId) return
    requestSequenceRef.current += 1
    setPreviewRows([])
    setResponse(null)
    successfulContextKeyRef.current = null
    setSuccessfulContextKey(null)
    setAcceptedAt(null)
    setPreviewDenied(false)
    setSurface("personal")
    setSelectedTarget(target)
  }, [mode, response?.previewCapability?.targets, selectedTarget?.contactId])

  const exitPreview = useCallback(() => {
    requestSequenceRef.current += 1
    setPreviewRows([])
    setResponse(null)
    setSelectedTarget(null)
    setSurface(productionSurface)
    successfulContextKeyRef.current = null
    setSuccessfulContextKey(null)
    setAcceptedAt(null)
    setPreviewDenied(false)
    setError(null)
    setLoadMoreError(null)
    setMode("production")
  }, [productionSurface])

  const currentContextKey = [actorId, companyId ?? "no-company", mode, surface, selectedTarget?.contactId ?? "no-subject"].join(":")
  const hasSuccessfulData = successfulContextKey === currentContextKey
  const acceptedContextKey = hasSuccessfulData
    ? [actorId, companyId ?? "no-company", mode, surface, response?.context.viewSubject?.contactId ?? "no-subject"].join(":")
    : null
  const hasMore = hasSuccessfulData && response?.pagination?.hasMore === true
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return Promise.resolve()
    return runRequest(mode, { append: true })
  }, [hasMore, loadingMore, mode, runRequest])

  return {
    mode,
    surface,
    selectedTarget,
    response,
    previewRows,
    previewDenied,
    waitingForAuth,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasSuccessfulData,
    acceptedContextKey,
    acceptedAt,
    isInitialLoading: loading && !hasSuccessfulData,
    isRefreshing: loading && hasSuccessfulData,
    isInitialError: Boolean(error) && !hasSuccessfulData,
    isRefreshError: Boolean(error) && hasSuccessfulData,
    trustContextKey,
    refresh: runRequest,
    hasMore,
    loadedCount: hasSuccessfulData ? response?.surgeries.length ?? 0 : 0,
    loadMore,
    changePreviewSurface,
    changePreviewTarget,
    exitPreview,
  }
}

export type CoordinationViewController = Omit<ReturnType<typeof useCoordinationView>, "acceptedContextKey" | "acceptedAt"> & {
  acceptedContextKey?: string | null
  acceptedAt?: number | null
}

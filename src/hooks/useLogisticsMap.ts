"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import type { LogisticsGeo } from "@/lib/services/logistics-geography"

export type LogisticsMapResponse = { generatedAt: string; source: "persisted_contact_address"; excluded: number; audit: Record<string, number>; markers: Array<{ surgery: { id: string; reference: string | null }; institution: { id: string; name: string } | null; geo: LogisticsGeo }>; feed: "active" | "unconfigured" | "unavailable"; vehicles: Array<{ id: string; name: string; routeAvailable?: boolean; state: "fresh" | "stale" | "unknown"; position: { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null } | null }> }
export type LogisticsRoute = { vehicle: { id: string; name: string }; feed: "active" | "unconfigured" | "unavailable"; points: Array<{ latitude: number; longitude: number; recordedAt: string; speedKmh: number | null }> }

export function useLogisticsMap() {
  const { activeCompany, currentUserLoading, isLoading } = useAuth()
  const companyId = activeCompany?.id
  const companyIdRef = useRef(companyId)
  const mapRequest = useRef(0)
  const routeRequest = useRef(0)
  const [data, setData] = useState<LogisticsMapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [route, setRoute] = useState<LogisticsRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)

  useEffect(() => {
    companyIdRef.current = companyId
    mapRequest.current += 1
    routeRequest.current += 1
    setData(null)
    setError(null)
    setRoute(null)
    setRouteError(null)
    setRouteLoading(false)
  }, [companyId])

  const refresh = useCallback(async () => {
    if (!companyId) return
    const current = ++mapRequest.current
    try {
      const result = await apiFetch<LogisticsMapResponse>(`/api/companies/${encodeURIComponent(companyId)}/logistics/map`)
      if (current === mapRequest.current && companyIdRef.current === companyId) { setData(result); setError(null) }
    } catch (cause) {
      if (current === mapRequest.current && companyIdRef.current === companyId) setError(cause instanceof Error ? cause.message : "No se pudo cargar el mapa logístico.")
    }
  }, [companyId])

  useEffect(() => {
    if (!isLoading && !currentUserLoading && companyId) void refresh()
  }, [companyId, currentUserLoading, isLoading, refresh])

  const showRoute = useCallback(async (vehicleId: string, hours: number) => {
    if (!companyId) return
    const current = ++routeRequest.current
    setRoute(null)
    setRouteLoading(true)
    setRouteError(null)
    try {
      const result = await apiFetch<LogisticsRoute>(`/api/companies/${encodeURIComponent(companyId)}/logistics/vehicles/${encodeURIComponent(vehicleId)}/route?hours=${hours}`)
      if (current === routeRequest.current && companyIdRef.current === companyId) setRoute(result)
    } catch {
      if (current === routeRequest.current && companyIdRef.current === companyId) {
        setRoute(null)
        setRouteError("No se pudo obtener el recorrido reciente.")
      }
    } finally {
      if (current === routeRequest.current && companyIdRef.current === companyId) setRouteLoading(false)
    }
  }, [companyId])

  return { data, error, route, routeLoading, routeError, showRoute, hideRoute: () => { routeRequest.current += 1; setRoute(null); setRouteError(null); setRouteLoading(false) } }
}

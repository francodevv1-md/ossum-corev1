"use client"

import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import type { LogisticsGeo } from "@/lib/services/logistics-geography"

export type LogisticsMapResponse = { generatedAt: string; source: "persisted_contact_address"; excluded: number; audit: { total: number; eligible: number; missing: number; incomplete: number; unvalidated: number; incompatibleCrs: number; conflict: number }; markers: Array<{ surgery: { id: string; reference: string | null }; institution: { id: string; name: string } | null; geo: LogisticsGeo }>; feed: "active" | "unconfigured" | "unavailable"; vehicles: Array<{ id: string; name: string; routeAvailable?: boolean; state: "fresh" | "stale" | "unknown"; position: { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null } | null }> }
export type LogisticsRoute = { vehicle: { id: string; name: string }; feed: "active" | "unconfigured" | "unavailable"; points: Array<{ latitude: number; longitude: number; recordedAt: string; speedKmh: number | null }> }

export function useLogisticsMap() {
  const { activeCompany, currentUserLoading, isLoading } = useAuth()
  const [data, setData] = useState<LogisticsMapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [route, setRoute] = useState<LogisticsRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true); setError(null)
    try { setData(await apiFetch<LogisticsMapResponse>(`/api/companies/${encodeURIComponent(activeCompany.id)}/logistics/map`)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el mapa logístico.") }
    finally { setLoading(false) }
  }, [activeCompany?.id])
  useEffect(() => { if (!isLoading && !currentUserLoading && activeCompany?.id) void refresh() }, [activeCompany?.id, currentUserLoading, isLoading, refresh])
  useEffect(() => { setRoute(null); setRouteError(null) }, [activeCompany?.id])
  const showRoute = useCallback(async (vehicleId: string, hours: number) => {
    if (!activeCompany?.id) return
    setRouteLoading(true); setRouteError(null); setRoute(null)
    try { setRoute(await apiFetch<LogisticsRoute>(`/api/companies/${encodeURIComponent(activeCompany.id)}/logistics/vehicles/${encodeURIComponent(vehicleId)}/route?hours=${encodeURIComponent(hours)}`)) }
    catch { setRouteError("No se pudo obtener el recorrido reciente.") }
    finally { setRouteLoading(false) }
  }, [activeCompany?.id])
  const hideRoute = useCallback(() => { setRoute(null); setRouteError(null) }, [])
  return { data, error, loading, refresh, route, routeLoading, routeError, showRoute, hideRoute }
}

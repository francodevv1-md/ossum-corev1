"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"

export type LogisticsInboxFilters = {
  q?: string
  from?: string
  to?: string
  institutionId?: string
  locality?: string
  cxStatus?: string
  prepStatus?: string
  logisticsStatus?: string
  hasBlockers?: boolean
  stage?: string
  exception?: string
  priority?: string
  news?: boolean
}

export type LogisticsInboxItem = {
  surgery: { id: string; reference: string | null; date: string | null; patient: string | null; doctor: string | null; institution: string | null; institutionId: string | null; locality: string | null; surgeryStatus: string | null; preparationStatus: string | null; logisticsStatus: string; priority: string | null }
  logistics: { availability: "available" | "partial" | "unavailable"; stages: string[] | string; blockers: { count: number; highest: string | null }; differences: { open: number; closed: number }; alerts: { count: number; highest: string | null }; exceptions: { count: number; highest: string | null }; lastNovelty: { at: string; label: string; responsible: string | null } | null; nextAction: { label?: string } | string | null }
}

export type LogisticsInboxResponse = {
  generatedAt: string
  counts: { news: number; urgent: number; overdue: number | null; exceptions: number }
  items: LogisticsInboxItem[]
  page: { nextCursor: string | null; hasMore: boolean }
}

export function buildLogisticsInboxUrl(companyId: string, filters: LogisticsInboxFilters, cursor?: string | null) {
  const params = new URLSearchParams({ limit: "25" })
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string" && value.trim()) params.set(key, value.trim())
    if (typeof value === "boolean") params.set(key, String(value))
  }
  if (cursor) params.set("cursor", cursor)
  return `/api/companies/${encodeURIComponent(companyId)}/logistics/inbox?${params.toString()}`
}

export function useLogisticsGlobalInbox(filters: LogisticsInboxFilters) {
  const { activeCompany, currentUserLoading, isLoading } = useAuth()
  const companyId = activeCompany?.id
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])
  const requestId = useRef(0)
  const [data, setData] = useState<LogisticsInboxResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async (cursor: string | null, append: boolean, manual = false) => {
    if (!companyId) return
    const id = ++requestId.current
    if (append) setLoadingMore(true)
    else if (manual) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const next = await apiFetch<LogisticsInboxResponse>(buildLogisticsInboxUrl(companyId, filters, cursor))
      if (id !== requestId.current) return
      setData((current) => append && current ? { ...next, items: [...current.items, ...next.items] } : next)
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : "No se pudo cargar la bandeja de logística.")
    } finally {
      if (id === requestId.current) { setLoading(false); setRefreshing(false); setLoadingMore(false) }
    }
  }, [companyId, filters])

  useEffect(() => {
    let active = true
    requestId.current += 1
    void Promise.resolve().then(() => {
      if (!active) return
      setData(null)
      setError(null)
      setLoading(false)
      if (!companyId || isLoading || currentUserLoading) return
      void request(null, false)
    })
    return () => { active = false }
  }, [companyId, currentUserLoading, filterKey, isLoading, request])

  const refresh = useCallback(() => void request(null, false, true), [request])
  const loadMore = useCallback(() => { if (data?.page.nextCursor && !loadingMore) void request(data.page.nextCursor, true) }, [data, loadingMore, request])
  const ready = !isLoading && !currentUserLoading

  return { data, loading, refreshing, loadingMore, error, ready, hasCompany: Boolean(companyId), companyId, refresh, loadMore }
}

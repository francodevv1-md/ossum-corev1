"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { VisibilityState, SortingState } from "@tanstack/react-table"
import {
  CIRUGIAS_COLUMNS,
  DEFAULT_VISIBLE_COLS,
  DEFAULT_COLUMN_WIDTHS,
} from "@/lib/cirugias.constants"

export type TableDensity = "standard" | "compact"

export interface CirugiasTableViewPreferences {
  density: TableDensity
  columnVisibility: Record<string, boolean>
  columnOrder: string[]
  sorting: SortingState
}

const STORAGE_KEY = "ossum:cirugias:view:v1"

const DEFAULT_COLUMN_ORDER = CIRUGIAS_COLUMNS.map((c) => c.key)

const DEFAULT_PREFERENCES: CirugiasTableViewPreferences = {
  density: "standard",
  columnVisibility: DEFAULT_VISIBLE_COLS,
  columnOrder: DEFAULT_COLUMN_ORDER,
  sorting: [{ id: "date", desc: false }],
}

function loadInitialPreferences(): CirugiasTableViewPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<CirugiasTableViewPreferences>
    return {
      density: parsed.density === "compact" ? "compact" : "standard",
      columnVisibility: { ...DEFAULT_VISIBLE_COLS, ...(parsed.columnVisibility ?? {}) },
      columnOrder: Array.isArray(parsed.columnOrder) && parsed.columnOrder.length > 0 ? parsed.columnOrder : DEFAULT_COLUMN_ORDER,
      sorting: Array.isArray(parsed.sorting) ? parsed.sorting : DEFAULT_PREFERENCES.sorting,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function useCirugiasTableState(initialSelectedId?: string | null) {
  const [density, setDensityState] = useState<TableDensity>("standard")
  const [columnVisibility, setColumnVisibilityState] = useState<VisibilityState>(DEFAULT_VISIBLE_COLS)
  const [columnOrder, setColumnOrderState] = useState<string[]>(DEFAULT_COLUMN_ORDER)
  const [sorting, setSortingState] = useState<SortingState>(DEFAULT_PREFERENCES.sorting)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage once on client
  useEffect(() => {
    const saved = loadInitialPreferences()
    setDensityState(saved.density)
    setColumnVisibilityState(saved.columnVisibility)
    setColumnOrderState(saved.columnOrder)
    setSortingState(saved.sorting)
    setIsHydrated(true)
  }, [])

  // Persist to localStorage on change (debounced / on update)
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return
    try {
      const payload: CirugiasTableViewPreferences = {
        density,
        columnVisibility: columnVisibility as Record<string, boolean>,
        columnOrder,
        sorting,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage errors in private browsing / quotas
    }
  }, [density, columnVisibility, columnOrder, sorting, isHydrated])

  const setDensity = useCallback((mode: TableDensity) => {
    setDensityState(mode)
  }, [])

  const toggleDensity = useCallback(() => {
    setDensityState((prev) => (prev === "standard" ? "compact" : "standard"))
  }, [])

  const setColumnVisibility = useCallback((updaterOrValue: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
    setColumnVisibilityState(updaterOrValue)
  }, [])

  const setColumnOrder = useCallback((order: string[]) => {
    setColumnOrderState(order)
  }, [])

  const setSorting = useCallback((updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
    setSortingState(updaterOrValue)
  }, [])

  const resetPreferences = useCallback(() => {
    setDensityState(DEFAULT_PREFERENCES.density)
    setColumnVisibilityState(DEFAULT_PREFERENCES.columnVisibility)
    setColumnOrderState(DEFAULT_PREFERENCES.columnOrder)
    setSortingState(DEFAULT_PREFERENCES.sorting)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  return useMemo(
    () => ({
      density,
      setDensity,
      toggleDensity,
      columnVisibility,
      setColumnVisibility,
      columnOrder,
      setColumnOrder,
      sorting,
      setSorting,
      selectedId,
      setSelectedId,
      resetPreferences,
      isHydrated,
    }),
    [
      density,
      setDensity,
      toggleDensity,
      columnVisibility,
      setColumnVisibility,
      columnOrder,
      setColumnOrder,
      sorting,
      setSorting,
      selectedId,
      setSelectedId,
      resetPreferences,
      isHydrated,
    ],
  )
}

"use client"

import { useState, useCallback, useEffect } from "react"
import {
  COORDINADORES_COLUMNS,
  DEFAULT_COORDINADORES_VISIBLE_COLS,
  DEFAULT_COORDINADORES_COLUMN_ORDER,
} from "@/lib/coordinadores.constants"

const STORAGE_KEY_VISIBILITY = "ossum-coordinadores-col-visibility"
const STORAGE_KEY_ORDER = "ossum-coordinadores-col-order"
const STORAGE_KEY_COMPACT = "ossum-coordinadores-compact-mode"
const STORAGE_KEY_STICKY = "ossum-coordinadores-sticky-cols"

export function useCoordinadoresColumnVisibility() {
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return { ...DEFAULT_COORDINADORES_VISIBLE_COLS }
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VISIBILITY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_COORDINADORES_VISIBLE_COLS, ...parsed }
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_COORDINADORES_VISIBLE_COLS }
  })

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return [...DEFAULT_COORDINADORES_COLUMN_ORDER]
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ORDER)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const known = new Set(DEFAULT_COORDINADORES_COLUMN_ORDER)
          const valid = parsed.filter((k: string) => known.has(k))
          const missing = DEFAULT_COORDINADORES_COLUMN_ORDER.filter((k) => !valid.includes(k))
          return [...valid, ...missing]
        }
      }
    } catch {
      // ignore
    }
    return [...DEFAULT_COORDINADORES_COLUMN_ORDER]
  })

  const [compactMode, setCompactMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMPACT)
      if (stored) return JSON.parse(stored) === true
    } catch {
      // ignore
    }
    return false
  })

  const [stickyColumns, setStickyColumns] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STICKY)
      if (stored) return JSON.parse(stored) === true
    } catch {
      // ignore
    }
    return true
  })

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(visibleCols))
    } catch {
      // ignore
    }
  }, [visibleCols])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(columnOrder))
    } catch {
      // ignore
    }
  }, [columnOrder])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPACT, JSON.stringify(compactMode))
    } catch {
      // ignore
    }
  }, [compactMode])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STICKY, JSON.stringify(stickyColumns))
    } catch {
      // ignore
    }
  }, [stickyColumns])

  const toggleColumn = useCallback((key: string, checked: boolean) => {
    setVisibleCols((prev) => ({
      ...prev,
      [key]: checked,
    }))
  }, [])

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumnOrder((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev
      }
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const resetToDefault = useCallback(() => {
    setVisibleCols({ ...DEFAULT_COORDINADORES_VISIBLE_COLS })
    setColumnOrder([...DEFAULT_COORDINADORES_COLUMN_ORDER])
  }, [])

  return {
    columns: COORDINADORES_COLUMNS,
    visibleCols,
    columnOrder,
    compactMode,
    setCompactMode,
    stickyColumns,
    setStickyColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
  }
}

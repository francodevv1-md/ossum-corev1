/**
 * useColumnVisibility.ts
 * Hook para manejar la visibilidad y orden de columnas en la tabla de cirugías.
 * Incluye configuración de columnas fijas (sticky) con persistencia en localStorage.
 *
 * CHATZAI-025 (4D): Añadido reorder de columnas vía drag & drop,
 * restaurar predeterminado y persistencia de orden en localStorage.
 */

import { useState, useCallback, useEffect } from "react"
import { DEFAULT_VISIBLE_COLS, CIRUGIAS_COLUMNS } from "@/lib/cirugias.constants"

const STICKY_COLS_KEY = "ortotrack-sticky-columns"
const COL_ORDER_KEY = "ortotrack-column-order"
const COL_VISIBILITY_KEY = "ortotrack-column-visibility"

/** Default column order based on CIRUGIAS_COLUMNS definition */
const DEFAULT_COLUMN_ORDER = CIRUGIAS_COLUMNS.map((c) => c.key)

function loadStickyColumns(): boolean {
  if (typeof window === "undefined") return false
  try {
    const val = localStorage.getItem(STICKY_COLS_KEY)
    return val === "true"
  } catch {
    return false
  }
}

function saveStickyColumns(value: boolean) {
  try {
    localStorage.setItem(STICKY_COLS_KEY, String(value))
  } catch {
    // Silently fail if localStorage is not available
  }
}

function loadColumnOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_COLUMN_ORDER
  try {
    const val = localStorage.getItem(COL_ORDER_KEY)
    if (!val) return DEFAULT_COLUMN_ORDER
    const parsed = JSON.parse(val) as string[]
    // Validate: ensure all keys from CIRUGIAS_COLUMNS are present
    const allKeys = CIRUGIAS_COLUMNS.map((c) => c.key)
    const hasAllKeys = allKeys.every((k) => parsed.includes(k))
    if (!hasAllKeys) return DEFAULT_COLUMN_ORDER
    // Add any new keys that weren't in the saved order
    const newKeys = allKeys.filter((k) => !parsed.includes(k))
    return [...parsed, ...newKeys]
  } catch {
    return DEFAULT_COLUMN_ORDER
  }
}

function saveColumnOrder(order: string[]) {
  try {
    localStorage.setItem(COL_ORDER_KEY, JSON.stringify(order))
  } catch {
    // Silently fail
  }
}

function loadVisibleCols(): Record<string, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_VISIBLE_COLS }
  try {
    const val = localStorage.getItem(COL_VISIBILITY_KEY)
    if (!val) return { ...DEFAULT_VISIBLE_COLS }
    const parsed = JSON.parse(val) as Record<string, boolean>
    // Merge with defaults to ensure new columns have a value
    return { ...DEFAULT_VISIBLE_COLS, ...parsed }
  } catch {
    return { ...DEFAULT_VISIBLE_COLS }
  }
}

function saveVisibleCols(cols: Record<string, boolean>) {
  try {
    localStorage.setItem(COL_VISIBILITY_KEY, JSON.stringify(cols))
  } catch {
    // Silently fail
  }
}

export function useColumnVisibility() {
  const [colVisOpen, setColVisOpen] = useState(false)
  // CHATZAI-025A-fix: Use default values first to avoid hydration mismatch,
  // then load from localStorage after mount
  const [visibleCols, setVisibleColsInternal] = useState<Record<string, boolean>>({ ...DEFAULT_VISIBLE_COLS })
  const [stickyColumns, setStickyColumns] = useState<boolean>(false)
  const [columnOrder, setColumnOrderInternal] = useState<string[]>(DEFAULT_COLUMN_ORDER)

  // Load persisted state after mount (client-only)
  useEffect(() => {
    setVisibleColsInternal(loadVisibleCols())
    setStickyColumns(loadStickyColumns())
    setColumnOrderInternal(loadColumnOrder())
  }, [])

  const setVisibleCols = useCallback((cols: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    setVisibleColsInternal((prev) => {
      const next = typeof cols === "function" ? cols(prev) : cols
      saveVisibleCols(next)
      return next
    })
  }, [])

  const toggleColumn = useCallback((key: string, checked: boolean) => {
    setVisibleColsInternal((v) => {
      const next = { ...v, [key]: checked }
      saveVisibleCols(next)
      return next
    })
  }, [])

  const isColumnVisible = useCallback((key: string): boolean => {
    return visibleCols[key] !== false
  }, [visibleCols])

  const toggleStickyColumns = useCallback(() => {
    setStickyColumns((prev) => {
      const next = !prev
      saveStickyColumns(next)
      return next
    })
  }, [])

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumnOrderInternal((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      saveColumnOrder(next)
      return next
    })
  }, [])

  const setColumnOrder = useCallback((order: string[]) => {
    setColumnOrderInternal(order)
    saveColumnOrder(order)
  }, [])

  const resetToDefault = useCallback(() => {
    setColumnOrderInternal(DEFAULT_COLUMN_ORDER)
    saveColumnOrder(DEFAULT_COLUMN_ORDER)
    setVisibleColsInternal({ ...DEFAULT_VISIBLE_COLS })
    saveVisibleCols(DEFAULT_VISIBLE_COLS)
    setStickyColumns(false)
    saveStickyColumns(false)
  }, [])

  return {
    colVisOpen, setColVisOpen,
    visibleCols, setVisibleCols,
    toggleColumn,
    isColumnVisible,
    stickyColumns,
    toggleStickyColumns,
    columnOrder,
    setColumnOrder,
    reorderColumns,
    resetToDefault,
  }
}

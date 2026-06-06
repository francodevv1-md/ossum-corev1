/**
 * useCirugiasSorting.ts
 * Hook para manejar el ordenamiento de la tabla de cirugías.
 */

import { useState, useCallback } from "react"
import type { SortState } from "@/lib/cirugias.types"
import type { Surgery } from "@/types"

export function useCirugiasSorting() {
  const [sortState, setSortState] = useState<SortState>({
    sortKey: "date",
    sortDir: "desc",
  })

  const handleSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev.sortKey === key) {
        return { ...prev, sortDir: prev.sortDir === "asc" ? "desc" : "asc" }
      }
      return { sortKey: key, sortDir: "asc" }
    })
  }, [])

  const sortData = useCallback((data: Surgery[]): Surgery[] => {
    return [...data].sort((a, b) => {
      const aVal = String(a[sortState.sortKey as keyof Surgery] ?? "")
      const bVal = String(b[sortState.sortKey as keyof Surgery] ?? "")
      return sortState.sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
  }, [sortState])

  return {
    sortKey: sortState.sortKey,
    sortDir: sortState.sortDir,
    handleSort,
    sortData,
  }
}

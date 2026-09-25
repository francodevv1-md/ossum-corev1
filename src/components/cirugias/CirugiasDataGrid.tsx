"use client"

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type VisibilityState,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Surgery } from "@/types"
import { createCirugiasColumns, type CirugiasColumnContext } from "@/lib/cirugias/cirugias-columns"
import { CirugiasEmptyState } from "./CirugiasEmptyState"
import { CirugiasGridHeader } from "./CirugiasGridHeader"
import { CirugiasGridRow } from "./CirugiasGridRow"
import { SurgeryPaginationFooter } from "./SurgeryPaginationFooter"
import { DEFAULT_COLUMN_WIDTHS, type CxStatusVariant } from "@/lib/cirugias.constants"

export interface CirugiasDataGridProps {
  data: Surgery[]
  columnContext: CirugiasColumnContext
  selectedSurgeryId: string | null
  onSelect: (id: string) => void
  onOpenExpediente: (id: string) => void
  density?: "standard" | "compact"
  columnVisibility: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  columnOrder: string[]
  onColumnOrderChange?: (order: string[]) => void
  sorting: SortingState
  onSortingChange?: (sorting: SortingState) => void
  stickyColumns?: boolean
  fixedLeftColumns?: string[]
  columnWidths?: Record<string, number>
  cxVariant?: CxStatusVariant
  onClearFilters?: () => void
  onNewSurgery?: () => void
  hasActiveFilters?: boolean
}

const SCROLL_STEP = 300

export function CirugiasDataGrid({
  data,
  columnContext,
  selectedSurgeryId,
  onSelect,
  onOpenExpediente,
  density = "standard",
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
  sorting,
  onSortingChange,
  stickyColumns = true,
  fixedLeftColumns = ["id", "state", "patient"],
  columnWidths,
  cxVariant,
  onClearFilters,
  onNewSurgery,
  hasActiveFilters,
}: CirugiasDataGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: false })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const columns = useMemo(() => createCirugiasColumns(columnContext), [columnContext])

  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      columnOrder,
      sorting,
    },
    onColumnVisibilityChange: onColumnVisibilityChange
      ? (updater) => {
          const next = typeof updater === "function" ? updater(columnVisibility) : updater
          onColumnVisibilityChange(next)
        }
      : undefined,
    onColumnOrderChange: onColumnOrderChange
      ? (updater) => {
          const next = typeof updater === "function" ? updater(columnOrder) : updater
          onColumnOrderChange(next)
        }
      : undefined,
    onSortingChange: onSortingChange
      ? (updater) => {
          const next = typeof updater === "function" ? updater(sorting) : updater
          onSortingChange(next)
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Sliced page data
  const rows = table.getRowModel().rows
  const totalResults = rows.length
  const isAll = pageSize === 0 || pageSize >= totalResults
  const totalPages = isAll || totalResults === 0 ? 1 : Math.ceil(totalResults / pageSize)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const paginatedRows = useMemo(() => {
    if (pageSize === 0 || pageSize >= totalResults) return rows
    const start = (currentPage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, currentPage, pageSize, totalResults])

  // Sticky column calculations
  const resolvedWidths = useMemo(
    () => Object.fromEntries(table.getAllLeafColumns().map((col) => [col.id, columnWidths?.[col.id] ?? DEFAULT_COLUMN_WIDTHS[col.id] ?? 148])),
    [table, columnWidths],
  )

  const visibleColumnOrder = useMemo(
    () => columnOrder.filter((key) => columnVisibility[key] !== false),
    [columnOrder, columnVisibility]
  )

  const lastVisibleKey = useMemo(
    () => (visibleColumnOrder.length > 0 ? visibleColumnOrder[visibleColumnOrder.length - 1] : null),
    [visibleColumnOrder]
  )

  const pinnedLeftKeys = useMemo(() => {
    if (!stickyColumns) return []
    const pinnedSet = new Set(fixedLeftColumns)
    const result: string[] = []
    for (const key of visibleColumnOrder) {
      if (pinnedSet.has(key)) {
        result.push(key)
      } else {
        break
      }
    }
    return result
  }, [stickyColumns, fixedLeftColumns, visibleColumnOrder])

  const stickyOffsets = useMemo(() => {
    if (!stickyColumns) return { left: {} as Record<string, number>, lastLeftKey: null as string | null }
    const left: Record<string, number> = {}
    let offset = 0
    let lastKey: string | null = null
    for (const key of pinnedLeftKeys) {
      left[key] = offset
      offset += resolvedWidths[key] ?? 148
      lastKey = key
    }
    return { left, lastLeftKey: lastKey }
  }, [pinnedLeftKeys, stickyColumns, resolvedWidths])

  // Scroll cues
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 2
    const canLeft = el.scrollLeft > threshold
    const canRight = el.scrollLeft < el.scrollWidth - el.clientWidth - threshold
    setScrollState((prev) => (prev.canLeft === canLeft && prev.canRight === canRight ? prev : { canLeft, canRight }))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener("scroll", updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, data, columnVisibility])

  const scrollBy = useCallback((direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    })
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col" data-density={density}>
      <div className="relative min-h-0 flex-1">
        {scrollState.canLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-20 w-8 pointer-events-none bg-gradient-to-r from-slate-900/10 to-transparent dark:from-slate-950/70" />
        )}
        {scrollState.canRight && (
          <div className="absolute right-0 top-0 bottom-0 z-20 w-8 pointer-events-none bg-gradient-to-l from-slate-900/10 to-transparent dark:from-slate-950/70" />
        )}

        <div
          ref={scrollRef}
          className="h-full overflow-auto rounded-t-md border border-b-0 border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 [scrollbar-width:thin]"
        >
          <table className="w-full border-collapse text-left font-sans text-xs">
            <CirugiasGridHeader
              headerGroups={table.getHeaderGroups()}
              density={density}
              stickyColumns={stickyColumns}
              pinnedLeftKeys={pinnedLeftKeys}
              stickyOffsets={stickyOffsets}
              resolvedWidths={resolvedWidths}
              lastVisibleKey={lastVisibleKey}
            />
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <CirugiasGridRow
                    key={row.id}
                    row={row}
                    isSelected={selectedSurgeryId === row.original.id}
                    density={density}
                    stickyColumns={stickyColumns}
                    pinnedLeftKeys={pinnedLeftKeys}
                    stickyOffsets={stickyOffsets}
                    resolvedWidths={resolvedWidths}
                    cxVariant={cxVariant ?? columnContext.cxVariant ?? "b"}
                    lastVisibleKey={lastVisibleKey}
                    onSelect={onSelect}
                    onOpenExpediente={onOpenExpediente}
                  />
                ))
              ) : (
                <CirugiasEmptyState
                  onClearFilters={onClearFilters}
                  onNewSurgery={onNewSurgery}
                  hasActiveFilters={!!hasActiveFilters}
                />
              )}
            </tbody>
          </table>
        </div>

        {/* Floating scroll buttons */}
        {(scrollState.canLeft || scrollState.canRight) && (
          <div className="absolute bottom-2.5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-sm border border-slate-300/90 bg-white/90 px-1 py-1 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90">
            <button
              onClick={() => scrollBy("left")}
              disabled={!scrollState.canLeft}
              className="flex size-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-0 disabled:pointer-events-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              aria-label="Desplazar tabla a la izquierda"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => scrollBy("right")}
              disabled={!scrollState.canRight}
              className="flex size-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-0 disabled:pointer-events-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              aria-label="Desplazar tabla a la derecha"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <SurgeryPaginationFooter
        currentPage={currentPage}
        pageSize={pageSize}
        totalResults={totalResults}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize)
          setCurrentPage(1)
        }}
      />
    </div>
  )
}

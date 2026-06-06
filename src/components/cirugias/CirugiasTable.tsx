"use client"
import React, { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { CirugiaRow } from "./CirugiaRow"
import { CIRUGIAS_COLUMNS, NON_SORTABLE_KEYS } from "@/lib/cirugias.constants"
import type { Surgery, SurgeryState } from "@/types"

// ═══════════════════════════════════════════════════════════════
// Sticky column configuration
// ═══════════════════════════════════════════════════════════════

/** Column keys fixed to the left when sticky columns are enabled */
const STICKY_LEFT_KEYS = ["id", "prNumber", "expedienteNumber", "state"]

/** Approximate widths (px) for left-sticky columns — used to compute left offsets */
const STICKY_LEFT_WIDTHS: Record<string, number> = {
  id: 75,
  prNumber: 75,
  expedienteNumber: 90,
  state: 120,
}

/** Scroll step in px for the ← → buttons */
const SCROLL_STEP = 300

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface CirugiasTableProps {
  data: Surgery[]
  selectedSurgeryId: string | null
  visibleCols: Record<string, boolean>
  sortKey: string
  sortDir: "asc" | "desc"
  onSort: (key: string) => void
  getDocStatus: (id: string) => string
  getConsumoState: (id: string) => string | null
  getFacturacionStatus: (s: Surgery) => string
  getPrId: (id: string) => string | undefined
  onSelect: (id: string) => void
  onOpenExpediente: (id: string) => void
  onOpenPresupuestoDialog: (surgery: Surgery) => void
  onSetExpTab: (tab: string) => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetNewState: (s: SurgeryState) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onRecover: (s: Surgery) => void
  canFacturar: (s: Surgery) => { allowed: boolean; reason?: string }
  stickyColumns: boolean
  columnOrder: string[]
}

// ═══════════════════════════════════════════════════════════════
// Sort icon helper
// ═══════════════════════════════════════════════════════════════

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: "asc" | "desc" }) {
  if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30" />
  return sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function CirugiasTable(props: CirugiasTableProps) {
  // ── Memoize columns to prevent infinite useEffect loop ──
  // Uses columnOrder from useColumnVisibility to respect user's preferred order.
  const columns = useMemo(() => {
    const columnsMap = new Map<string, typeof CIRUGIAS_COLUMNS[number]>(CIRUGIAS_COLUMNS.map((c) => [c.key, c]))
    // Build ordered visible columns from columnOrder
    const ordered = props.columnOrder
      .map((key) => columnsMap.get(key))
      .filter((c): c is typeof CIRUGIAS_COLUMNS[number] => !!c && props.visibleCols[c.key])
    // Add any visible columns not in columnOrder (new columns)
    const orderedKeys = new Set(props.columnOrder)
    const extras = CIRUGIAS_COLUMNS.filter(
      (c) => !orderedKeys.has(c.key) && props.visibleCols[c.key]
    )
    return [...ordered, ...extras]
  }, [props.visibleCols, props.columnOrder])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: false })

  // ── Compute sticky column offsets ──
  const stickyOffsets = useMemo(() => {
    if (!props.stickyColumns) return { left: {} as Record<string, number>, lastLeftKey: null as string | null }
    const left: Record<string, number> = {}
    let offset = 0
    let lastKey: string | null = null
    for (const key of STICKY_LEFT_KEYS) {
      if (props.visibleCols[key]) {
        left[key] = offset
        offset += STICKY_LEFT_WIDTHS[key]
        lastKey = key
      }
    }
    return { left, lastLeftKey: lastKey }
  }, [props.stickyColumns, props.visibleCols])

  // ── Track scroll position for shadows and button states ──
  // Uses functional updater with reference equality check to avoid
  // unnecessary re-renders when scroll position hasn't actually changed.
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 2
    const canLeft = el.scrollLeft > threshold
    const canRight = el.scrollLeft < el.scrollWidth - el.clientWidth - threshold
    setScrollState(prev => {
      if (prev.canLeft === canLeft && prev.canRight === canRight) return prev
      return { canLeft, canRight }
    })
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
  }, [updateScrollState, props.data, columns])

  // ── Scroll by step (for ← → buttons) ──
  const scrollBy = useCallback((direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    })
  }, [])

  // ── Determine if any horizontal scroll is possible ──
  const hasHorizontalScroll = scrollState.canLeft || scrollState.canRight

  return (
    <div className="flex-1 min-h-0 relative">
      {/* ── Left shadow indicator ── */}
      {scrollState.canLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/[0.04] to-transparent pointer-events-none z-20" />
      )}

      {/* ── Right shadow indicator ── */}
      {scrollState.canRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/[0.04] to-transparent pointer-events-none z-20" />
      )}

      {/* ── Scroll container ── */}
      <div
        ref={scrollRef}
        className="h-full overflow-auto"
      >
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-muted/40">
              {columns.map((col) => {
                const isStickyLeft = props.stickyColumns && STICKY_LEFT_KEYS.includes(col.key)
                const isStickyRight = props.stickyColumns && col.key === "actions"
                const isLastLeft = props.stickyColumns && col.key === stickyOffsets.lastLeftKey

                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-2.5 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap text-[11px]",
                      !NON_SORTABLE_KEYS.includes(col.key) && "cursor-pointer select-none hover:bg-muted/70",
                      // Sticky left styles
                      isStickyLeft && "sticky z-20 bg-muted",
                      // Sticky right styles
                      isStickyRight && "sticky right-0 z-20 bg-muted",
                      // Shadow on last left-sticky column
                      isLastLeft && "shadow-[2px_0_4px_rgba(0,0,0,0.06)]",
                      // Shadow on right-sticky column
                      isStickyRight && "shadow-[-2px_0_4px_rgba(0,0,0,0.06)]",
                    )}
                    style={isStickyLeft ? { left: stickyOffsets.left[col.key] } : undefined}
                    onClick={() => !NON_SORTABLE_KEYS.includes(col.key) && props.onSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {!NON_SORTABLE_KEYS.includes(col.key) && <SortIcon col={col.key} sortKey={props.sortKey} sortDir={props.sortDir} />}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {props.data.map((s) => (
              <CirugiaRow
                key={s.id}
                surgery={s}
                isSelected={props.selectedSurgeryId === s.id}
                visibleCols={props.visibleCols}
                docStatus={props.getDocStatus(s.id)}
                consumoState={props.getConsumoState(s.id)}
                facturacionStatus={props.getFacturacionStatus(s)}
                prId={props.getPrId(s.id)}
                onSelect={props.onSelect}
                onOpenExpediente={props.onOpenExpediente}
                onOpenPresupuestoDialog={props.onOpenPresupuestoDialog}
                onSetExpTab={props.onSetExpTab}
                onSetDialogSurgery={props.onSetDialogSurgery}
                onSetNewState={props.onSetNewState}
                onSetChangeStateDialogOpen={props.onSetChangeStateDialogOpen}
                onSetChangeDateDialogOpen={props.onSetChangeDateDialogOpen}
                onSetSuspendDialogOpen={props.onSetSuspendDialogOpen}
                onSetCancelDialogOpen={props.onSetCancelDialogOpen}
                onSetNoteDialogOpen={props.onSetNoteDialogOpen}
                onSetFacturarDialogOpen={props.onSetFacturarDialogOpen}
                onRecover={props.onRecover}
                canFacturar={props.canFacturar}
                stickyColumns={props.stickyColumns}
                stickyOffsets={stickyOffsets}
                columnOrder={props.columnOrder}
              />
            ))}
            {props.data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No se encontraron cirugías con los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Horizontal scroll buttons (floating, bottom-center) ── */}
      {hasHorizontalScroll && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30">
          <button
            onClick={() => scrollBy("left")}
            disabled={!scrollState.canLeft}
            className={cn(
              "flex items-center justify-center size-7 rounded-full border bg-background/90 backdrop-blur-sm shadow-sm transition-all",
              scrollState.canLeft
                ? "opacity-80 hover:opacity-100 hover:bg-background cursor-pointer"
                : "opacity-0 pointer-events-none"
            )}
            aria-label="Desplazar tabla a la izquierda"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scrollBy("right")}
            disabled={!scrollState.canRight}
            className={cn(
              "flex items-center justify-center size-7 rounded-full border bg-background/90 backdrop-blur-sm shadow-sm transition-all",
              scrollState.canRight
                ? "opacity-80 hover:opacity-100 hover:bg-background cursor-pointer"
                : "opacity-0 pointer-events-none"
            )}
            aria-label="Desplazar tabla a la derecha"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

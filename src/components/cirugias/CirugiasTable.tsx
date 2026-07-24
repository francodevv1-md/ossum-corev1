"use client"
import React, { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { CirugiaRow } from "./CirugiaRow"
import { CirugiasEmptyState } from "./CirugiasEmptyState"
import { CIRUGIAS_COLUMNS, CIRUGIAS_COLUMN_GROUPS, DEFAULT_COLUMN_WIDTHS, NON_SORTABLE_KEYS, TABLE_COLUMN_HEADER_BASE, TABLE_COLUMN_HEADER_COMPACT, TABLE_GROUP_HEADER_BASE, TABLE_GROUP_HEADER_COMPACT } from "@/lib/cirugias.constants"
import type { GroupedHeaderPreference } from "@/hooks/useColumnVisibility"
import type { CircuitStage } from "@/lib/circuit-progress"
import type { Surgery, SurgeryState } from "@/types"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"
import type { CxOperationsClosureSignals } from "@/lib/cx-operations-derived"

/** Scroll step in px for the ← → buttons */
const SCROLL_STEP = 300

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface CirugiasTableProps {
  data: Surgery[]
  shipmentDateMap?: Record<string, string | undefined>
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
  compactMode?: boolean
  fixedLeftColumns?: string[]
  columnOrder: string[]
  columnWidths?: Record<string, number>
  groups?: GroupedHeaderPreference[]
  showGroupedHeaders?: boolean
  onClearFilters?: () => void
  onNewSurgery?: () => void
  hasActiveFilters?: boolean
  circuitProgressMap?: Record<string, CircuitStage[]>
  coordinatorCaseMap?: Record<string, CoordinatorCase | null>
  closureSignalsMap?: Record<string, CxOperationsClosureSignals>
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
  const defaultGroups = useMemo<GroupedHeaderPreference[]>(() => CIRUGIAS_COLUMN_GROUPS.map((group) => ({
    id: group.key,
    label: group.label,
    colorName: group.label,
    colorClassName: group.className,
    columns: [...group.columns],
  })), [])
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

  const visibleGroupHeaders = useMemo(() => {
    return (props.groups?.length ? props.groups : defaultGroups)
      .map((group) => ({
        ...group,
        visibleColumns: columns.filter((column) => group.columns.includes(column.key)),
      }))
      .filter((group) => group.visibleColumns.length > 0)
  }, [columns, defaultGroups, props.groups])

  const resolvedColumnWidths = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, props.columnWidths?.[column.key] ?? DEFAULT_COLUMN_WIDTHS[column.key] ?? 148])),
    [columns, props.columnWidths]
  )

  const pinnedLeftKeys = useMemo(() => {
    if (!props.stickyColumns) return [] as string[]

    const pinnedSet = new Set(props.fixedLeftColumns ?? [])
    return columns.filter((column) => pinnedSet.has(column.key)).map((column) => column.key)
  }, [columns, props.fixedLeftColumns, props.stickyColumns])

  // ── Compute sticky column offsets ──
  const stickyOffsets = useMemo(() => {
    if (!props.stickyColumns) return { left: {} as Record<string, number>, lastLeftKey: null as string | null }
    const left: Record<string, number> = {}
    let offset = 0
    let lastKey: string | null = null
    for (const key of pinnedLeftKeys) {
      if (props.visibleCols[key]) {
        left[key] = offset
        offset += resolvedColumnWidths[key] ?? DEFAULT_COLUMN_WIDTHS[key] ?? 148
        lastKey = key
      }
    }
    return { left, lastLeftKey: lastKey }
  }, [pinnedLeftKeys, props.stickyColumns, props.visibleCols, resolvedColumnWidths])

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
    <div className="relative h-full min-h-0">
      {/* ── Left shadow indicator ── */}
      {scrollState.canLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-20 w-10 pointer-events-none bg-gradient-to-r from-slate-900/10 via-slate-700/5 to-transparent dark:from-slate-950/70 dark:via-slate-900/35" />
      )}

      {/* ── Right shadow indicator ── */}
      {scrollState.canRight && (
        <div className="absolute right-0 top-0 bottom-0 z-20 w-10 pointer-events-none bg-gradient-to-l from-slate-900/10 via-slate-700/5 to-transparent dark:from-slate-950/70 dark:via-slate-900/35" />
      )}

      {/* ── Scroll container ── */}
      <div
        ref={scrollRef}
        className="h-full overflow-auto rounded-md border border-slate-200/80 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] [scrollbar-color:rgba(100,116,139,0.45)_transparent] [scrollbar-width:thin] dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:[scrollbar-color:rgba(148,163,184,0.35)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/45 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500/55 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/50 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500/65"
      >
        <table className="w-full border-collapse text-sm [&_tbody_tr:nth-child(even)]:bg-slate-50/35 dark:[&_tbody_tr:nth-child(even)]:bg-slate-900/30">
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: resolvedColumnWidths[col.key], minWidth: resolvedColumnWidths[col.key] }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
             {props.showGroupedHeaders !== false && visibleGroupHeaders.length > 0 && (
                <tr className="border-b border-slate-300/90 bg-slate-100/95 text-slate-700 shadow-[inset_0_-1px_0_rgba(148,163,184,0.45)] backdrop-blur-sm dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-200 dark:shadow-[inset_0_-1px_0_rgba(30,41,59,0.85)]">
                 {visibleGroupHeaders.map((group) => (
                   <th
                     key={group.id}
                     colSpan={group.visibleColumns.length}
                     className={cn(
                        props.compactMode ? TABLE_GROUP_HEADER_COMPACT : TABLE_GROUP_HEADER_BASE,
                        group.colorClassName,
                      )}
                   >
                     {group.label}
                   </th>
                 ))}
               </tr>
             )}
             <tr className="border-b border-slate-300/90 bg-slate-50/95 text-slate-700 shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-100 dark:shadow-[0_1px_0_rgba(15,23,42,0.95)]">
              {columns.map((col) => {
                const isStickyLeft = props.stickyColumns && pinnedLeftKeys.includes(col.key)
                const isStickyRight = props.stickyColumns && col.key === "actions"
                const isLastLeft = props.stickyColumns && col.key === stickyOffsets.lastLeftKey

                return (
                  <th
                    key={col.key}
                    className={cn(
                       props.compactMode ? TABLE_COLUMN_HEADER_COMPACT : TABLE_COLUMN_HEADER_BASE,
                        !NON_SORTABLE_KEYS.includes(col.key) && "cursor-pointer select-none hover:bg-slate-100/90 dark:hover:bg-slate-800/90",
                       // Sticky left styles
                         isStickyLeft && "sticky z-20 bg-slate-50 dark:bg-slate-900",
                       // Sticky right styles
                       isStickyRight && "sticky right-0 z-20 bg-slate-50 dark:bg-slate-900",
                       // Shadow on last left-sticky column
                       isLastLeft && "shadow-[2px_0_6px_rgba(15,23,42,0.08)] dark:shadow-[2px_0_8px_rgba(2,6,23,0.65)]",
                       // Shadow on right-sticky column
                       isStickyRight && "shadow-[-2px_0_6px_rgba(15,23,42,0.08)] dark:shadow-[-2px_0_8px_rgba(2,6,23,0.65)]",
                     )}
                    style={{
                      width: resolvedColumnWidths[col.key],
                      minWidth: resolvedColumnWidths[col.key],
                      ...(isStickyLeft ? { left: stickyOffsets.left[col.key] } : {}),
                    }}
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
            {props.data.map((s, idx) => (
              <CirugiaRow
                key={s.id}
                surgery={s}
                shipmentDate={props.shipmentDateMap?.[s.id]}
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
                compactMode={!!props.compactMode}
                stickyOffsets={stickyOffsets}
                pinnedLeftKeys={pinnedLeftKeys}
                columnOrder={props.columnOrder}
                circuitProgress={props.circuitProgressMap?.[s.id]}
                rowIndex={idx}
                coordinatorCase={props.coordinatorCaseMap?.[s.id] ?? null}
                closureSignals={props.closureSignalsMap?.[s.id]}
              />
            ))}
            {props.data.length === 0 && (
              <CirugiasEmptyState
                onClearFilters={props.onClearFilters}
                onNewSurgery={props.onNewSurgery}
                hasActiveFilters={!!props.hasActiveFilters}
              />
            )}
          </tbody>
        </table>
      </div>

      {/* ── Horizontal scroll buttons (floating, bottom-center) ── */}
      {hasHorizontalScroll && (
        <div className="absolute bottom-2.5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-sm border border-slate-300/90 bg-white/85 px-1 py-1 shadow-sm backdrop-blur-sm dark:border-slate-700/90 dark:bg-slate-900/90 dark:shadow-[0_8px_24px_rgba(2,6,23,0.35)]">
          <button
            onClick={() => scrollBy("left")}
            disabled={!scrollState.canLeft}
            className={cn(
                "flex size-7 items-center justify-center rounded-sm border border-slate-300 bg-white/95 text-slate-700 backdrop-blur-sm shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200",
               scrollState.canLeft
                 ? "cursor-pointer opacity-90 hover:bg-background dark:hover:bg-slate-800"
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
                "flex size-7 items-center justify-center rounded-sm border border-slate-300 bg-white/95 text-slate-700 backdrop-blur-sm shadow-sm transition-all dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200",
               scrollState.canRight
                 ? "cursor-pointer opacity-90 hover:bg-background dark:hover:bg-slate-800"
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

"use client"

import React from "react"
import { Filter, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { SmartSurgerySearch, type SmartSurgerySearchProps } from "./SmartSurgerySearch"

interface MobileCirugiasToolbarProps extends SmartSurgerySearchProps {
  activeFilterCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void
  onOpenFilters: () => void
  onNewSurgery: () => void
  resultCount: number
}

/**
 * ponytail: header is intentionally two rows:
 *   row 1 = title + new-surgery FAB (no overlap with the back/menu triggers
 *          that the rest of the shell owns)
 *   row 2 = search + filter pill (no extra chrome)
 *   counter stays in the body list, never as its own row.
 */
export function MobileCirugiasToolbar({
  surgeries,
  chips,
  onChipsChange,
  activeFilterCount,
  hasActiveFilters,
  onClearFilters,
  onOpenFilters,
  onNewSurgery,
  resultCount,
}: MobileCirugiasToolbarProps) {
  return (
    <header
      className="sticky top-0 z-30 flex flex-col gap-2 border-b border-slate-200 bg-white/95 px-3 pb-2.5 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/80"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Cirugías
          <span className="ml-2 align-middle text-xs font-medium tabular-nums text-slate-400 dark:text-slate-500">
            {resultCount}
          </span>
        </h1>

        <button
          type="button"
          onClick={onNewSurgery}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/30",
            "transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40",
          )}
          aria-label="Nueva cirugía"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SmartSurgerySearch surgeries={surgeries} chips={chips} onChipsChange={onChipsChange} />
        </div>

        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "transition-[transform,background-color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-600/40",
            activeFilterCount > 0
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          )}
          aria-label={`Abrir filtros${activeFilterCount > 0 ? ` (${activeFilterCount} activos)` : ""}`}
        >
          <Filter className="h-4 w-4" aria-hidden />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {hasActiveFilters ? (
        <div className="-mx-3 flex items-center justify-between px-3">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Filtros activos
          </span>
          <button
            type="button"
            onClick={onClearFilters}
            className="text-[11px] font-semibold text-blue-700 transition hover:underline dark:text-blue-400"
          >
            Limpiar
          </button>
        </div>
      ) : null}
    </header>
  )
}

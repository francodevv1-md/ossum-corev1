"use client"

import React from "react"
import { Filter, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileCirugiasToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  activeFilterCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void
  onOpenFilters: () => void
  onNewSurgery: () => void
  resultCount: number
}

export function MobileCirugiasToolbar({
  search,
  onSearchChange,
  activeFilterCount,
  hasActiveFilters,
  onClearFilters,
  onOpenFilters,
  onNewSurgery,
  resultCount,
}: MobileCirugiasToolbarProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 pb-2 pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center gap-2">
        <label className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar paciente, cirujano, institución…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "h-10 w-full rounded-md border border-slate-300 bg-white pl-8 pr-9 text-sm",
              "placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20",
              "dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:border-blue-400",
            )}
            aria-label="Buscar cirugías"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium",
            activeFilterCount > 0
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
          )}
          aria-label={`Abrir filtros${activeFilterCount > 0 ? ` (${activeFilterCount} activos)` : ""}`}
        >
          <Filter className="h-4 w-4" aria-hidden />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          <strong className="font-semibold text-slate-700 dark:text-slate-200">{resultCount}</strong>{" "}
          {resultCount === 1 ? "cirugía" : "cirugías"}
        </span>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onNewSurgery}
        className={cn(
          "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30",
          "inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30",
          "transition active:scale-95 hover:bg-blue-700",
        )}
        aria-label="Nueva cirugía"
      >
        <Plus className="h-5 w-5" aria-hidden />
      </button>
    </div>
  )
}
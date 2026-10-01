"use client"

import React from "react"
import { ChevronLeft, Filter, Plus, Search, X } from "lucide-react"
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
  onBack?: () => void
  title?: string
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
  onBack,
  title = "Cirugías",
}: MobileCirugiasToolbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
        "dark:border-slate-800 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/80",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 transition active:scale-95 active:bg-slate-100 hover:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-800 dark:hover:bg-slate-800"
            aria-label="Volver al listado"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : null}

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        <button
          type="button"
          onClick={onNewSurgery}
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/30",
            "transition active:scale-90 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40",
          )}
          aria-label="Nueva cirugía"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2">
        <label className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar paciente, cirujano, institución…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "h-12 w-full rounded-full border border-slate-200 bg-slate-100 pl-10 pr-10 text-sm",
              "placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20",
              "dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-950",
            )}
            aria-label="Buscar cirugías"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition active:scale-90 hover:bg-slate-200 dark:hover:bg-slate-800"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            "relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium",
            "transition active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-600/40",
            activeFilterCount > 0
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          )}
          aria-label={`Abrir filtros${activeFilterCount > 0 ? ` (${activeFilterCount} activos)` : ""}`}
        >
          <Filter className="h-4 w-4" aria-hidden />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex items-center justify-between px-4 pb-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          <strong className="font-semibold text-slate-700 dark:text-slate-200">{resultCount}</strong>{" "}
          {resultCount === 1 ? "cirugía" : "cirugías"}
        </span>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-medium text-blue-700 transition hover:underline dark:text-blue-400"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    </header>
  )
}
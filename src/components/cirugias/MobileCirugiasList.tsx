"use client"

import React, { useState } from "react"
import { ChevronDown, Inbox, Loader2 } from "lucide-react"
import type { Surgery } from "@/types"
import { MobileCirugiaCard } from "./MobileCirugiaCard"
import { cn } from "@/lib/utils"

interface QuickActionHandlers {
  onChangeState?: (s: Surgery) => void
  onAddNote?: (s: Surgery) => void
  onFacturar?: (s: Surgery) => void
  onSuspender?: (s: Surgery) => void
  onCancelar?: (s: Surgery) => void
}

interface MobileCirugiasListProps {
  surgeries: Surgery[]
  onOpen: (surgery: Surgery) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  quickActions?: QuickActionHandlers
  /** Initial visible item count. */
  pageSize?: number
  /** Items added each time the user taps "Cargar más". */
  pageStep?: number
}

export function MobileCirugiasList({
  surgeries,
  onOpen,
  hasActiveFilters,
  onClearFilters,
  quickActions,
  pageSize = 25,
  pageStep = 25,
}: MobileCirugiasListProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [loading, setLoading] = useState(false)

  // When the underlying list shrinks (filters change) we never want to keep an
  // inflated visibleCount. Resync when total drops below the window.
  const effectiveVisible = Math.min(visibleCount, surgeries.length)
  const hasMore = effectiveVisible < surgeries.length
  const visible = surgeries.slice(0, effectiveVisible)

  const loadMore = () => {
    setLoading(true)
    // tiny artificial delay so the spinner is visible — gives the action weight
    window.setTimeout(() => {
      setVisibleCount((prev) => prev + pageStep)
      setLoading(false)
    }, 180)
  }

  if (surgeries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800/50">
          <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No hay cirugías para mostrar
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? "Probá ajustando los filtros activos."
              : "Cuando se carguen cirugías aparecerán acá."}
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <ul className="flex flex-col gap-2.5 px-3 pt-2" role="list">
        {visible.map((surgery, idx) => (
          <li key={surgery.id} style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
            <MobileCirugiaCard
              surgery={surgery}
              onOpen={onOpen}
              {...(quickActions ?? {})}
            />
          </li>
        ))}
      </ul>

      {hasMore ? (
        <div className="flex justify-center px-3 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700",
              "shadow-sm transition active:scale-95 hover:border-slate-300 hover:bg-slate-50",
              "disabled:cursor-not-allowed disabled:opacity-70",
              "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
            {loading
              ? "Cargando…"
              : `Cargar ${Math.min(pageStep, surgeries.length - effectiveVisible)} más (${surgeries.length - effectiveVisible} restantes)`}
          </button>
        </div>
      ) : (
        <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]" aria-hidden />
      )}
    </div>
  )
}
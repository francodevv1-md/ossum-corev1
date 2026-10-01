"use client"

import React from "react"
import type { Surgery } from "@/types"
import { MobileCirugiaCard } from "./MobileCirugiaCard"
import { Inbox } from "lucide-react"

interface MobileCirugiasListProps {
  surgeries: Surgery[]
  onOpen: (surgery: Surgery) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function MobileCirugiasList({
  surgeries,
  onOpen,
  hasActiveFilters,
  onClearFilters,
}: MobileCirugiasListProps) {
  if (surgeries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No hay cirugías para mostrar
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? "Probabilí ajustando los filtros activos."
              : "Cuando se carguen cirugías aparecerán acá."}
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 p-2 pb-24" role="list">
      {surgeries.map((surgery) => (
        <li key={surgery.id}>
          <MobileCirugiaCard surgery={surgery} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}
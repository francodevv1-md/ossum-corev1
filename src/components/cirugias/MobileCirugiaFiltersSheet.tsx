"use client"

import React from "react"
import { FilterX } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

interface MobileCirugiaFiltersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearAll: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  selectedPresetLabel?: string | null
}

export function MobileCirugiaFiltersSheet({
  open,
  onOpenChange,
  onClearAll,
  hasActiveFilters,
  activeFilterCount,
  selectedPresetLabel,
}: MobileCirugiaFiltersSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

        <SheetHeader className="px-5 pt-3">
          <SheetTitle className="text-base">Filtros</SheetTitle>
          <SheetDescription>
            {hasActiveFilters
              ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}.`
              : "No tenés filtros aplicados."}
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-2 pt-1">
          {selectedPresetLabel ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <span className="font-semibold">Preset activo: </span>
              <span>{selectedPresetLabel}</span>
            </div>
          ) : null}

          {!hasActiveFilters && !selectedPresetLabel ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Aplicá filtros escribiendo en el buscador o usando un preset para acotar la lista.
            </p>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Los filtros detallados (estado, preparación, fechas, coordinador, etc.) están en la versión desktop.
            Desde acá podés limpiarlos de una vez para volver al listado completo.
          </p>
        </div>

        <div className="mt-2 flex gap-2 border-t border-slate-200 px-5 pt-3 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={!hasActiveFilters}
            onClick={() => {
              onClearAll()
              onOpenChange(false)
            }}
          >
            <FilterX className="mr-1.5 h-4 w-4" aria-hidden />
            Limpiar filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
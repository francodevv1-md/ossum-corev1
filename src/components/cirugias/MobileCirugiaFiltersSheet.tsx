"use client"

import React, { useState } from "react"
import { ChevronDown, FilterX } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  STATE_FILTER_OPTIONS,
  PREP_FILTER_OPTIONS,
  DOC_FILTER_OPTIONS,
  FACT_FILTER_OPTIONS,
  CX_STATE_COLORS,
} from "@/lib/cirugias.constants"

interface MobileCirugiaFiltersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearAll: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  selectedPresetLabel?: string | null
  stateFilters: string[]
  onStateFilters: (next: string[]) => void
  prepFilters: string[]
  onPrepFilters: (next: string[]) => void
  docFilters: string[]
  onDocFilters: (next: string[]) => void
  factFilters: string[]
  onFactFilters: (next: string[]) => void
  urgenteFilter: boolean | null
  onUrgenteFilter: (next: boolean | null) => void
}

function toggleValue(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-200 py-3 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
          {count && count > 0 ? (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? <div className="mt-2 space-y-1.5">{children}</div> : null}
    </div>
  )
}

function FilterRow({
  label,
  checked,
  onToggle,
  colorClass,
}: {
  label: string
  checked: boolean
  onToggle: () => void
  colorClass?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition active:scale-[0.99] active:bg-slate-50 hover:bg-slate-50 dark:active:bg-slate-800 dark:hover:bg-slate-800">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="h-5 w-5 shrink-0"
        aria-label={label}
      />
      {colorClass ? (
        <span
          className={cn(
            "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide leading-none",
            colorClass,
          )}
        >
          {label}
        </span>
      ) : (
        <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
      )}
    </label>
  )
}

export function MobileCirugiaFiltersSheet({
  open,
  onOpenChange,
  onClearAll,
  hasActiveFilters,
  activeFilterCount,
  selectedPresetLabel,
  stateFilters,
  onStateFilters,
  prepFilters,
  onPrepFilters,
  docFilters,
  onDocFilters,
  factFilters,
  onFactFilters,
  urgenteFilter,
  onUrgenteFilter,
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
              : "Tocá las opciones para acotar la lista."}
          </SheetDescription>
        </SheetHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5 pb-2">
          {selectedPresetLabel ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <span className="font-semibold">Preset activo: </span>
              <span>{selectedPresetLabel}</span>
            </div>
          ) : null}

          <Section title="Estado" count={stateFilters.length}>
            {STATE_FILTER_OPTIONS.map((state) => (
              <FilterRow
                key={state}
                label={state}
                checked={stateFilters.includes(state)}
                onToggle={() => onStateFilters(toggleValue(stateFilters, state))}
                colorClass={CX_STATE_COLORS[state]}
              />
            ))}
          </Section>

          <Section title="Preparación" count={prepFilters.length}>
            {PREP_FILTER_OPTIONS.map((state) => (
              <FilterRow
                key={state}
                label={state}
                checked={prepFilters.includes(state)}
                onToggle={() => onPrepFilters(toggleValue(prepFilters, state))}
              />
            ))}
          </Section>

          <Section title="Documentación" count={docFilters.length}>
            {DOC_FILTER_OPTIONS.map((state) => (
              <FilterRow
                key={state}
                label={state}
                checked={docFilters.includes(state)}
                onToggle={() => onDocFilters(toggleValue(docFilters, state))}
              />
            ))}
          </Section>

          <Section title="Facturación" count={factFilters.length}>
            {FACT_FILTER_OPTIONS.map((opt) => (
              <FilterRow
                key={opt.value}
                label={opt.label}
                checked={factFilters.includes(opt.value)}
                onToggle={() => onFactFilters(toggleValue(factFilters, opt.value))}
              />
            ))}
          </Section>

          <Section title="Urgente" count={urgenteFilter !== null ? 1 : 0}>
            <FilterRow
              label="Solo cirugías urgentes"
              checked={urgenteFilter === true}
              onToggle={() => onUrgenteFilter(urgenteFilter === true ? null : true)}
            />
          </Section>
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
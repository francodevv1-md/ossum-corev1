"use client"

import { useRef, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  EMPTY_ADVANCED_FILTERS,
  buildAdvancedFilterChips,
  countActiveAdvancedFilters,
  normalizeAdvancedFilters,
  removeAdvancedFilter,
  validateAdvancedFilters,
  type AdvancedFilterErrors,
  type AdvancedFilters,
  type FilterIdentity,
} from "@/components/coordinadores/coordination-filtering"

function cloneFilters(filters: AdvancedFilters): AdvancedFilters {
  return {
    ...filters,
    surgeryDate: { ...filters.surgeryDate },
    availabilityDate: { ...filters.availabilityDate },
    institution: filters.institution ? { ...filters.institution } : null,
    client: filters.client ? { ...filters.client } : null,
  }
}

export function createEmptyAdvancedFilters(): AdvancedFilters {
  return cloneFilters(EMPTY_ADVANCED_FILTERS)
}

function identityValue(identity: FilterIdentity): string {
  return `${identity.kind}:${identity.value}`
}

function findIdentity(options: readonly FilterIdentity[], value: string): FilterIdentity | null {
  return options.find((option) => identityValue(option) === value) ?? null
}

const controlClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function CoordinationAdvancedFilters({
  applied,
  institutionOptions,
  clientOptions,
  stateOptions,
  onApply,
  onClearAdvanced,
}: {
  applied: AdvancedFilters
  institutionOptions: readonly FilterIdentity[]
  clientOptions: readonly FilterIdentity[]
  stateOptions: readonly string[]
  onApply: (filters: AdvancedFilters) => void
  onClearAdvanced: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AdvancedFilters>(() => cloneFilters(applied))
  const [errors, setErrors] = useState<AdvancedFilterErrors>({})
  const surgeryFromRef = useRef<HTMLInputElement>(null)
  const availabilityFromRef = useRef<HTMLInputElement>(null)
  const count = countActiveAdvancedFilters(applied)
  const chips = buildAdvancedFilterChips(applied)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setDraft(cloneFilters(applied))
      setErrors({})
    } else {
      setDraft(cloneFilters(applied))
      setErrors({})
    }
  }

  const applyDraft = () => {
    const nextErrors = validateAdvancedFilters(draft)
    setErrors(nextErrors)
    if (nextErrors.surgeryDate) {
      surgeryFromRef.current?.focus()
      return
    }
    if (nextErrors.availabilityDate) {
      availabilityFromRef.current?.focus()
      return
    }
    onApply(normalizeAdvancedFilters(draft))
    setOpen(false)
  }

  const clearAdvanced = () => {
    const empty = createEmptyAdvancedFilters()
    setDraft(empty)
    setErrors({})
    onClearAdvanced()
  }

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" aria-label={count ? `Más filtros, ${count} activos` : "Más filtros"}>
            {count ? `Más filtros · ${count}` : "Más filtros"}
          </Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0" data-coordination-advanced-dialog="viewport-bounded">
          <DialogHeader className="shrink-0 flex-row items-start justify-between gap-3 border-b px-4 py-3 text-left sm:px-5">
            <div className="space-y-2 py-1">
              <DialogTitle>Más filtros</DialogTitle>
              <DialogDescription>Afiná los casos de tu bandeja</DialogDescription>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Cerrar">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>CX</span>
              <input className={controlClass} value={draft.cx} onChange={(event) => setDraft((current) => ({ ...current, cx: event.target.value }))} />
            </label>

            <fieldset className="space-y-2" aria-describedby={errors.surgeryDate ? "surgery-range-error" : undefined}>
              <legend className="text-sm font-semibold text-slate-800">Fecha de cirugía</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Fecha de cirugía desde</span><input ref={surgeryFromRef} type="date" className={controlClass} value={draft.surgeryDate.from} aria-invalid={Boolean(errors.surgeryDate)} onChange={(event) => setDraft((current) => ({ ...current, surgeryDate: { ...current.surgeryDate, from: event.target.value } }))} /></label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Fecha de cirugía hasta</span><input type="date" className={controlClass} value={draft.surgeryDate.to} aria-invalid={Boolean(errors.surgeryDate)} onChange={(event) => setDraft((current) => ({ ...current, surgeryDate: { ...current.surgeryDate, to: event.target.value } }))} /></label>
              </div>
              {errors.surgeryDate ? <p id="surgery-range-error" role="alert" className="text-sm font-medium text-red-700">{errors.surgeryDate}</p> : null}
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Institución</span><select className={controlClass} value={draft.institution ? identityValue(draft.institution) : ""} onChange={(event) => setDraft((current) => ({ ...current, institution: findIdentity(institutionOptions, event.target.value) }))}><option value="">Todas</option>{institutionOptions.map((option) => <option key={identityValue(option)} value={identityValue(option)}>{option.label}</option>)}</select></label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Cliente</span><select className={controlClass} value={draft.client ? identityValue(draft.client) : ""} onChange={(event) => setDraft((current) => ({ ...current, client: findIdentity(clientOptions, event.target.value) }))}><option value="">Todos</option>{clientOptions.map((option) => <option key={identityValue(option)} value={identityValue(option)}>{option.label}</option>)}</select></label>
            </div>

            <fieldset className="space-y-2" aria-describedby={errors.availabilityDate ? "availability-range-error" : undefined}>
              <legend className="text-sm font-semibold text-slate-800">Fecha de disponibilidad del material</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Disponibilidad desde</span><input ref={availabilityFromRef} type="date" className={controlClass} value={draft.availabilityDate.from} aria-invalid={Boolean(errors.availabilityDate)} onChange={(event) => setDraft((current) => ({ ...current, availabilityDate: { ...current.availabilityDate, from: event.target.value } }))} /></label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Disponibilidad hasta</span><input type="date" className={controlClass} value={draft.availabilityDate.to} aria-invalid={Boolean(errors.availabilityDate)} onChange={(event) => setDraft((current) => ({ ...current, availabilityDate: { ...current.availabilityDate, to: event.target.value } }))} /></label>
              </div>
              {errors.availabilityDate ? <p id="availability-range-error" role="alert" className="text-sm font-medium text-red-700">{errors.availabilityDate}</p> : null}
            </fieldset>

            <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>Estado</span><select className={controlClass} value={draft.cxState} onChange={(event) => setDraft((current) => ({ ...current, cxState: event.target.value }))}><option value="">Todos</option>{stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
          </div>

          <DialogFooter className="shrink-0 border-t bg-white px-4 py-3 sm:px-5">
            <Button type="button" variant="ghost" className="min-h-11" onClick={clearAdvanced}>Limpiar</Button>
            <DialogClose asChild><Button type="button" variant="outline" className="min-h-11">Cancelar</Button></DialogClose>
            <Button type="button" className="min-h-11" onClick={applyDraft}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {chips.length ? (
        <div className="flex min-w-0 flex-wrap gap-2" aria-label="Filtros avanzados aplicados">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 pl-3 text-xs font-medium text-slate-700">
              <span className="truncate">{chip.label}</span>
              <button type="button" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={chip.removeLabel} onClick={() => onApply(removeAdvancedFilter(applied, chip.key))}><X className="size-3.5" aria-hidden="true" /></button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

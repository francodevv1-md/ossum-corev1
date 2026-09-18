"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export const CX_OPERATION_PRESETS = {
  attention: { label: "Necesitan atención" },
  urgent: { label: "Urgentes" },
  noCxDate: { label: "Sin fecha CX" },
  preparationPending: { label: "Preparación pendiente" },
  documentationIncomplete: { label: "Documentación incompleta" },
  withoutPr: { label: "Sin PR" },
  withoutConsumption: { label: "Sin consumo" },
  withoutInvoice: { label: "Sin factura" },
} as const

export type CxOperationPresetKey = keyof typeof CX_OPERATION_PRESETS

export type CxOperationPresetSetters = {
  setNeedsAttention: (value: boolean) => void
  setUrgenteFilter: (value: boolean | null) => void
  setSinFechaCx: (value: boolean) => void
  setPrepFilters: (value: string[]) => void
  setDocFilters: (value: string[]) => void
  setConPrFilter: (value: "con" | "sin" | null) => void
  setConConsumoFilter: (value: "con" | "sin" | null) => void
  setConFacturaFilter: (value: "con" | "sin" | null) => void
}

export type CxOperationPresetState = {
  needsAttention: boolean
  urgenteFilter: boolean | null
  sinFechaCx: boolean
  prepFilters: string[]
  docFilters: string[]
  conPrFilter: "con" | "sin" | null
  conConsumoFilter: "con" | "sin" | null
  conFacturaFilter: "con" | "sin" | null
}

/** Values introduced by one transient preset, plus the prior scalar values it replaced. */
export type CxOperationPresetOwnership = {
  key: CxOperationPresetKey
  previous: Partial<CxOperationPresetState>
  addedPrepFilters?: string[]
  addedDocFilters?: string[]
}

/** Existing hook clauses represented as transient toolbar presets. */
export function applyCxOperationPreset(
  key: CxOperationPresetKey,
  current: CxOperationPresetState,
  setters: CxOperationPresetSetters,
): CxOperationPresetOwnership {
  if (key === "attention") {
    setters.setNeedsAttention(true)
    return { key, previous: { needsAttention: current.needsAttention } }
  }
  if (key === "urgent") {
    setters.setUrgenteFilter(true)
    return { key, previous: { urgenteFilter: current.urgenteFilter } }
  }
  if (key === "noCxDate") {
    setters.setSinFechaCx(true)
    return { key, previous: { sinFechaCx: current.sinFechaCx } }
  }
  if (key === "preparationPending") {
    const addedPrepFilters = ["Sin preparar", "Congelado con faltantes"].filter((value) => !current.prepFilters.includes(value))
    setters.setPrepFilters([...current.prepFilters, ...addedPrepFilters])
    return { key, previous: {}, addedPrepFilters }
  }
  if (key === "documentationIncomplete") {
    const addedDocFilters = ["Incompleta"].filter((value) => !current.docFilters.includes(value))
    setters.setDocFilters([...current.docFilters, ...addedDocFilters])
    return { key, previous: {}, addedDocFilters }
  }
  if (key === "withoutPr") {
    setters.setConPrFilter("sin")
    return { key, previous: { conPrFilter: current.conPrFilter } }
  }
  if (key === "withoutConsumption") {
    setters.setConConsumoFilter("sin")
    return { key, previous: { conConsumoFilter: current.conConsumoFilter } }
  }
  setters.setConFacturaFilter("sin")
  return { key, previous: { conFacturaFilter: current.conFacturaFilter } }
}

export function getCxOperationPresetStateAfterClear(
  ownership: CxOperationPresetOwnership,
  current: CxOperationPresetState,
): CxOperationPresetState {
  if (ownership.key === "attention") return { ...current, needsAttention: ownership.previous.needsAttention ?? false }
  if (ownership.key === "urgent") return { ...current, urgenteFilter: ownership.previous.urgenteFilter ?? null }
  if (ownership.key === "noCxDate") return { ...current, sinFechaCx: ownership.previous.sinFechaCx ?? false }
  if (ownership.key === "preparationPending") return { ...current, prepFilters: current.prepFilters.filter((value) => !ownership.addedPrepFilters?.includes(value)) }
  if (ownership.key === "documentationIncomplete") return { ...current, docFilters: current.docFilters.filter((value) => !ownership.addedDocFilters?.includes(value)) }
  if (ownership.key === "withoutPr") return { ...current, conPrFilter: ownership.previous.conPrFilter ?? null }
  if (ownership.key === "withoutConsumption") return { ...current, conConsumoFilter: ownership.previous.conConsumoFilter ?? null }
  return { ...current, conFacturaFilter: ownership.previous.conFacturaFilter ?? null }
}

export function clearCxOperationPreset(
  ownership: CxOperationPresetOwnership,
  current: CxOperationPresetState,
  setters: CxOperationPresetSetters,
): CxOperationPresetState {
  const next = getCxOperationPresetStateAfterClear(ownership, current)
  if (ownership.key === "attention") setters.setNeedsAttention(next.needsAttention)
  if (ownership.key === "urgent") setters.setUrgenteFilter(next.urgenteFilter)
  if (ownership.key === "noCxDate") setters.setSinFechaCx(next.sinFechaCx)
  if (ownership.key === "preparationPending") setters.setPrepFilters(next.prepFilters)
  if (ownership.key === "documentationIncomplete") setters.setDocFilters(next.docFilters)
  if (ownership.key === "withoutPr") setters.setConPrFilter(next.conPrFilter)
  if (ownership.key === "withoutConsumption") setters.setConConsumoFilter(next.conConsumoFilter)
  if (ownership.key === "withoutInvoice") setters.setConFacturaFilter(next.conFacturaFilter)
  return next
}

type CxOperationPresetsProps = {
  selectedPreset: CxOperationPresetKey | null
  onApply: (key: CxOperationPresetKey) => void
  onClear: () => void
}

export function CxOperationPresets({ selectedPreset, onApply, onClear }: CxOperationPresetsProps) {
  return (
    <div className="flex max-w-full items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:thin]" aria-label="Presets operativos">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Operación</span>
      {(Object.keys(CX_OPERATION_PRESETS) as CxOperationPresetKey[]).map((key) => (
        <Button
          key={key}
          type="button"
          variant={selectedPreset === key ? "default" : "outline"}
          size="sm"
          className="h-7 shrink-0 rounded-sm px-2 text-[11px] font-semibold"
          onClick={() => onApply(key)}
        >
          {CX_OPERATION_PRESETS[key].label}
        </Button>
      ))}
      {selectedPreset ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 gap-1 rounded-sm px-2 text-[11px]" onClick={onClear}>
          <X className="size-3" /> Limpiar preset
        </Button>
      ) : null}
    </div>
  )
}

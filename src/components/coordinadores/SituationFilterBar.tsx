import { cn } from "@/lib/utils"

type SituationKey = "Falta información" | "Necesita definición" | "Hay un problema" | "Fuera de plazo"

type Props = {
  activeFilter: string
  onToggle: (value: SituationKey) => void
  counts: {
    missing: number
    decision: number
    problem: number
    overdue: number
  }
}

const FILTERS: ReadonlyArray<{
  key: SituationKey
  label: string
  countKey: keyof Props["counts"]
  indicatorClass: string
  activeBgClass: string
  textTone: string
}> = [
  {
    key: "Falta información",
    label: "Falta información",
    countKey: "missing",
    indicatorClass: "op-dot-warning",
    activeBgClass: "op-sit-warning font-semibold",
    textTone: "op-text-secondary",
  },
  {
    key: "Necesita definición",
    label: "Necesita definición",
    countKey: "decision",
    indicatorClass: "op-dot-info",
    activeBgClass: "op-sit-info font-semibold",
    textTone: "op-text-secondary",
  },
  {
    key: "Hay un problema",
    label: "Hay un problema",
    countKey: "problem",
    indicatorClass: "op-dot-danger",
    activeBgClass: "op-sit-danger font-semibold",
    textTone: "op-text-secondary",
  },
  {
    key: "Fuera de plazo",
    label: "Fuera de plazo",
    countKey: "overdue",
    indicatorClass: "op-dot-danger animate-pulse",
    activeBgClass: "op-sit-danger font-bold",
    textTone: "text-[var(--op-danger)]",
  },
]

export function SituationFilterBar({ activeFilter, onToggle, counts }: Props) {
  return (
    <section
      aria-labelledby="attention-heading"
      className="grid gap-2 bg-[var(--op-secondary)] p-2 rounded-xl border border-[var(--op-border-subtle)] sm:grid-cols-2 lg:grid-cols-4"
    >
      <span id="attention-heading" className="sr-only">Filtros de atención</span>
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key
        const count = counts[filter.countKey]

        return (
          <button
            key={filter.key}
            type="button"
            className={cn(
              "flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-left rounded-lg transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-primary-highlight)]",
              isActive
                ? cn("border shadow-sm", filter.activeBgClass)
                : "border border-transparent bg-[var(--op-surface)] hover:bg-[var(--op-hover)] border-[var(--op-border-default)] shadow-xs",
            )}
            onClick={() => onToggle(filter.key)}
            aria-pressed={isActive}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("size-2 rounded-full shrink-0", filter.indicatorClass)} aria-hidden="true" />
              <span className={cn("text-xs font-medium truncate", isActive ? "text-current" : filter.textTone)}>
                {filter.label}
              </span>
            </div>
            <strong className="text-sm font-bold tabular-nums ml-1">{count}</strong>
          </button>
        )
      })}
    </section>
  )
}



"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { MetricCounts, MetricKey } from "@/components/coordinadores/coordination-filtering"

const METRICS: ReadonlyArray<{ key: MetricKey; label: string }> = [
  { key: "put-date", label: "Poner fecha" },
  { key: "overdue", label: "Fuera de plazo" },
  { key: "coordinated", label: "Coordinadas" },
  { key: "in-transit", label: "En tránsito" },
]

export function CoordinationMetricFilters({
  counts,
  selected,
  onToggle,
}: {
  counts: MetricCounts
  selected: ReadonlySet<MetricKey>
  onToggle: (metric: MetricKey) => void
}) {
  return (
    <section
      className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4"
      role="group"
      aria-label="Filtros por métricas de coordinación"
      data-coordination-metrics="compact-responsive"
    >
      {METRICS.map(({ key, label }) => {
        const pressed = selected.has(key)
        const count = counts[key]
        return (
          <button
            key={key}
            type="button"
            aria-pressed={pressed}
            aria-label={`${label}, ${count} ${count === 1 ? "caso" : "casos"}`}
            onClick={() => onToggle(key)}
            className={cn(
              "relative flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              pressed
                ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100",
              key === "overdue" && !pressed && count > 0 && "border-red-200 bg-red-50 text-red-800",
            )}
          >
            <span className="min-w-0 leading-tight">{label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {pressed ? <Check className="size-3.5" aria-hidden="true" /> : null}
              <strong className="text-base tabular-nums">{count}</strong>
            </span>
          </button>
        )
      })}
    </section>
  )
}

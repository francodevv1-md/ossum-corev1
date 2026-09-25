"use client"

import type { IncidentMetric, IncidentFilterKey } from "@/types/coordinadores.types"
import { AlertCircle, CalendarClock, Truck, UserX, CheckCircle2 } from "lucide-react"

interface IncidentsMetricsStripProps {
  metrics: IncidentMetric[]
  activeFilter: IncidentFilterKey | null
  onToggleFilter: (key: IncidentFilterKey) => void
}

export function IncidentsMetricsStrip({
  metrics,
  activeFilter,
  onToggleFilter,
}: IncidentsMetricsStripProps) {
  const getIcon = (key: IncidentFilterKey) => {
    switch (key) {
      case "fuera-plazo":
        return <AlertCircle className="w-3.5 h-3.5" />
      case "poner-fecha":
        return <CalendarClock className="w-3.5 h-3.5" />
      case "en-transito":
        return <Truck className="w-3.5 h-3.5" />
      case "sin-asignar":
        return <UserX className="w-3.5 h-3.5" />
      case "coordinadas":
        return <CheckCircle2 className="w-3.5 h-3.5" />
    }
  }

  const getToneClasses = (tone: IncidentMetric["tone"], isActive: boolean) => {
    if (isActive) {
      switch (tone) {
        case "danger":
          return "bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-400/40"
        case "warning":
          return "bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-300/40"
        case "info":
          return "bg-sky-600 text-white border-sky-700 shadow-sm ring-2 ring-sky-400/40"
        case "neutral":
          return "bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-400/40"
        case "success":
          return "bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/40"
      }
    }

    switch (tone) {
      case "danger":
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
      case "warning":
        return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
      case "info":
        return "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900"
      case "neutral":
        return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
    }
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 overflow-x-auto scrollbar-thin shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-max max-w-[1920px] mx-auto">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
          Alertas e incidencias:
        </span>

        {metrics.map((metric) => {
          const isActive = activeFilter === metric.key
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => onToggleFilter(metric.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 active:scale-95 cursor-pointer ${getToneClasses(
                metric.tone,
                isActive
              )}`}
            >
              {getIcon(metric.key)}
              <span>{metric.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-mono font-bold transition-transform ${
                  isActive
                    ? "bg-black/25 text-white scale-105"
                    : "bg-white/80 dark:bg-slate-800/80 shadow-2xs"
                }`}
              >
                {metric.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

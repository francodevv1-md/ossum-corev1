"use client"

import React from "react"
import { AlertCircle, Clock, Truck, ShieldAlert, Sparkles, CheckCircle2, Box } from "lucide-react"
import { cn } from "@/lib/utils"

export type LogisticsMetricKey = "news" | "urgent" | "exceptions" | "transit" | "pending_prep"

export interface LogisticsMetricItem {
  key: LogisticsMetricKey
  label: string
  count: number
  icon: React.ElementType
  tone: "danger" | "warning" | "info" | "success" | "neutral"
}

interface LogisticsMetricsStripProps {
  counts: {
    news?: number
    urgent?: number
    overdue?: number | null
    exceptions?: number
    transit?: number
    pendingPrep?: number
  }
  activeKey: LogisticsMetricKey | null
  onToggle: (key: LogisticsMetricKey) => void
}

export function LogisticsMetricsStrip({
  counts,
  activeKey,
  onToggle,
}: LogisticsMetricsStripProps) {
  const metrics: LogisticsMetricItem[] = [
    {
      key: "exceptions",
      label: "Bloqueos / Alertas",
      count: counts.exceptions ?? 0,
      icon: ShieldAlert,
      tone: "danger",
    },
    {
      key: "urgent",
      label: "Urgentes",
      count: counts.urgent ?? 0,
      icon: AlertCircle,
      tone: "warning",
    },
    {
      key: "news",
      label: "Novedades",
      count: counts.news ?? 0,
      icon: Sparkles,
      tone: "info",
    },
    {
      key: "transit",
      label: "En tránsito",
      count: counts.transit ?? 0,
      icon: Truck,
      tone: "neutral",
    },
    {
      key: "pending_prep",
      label: "Pend. Preparación",
      count: counts.pendingPrep ?? 0,
      icon: Box,
      tone: "neutral",
    },
  ]

  const getToneClasses = (tone: LogisticsMetricItem["tone"], isActive: boolean) => {
    if (isActive) {
      switch (tone) {
        case "danger":
          return "bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-400/40"
        case "warning":
          return "bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-300/40"
        case "info":
          return "bg-sky-600 text-white border-sky-700 shadow-sm ring-2 ring-sky-400/40"
        case "success":
          return "bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/40"
        case "neutral":
          return "bg-slate-800 text-white border-slate-900 shadow-sm ring-2 ring-slate-400/40"
      }
    }

    switch (tone) {
      case "danger":
        return "bg-rose-50/90 text-rose-800 border-rose-200/80 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
      case "warning":
        return "bg-amber-50/90 text-amber-900 border-amber-200/80 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
      case "info":
        return "bg-sky-50/90 text-sky-800 border-sky-200/80 hover:bg-sky-100 hover:border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900"
      case "success":
        return "bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
      case "neutral":
        return "bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Métricas de logística">
      {metrics.map((metric) => {
        const Icon = metric.icon
        const isActive = activeKey === metric.key

        return (
          <button
            key={metric.key}
            type="button"
            onClick={() => onToggle(metric.key)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
              getToneClasses(metric.tone, isActive)
            )}
            aria-pressed={isActive}
          >
            <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-current" : "")} />
            <span>{metric.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 min-w-[20px] text-center rounded-full text-[11px] font-bold font-mono",
                isActive
                  ? "bg-white/20 text-current"
                  : "bg-black/5 text-current dark:bg-white/10"
              )}
            >
              {metric.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

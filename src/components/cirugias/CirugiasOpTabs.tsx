"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Surgery } from "@/types"
import type { CxOperationPresetKey } from "./CxOperationPresets"

export interface OpTabCounts {
  all: number
  urgent: number
  noCxDate: number
  prepPending: number
  attention: number
  withoutPr: number
  withoutConsumption: number
  withoutInvoice: number
}

export function computeOpTabCounts(
  surgeries: Surgery[],
  getConsumoState?: (id: string) => string | null,
): OpTabCounts {
  let urgent = 0
  let noCxDate = 0
  let prepPending = 0
  let attention = 0
  let withoutPr = 0
  let withoutConsumption = 0
  let withoutInvoice = 0

  for (const s of surgeries) {
    if (s.urgente) urgent++
    if (!s.date || s.date === "Sin fecha" || s.state === "Sin fecha") noCxDate++
    if (
      s.preparationState === "Sin preparar" ||
      s.preparationState === "En preparación" ||
      s.preparationState === "Congelado con faltantes"
    ) {
      prepPending++
    }
    if (
      s.urgente ||
      !s.date ||
      s.state === "Sin fecha" ||
      s.state === "Sin autorizar" ||
      s.state === "Suspendida"
    ) {
      attention++
    }
    if (!s.prNumber && !s.presupuestoId) withoutPr++
    const consumo = getConsumoState ? getConsumoState(s.id) : null
    if (s.state === "Sin consumo" || consumo === "Pendiente") withoutConsumption++
    if (!s.facturado && (s.state === "Realizada" || s.state === "Finalizada")) withoutInvoice++
  }

  return {
    all: surgeries.length,
    urgent,
    noCxDate,
    prepPending,
    attention,
    withoutPr,
    withoutConsumption,
    withoutInvoice,
  }
}

interface CirugiasOpTabsProps {
  selectedPreset: CxOperationPresetKey | null
  counts: OpTabCounts
  onSelectTab: (tabKey: CxOperationPresetKey | "all") => void
}

export function CirugiasOpTabs({ selectedPreset, counts, onSelectTab }: CirugiasOpTabsProps) {
  const fixedTabs = [
    { key: "all" as const, label: "Todos", count: counts.all },
    { key: "attention" as const, label: "Necesitan atención", count: counts.attention },
    { key: "urgent" as const, label: "🚨 Urgentes", count: counts.urgent, highlight: counts.urgent > 0 },
  ]

  const stageTabs = [
    { key: "noCxDate" as const, label: "Sin fecha CX", count: counts.noCxDate },
    { key: "prepPending" as const, label: "Prep. pendiente", count: counts.prepPending },
    { key: "withoutPr" as const, label: "Sin PR", count: counts.withoutPr },
    { key: "withoutConsumption" as const, label: "Sin consumo", count: counts.withoutConsumption },
    { key: "withoutInvoice" as const, label: "Sin factura", count: counts.withoutInvoice },
  ]

  const activeKey = selectedPreset === "preparationPending" ? "prepPending" : selectedPreset ?? "all"

  const handleTabClick = (key: string) => {
    if (key === "all") {
      onSelectTab("all")
    } else if (key === "prepPending") {
      onSelectTab("preparationPending")
    } else {
      onSelectTab(key as CxOperationPresetKey)
    }
  }

  const renderTab = (tab: { key: string; label: string; count: number; highlight?: boolean }, isFixed = false) => {
    const isActive = activeKey === tab.key
    return (
      <motion.button
        key={tab.key}
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => handleTabClick(tab.key)}
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0 select-none",
          isActive
            ? "text-white dark:text-slate-900 font-semibold"
            : isFixed
            ? "text-slate-800 bg-white/70 hover:bg-slate-200/80 hover:text-slate-950 border border-slate-200/90 shadow-2xs dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
            : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
          tab.highlight && !isActive && "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
        )}
      >
        {isActive && (
          <motion.span
            layoutId="active-cirugias-optab"
            className="absolute inset-0 rounded bg-slate-900 shadow-xs dark:bg-slate-100"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
        <span className="relative z-10">{tab.label}</span>
        <span
          className={cn(
            "relative z-10 inline-flex items-center justify-center rounded px-1.5 py-0.2 text-[10px] font-semibold leading-tight transition-colors",
            isActive
              ? "bg-slate-800 text-slate-200 dark:bg-slate-200 dark:text-slate-800"
              : isFixed
              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          )}
        >
          {tab.count}
        </span>
      </motion.button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 [scrollbar-width:none] border-b border-slate-200/90 bg-slate-50/70 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
      {/* Pestañas fijas / triaje principal */}
      <div className="flex items-center gap-1 shrink-0" title="Vistas fijas">
        {fixedTabs.map((tab) => renderTab(tab, true))}
      </div>

      {/* Línea divisoria destacada */}
      <div className="mx-1.5 h-5 w-[1.5px] bg-slate-300 dark:bg-slate-700 shrink-0" aria-hidden="true" />

      {/* Pestañas de estado operativo / filtros por etapa */}
      <div className="flex items-center gap-1 shrink-0" title="Filtros por etapa operativa">
        {stageTabs.map((tab) => renderTab(tab, false))}
      </div>
    </div>
  )
}


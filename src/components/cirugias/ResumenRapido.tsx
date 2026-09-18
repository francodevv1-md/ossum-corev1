"use client"
import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, Scissors, Shield, CheckCircle2, Package, Truck, Activity, FileWarning, Receipt } from "lucide-react"
import type { CirugiasKpis } from "@/lib/cirugias.types"

interface ResumenRapidoProps {
  kpis: CirugiasKpis
  kpiFilter: string | null
  onKpiClick: (filterKey: string | null) => void
  kpiPanelOpen: boolean
  setKpiPanelOpen: (open: boolean) => void
}

export function ResumenRapido({ kpis, kpiFilter, onKpiClick, kpiPanelOpen, setKpiPanelOpen }: ResumenRapidoProps) {
  const kpiItems = [
    { label: "Total Activas", value: kpis.totalActivas, icon: Scissors, color: "text-foreground", filterKey: null as string | null },
    { label: "Sin autorizar", value: kpis.sinAutorizar, icon: Shield, color: "text-amber-600", filterKey: "Sin autorizar" },
    { label: "Autorizadas", value: kpis.autorizadas, icon: CheckCircle2, color: "text-blue-600", filterKey: "Autorizada" },
    { label: "En preparación", value: kpis.enPreparacion, icon: Package, color: "text-sky-600", filterKey: "En preparación" },
    { label: "En tránsito", value: kpis.enTransito, icon: Truck, color: "text-blue-600", filterKey: "En tránsito" },
    { label: "Realizadas", value: kpis.realizadas, icon: Activity, color: "text-emerald-600", filterKey: "Realizada" },
    { label: "Doc. Incompleta", value: kpis.docIncompleta, icon: FileWarning, color: "text-red-500", filterKey: "docIncompleta" },
    { label: "Pend. Facturar", value: kpis.pendFacturar, icon: Receipt, color: "text-orange-600", filterKey: "pendFacturar" },
  ]

  return (
    <div className="shrink-0 px-1">
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        onClick={() => setKpiPanelOpen(!kpiPanelOpen)}
      >
        <ChevronRight className={cn("size-3 transition-transform", kpiPanelOpen && "rotate-90")} />
        Resumen rápido
        {kpiFilter && <span className="ml-1 text-blue-600 font-medium">({kpiFilter === "docIncompleta" ? "Doc. incompleta" : kpiFilter === "pendFacturar" ? "Pend. facturar" : kpiFilter})</span>}
      </button>
      {kpiPanelOpen && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pb-2">
          {kpiItems.map((kpi) => (
            <button
              key={kpi.label}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors cursor-pointer",
                kpiFilter === kpi.filterKey ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "hover:bg-muted/50"
              )}
              onClick={() => onKpiClick(kpi.filterKey)}
            >
              <kpi.icon className={cn("size-4 shrink-0", kpi.color)} />
              <div className="min-w-0">
                <p className={cn("text-sm font-bold leading-none", kpi.color)}>{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{kpi.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import React from "react"
import type { ConsumoItem, ValidationIssue } from "@/types"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConsumoSummarySectionProps {
  items: ConsumoItem[]
  sentMap?: Map<string, number>
  origen?: "remito" | "manual"
  hasPresupuesto?: boolean
  validationIssues?: ValidationIssue[]
}

export function ConsumoSummarySection({
  items,
  sentMap,
  origen = "remito",
  hasPresupuesto = false,
  validationIssues = [],
}: ConsumoSummarySectionProps) {
  const totalConsumed = items.reduce((s, i) => s + i.consumed, 0)
  const totalReturned = items.reduce((s, i) => s + i.returned, 0)
  const faltantes = items.filter((item) => {
    const sent = sentMap?.get(item.stockItemId) ?? 0
    return sent > item.consumed + item.returned
  })
  const errors = validationIssues.filter((i) => i.severity === "error")
  const warnings = validationIssues.filter((i) => i.severity === "warning")

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalConsumed}</p>
          <p className="text-[10px] text-muted-foreground">Consumidos</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalReturned}</p>
          <p className="text-[10px] text-muted-foreground">Devueltos</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{items.length}</p>
          <p className="text-[10px] text-muted-foreground">Ítems</p>
        </div>
      </div>

      {/* Alerts */}
      {!hasPresupuesto && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>No hay presupuesto vigente asociado para comparar.</span>
        </div>
      )}

      {faltantes.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{faltantes.length} ítem(s) con faltante (enviado &gt; consumido + devuelto).</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{errors.length} problema(s) que bloquean la validación.</span>
        </div>
      )}

      {warnings.length > 0 && errors.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{warnings.length} advertencia(s) (no bloquean validación).</span>
        </div>
      )}

      {errors.length === 0 && warnings.length === 0 && items.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>Datos completos. Listo para validar.</span>
        </div>
      )}
    </div>
  )
}

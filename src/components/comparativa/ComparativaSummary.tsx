"use client"

import React from "react"
import type { ResumenComparativaMateriales } from "@/types"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { ArrowRight, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react"

interface ComparativaSummaryProps {
  resumen: ResumenComparativaMateriales | null
  onVerDetalle?: () => void
}

export function ComparativaSummary({ resumen, onVerDetalle }: ComparativaSummaryProps) {
  if (!resumen) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Comparativa de materiales</span>
        </div>
        <p className="text-[10px] text-muted-foreground">No hay datos suficientes para comparar.</p>
      </div>
    )
  }

  const tieneDiferencias = resumen.lineasConDiferencia > 0
  const estadoGeneral = tieneDiferencias ? "Con diferencias" : "Sin diferencias"

  return (
    <div className={cn(
      "rounded-lg border p-3",
      tieneDiferencias ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/30",
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Comparativa de materiales</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1.5 py-0",
            tieneDiferencias
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200",
          )}
        >
          {tieneDiferencias ? (
            <><AlertTriangle className="size-3 mr-0.5" />{estadoGeneral}</>
          ) : (
            <><CheckCircle2 className="size-3 mr-0.5" />{estadoGeneral}</>
          )}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-[10px]">
        <span>
          Diferencias: <strong>{resumen.lineasConDiferencia}</strong> de {resumen.totalLineas} ítems
        </span>
        {resumen.deltaEconomico !== 0 && (
          <span>
            Delta estimado:{" "}
            <strong className={resumen.deltaEconomico > 0 ? "text-red-600" : "text-emerald-600"}>
              {resumen.deltaEconomico > 0 ? "+" : ""}{formatCurrency(resumen.deltaEconomico)}
            </strong>
          </span>
        )}
      </div>

      {resumen.lineasRevisionManual > 0 && (
        <p className="text-[10px] text-amber-700 mt-1">
          {resumen.lineasRevisionManual} ítem(s) requieren revisión manual
        </p>
      )}

      {onVerDetalle && (
        <button
          type="button"
          onClick={onVerDetalle}
          className="mt-2 text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          Ver detalle en Consumos <ArrowRight className="size-3" />
        </button>
      )}
    </div>
  )
}

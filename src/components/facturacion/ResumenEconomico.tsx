"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/formatters"
import type { BaseFacturacion } from "@/types"
import { BASE_FACTURACION_OPTIONS } from "@/lib/facturacion.constants"

interface ResumenEconomicoProps {
  totalPresupuestado: number
  totalConsumidoValorizado: number
  deltaDetectado: number
  baseFacturacion: BaseFacturacion
  totalAFacturar: number
  presupuestoId?: string
  itemsSinPrecio?: string[]
  onVerDiferencias?: () => void
  onFacturar?: () => void
  compact?: boolean
}

export function ResumenEconomico({
  totalPresupuestado,
  totalConsumidoValorizado,
  deltaDetectado,
  baseFacturacion,
  totalAFacturar,
  presupuestoId,
  itemsSinPrecio = [],
  onVerDiferencias,
  onFacturar,
  compact = false,
}: ResumenEconomicoProps) {
  const deltaPositivo = deltaDetectado > 0
  const tieneDiferencias = Math.abs(deltaDetectado) >= 1
  const baseLabel = BASE_FACTURACION_OPTIONS.find((o) => o.value === baseFacturacion)?.label || baseFacturacion

  if (compact) {
    return (
      <div className="rounded-md border bg-muted/20 px-3 py-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Presupuesto{presupuestoId ? ` ${presupuestoId}` : ""}:</span>
          <span className="font-medium">{formatCurrency(totalPresupuestado)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Consumo valorizado:</span>
          <span className="font-medium">{formatCurrency(totalConsumidoValorizado)}</span>
        </div>
        {tieneDiferencias && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Delta:</span>
            <span className={cn("font-bold", deltaPositivo ? "text-red-600" : "text-green-600")}>
              {deltaPositivo ? "+" : ""}{formatCurrency(deltaDetectado)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs border-t pt-1">
          <span className="text-muted-foreground">Base: {baseLabel}</span>
          <span className="font-bold text-sm">{formatCurrency(totalAFacturar)}</span>
        </div>
        {itemsSinPrecio.length > 0 && (
          <p className="text-[10px] text-amber-600">
            {itemsSinPrecio.length} ítem(s) sin precio
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Resumen Económico</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Presupuesto vigente{presupuestoId ? `: ${presupuestoId}` : ""}
          </span>
          <span className="font-medium">{formatCurrency(totalPresupuestado)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Consumo valorizado</span>
          <span className="font-medium">{formatCurrency(totalConsumidoValorizado)}</span>
        </div>
        {tieneDiferencias && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Delta</span>
            <span className={cn("font-bold", deltaPositivo ? "text-red-600" : "text-green-600")}>
              {deltaPositivo ? "+" : ""}{formatCurrency(deltaDetectado)}
            </span>
          </div>
        )}
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Base facturación: {baseLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total a facturar</span>
          <span className="text-lg font-bold">{formatCurrency(totalAFacturar)}</span>
        </div>
      </div>

      {itemsSinPrecio.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-700 font-medium">
            {itemsSinPrecio.length} ítem(s) sin precio de referencia:
          </p>
          <p className="text-xs text-amber-600">{itemsSinPrecio.join(", ")}</p>
        </div>
      )}

      {(onVerDiferencias || onFacturar) && (
        <div className="flex items-center gap-2 pt-1">
          {tieneDiferencias && onVerDiferencias && (
            <button
              onClick={onVerDiferencias}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Ver diferencias
            </button>
          )}
          {onFacturar && (
            <button
              onClick={onFacturar}
              className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Facturar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

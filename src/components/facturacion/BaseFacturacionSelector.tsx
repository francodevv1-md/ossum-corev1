"use client"

import React from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatCurrency } from "@/lib/formatters"
import type { BaseFacturacion } from "@/types"
import { BASE_FACTURACION_OPTIONS } from "@/lib/facturacion.constants"

interface BaseFacturacionSelectorProps {
  value: BaseFacturacion
  onChange: (base: BaseFacturacion) => void
  totalPresupuestado: number
  totalConsumidoValorizado: number
  suggestion?: BaseFacturacion
  forced?: boolean
}

export function BaseFacturacionSelector({
  value,
  onChange,
  totalPresupuestado,
  totalConsumidoValorizado,
  suggestion,
  forced,
}: BaseFacturacionSelectorProps) {
  const montos: Record<BaseFacturacion, number> = {
    presupuesto: totalPresupuestado,
    consumo: totalConsumidoValorizado,
    mixto: Math.max(totalPresupuestado, totalConsumidoValorizado),
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Facturar según:</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as BaseFacturacion)}
        className="space-y-2"
        disabled={forced}
      >
        {BASE_FACTURACION_OPTIONS.map((opt) => {
          const isSuggested = suggestion === opt.value
          return (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`base-${opt.value}`} />
              <Label
                htmlFor={`base-${opt.value}`}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <span>{opt.label}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  ({formatCurrency(montos[opt.value])})
                </span>
                {isSuggested && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    Sugerido
                  </span>
                )}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
      {forced && (
        <p className="text-xs text-amber-600">
          Base forzada: no hay fuente alternativa disponible.
        </p>
      )}
    </div>
  )
}

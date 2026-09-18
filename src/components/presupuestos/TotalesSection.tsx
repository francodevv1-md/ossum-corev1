"use client"

import React from "react"
import { formatCurrency } from "@/lib/formatters"
import { IVA_OPTIONS, ivaValueFromKey } from "@/lib/presupuestos.constants"
// CHATZAI-017R: AlertCircle removed — no Z warning banner needed

/**
 * CHATZAI-025: Totales redesigned with per-item IVA breakdown.
 *
 * When items have different IVA rates, shows breakdown:
 * - "IVA 21%: $XXX"
 * - "IVA 10.5%: $XXX"
 * etc.
 *
 * When all items share the same rate, shows a single IVA line as before.
 */

interface TotalesSectionProps {
  subtotal: number
  descuento: number
  descuentoMonto: number
  /** CHATZAI-017K: Monto total de descuentos por ítem (suma de todos los descuentos de línea) */
  descuentoLineasMonto?: number
  /** CHATZAI-017J: Porcentaje de IVA (numérico, ej: 21) */
  ivaPercentage?: number
  /** CHATZAI-017J: Monto de IVA calculado */
  ivaMonto?: number
  /** CHATZAI-017J/017P-fix: IVA key string (e.g. "21", "exento", "0") for display logic */
  ivaKey?: string
  /** CHATZAI-025: IVA breakdown by rate — when items have different IVA keys */
  ivaDesglose?: Record<string, number>
  total: number
  /** CHATZAI-017L: Cantidad de artículos libres/Z (no vinculados a catálogo) */
  articuloLibreCount?: number
  /** @deprecated Use articuloLibreCount. Kept for backward compat. */
  articuloZCount?: number
  compact?: boolean
}

/** Helper: format IVA label for display from ivaKey */
function ivaLabelFromKey(key: string): string {
  if (key === "exento") return "Exento / No gravado"
  const opt = IVA_OPTIONS.find((o) => o.key === key)
  if (opt) return `IVA ${opt.label}`
  return `IVA ${key}%`
}

/** Helper: format IVA label for display (legacy — uses percentage + key) */
function ivaLabel(percentage: number, key?: string): string {
  if (key === "exento") return "Exento / No gravado"
  if (percentage === 0) return "IVA 0%"
  return `IVA ${percentage}%`
}

export function TotalesSection({
  subtotal,
  descuento,
  descuentoMonto,
  descuentoLineasMonto = 0,
  ivaPercentage = 0,
  ivaMonto = 0,
  ivaKey,
  ivaDesglose,
  total,
  articuloLibreCount,
  articuloZCount = 0,
  compact = false,
}: TotalesSectionProps) {
  // CHATZAI-017L: Prefer articuloLibreCount, fall back to articuloZCount
  const libreCount = articuloLibreCount ?? articuloZCount
  // Whether to show the IVA line (when there's a non-zero percentage, non-zero amount, or exento key)
  const showIva = ivaPercentage > 0 || (ivaMonto ?? 0) > 0 || ivaKey === "exento" || (ivaDesglose && Object.keys(ivaDesglose).length > 0)

  // CHATZAI-025: Check if we have multiple IVA rates for breakdown display
  const hasMultipleIvaRates = ivaDesglose && Object.keys(ivaDesglose).length > 1
  const hasDesglose = ivaDesglose && Object.keys(ivaDesglose).length > 0

  if (compact) {
    // ─── CHATZAI-017G-fix + 025 + 025A.4: Bottom economic closure footer with IVA breakdown (compact ~20% lighter) ───
    return (
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        {/* CHATZAI-017K: Descuento por ítems */}
        {descuentoLineasMonto > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">Dto. ítems:</span>
            <span className="font-medium text-destructive tabular-nums">-{formatCurrency(descuentoLineasMonto)}</span>
          </div>
        )}
        {descuento > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">Dto. gral. ({descuento}%):</span>
            <span className="font-medium text-destructive tabular-nums">-{formatCurrency(descuentoMonto)}</span>
          </div>
        )}
        {showIva && hasDesglose ? (
          // CHATZAI-025: Show IVA breakdown — use ivaLabelFromKey for correct per-rate labels
          hasMultipleIvaRates ? (
            Object.entries(ivaDesglose!).map(([key, monto]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px]">
                <span className="text-muted-foreground">{ivaLabelFromKey(key)}:</span>
                <span className="font-medium tabular-nums">{formatCurrency(monto)}</span>
              </div>
            ))
          ) : (
            // Single IVA rate — use the actual rate from desglose key
            (() => {
              const [singleKey, singleMonto] = Object.entries(ivaDesglose!)[0]
              return (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">{ivaLabelFromKey(singleKey)}:</span>
                  <span className="font-medium tabular-nums">{formatCurrency(singleMonto)}</span>
                </div>
              )
            })()
          )
        ) : showIva ? (
          // Fallback: no desglose, use legacy label
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">{ivaLabel(ivaPercentage, ivaKey)}:</span>
            <span className="font-medium tabular-nums">{formatCurrency(ivaMonto)}</span>
          </div>
        ) : null}
        {/* CHATZAI-025A.4: Reduced TOTAL visual weight — smaller font, tighter padding */}
        <div className="flex items-center gap-2 pl-3 border-l-2 border-gray-400 dark:border-gray-500">
          <span className="font-bold text-[11px] tracking-wide">TOTAL:</span>
          <span className="text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    )
  }

  // ─── Standard mode: card-style for PresupuestoFormDialog ───
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold">Totales</span>
      </div>

      <div className="rounded-md border bg-muted/20 px-4 py-3 space-y-2">
        {/* Subtotal (ya descontado por ítem) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
        </div>

        {/* CHATZAI-017K: Descuento por ítems */}
        {descuentoLineasMonto > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Descuento por ítems
            </span>
            <span className="font-medium text-destructive tabular-nums">
              - {formatCurrency(descuentoLineasMonto)}
            </span>
          </div>
        )}

        {/* Descuento general */}
        {descuento > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Descuento gral. ({descuento}%)
            </span>
            <span className="font-medium text-destructive tabular-nums">
              - {formatCurrency(descuentoMonto)}
            </span>
          </div>
        )}

        {/* CHATZAI-025: IVA — breakdown when multiple rates, single line otherwise */}
        {showIva && hasDesglose ? (
          // CHATZAI-025: IVA breakdown — use ivaLabelFromKey for correct per-rate labels
          hasMultipleIvaRates ? (
            // Multiple IVA rates: show breakdown
            Object.entries(ivaDesglose!).map(([key, monto]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {ivaLabelFromKey(key)}
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(monto)}
                </span>
              </div>
            ))
          ) : (
            // Single IVA rate — use the actual rate from desglose key
            (() => {
              const [singleKey, singleMonto] = Object.entries(ivaDesglose!)[0]
              return (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {ivaLabelFromKey(singleKey)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(singleMonto)}
                  </span>
                </div>
              )
            })()
          )
        ) : showIva ? (
          // Fallback: no desglose, use legacy label
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {ivaLabel(ivaPercentage, ivaKey)}
            </span>
            <span className="font-medium tabular-nums">
              {formatCurrency(ivaMonto)}
            </span>
          </div>
        ) : null}

        <div className="border-t" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">TOTAL</span>
          <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

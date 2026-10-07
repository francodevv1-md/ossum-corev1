"use client"
import React, { type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import {
  getCxStateVisual,
  type CxStatusVariant,
} from "@/lib/cirugias.constants"

interface CirugiaStatusCellProps {
  state: string
  date?: string | null
  variant?: CxStatusVariant
  compactMode?: boolean
  tdClassName?: string
  tdStyle?: CSSProperties
  asCell?: boolean
}

/**
 * Estado CX — Celda de Estado con soporte multi-variante (ADDENDUM OFICIAL):
 * - "a" / "d": Celda con color fuerte y texto legible
 * - "b": Barra lateral de 4px con color fuerte y texto semántico
 * - "c": Indicador puntual (dot) con color fuerte y texto semántico
 */
export function CirugiaStatusCell({
  state,
  date,
  variant = "b",
  compactMode = false,
  tdClassName,
  tdStyle,
  asCell = true,
}: CirugiaStatusCellProps) {
  const visuals = getCxStateVisual(state, date)
  const paddingClass = compactMode ? "px-2 py-1" : "px-2.5 py-1.5"

  const renderContent = () => {
    if (variant === "a" || variant === "d") {
      return (
        <span className={cn("inline-block text-[11px] tracking-wide uppercase select-none", visuals.strongClass)}>
          {state}
        </span>
      )
    }
    if (variant === "c") {
      return (
        <div className="flex items-center gap-1.5 select-none">
          <span
            className={cn("size-2 rounded-full shrink-0 shadow-xs", visuals.dotClass)}
            style={{ backgroundColor: visuals.strong }}
          />
          <span className={cn("font-semibold tracking-tight text-[11px]", visuals.textClass)}>
            {state}
          </span>
        </div>
      )
    }
    // Variant B: Barra lateral 4px + texto
    return (
      <div className="flex items-center gap-2 select-none">
        <span
          className={cn(compactMode ? "h-3" : "h-3.5", "w-1 rounded-sm shrink-0", visuals.barClass)}
          style={{ backgroundColor: visuals.strong }}
        />
        <span className={cn("font-bold tracking-tight text-[11px]", visuals.textClass)}>
          {state}
        </span>
      </div>
    )
  }

  if (!asCell) {
    if (variant === "a" || variant === "d") {
      return (
        <div className={cn("flex items-center justify-center leading-tight", tdClassName)} style={tdStyle}>
          {renderContent()}
        </div>
      )
    }
    return (
      <div className={cn("leading-tight", tdClassName)} style={tdStyle}>
        {renderContent()}
      </div>
    )
  }

  if (variant === "a" || variant === "d") {
    return (
      <td
        className={cn(paddingClass, visuals.strongClass, "text-center", tdClassName)}
        style={{ backgroundColor: visuals.strong, ...tdStyle }}
      >
        {renderContent()}
      </td>
    )
  }

  return (
    <td className={cn(paddingClass, "text-[11px] leading-tight select-none", tdClassName)} style={tdStyle}>
      {renderContent()}
    </td>
  )
}

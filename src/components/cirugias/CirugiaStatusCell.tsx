"use client"
import { cn } from "@/lib/utils"
import { CX_STATE_CELL_COLORS } from "@/lib/cirugias.constants"
import type { CSSProperties } from "react"

interface CirugiaStatusCellProps {
  state: string
  tdClassName?: string
  tdStyle?: CSSProperties
}

/**
 * Estado CX — protagonist cromático.
 * Visually dominant badge with bolder treatment than other cells.
 */
export function CirugiaStatusCell({ state, tdClassName, tdStyle }: CirugiaStatusCellProps) {
  return (
    <td className={cn("px-2 py-1.5", CX_STATE_CELL_COLORS[state] || "bg-gray-100 text-gray-700", tdClassName)} style={tdStyle}>
      <span className="text-[11px] font-bold leading-tight tracking-wide">{state}</span>
    </td>
  )
}

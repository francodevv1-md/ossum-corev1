"use client"
import { cn } from "@/lib/utils"
import { PREP_STATE_CELL_COLORS } from "@/lib/cirugias.constants"

interface CirugiaPreparationCellProps {
  preparationState: string
  asCell?: boolean
}

/**
 * Preparación — subestado visual.
 * Uses softer badges with lower saturation, fine borders, and readable text.
 * Should NOT compete visually with Estado CX (protagonist).
 */
export function CirugiaPreparationCell({ preparationState, asCell = true }: CirugiaPreparationCellProps) {
  const colorClasses = PREP_STATE_CELL_COLORS[preparationState]

  const badge = (
    <span className={cn(
      "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium leading-none",
      colorClasses || "bg-gray-50 text-gray-500 border border-gray-200",
    )}>
      {preparationState}
    </span>
  )

  if (!asCell) return badge

  return (
    <td className="px-2 py-1.5">
      {badge}
    </td>
  )
}

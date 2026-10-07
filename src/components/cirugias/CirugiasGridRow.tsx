"use client"

import React from "react"
import { flexRender, type Row } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import type { Surgery } from "@/types"
import {
  getCxStateVisual,
  type CxStatusVariant,
} from "@/lib/cirugias.constants"

interface CirugiasGridRowProps {
  row: Row<Surgery>
  isSelected: boolean
  density: "standard" | "compact"
  stickyColumns: boolean
  pinnedLeftKeys: string[]
  stickyOffsets: { left: Record<string, number>; lastLeftKey: string | null }
  resolvedWidths: Record<string, number>
  cxVariant?: CxStatusVariant
  lastVisibleKey?: string | null
  onSelect: (id: string) => void
  onOpenExpediente: (id: string) => void
}

export function CirugiasGridRow({
  row,
  isSelected,
  density,
  stickyColumns,
  pinnedLeftKeys,
  stickyOffsets,
  resolvedWidths,
  cxVariant = "b",
  lastVisibleKey,
  onSelect,
  onOpenExpediente,
}: CirugiasGridRowProps) {
  const s = row.original
  const isUrgent = !!s.urgente
  const visuals = getCxStateVisual(s.state, s.date)
  const isStateStrong = cxVariant === "a" || cxVariant === "d"

  return (
    <tr
      onClick={() => onSelect(s.id)}
      onDoubleClick={() => onOpenExpediente(s.id)}
      style={{
        "--row-bg": visuals.rowTint,
        "--row-hover": visuals.hoverTint,
        "--row-dark-bg": visuals.darkRowTint || "#0d131d",
        "--row-dark-hover": visuals.darkHoverTint || "#151e2e",
      } as React.CSSProperties}
      className={cn(
        "group cursor-pointer transition-colors",
        density === "compact" ? "h-[26px]" : "h-[32px]",
        isSelected
          ? "border-l-[3.5px] border-l-[#1D2FC0] shadow-[inset_0_0_0_1px_rgba(29,47,192,0.12)] dark:border-l-blue-500 dark:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
          : isUrgent
          ? "border-l-[3.5px] border-l-[#DC2626] dark:border-l-red-500"
          : "border-l-[3.5px] border-l-transparent",
      )}
    >
      {row.getVisibleCells().map((cell) => {
        const colId = cell.column.id
        const isStateCol = colId === "state"
        const isStickyLeft = stickyColumns && pinnedLeftKeys.includes(colId)
        const isStickyRight = stickyColumns && colId === "actions" && (lastVisibleKey ? colId === lastVisibleKey : true)
        const isLastLeft = stickyColumns && colId === stickyOffsets.lastLeftKey

        const isSolidState = isStateCol && isStateStrong

        return (
          <td
            key={cell.id}
            className={cn(
              "whitespace-nowrap px-2.5 align-middle transition-colors",
              density === "compact" ? "py-0.5 text-[11px]" : "py-1 text-[12px]",
              (isStickyLeft || isStickyRight) && "sticky z-10",
              isSolidState
                ? cn(visuals.strongClass, "text-center")
                : "bg-[var(--row-bg)] group-hover:bg-[var(--row-hover)] dark:bg-[var(--row-dark-bg)] dark:group-hover:bg-[var(--row-dark-hover)] text-slate-800 dark:text-slate-200",
              isSelected && !isSolidState && "text-slate-950 font-medium dark:text-slate-100",
              isLastLeft && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)]",
              isStickyRight && "shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.4)]",
            )}
            style={{
              width: resolvedWidths[colId],
              minWidth: resolvedWidths[colId],
              ...(isSolidState ? { backgroundColor: visuals.strong } : {}),
              ...(isStickyLeft ? { left: stickyOffsets.left[colId] } : {}),
              ...(isStickyRight ? { right: 0 } : {}),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )
}

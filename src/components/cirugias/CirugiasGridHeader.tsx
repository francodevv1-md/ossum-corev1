"use client"

import React from "react"
import { flexRender, type HeaderGroup } from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { NON_SORTABLE_KEYS } from "@/lib/cirugias.constants"
import type { Surgery } from "@/types"

interface CirugiasGridHeaderProps {
  headerGroups: HeaderGroup<Surgery>[]
  density: "standard" | "compact"
  stickyColumns: boolean
  pinnedLeftKeys: string[]
  stickyOffsets: { left: Record<string, number>; lastLeftKey: string | null }
  resolvedWidths: Record<string, number>
  lastVisibleKey?: string | null
}

export function CirugiasGridHeader({
  headerGroups,
  density,
  stickyColumns,
  pinnedLeftKeys,
  stickyOffsets,
  resolvedWidths,
  lastVisibleKey,
}: CirugiasGridHeaderProps) {
  return (
    <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 font-semibold text-slate-600 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id} className={density === "compact" ? "h-[28px]" : "h-[34px]"}>
          {headerGroup.headers.map((header) => {
            const colId = header.column.id
            const isStickyLeft = stickyColumns && pinnedLeftKeys.includes(colId)
            const isStickyRight = stickyColumns && colId === "actions" && (lastVisibleKey ? colId === lastVisibleKey : true)
            const isLastLeft = stickyColumns && colId === stickyOffsets.lastLeftKey
            const isSortable = !NON_SORTABLE_KEYS.includes(colId)

            return (
              <th
                key={header.id}
                className={cn(
                  "whitespace-nowrap border-r border-slate-200/80 px-2.5 text-[11px] font-semibold uppercase tracking-wider last:border-r-0 dark:border-slate-800",
                  isSortable && "cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-800/90",
                  isStickyLeft && "sticky z-20 bg-slate-50 dark:bg-slate-900",
                  isStickyRight && "sticky right-0 z-20 bg-slate-50 dark:bg-slate-900",
                  isLastLeft && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]",
                  isStickyRight && "shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)]",
                )}
                style={{
                  width: resolvedWidths[colId],
                  minWidth: resolvedWidths[colId],
                  ...(isStickyLeft ? { left: stickyOffsets.left[colId] } : {}),
                }}
                onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
              >
                <div className="flex items-center gap-1">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {isSortable && (
                    header.column.getIsSorted() === "asc" ? (
                      <ArrowUp className="size-3 text-blue-600 dark:text-sky-400" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDown className="size-3 text-blue-600 dark:text-sky-400" />
                    ) : (
                      <ArrowUpDown className="size-3 opacity-25" />
                    )
                  )}
                </div>
              </th>
            )
          })}
        </tr>
      ))}
    </thead>
  )
}

"use client"

import React from "react"
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useSidebar } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { SmartSurgerySearch } from "./SmartSurgerySearch"
import type { SurgerySearchRecord } from "@/lib/cirugias/search"

interface CirugiasModuleBarProps {
  surgeries: readonly SurgerySearchRecord[]
  searchChips: import("@/lib/cirugias.types").SearchChip[]
  onSearchChipsChange: (chips: import("@/lib/cirugias.types").SearchChip[]) => void
  colVisOpen: boolean
  setColVisOpen: (v: boolean) => void
  columns: ReadonlyArray<{ key: string; label: string }>
  visibleCols: Record<string, boolean>
  toggleColumn: (key: string, checked: boolean) => void
  stickyColumns: boolean
  onToggleStickyColumns: () => void
  columnOrder: string[]
  onReorderColumns: (fromIndex: number, toIndex: number) => void
  onResetToDefault: () => void
  resultCount: number
  activeFilterCount: number
  hasActiveFilters: boolean
  clearFilters: () => void
  onNewSurgery: () => void
  onReportsDialogOpenChange: (open: boolean) => void
}

export function CirugiasModuleBar({
  surgeries,
  searchChips,
  onSearchChipsChange,
  colVisOpen,
  setColVisOpen,
  columns,
  visibleCols,
  toggleColumn,
  stickyColumns,
  onToggleStickyColumns,
  columnOrder,
  onReorderColumns,
  onResetToDefault,
}: CirugiasModuleBarProps) {
  const { sidebarState, setSidebarState } = useSidebar()

  const handleShowMenu = () => {
    setSidebarState("compact")
  }

  const handleToggleSidebar = () => {
    if (sidebarState === "expanded") setSidebarState("compact")
    else if (sidebarState === "compact") setSidebarState("expanded")
  }

  return (
    <div className="px-2.5 py-1.5 lg:px-3">
      <div className="flex flex-col gap-2 border-b border-slate-300/80 pb-1.5 dark:border-slate-800 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex min-w-0 items-center gap-2 lg:shrink-0">
          <div className="flex shrink-0 items-center gap-1">
            {sidebarState === "hidden" ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-sm border border-slate-300 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                onClick={handleShowMenu}
                aria-label="Mostrar menú"
              >
                <Menu className="size-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="hidden size-8 rounded-sm border border-slate-300 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:flex"
                onClick={handleToggleSidebar}
                aria-label={sidebarState === "expanded" ? "Compactar menú" : "Expandir menú"}
              >
                {sidebarState === "expanded" ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeftOpen className="size-4" />
                )}
              </Button>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Módulo operativo
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm font-semibold tracking-[0.01em] text-slate-950 dark:text-slate-50">Cirugías</h2>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <SmartSurgerySearch
            surgeries={surgeries}
            chips={searchChips}
            onChipsChange={onSearchChipsChange}
          />
        </div>
      </div>
    </div>
  )
}


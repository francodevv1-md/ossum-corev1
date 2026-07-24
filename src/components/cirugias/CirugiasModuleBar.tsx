"use client"

import React from "react"
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { NotificationMenu } from "@/components/layout/ShellUtilityMenus"
import { UserMenu } from "@/components/layout/UserMenu"
import { useSidebar } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { SmartSurgerySearch } from "./SmartSurgerySearch"

interface CirugiasModuleBarProps {
  searchChips: import("@/lib/cirugias.types").SearchChip[]
  onSearchChipsChange: (chips: import("@/lib/cirugias.types").SearchChip[]) => void
  onSmartSearch: () => void
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
  searchChips,
  onSearchChipsChange,
  onSmartSearch,
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
      <div className="flex flex-col gap-2 border-b border-slate-300/80 pb-1.5 dark:border-slate-800 lg:grid lg:grid-cols-[auto_minmax(24rem,1fr)_auto] lg:items-center lg:gap-x-3 lg:gap-y-0">
        <div className="flex min-w-0 items-center gap-2 lg:min-w-[11.75rem] lg:shrink-0">
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

        <div className="min-w-0 lg:w-full lg:max-w-[56rem]">
          <SmartSurgerySearch
            chips={searchChips}
            onChipsChange={onSearchChipsChange}
            onSearch={onSmartSearch}
          />
        </div>

        <div className="flex min-w-0 items-center justify-end lg:min-w-[14.5rem] lg:justify-self-end">
          <div className="flex h-9 shrink-0 items-center gap-2.5 border border-slate-300 bg-white px-1.5 py-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <NotificationMenu buttonClassName="relative inline-flex size-8 items-center justify-center self-center rounded-[3px] border border-transparent bg-white text-slate-700 shadow-none transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-1 focus-visible:ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-600" />
            <div className="h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
            <UserMenu className="inline-flex h-8 min-w-[8.75rem] max-w-[10.5rem] items-center justify-start gap-2 rounded-[3px] border border-transparent bg-white px-1.5 text-slate-700 shadow-none transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-1 focus-visible:ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

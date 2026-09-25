"use client"

import React from "react"
import {
  Search,
  X,
  SlidersHorizontal,
  Table2,
  LayoutGrid,
  MapPin,
  ShieldAlert,
  RotateCcw,
  Building2,
  Truck,
  Box,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type LogisticsViewMode = "table" | "grid" | "map"

interface LogisticsControlsToolbarProps {
  viewMode: LogisticsViewMode
  onViewModeChange: (mode: LogisticsViewMode) => void
  search: string
  onSearchChange: (value: string) => void
  prepStatus: string
  onPrepStatusChange: (value: string) => void
  logisticsStatus: string
  onLogisticsStatusChange: (value: string) => void
  institutionId: string
  onInstitutionChange: (value: string) => void
  locality: string
  onLocalityChange: (value: string) => void
  hasBlockers?: boolean
  onToggleBlockers: () => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  options: {
    preparation: Array<{ value: string; label: string }>
    logistics: Array<{ value: string; label: string }>
    institutions: Array<{ value: string; label: string }>
    localities: Array<{ value: string; label: string }>
  }
  totalCount: number
}

export function LogisticsControlsToolbar({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  prepStatus,
  onPrepStatusChange,
  logisticsStatus,
  onLogisticsStatusChange,
  institutionId,
  onInstitutionChange,
  locality,
  onLocalityChange,
  hasBlockers,
  onToggleBlockers,
  hasActiveFilters,
  onClearFilters,
  options,
  totalCount,
}: LogisticsControlsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs dark:bg-slate-900 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Switcher */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg dark:bg-slate-800" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "table"}
            onClick={() => onViewModeChange("table")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer",
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Grilla</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer",
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tarjetas</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "map"}
            onClick={() => onViewModeChange("map")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer",
              viewMode === "map"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Mapa & Rutas</span>
          </button>
        </div>

        {/* Count indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-900 font-mono dark:text-white">{totalCount}</span>
          <span>expedientes en seguimiento</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por paciente, cirugía, médico o remito..."
            className="h-9 pl-9 pr-8 text-xs bg-slate-50/50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Prep Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-700",
                prepStatus ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200" : ""
              )}
            >
              <Box className="w-3.5 h-3.5" />
              <span>
                {prepStatus
                  ? options.preparation.find((o) => o.value === prepStatus)?.label || "Preparación"
                  : "Preparación"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Estado de Preparación</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onPrepStatusChange("")} className="text-xs">
              Todas las preparaciones
            </DropdownMenuItem>
            {options.preparation.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={prepStatus === opt.value}
                onCheckedChange={() => onPrepStatusChange(prepStatus === opt.value ? "" : opt.value)}
                className="text-xs"
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logistics Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-700",
                logisticsStatus ? "bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200" : ""
              )}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>
                {logisticsStatus
                  ? options.logistics.find((o) => o.value === logisticsStatus)?.label || "Logística"
                  : "Estado Logístico"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs">Estado de Despacho / Logística</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onLogisticsStatusChange("")} className="text-xs">
              Todos los estados
            </DropdownMenuItem>
            {options.logistics.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={logisticsStatus === opt.value}
                onCheckedChange={() => onLogisticsStatusChange(logisticsStatus === opt.value ? "" : opt.value)}
                className="text-xs"
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Institution Dropdown */}
        {options.institutions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-700 max-w-[160px] truncate",
                  institutionId ? "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800" : ""
                )}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {institutionId
                    ? options.institutions.find((o) => o.value === institutionId)?.label || "Institución"
                    : "Institución"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 max-h-64 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Filtrar por Institución</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onInstitutionChange("")} className="text-xs">
                Todas las instituciones
              </DropdownMenuItem>
              {options.institutions.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={institutionId === opt.value}
                  onCheckedChange={() => onInstitutionChange(institutionId === opt.value ? "" : opt.value)}
                  className="text-xs"
                >
                  <span className="truncate">{opt.label}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Blockers toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleBlockers}
          className={cn(
            "h-9 gap-1.5 text-xs font-medium transition-colors border-slate-200 dark:border-slate-700",
            hasBlockers
              ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
          )}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Solo con bloqueos</span>
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </Button>
        )}
      </div>
    </div>
  )
}

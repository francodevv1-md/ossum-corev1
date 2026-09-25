"use client"

import React, { useState } from "react"
import { Search, X, AlertTriangle, Rows3, StretchHorizontal } from "lucide-react"
import { SURGERY_STATE_OPTIONS } from "@/lib/statusHelpers"
import { ColumnVisibilityMenu } from "@/components/cirugias/ColumnVisibilityMenu"
import { MoreFiltersPopover } from "@/components/cirugias/CirugiasAdvancedFilters"
import { SurgeryStateSelect } from "@/components/shared/selectors/SurgeryStateSelect"
import { PreparationStateSelect } from "@/components/shared/selectors/PreparationStateSelect"

interface FiltersToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  coordinators: string[]
  selectedCoordinators: string[]
  onToggleCoordinator: (coordinator: string) => void
  selectedStates: string[]
  onToggleState: (state: string) => void
  selectedPreps: string[]
  onTogglePrep: (prep: string) => void
  soloIncidencias: boolean
  onToggleSoloIncidencias: () => void
  hasActiveFilters: boolean
  onClearAll: () => void
  // Column visibility & density props
  columns?: ReadonlyArray<{ key: string; label: string }>
  visibleCols?: Record<string, boolean>
  onToggleColumn?: (key: string, checked: boolean) => void
  columnOrder?: string[]
  onReorderColumns?: (fromIndex: number, toIndex: number) => void
  onResetColumns?: () => void
  stickyColumns?: boolean
  onToggleStickyColumns?: () => void
  compactMode?: boolean
  onToggleCompactMode?: () => void
  showColumnControls?: boolean

  // Advanced "Más filtros" props
  classFilters?: string[]
  setClassFilters?: React.Dispatch<React.SetStateAction<string[]>>
  clientFilters?: string[]
  setClientFilters?: React.Dispatch<React.SetStateAction<string[]>>
  institutionFilters?: string[]
  setInstitutionFilters?: React.Dispatch<React.SetStateAction<string[]>>
  urgenteFilter?: boolean | null
  setUrgenteFilter?: (v: boolean | null) => void
  provinciaFilters?: string[]
  setProvinciaFilters?: React.Dispatch<React.SetStateAction<string[]>>
  vendedorFilters?: string[]
  setVendedorFilters?: React.Dispatch<React.SetStateAction<string[]>>
  searchInMedico?: boolean
  setSearchInMedico?: (v: boolean) => void
  searchInInstitucion?: boolean
  setSearchInInstitucion?: (v: boolean) => void
  searchInCliente?: boolean
  setSearchInCliente?: (v: boolean) => void
  searchInPR?: boolean
  setSearchInPR?: (v: boolean) => void
  searchInExpediente?: boolean
  setSearchInExpediente?: (v: boolean) => void
  searchInNR?: boolean
  setSearchInNR?: (v: boolean) => void
  searchInFV?: boolean
  setSearchInFV?: (v: boolean) => void
  hasActiveSecondary?: boolean
  expedienteNumFilter?: string
  setExpedienteNumFilter?: (v: string) => void
  nrNumFilter?: string
  setNrNumFilter?: (v: string) => void
  fvNumFilter?: string
  setFvNumFilter?: (v: string) => void
  numeroAutorizacionFilter?: string
  setNumeroAutorizacionFilter?: (v: string) => void
  instrumentadorFilter?: string
  setInstrumentadorFilter?: (v: string) => void
  localidadFilter?: string
  setLocalidadFilter?: (v: string) => void
  fechaAutorizacionFrom?: string
  setFechaAutorizacionFrom?: (v: string) => void
  fechaAutorizacionTo?: string
  setFechaAutorizacionTo?: (v: string) => void
  fechaFacturaFrom?: string
  setFechaFacturaFrom?: (v: string) => void
  fechaFacturaTo?: string
  setFechaFacturaTo?: (v: string) => void
  sinFechaCx?: boolean
  setSinFechaCx?: (v: boolean) => void
  conPrFilter?: "con" | "sin" | null
  setConPrFilter?: (v: "con" | "sin" | null) => void
  conConsumoFilter?: "con" | "sin" | null
  setConConsumoFilter?: (v: "con" | "sin" | null) => void
  conFacturaFilter?: "con" | "sin" | null
  setConFacturaFilter?: (v: "con" | "sin" | null) => void
  clearAdvancedFilters?: () => void
}

const PREP_OPTIONS = [
  "Sin preparar",
  "En preparación",
  "Congelado",
  "Congelado con faltantes",
  "Enviado",
  "Entregado",
  "Retirado",
]

export function FiltersToolbar({
  search,
  onSearchChange,
  coordinators,
  selectedCoordinators,
  onToggleCoordinator,
  selectedStates,
  onToggleState,
  selectedPreps,
  onTogglePrep,
  soloIncidencias,
  onToggleSoloIncidencias,
  hasActiveFilters,
  onClearAll,
  columns,
  visibleCols,
  onToggleColumn,
  columnOrder,
  onReorderColumns,
  onResetColumns,
  stickyColumns,
  onToggleStickyColumns,
  compactMode,
  onToggleCompactMode,
  showColumnControls = true,
  // Advanced filters
  classFilters = [],
  setClassFilters = () => {},
  clientFilters = [],
  setClientFilters = () => {},
  institutionFilters = [],
  setInstitutionFilters = () => {},
  urgenteFilter = null,
  setUrgenteFilter = () => {},
  provinciaFilters = [],
  setProvinciaFilters = () => {},
  vendedorFilters = [],
  setVendedorFilters = () => {},
  searchInMedico = true,
  setSearchInMedico = () => {},
  searchInInstitucion = true,
  setSearchInInstitucion = () => {},
  searchInCliente = true,
  setSearchInCliente = () => {},
  searchInPR = true,
  setSearchInPR = () => {},
  searchInExpediente = true,
  setSearchInExpediente = () => {},
  searchInNR = false,
  setSearchInNR = () => {},
  searchInFV = false,
  setSearchInFV = () => {},
  hasActiveSecondary = false,
  expedienteNumFilter = "",
  setExpedienteNumFilter = () => {},
  nrNumFilter = "",
  setNrNumFilter = () => {},
  fvNumFilter = "",
  setFvNumFilter = () => {},
  numeroAutorizacionFilter = "",
  setNumeroAutorizacionFilter = () => {},
  instrumentadorFilter = "",
  setInstrumentadorFilter = () => {},
  localidadFilter = "",
  setLocalidadFilter = () => {},
  fechaAutorizacionFrom = "",
  setFechaAutorizacionFrom = () => {},
  fechaAutorizacionTo = "",
  setFechaAutorizacionTo = () => {},
  fechaFacturaFrom = "",
  setFechaFacturaFrom = () => {},
  fechaFacturaTo = "",
  setFechaFacturaTo = () => {},
  sinFechaCx = false,
  setSinFechaCx = () => {},
  conPrFilter = null,
  setConPrFilter = () => {},
  conConsumoFilter = null,
  setConConsumoFilter = () => {},
  conFacturaFilter = null,
  setConFacturaFilter = () => {},
  clearAdvancedFilters = () => {},
}: FiltersToolbarProps) {
  const [colVisOpen, setColVisOpen] = useState(false)

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-all">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por paciente, médico, institución o ID de CX..."
          className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D2FC0]/30 focus:border-[#1D2FC0] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-90 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Select Filters Group */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Coordinador Filter */}
        <div className="relative inline-block">
          <select
            value={selectedCoordinators[0] || ""}
            onChange={(e) => {
              if (e.target.value === "") {
                if (selectedCoordinators.length > 0) onToggleCoordinator(selectedCoordinators[0])
              } else {
                onToggleCoordinator(e.target.value)
              }
            }}
            className={`text-xs py-2 px-3 rounded-lg border appearance-none pr-8 bg-white dark:bg-slate-800 font-medium cursor-pointer transition-all ${
              selectedCoordinators.length > 0
                ? "border-[#1D2FC0] text-[#1D2FC0] bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-[#1D2FC0]/30"
                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
            }`}
          >
            <option value="">Coordinador: Todos</option>
            {coordinators.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
            ▼
          </div>
        </div>

        {/* Estado Filter */}
        <div className="w-48 shrink-0">
          <SurgeryStateSelect
            value={selectedStates[0] || ""}
            onChange={(val) => {
              if (val === "") {
                if (selectedStates.length > 0) onToggleState(selectedStates[0])
              } else {
                onToggleState(val)
              }
            }}
            includeAllOption={true}
            allOptionLabel="Estado: Todos"
            className="h-9"
          />
        </div>

        {/* Preparación Filter */}
        <div className="w-48 shrink-0">
          <PreparationStateSelect
            value={selectedPreps[0] || ""}
            onChange={(val) => {
              if (val === "") {
                if (selectedPreps.length > 0) onTogglePrep(selectedPreps[0])
              } else {
                onTogglePrep(val)
              }
            }}
            includeAllOption={true}
            allOptionLabel="Preparación: Todas"
            className="h-9"
          />
        </div>

        {/* Toggle Solo Incidencias */}
        <button
          type="button"
          onClick={onToggleSoloIncidencias}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
            soloIncidencias
              ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 shadow-2xs"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${soloIncidencias ? "text-red-600 animate-pulse" : "text-slate-400"}`} />
          <span>Solo incidencias</span>
        </button>

        {/* Reusable "Más Filtros" Popover from Cirugias */}
        <MoreFiltersPopover
          classFilters={classFilters}
          setClassFilters={setClassFilters}
          clientFilters={clientFilters}
          setClientFilters={setClientFilters}
          institutionFilters={institutionFilters}
          setInstitutionFilters={setInstitutionFilters}
          urgenteFilter={urgenteFilter}
          setUrgenteFilter={setUrgenteFilter}
          provinciaFilters={provinciaFilters}
          setProvinciaFilters={setProvinciaFilters}
          vendedorFilters={vendedorFilters}
          setVendedorFilters={setVendedorFilters}
          searchInMedico={searchInMedico}
          setSearchInMedico={setSearchInMedico}
          searchInInstitucion={searchInInstitucion}
          setSearchInInstitucion={setSearchInInstitucion}
          searchInCliente={searchInCliente}
          setSearchInCliente={setSearchInCliente}
          searchInPR={searchInPR}
          setSearchInPR={setSearchInPR}
          searchInExpediente={searchInExpediente}
          setSearchInExpediente={setSearchInExpediente}
          searchInNR={searchInNR}
          setSearchInNR={setSearchInNR}
          searchInFV={searchInFV}
          setSearchInFV={setSearchInFV}
          clearFilters={clearAdvancedFilters}
          hasActiveSecondary={hasActiveSecondary}
          expedienteNumFilter={expedienteNumFilter}
          setExpedienteNumFilter={setExpedienteNumFilter}
          nrNumFilter={nrNumFilter}
          setNrNumFilter={setNrNumFilter}
          fvNumFilter={fvNumFilter}
          setFvNumFilter={setFvNumFilter}
          numeroAutorizacionFilter={numeroAutorizacionFilter}
          setNumeroAutorizacionFilter={setNumeroAutorizacionFilter}
          instrumentadorFilter={instrumentadorFilter}
          setInstrumentadorFilter={setInstrumentadorFilter}
          localidadFilter={localidadFilter}
          setLocalidadFilter={setLocalidadFilter}
          fechaAutorizacionFrom={fechaAutorizacionFrom}
          setFechaAutorizacionFrom={setFechaAutorizacionFrom}
          fechaAutorizacionTo={fechaAutorizacionTo}
          setFechaAutorizacionTo={setFechaAutorizacionTo}
          fechaFacturaFrom={fechaFacturaFrom}
          setFechaFacturaFrom={setFechaFacturaFrom}
          fechaFacturaTo={fechaFacturaTo}
          setFechaFacturaTo={setFechaFacturaTo}
          sinFechaCx={sinFechaCx}
          setSinFechaCx={setSinFechaCx}
          conPrFilter={conPrFilter}
          setConPrFilter={setConPrFilter}
          conConsumoFilter={conConsumoFilter}
          setConConsumoFilter={setConConsumoFilter}
          conFacturaFilter={conFacturaFilter}
          setConFacturaFilter={setConFacturaFilter}
        />

        {/* Limpiar Filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer animate-in fade-in"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        )}

        {/* Column visibility menu & density toggle */}
        {showColumnControls && columns && visibleCols && onToggleColumn && columnOrder && onReorderColumns && onResetColumns && (
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800 ml-1">
            <ColumnVisibilityMenu
              colVisOpen={colVisOpen}
              setColVisOpen={setColVisOpen}
              columns={columns}
              visibleCols={visibleCols}
              toggleColumn={onToggleColumn}
              stickyColumns={stickyColumns}
              onToggleStickyColumns={onToggleStickyColumns}
              columnOrder={columnOrder}
              onReorderColumns={onReorderColumns}
              onResetToDefault={onResetColumns}
              triggerLabel="Columnas"
              triggerClassName="h-8 text-xs py-1.5 px-2.5 rounded-lg border-slate-200 dark:border-slate-700"
            />

            {onToggleCompactMode && (
              <button
                type="button"
                onClick={onToggleCompactMode}
                title={compactMode ? "Cambiar a vista cómoda" : "Cambiar a vista compacta"}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border text-xs transition-all active:scale-95 cursor-pointer ${
                  compactMode
                    ? "bg-blue-50 text-[#1D2FC0] border-blue-200 dark:bg-blue-950/40 dark:border-blue-800"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                {compactMode ? (
                  <Rows3 className="w-3.5 h-3.5" />
                ) : (
                  <StretchHorizontal className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

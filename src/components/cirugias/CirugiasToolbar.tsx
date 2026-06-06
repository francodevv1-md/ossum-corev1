"use client"
import React from "react"
import { Plus, FileText, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SmartSurgerySearch } from "./SmartSurgerySearch"
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu"
import {
  CX_STATE_COLORS, PREP_STATE_COLORS, DOC_STATUS_COLORS,
  STATE_FILTER_OPTIONS, PREP_FILTER_OPTIONS, DOC_FILTER_OPTIONS, FACT_FILTER_OPTIONS,
  COORDINADOR_CX_OPTIONS,
} from "@/lib/cirugias.constants"
import { MoreFiltersPopover } from "./CirugiasAdvancedFilters"
import { DateFiltersPopover } from "./DateFiltersPopover"
import type { DateFilter } from "@/lib/cirugias.types"

// ═══════════════════════════════════════════════════════════════
// QuickFilterPopover — small button + popover with checkboxes
// ═══════════════════════════════════════════════════════════════
function QuickFilterPopover({
  label,
  options,
  selected,
  onToggle,
  colorMap,
}: {
  label: string
  options: string[] | Array<{ value: string; label: string }>
  selected: string[]
  onToggle: (value: string) => void
  colorMap?: Record<string, string>
}) {
  const [open, setOpen] = React.useState(false)
  const normalized = typeof options[0] === "string"
    ? (options as string[]).map(o => ({ value: o, label: o }))
    : (options as Array<{ value: string; label: string }>)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selected.length > 0 ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-7 gap-1 text-[11px] px-2.5 shrink-0",
            selected.length > 0 && "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
          )}
        >
          {label}
          {selected.length > 0 && (
            <span className="flex size-4 rounded-full bg-white/25 items-center justify-center text-[9px] font-bold leading-none">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[180px] max-w-[280px] p-2">
        <div className="space-y-0.5">
          {normalized.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer text-xs py-0.5 hover:bg-accent rounded px-1"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => onToggle(opt.value)}
                className="size-3.5"
              />
              {colorMap && colorMap[opt.value] ? (
                <span className={cn("inline-flex items-center rounded px-1.5 py-[1px] text-[9px] font-medium leading-none", colorMap[opt.value])}>
                  {opt.label}
                </span>
              ) : (
                <span>{opt.label}</span>
              )}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ═══════════════════════════════════════════════════════════════
// Toolbar Props — same interface, different rendering
// ═══════════════════════════════════════════════════════════════
interface CirugiasToolbarProps {
  // CHATZAI-025: Smart search chips
  searchChips: import("@/lib/cirugias.types").SearchChip[]
  onSearchChipsChange: (chips: import("@/lib/cirugias.types").SearchChip[]) => void
  onSmartSearch: () => void
  // Advanced filters (kept for "Más filtros")
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  hasActiveFilters: boolean
  activeFilterCount: number
  stateFilters: string[]
  setStateFilters: React.Dispatch<React.SetStateAction<string[]>>
  prepFilters: string[]
  setPrepFilters: React.Dispatch<React.SetStateAction<string[]>>
  docFilters: string[]
  setDocFilters: React.Dispatch<React.SetStateAction<string[]>>
  factFilters: string[]
  setFactFilters: React.Dispatch<React.SetStateAction<string[]>>
  classFilters: string[]
  setClassFilters: React.Dispatch<React.SetStateAction<string[]>>
  clientFilters: string[]
  setClientFilters: React.Dispatch<React.SetStateAction<string[]>>
  institutionFilters: string[]
  setInstitutionFilters: React.Dispatch<React.SetStateAction<string[]>>
  coordinadorFilters: string[]
  setCoordinadorFilters: React.Dispatch<React.SetStateAction<string[]>>
  urgenteFilter: boolean | null
  setUrgenteFilter: (v: boolean | null) => void
  provinciaFilters: string[]
  setProvinciaFilters: React.Dispatch<React.SetStateAction<string[]>>
  vendedorFilters: string[]
  setVendedorFilters: React.Dispatch<React.SetStateAction<string[]>>
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  // CHATZAI-025-4C: Enhanced date filters
  dateFilters: DateFilter[]
  onDateFiltersChange: (filters: DateFilter[]) => void
  searchInMedico: boolean
  setSearchInMedico: (v: boolean) => void
  searchInInstitucion: boolean
  setSearchInInstitucion: (v: boolean) => void
  searchInCliente: boolean
  setSearchInCliente: (v: boolean) => void
  searchInPR: boolean
  setSearchInPR: (v: boolean) => void
  searchInExpediente: boolean
  setSearchInExpediente: (v: boolean) => void
  searchInNR: boolean
  setSearchInNR: (v: boolean) => void
  searchInFV: boolean
  setSearchInFV: (v: boolean) => void
  clearFilters: () => void
  // Legacy search (kept for backward compat, but SmartSurgerySearch replaces it)
  search: string
  setSearch: (v: string) => void
  // Column visibility
  colVisOpen: boolean
  setColVisOpen: (v: boolean) => void
  columns: ReadonlyArray<{ key: string; label: string }>
  visibleCols: Record<string, boolean>
  toggleColumn: (key: string, checked: boolean) => void
  // Sticky columns
  stickyColumns: boolean
  onToggleStickyColumns: () => void
  // Column order
  columnOrder: string[]
  onReorderColumns: (fromIndex: number, toIndex: number) => void
  onResetToDefault: () => void
  // Count
  resultCount: number
  // Actions
  onNewSurgery: () => void
  // Reports & Documents dialog
  reportsDialogOpen: boolean
  onReportsDialogOpenChange: (open: boolean) => void
  // CHATZAI-025-4C: New advanced filter props
  expedienteNumFilter: string
  setExpedienteNumFilter: (v: string) => void
  nrNumFilter: string
  setNrNumFilter: (v: string) => void
  fvNumFilter: string
  setFvNumFilter: (v: string) => void
  numeroAutorizacionFilter: string
  setNumeroAutorizacionFilter: (v: string) => void
  instrumentadorFilter: string
  setInstrumentadorFilter: (v: string) => void
  localidadFilter: string
  setLocalidadFilter: (v: string) => void
  fechaAutorizacionFrom: string
  setFechaAutorizacionFrom: (v: string) => void
  fechaAutorizacionTo: string
  setFechaAutorizacionTo: (v: string) => void
  fechaFacturaFrom: string
  setFechaFacturaFrom: (v: string) => void
  fechaFacturaTo: string
  setFechaFacturaTo: (v: string) => void
  sinFechaCx: boolean
  setSinFechaCx: (v: boolean) => void
  conPrFilter: "con" | "sin" | null
  setConPrFilter: (v: "con" | "sin" | null) => void
  conConsumoFilter: "con" | "sin" | null
  setConConsumoFilter: (v: "con" | "sin" | null) => void
  conFacturaFilter: "con" | "sin" | null
  setConFacturaFilter: (v: "con" | "sin" | null) => void
}

export function CirugiasToolbar(props: CirugiasToolbarProps) {
  const toggleFilter = (
    current: string[],
    set: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) => {
    set(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])
  }

  const hasActiveSecondary = !!(
    props.classFilters.length > 0 ||
    props.clientFilters.length > 0 ||
    props.institutionFilters.length > 0 ||
    props.urgenteFilter !== null ||
    props.provinciaFilters.length > 0 ||
    props.vendedorFilters.length > 0 ||
    props.searchInMedico ||
    props.searchInInstitucion ||
    props.searchInCliente ||
    props.searchInPR ||
    props.searchInExpediente ||
    props.searchInNR ||
    props.searchInFV ||
    // CHATZAI-025-4C: New advanced filters in "Más filtros"
    props.expedienteNumFilter ||
    props.nrNumFilter ||
    props.fvNumFilter ||
    props.numeroAutorizacionFilter ||
    props.instrumentadorFilter ||
    props.localidadFilter ||
    props.fechaAutorizacionFrom ||
    props.fechaAutorizacionTo ||
    props.fechaFacturaFrom ||
    props.fechaFacturaTo ||
    props.sinFechaCx ||
    props.conPrFilter !== null ||
    props.conConsumoFilter !== null ||
    props.conFacturaFilter !== null
  )

  // CHATZAI-025: Use centralized filter count from hook
  const activeFilterCount = props.activeFilterCount

  return (
    <div className="shrink-0 border-b px-3 py-2 space-y-2">
      {/* ═══ ROW 1: Smart Search (CHATZAI-025) ═══ */}
      <SmartSurgerySearch
        chips={props.searchChips}
        onChipsChange={props.onSearchChipsChange}
        onSearch={props.onSmartSearch}
      />

      {/* ═══ ROW 2: Filter Buttons ═══ */}
      <div className="flex flex-wrap items-center gap-1.5">
        <QuickFilterPopover
          label="Estado CX"
          options={STATE_FILTER_OPTIONS}
          selected={props.stateFilters}
          onToggle={(v) => toggleFilter(props.stateFilters, props.setStateFilters, v)}
          colorMap={CX_STATE_COLORS}
        />
        <QuickFilterPopover
          label="Preparación"
          options={PREP_FILTER_OPTIONS}
          selected={props.prepFilters}
          onToggle={(v) => toggleFilter(props.prepFilters, props.setPrepFilters, v)}
          colorMap={PREP_STATE_COLORS}
        />
        <QuickFilterPopover
          label="Documentación"
          options={DOC_FILTER_OPTIONS}
          selected={props.docFilters}
          onToggle={(v) => toggleFilter(props.docFilters, props.setDocFilters, v)}
          colorMap={DOC_STATUS_COLORS}
        />
        <QuickFilterPopover
          label="Facturación"
          options={[...FACT_FILTER_OPTIONS]}
          selected={props.factFilters}
          onToggle={(v) => toggleFilter(props.factFilters, props.setFactFilters, v)}
        />
        <QuickFilterPopover
          label="Coordinador"
          options={[...COORDINADOR_CX_OPTIONS]}
          selected={props.coordinadorFilters}
          onToggle={(v) => toggleFilter(props.coordinadorFilters, props.setCoordinadorFilters, v)}
        />

        {/* CHATZAI-025-4C: Enhanced Date Filters */}
        <DateFiltersPopover
          dateFilters={props.dateFilters}
          onDateFiltersChange={props.onDateFiltersChange}
        />

        {/* Más filtros (secondary) */}
        <MoreFiltersPopover
          classFilters={props.classFilters}
          setClassFilters={props.setClassFilters}
          clientFilters={props.clientFilters}
          setClientFilters={props.setClientFilters}
          institutionFilters={props.institutionFilters}
          setInstitutionFilters={props.setInstitutionFilters}
          urgenteFilter={props.urgenteFilter}
          setUrgenteFilter={props.setUrgenteFilter}
          provinciaFilters={props.provinciaFilters}
          setProvinciaFilters={props.setProvinciaFilters}
          vendedorFilters={props.vendedorFilters}
          setVendedorFilters={props.setVendedorFilters}
          searchInMedico={props.searchInMedico}
          setSearchInMedico={props.setSearchInMedico}
          searchInInstitucion={props.searchInInstitucion}
          setSearchInInstitucion={props.setSearchInInstitucion}
          searchInCliente={props.searchInCliente}
          setSearchInCliente={props.setSearchInCliente}
          searchInPR={props.searchInPR}
          setSearchInPR={props.setSearchInPR}
          searchInExpediente={props.searchInExpediente}
          setSearchInExpediente={props.setSearchInExpediente}
          searchInNR={props.searchInNR}
          setSearchInNR={props.setSearchInNR}
          searchInFV={props.searchInFV}
          setSearchInFV={props.setSearchInFV}
          clearFilters={props.clearFilters}
          hasActiveSecondary={hasActiveSecondary}
          // CHATZAI-025-4C: New advanced filter props
          expedienteNumFilter={props.expedienteNumFilter}
          setExpedienteNumFilter={props.setExpedienteNumFilter}
          nrNumFilter={props.nrNumFilter}
          setNrNumFilter={props.setNrNumFilter}
          fvNumFilter={props.fvNumFilter}
          setFvNumFilter={props.setFvNumFilter}
          numeroAutorizacionFilter={props.numeroAutorizacionFilter}
          setNumeroAutorizacionFilter={props.setNumeroAutorizacionFilter}
          instrumentadorFilter={props.instrumentadorFilter}
          setInstrumentadorFilter={props.setInstrumentadorFilter}
          localidadFilter={props.localidadFilter}
          setLocalidadFilter={props.setLocalidadFilter}
          fechaAutorizacionFrom={props.fechaAutorizacionFrom}
          setFechaAutorizacionFrom={props.setFechaAutorizacionFrom}
          fechaAutorizacionTo={props.fechaAutorizacionTo}
          setFechaAutorizacionTo={props.setFechaAutorizacionTo}
          fechaFacturaFrom={props.fechaFacturaFrom}
          setFechaFacturaFrom={props.setFechaFacturaFrom}
          fechaFacturaTo={props.fechaFacturaTo}
          setFechaFacturaTo={props.setFechaFacturaTo}
          sinFechaCx={props.sinFechaCx}
          setSinFechaCx={props.setSinFechaCx}
          conPrFilter={props.conPrFilter}
          setConPrFilter={props.setConPrFilter}
          conConsumoFilter={props.conConsumoFilter}
          setConConsumoFilter={props.setConConsumoFilter}
          conFacturaFilter={props.conFacturaFilter}
          setConFacturaFilter={props.setConFacturaFilter}
        />
      </div>

      {/* ═══ ROW 3: Actions + Counter + Nueva cirugía ═══ */}
      <div className="flex items-center gap-2">
        {/* Left side: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Informes y documentos */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-[11px] px-2.5 shrink-0"
            onClick={() => props.onReportsDialogOpenChange(true)}
          >
            <FileText className="size-3" />
            Informes y documentos
          </Button>

          {/* Column visibility */}
          <ColumnVisibilityMenu
            colVisOpen={props.colVisOpen}
            setColVisOpen={props.setColVisOpen}
            columns={props.columns}
            visibleCols={props.visibleCols}
            toggleColumn={props.toggleColumn}
            stickyColumns={props.stickyColumns}
            onToggleStickyColumns={props.onToggleStickyColumns}
            columnOrder={props.columnOrder}
            onReorderColumns={props.onReorderColumns}
            onResetToDefault={props.onResetToDefault}
          />

          {/* Clear filters */}
          {props.hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px] px-2.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={props.clearFilters}
            >
              <X className="size-3" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Center: Counter */}
        <div className="flex-1 text-center">
          <span className="text-[11px] text-muted-foreground">
            {props.resultCount} cirugía{props.resultCount !== 1 ? "s" : ""}
            {activeFilterCount > 0 && (
              <> · {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""} activo{activeFilterCount !== 1 ? "s" : ""}</>
            )}
          </span>
        </div>

        {/* Right side: Nueva cirugía dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 shrink-0">
              <Plus className="size-4" />
              Nueva cirugía
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={props.onNewSurgery}>
              <Plus className="size-4" />
              <span>Crear nueva cirugía</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <FileText className="size-4" />
              <span>Crear PR para cirugía existente</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Próximamente</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

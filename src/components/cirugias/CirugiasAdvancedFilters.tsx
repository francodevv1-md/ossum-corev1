"use client"

import React, { useState, useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SlidersHorizontal,
  Building2,
  Stethoscope,
  FileText,
  Receipt,
  Calendar,
  MapPin,
  RotateCcw,
  Check,
  Search,
  ShieldCheck,
  AlertCircle,
  Folder,
  Tag,
  Briefcase,
  UserCheck,
  User,
  Clock,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CLASSIFICATIONS,
  PROVINCIA_FILTER_OPTIONS,
  VENDEDOR_FILTER_OPTIONS,
} from "@/lib/cirugias.constants"
import { INSTITUTION_OPTIONS, CLIENT_OPTIONS } from "@/lib/statusHelpers"

interface MoreFiltersPopoverProps {
  classFilters: string[]
  setClassFilters: React.Dispatch<React.SetStateAction<string[]>>
  clientFilters: string[]
  setClientFilters: React.Dispatch<React.SetStateAction<string[]>>
  institutionFilters: string[]
  setInstitutionFilters: React.Dispatch<React.SetStateAction<string[]>>
  urgenteFilter: boolean | null
  setUrgenteFilter: (v: boolean | null) => void
  provinciaFilters: string[]
  setProvinciaFilters: React.Dispatch<React.SetStateAction<string[]>>
  vendedorFilters: string[]
  setVendedorFilters: React.Dispatch<React.SetStateAction<string[]>>
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
  hasActiveSecondary: boolean
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

type FilterTab = "people" | "documents" | "dates" | "status"

export function MoreFiltersPopover(props: MoreFiltersPopoverProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<FilterTab>("people")

  // Count active filters per category
  const counts = useMemo(() => {
    let people = 0
    if (props.institutionFilters.length > 0) people++
    if (props.clientFilters.length > 0) people++
    if (props.classFilters.length > 0) people++
    if (props.provinciaFilters.length > 0) people++
    if (props.vendedorFilters.length > 0) people++
    if (props.instrumentadorFilter.trim()) people++
    if (props.localidadFilter.trim()) people++

    let documents = 0
    if (props.expedienteNumFilter.trim()) documents++
    if (props.nrNumFilter.trim()) documents++
    if (props.fvNumFilter.trim()) documents++
    if (props.numeroAutorizacionFilter.trim()) documents++

    let dates = 0
    if (props.fechaAutorizacionFrom || props.fechaAutorizacionTo) dates++
    if (props.fechaFacturaFrom || props.fechaFacturaTo) dates++
    if (props.sinFechaCx) dates++

    let status = 0
    if (props.urgenteFilter === true) status++
    if (props.conPrFilter !== null) status++
    if (props.conConsumoFilter !== null) status++
    if (props.conFacturaFilter !== null) status++

    const total = people + documents + dates + status
    return { people, documents, dates, status, total }
  }, [
    props.institutionFilters,
    props.clientFilters,
    props.classFilters,
    props.provinciaFilters,
    props.vendedorFilters,
    props.instrumentadorFilter,
    props.localidadFilter,
    props.expedienteNumFilter,
    props.nrNumFilter,
    props.fvNumFilter,
    props.numeroAutorizacionFilter,
    props.fechaAutorizacionFrom,
    props.fechaAutorizacionTo,
    props.fechaFacturaFrom,
    props.fechaFacturaTo,
    props.sinFechaCx,
    props.urgenteFilter,
    props.conPrFilter,
    props.conConsumoFilter,
    props.conFacturaFilter,
  ])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-all shrink-0",
            counts.total > 0
              ? "border-blue-500 bg-blue-50/80 text-blue-700 shadow-2xs dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          <span>Más filtros</span>
          {counts.total > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white dark:bg-blue-500">
              {counts.total}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] sm:w-[560px] max-h-[82vh] overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        {/* ── Popover Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <SlidersHorizontal className="size-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Filtros Avanzados
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Filtrá cirugías por criterios específicos
              </p>
            </div>
          </div>

          {counts.total > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={props.clearFilters}
              className="h-6 gap-1 px-2 text-[10px] font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400"
            >
              <RotateCcw className="size-2.5" />
              Limpiar ({counts.total})
            </Button>
          )}
        </div>

        {/* ── Categorized Tabs Navigation ── */}
        <div className="flex border-b border-slate-200 bg-slate-100/50 px-2 pt-2 dark:border-slate-800 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all",
              activeTab === "people"
                ? "border-b-2 border-blue-600 bg-white text-blue-700 shadow-2xs dark:bg-slate-950 dark:text-blue-400 font-semibold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Building2 className="size-3.5" />
            <span>Participantes</span>
            {counts.people > 0 && (
              <span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all",
              activeTab === "documents"
                ? "border-b-2 border-blue-600 bg-white text-blue-700 shadow-2xs dark:bg-slate-950 dark:text-blue-400 font-semibold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <FileText className="size-3.5" />
            <span>Comprobantes</span>
            {counts.documents > 0 && (
              <span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dates")}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all",
              activeTab === "dates"
                ? "border-b-2 border-blue-600 bg-white text-blue-700 shadow-2xs dark:bg-slate-950 dark:text-blue-400 font-semibold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Calendar className="size-3.5" />
            <span>Fechas</span>
            {counts.dates > 0 && (
              <span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("status")}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all",
              activeTab === "status"
                ? "border-b-2 border-blue-600 bg-white text-blue-700 shadow-2xs dark:bg-slate-950 dark:text-blue-400 font-semibold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Layers className="size-3.5" />
            <span>Estado & Doc</span>
            {counts.status > 0 && (
              <span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {/* ── Tab Content (Scrollable) ── */}
        <div className="max-h-[380px] overflow-y-auto p-4 space-y-4">
          {/* ════════ TAB 1: Participantes y Lugares ════════ */}
          {activeTab === "people" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Institución */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="size-3 text-slate-400" />
                  Institución / Sanatorio
                </Label>
                <select
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white text-xs px-2.5 text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  value={props.institutionFilters[0] || ""}
                  onChange={(e) =>
                    props.setInstitutionFilters(e.target.value ? [e.target.value] : [])
                  }
                >
                  <option value="">Todas las instituciones</option>
                  {INSTITUTION_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Obra Social / Cliente */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="size-3 text-slate-400" />
                  Cliente / Obra Social
                </Label>
                <select
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white text-xs px-2.5 text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  value={props.clientFilters[0] || ""}
                  onChange={(e) =>
                    props.setClientFilters(e.target.value ? [e.target.value] : [])
                  }
                >
                  <option value="">Todos los clientes / obras sociales</option>
                  {CLIENT_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clasificación */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="size-3 text-slate-400" />
                  Tipo de Cirugía / Clasificación
                </Label>
                <select
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white text-xs px-2.5 text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  value={props.classFilters[0] || ""}
                  onChange={(e) =>
                    props.setClassFilters(e.target.value ? [e.target.value] : [])
                  }
                >
                  <option value="">Todas las clasificaciones</option>
                  {CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendedor */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="size-3 text-slate-400" />
                  Comercial / Vendedor
                </Label>
                <select
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white text-xs px-2.5 text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  value={props.vendedorFilters[0] || ""}
                  onChange={(e) =>
                    props.setVendedorFilters(e.target.value ? [e.target.value] : [])
                  }
                >
                  {VENDEDOR_FILTER_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v || "Todos los vendedores"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instrumentador */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="size-3 text-slate-400" />
                  Instrumentador
                </Label>
                <Input
                  placeholder="Buscar instrumentador..."
                  className="h-8 text-xs rounded-lg"
                  value={props.instrumentadorFilter}
                  onChange={(e) => props.setInstrumentadorFilter(e.target.value)}
                />
              </div>

              {/* Localidad */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="size-3 text-slate-400" />
                  Localidad / Ciudad
                </Label>
                <Input
                  placeholder="Ej: Resistencia, Corrientes..."
                  className="h-8 text-xs rounded-lg"
                  value={props.localidadFilter}
                  onChange={(e) => props.setLocalidadFilter(e.target.value)}
                />
              </div>

              {/* Provincia */}
              <div className="space-y-1 col-span-1 sm:col-span-2">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="size-3 text-slate-400" />
                  Provincia
                </Label>
                <select
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white text-xs px-2.5 text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  value={props.provinciaFilters[0] || ""}
                  onChange={(e) =>
                    props.setProvinciaFilters(e.target.value ? [e.target.value] : [])
                  }
                >
                  {PROVINCIA_FILTER_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p || "Todas las provincias"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ════════ TAB 2: Comprobantes y Números ════════ */}
          {activeTab === "documents" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Expediente Nº */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Folder className="size-3 text-slate-400" />
                  Expediente Nº
                </Label>
                <Input
                  placeholder="Ej: EXP-2026-042"
                  className="h-8 text-xs font-mono rounded-lg"
                  value={props.expedienteNumFilter}
                  onChange={(e) => props.setExpedienteNumFilter(e.target.value)}
                />
              </div>

              {/* Número de Autorización */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="size-3 text-slate-400" />
                  Nº de Autorización Médica
                </Label>
                <Input
                  placeholder="Ej: AUT-9843"
                  className="h-8 text-xs font-mono rounded-lg"
                  value={props.numeroAutorizacionFilter}
                  onChange={(e) => props.setNumeroAutorizacionFilter(e.target.value)}
                />
              </div>

              {/* Remito (NR Nº) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="size-3 text-slate-400" />
                  Remito (NR Nº)
                </Label>
                <Input
                  placeholder="Ej: NR-0001-000045"
                  className="h-8 text-xs font-mono rounded-lg"
                  value={props.nrNumFilter}
                  onChange={(e) => props.setNrNumFilter(e.target.value)}
                />
              </div>

              {/* Factura (FV Nº) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Receipt className="size-3 text-slate-400" />
                  Factura de Venta (FV Nº)
                </Label>
                <Input
                  placeholder="Ej: FV-0001-000089"
                  className="h-8 text-xs font-mono rounded-lg"
                  value={props.fvNumFilter}
                  onChange={(e) => props.setFvNumFilter(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ════════ TAB 3: Fechas y Períodos ════════ */}
          {activeTab === "dates" && (
            <div className="space-y-3.5">
              {/* Sin Fecha CX Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="toggle-sin-fecha-cx"
                    className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="size-3.5 text-slate-500" />
                    Cirugías sin fecha quirúrgica definida
                  </Label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Muestra únicamente cirugías en espera de fecha confirmada.
                  </p>
                </div>
                <Checkbox
                  id="toggle-sin-fecha-cx"
                  checked={props.sinFechaCx}
                  onCheckedChange={(checked) => props.setSinFechaCx(!!checked)}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {/* Rango Fecha Autorización */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-600" />
                  Rango por Fecha de Autorización
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium">Desde</span>
                    <Input
                      type="date"
                      value={props.fechaAutorizacionFrom}
                      onChange={(e) => props.setFechaAutorizacionFrom(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium">Hasta</span>
                    <Input
                      type="date"
                      value={props.fechaAutorizacionTo}
                      onChange={(e) => props.setFechaAutorizacionTo(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Rango Fecha Factura */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Receipt className="size-3.5 text-emerald-600" />
                  Rango por Fecha de Facturación
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium">Desde</span>
                    <Input
                      type="date"
                      value={props.fechaFacturaFrom}
                      onChange={(e) => props.setFechaFacturaFrom(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium">Hasta</span>
                    <Input
                      type="date"
                      value={props.fechaFacturaTo}
                      onChange={(e) => props.setFechaFacturaTo(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ TAB 4: Estado y Documentación ════════ */}
          {activeTab === "status" && (
            <div className="space-y-3.5">
              {/* Urgentes Card */}
              <div className="flex items-center justify-between rounded-xl border border-red-200/80 bg-red-50/40 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="toggle-urgentes"
                    className="text-xs font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertCircle className="size-3.5 text-red-600" />
                    Solo Cirugías Urgentes
                    <span className="inline-flex items-center rounded border border-red-300 bg-red-100 px-1 py-0.2 text-[9px] font-extrabold text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                      URG
                    </span>
                  </Label>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Filtra únicamente las intervenciones marcadas con prioridad alta.
                  </p>
                </div>
                <Checkbox
                  id="toggle-urgentes"
                  checked={props.urgenteFilter === true}
                  onCheckedChange={(checked) => props.setUrgenteFilter(checked ? true : null)}
                  className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
              </div>

              {/* Segmented Controls for Tri-state filters */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900">
                {/* Presupuesto / PR */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Presupuesto (PR)
                  </span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                    <button
                      type="button"
                      onClick={() => props.setConPrFilter(null)}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conPrFilter === null
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => props.setConPrFilter("con")}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conPrFilter === "con"
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Con PR
                    </button>
                    <button
                      type="button"
                      onClick={() => props.setConPrFilter("sin")}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conPrFilter === "sin"
                          ? "bg-amber-600 text-white shadow-xs font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Sin PR
                    </button>
                  </div>
                </div>

                {/* Consumo */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Registro de Consumo
                  </span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                    <button
                      type="button"
                      onClick={() => props.setConConsumoFilter(null)}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conConsumoFilter === null
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => props.setConConsumoFilter("con")}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conConsumoFilter === "con"
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Con consumo
                    </button>
                    <button
                      type="button"
                      onClick={() => props.setConConsumoFilter("sin")}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conConsumoFilter === "sin"
                          ? "bg-amber-600 text-white shadow-xs font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Sin consumo
                    </button>
                  </div>
                </div>

                {/* Factura */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Estado de Factura
                  </span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                    <button
                      type="button"
                      onClick={() => props.setConFacturaFilter(null)}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conFacturaFilter === null
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => props.setConFacturaFilter("con")}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conFacturaFilter === "con"
                          ? "bg-emerald-600 text-white shadow-xs font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Facturada
                    </button>
                    <button
                      type="button"
                      onClick={() => props.setConFacturaFilter("sin")}
                      className={cn(
                        "rounded-md px-2.5 py-0.5 font-medium transition-colors",
                        props.conFacturaFilter === "sin"
                          ? "bg-amber-600 text-white shadow-xs font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      Sin facturar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Ámbito de búsqueda global (Collapsible helper) ── */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/40">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Search className="size-3" />
              Campos incluidos en el buscador general:
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox
                  checked={props.searchInMedico}
                  onCheckedChange={(c) => props.setSearchInMedico(!!c)}
                />
                Médico
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox
                  checked={props.searchInInstitucion}
                  onCheckedChange={(c) => props.setSearchInInstitucion(!!c)}
                />
                Institución
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox
                  checked={props.searchInCliente}
                  onCheckedChange={(c) => props.setSearchInCliente(!!c)}
                />
                Obra Social
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox
                  checked={props.searchInPR}
                  onCheckedChange={(c) => props.setSearchInPR(!!c)}
                />
                PR Nº
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox
                  checked={props.searchInExpediente}
                  onCheckedChange={(c) => props.setSearchInExpediente(!!c)}
                />
                Expediente
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox
                  checked={props.searchInNR}
                  onCheckedChange={(c) => props.setSearchInNR(!!c)}
                />
                Remito
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox
                  checked={props.searchInFV}
                  onCheckedChange={(c) => props.setSearchInFV(!!c)}
                />
                Factura
              </label>
            </div>
          </div>
        </div>

        {/* ── Popover Footer ── */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {counts.total > 0
              ? `${counts.total} ${counts.total === 1 ? "filtro activo" : "filtros activos"}`
              : "Sin filtros aplicados"}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs px-3"
            >
              Listo
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Keep the old export name for backward compatibility
export { MoreFiltersPopover as CirugiasAdvancedFilters }

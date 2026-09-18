"use client"
import React, { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { SlidersHorizontal } from "lucide-react"
import { CLASSIFICATIONS, PROVINCIA_FILTER_OPTIONS, VENDEDOR_FILTER_OPTIONS } from "@/lib/cirugias.constants"
import { INSTITUTION_OPTIONS, CLIENT_OPTIONS } from "@/lib/statusHelpers"

// ═══════════════════════════════════════════════════════════════
// MoreFiltersPopover — secondary filters (Médico, Institución,
// Cliente/OS, Clasificación, Urgente, Provincia, Vendedor,
// PR/Exp/NR/FV, Buscar también en)
// CHATZAI-025-4C: Added new filter fields (Expediente Nº, NR Nº,
// FV Nº, Número autorización, Instrumentador, Localidad,
// Fecha autorización, Fecha factura, Sin fecha CX,
// Con/Sin PR, Con/Sin consumo, Con/Sin factura)
// ═══════════════════════════════════════════════════════════════

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

export function MoreFiltersPopover(props: MoreFiltersPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] px-2.5 shrink-0">
          <SlidersHorizontal className="size-3" />
          Más filtros
          {props.hasActiveSecondary && (
            <span className="flex size-2 rounded-full bg-blue-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[480px] max-h-[70vh] overflow-y-auto p-0">
        <div className="p-2.5 border-b sticky top-0 bg-popover z-10">
          <p className="text-xs font-semibold">Más filtros</p>
        </div>
        <div className="p-2.5 space-y-3">
          {/* ── Row 1: Médico, Institución, Cliente, Clasificación ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Médico</Label>
              <Input placeholder="Buscar médico..." className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Institución</Label>
              <select
                className="h-7 w-full rounded-md border text-xs px-2 bg-background"
                value={props.institutionFilters[0] || ""}
                onChange={e => props.setInstitutionFilters(e.target.value ? [e.target.value] : [])}
              >
                <option value="">Todas</option>
                {INSTITUTION_OPTIONS.filter(o => o.value).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Cliente / Obra Social</Label>
              <select
                className="h-7 w-full rounded-md border text-xs px-2 bg-background"
                value={props.clientFilters[0] || ""}
                onChange={e => props.setClientFilters(e.target.value ? [e.target.value] : [])}
              >
                <option value="">Todos</option>
                {CLIENT_OPTIONS.filter(o => o.value).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Clasificación</Label>
              <select
                className="h-7 w-full rounded-md border text-xs px-2 bg-background"
                value={props.classFilters[0] || ""}
                onChange={e => props.setClassFilters(e.target.value ? [e.target.value] : [])}
              >
                <option value="">Todas</option>
                {CLASSIFICATIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Row 2: Provincia, Vendedor, Instrumentador, Localidad ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Provincia</Label>
              <select
                className="h-7 w-full rounded-md border text-xs px-2 bg-background"
                value={props.provinciaFilters[0] || ""}
                onChange={e => props.setProvinciaFilters(e.target.value ? [e.target.value] : [])}
              >
                {PROVINCIA_FILTER_OPTIONS.map(p => (
                  <option key={p} value={p}>{p || "Todas"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Vendedor</Label>
              <select
                className="h-7 w-full rounded-md border text-xs px-2 bg-background"
                value={props.vendedorFilters[0] || ""}
                onChange={e => props.setVendedorFilters(e.target.value ? [e.target.value] : [])}
              >
                {VENDEDOR_FILTER_OPTIONS.map(v => (
                  <option key={v} value={v}>{v || "Todos"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Instrumentador</Label>
              <Input
                placeholder="Buscar instrumentador..."
                className="h-7 text-xs"
                value={props.instrumentadorFilter}
                onChange={e => props.setInstrumentadorFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Localidad</Label>
              <Input
                placeholder="Buscar localidad..."
                className="h-7 text-xs"
                value={props.localidadFilter}
                onChange={e => props.setLocalidadFilter(e.target.value)}
              />
            </div>
          </div>

          {/* ── Row 3: Document numbers ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">PR Nº</Label>
              <Input placeholder="PR-..." className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Expediente Nº</Label>
              <Input
                placeholder="EXP-..."
                className="h-7 text-xs"
                value={props.expedienteNumFilter}
                onChange={e => props.setExpedienteNumFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">NR Nº</Label>
              <Input
                placeholder="NR-..."
                className="h-7 text-xs"
                value={props.nrNumFilter}
                onChange={e => props.setNrNumFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">FV Nº</Label>
              <Input
                placeholder="FV-..."
                className="h-7 text-xs"
                value={props.fvNumFilter}
                onChange={e => props.setFvNumFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Número de autorización</Label>
              <Input
                placeholder="Nº autorización..."
                className="h-7 text-xs"
                value={props.numeroAutorizacionFilter}
                onChange={e => props.setNumeroAutorizacionFilter(e.target.value)}
              />
            </div>
          </div>

          {/* ── Row 4: Date filters ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Fecha autorización</Label>
              <div className="grid grid-cols-2 gap-1">
                <Input
                  type="date"
                  placeholder="Desde"
                  value={props.fechaAutorizacionFrom}
                  onChange={e => props.setFechaAutorizacionFrom(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  type="date"
                  placeholder="Hasta"
                  value={props.fechaAutorizacionTo}
                  onChange={e => props.setFechaAutorizacionTo(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Fecha factura</Label>
              <div className="grid grid-cols-2 gap-1">
                <Input
                  type="date"
                  placeholder="Desde"
                  value={props.fechaFacturaFrom}
                  onChange={e => props.setFechaFacturaFrom(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  type="date"
                  placeholder="Hasta"
                  value={props.fechaFacturaTo}
                  onChange={e => props.setFechaFacturaTo(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* ── Row 5: Checkbox filters ── */}
          <div className="space-y-2">
            {/* Urgente filter */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={props.urgenteFilter === true}
                onCheckedChange={(checked) => {
                  if (checked) {
                    props.setUrgenteFilter(true)
                  } else {
                    props.setUrgenteFilter(null)
                  }
                }}
              />
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase cursor-pointer">Solo urgentes</Label>
            </div>

            {/* Sin fecha CX */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={props.sinFechaCx}
                onCheckedChange={(checked) => props.setSinFechaCx(!!checked)}
              />
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase cursor-pointer">Sin fecha CX</Label>
            </div>

            {/* Con PR / Sin PR */}
            <div className="flex items-center gap-4">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">PR:</Label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={props.conPrFilter === "con"}
                  onCheckedChange={(checked) => props.setConPrFilter(checked ? "con" : null)}
                />
                Con PR
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={props.conPrFilter === "sin"}
                  onCheckedChange={(checked) => props.setConPrFilter(checked ? "sin" : null)}
                />
                Sin PR
              </label>
            </div>

            {/* Con consumo / Sin consumo */}
            <div className="flex items-center gap-4">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Consumo:</Label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={props.conConsumoFilter === "con"}
                  onCheckedChange={(checked) => props.setConConsumoFilter(checked ? "con" : null)}
                />
                Con consumo
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={props.conConsumoFilter === "sin"}
                  onCheckedChange={(checked) => props.setConConsumoFilter(checked ? "sin" : null)}
                />
                Sin consumo
              </label>
            </div>

            {/* Con factura / Sin factura */}
            <div className="flex items-center gap-4">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Factura:</Label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={props.conFacturaFilter === "con"}
                  onCheckedChange={(checked) => props.setConFacturaFilter(checked ? "con" : null)}
                />
                Con factura
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={props.conFacturaFilter === "sin"}
                  onCheckedChange={(checked) => props.setConFacturaFilter(checked ? "sin" : null)}
                />
                Sin factura
              </label>
            </div>
          </div>

          {/* ── Search also in ── */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Buscar también en:</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={props.searchInMedico} onCheckedChange={(c) => props.setSearchInMedico(!!c)} /> Médico
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={props.searchInInstitucion} onCheckedChange={(c) => props.setSearchInInstitucion(!!c)} /> Institución
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={props.searchInCliente} onCheckedChange={(c) => props.setSearchInCliente(!!c)} /> Cliente/OS
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={props.searchInPR} onCheckedChange={(c) => props.setSearchInPR(!!c)} /> PR
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={props.searchInExpediente} onCheckedChange={(c) => props.setSearchInExpediente(!!c)} /> Expediente
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={props.searchInNR} onCheckedChange={(c) => props.setSearchInNR(!!c)} /> Remito/NR
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={props.searchInFV} onCheckedChange={(c) => props.setSearchInFV(!!c)} /> Factura/FV
              </label>
            </div>
          </div>
        </div>
        <div className="p-2.5 border-t flex justify-end sticky bottom-0 bg-popover">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600" onClick={props.clearFilters}>
            Limpiar filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Keep the old export name for backward compatibility (page.tsx imports may use it)
export { MoreFiltersPopover as CirugiasAdvancedFilters }

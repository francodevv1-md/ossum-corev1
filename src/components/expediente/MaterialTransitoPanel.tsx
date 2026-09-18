"use client"

import React, { useMemo } from "react"
import type { Surgery, MaterialTransito, TransitType } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { AlertTriangle, Clock, FileText, MapPin, Package, Truck } from "lucide-react"

type TransitSource = "remitos" | "fallback"

type TransitSummaryItem = MaterialTransito & {
  sentQuantity?: number
  returnedQuantity?: number
  consumedQuantity?: number
  remainingQuantity?: number
  referenceSource?: TransitSource
}

interface MaterialTransitoPanelProps {
  surgery: Surgery
  materialTransito: TransitSummaryItem[]
  source: TransitSource
}

const TRANSIT_TYPE_COLORS: Record<TransitType, string> = {
  "En tránsito CX": "bg-sky-100 text-sky-800 border-sky-300",
  "En tránsito permanente": "bg-amber-100 text-amber-800 border-amber-300",
}

const DAYS_OUT_WARNING_THRESHOLD = 7
const DAYS_OUT_CRITICAL_THRESHOLD = 14
const SUBSECTION_TITLE_CLS = "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700"

function daysSince(dateStr: string): number {
  if (!dateStr) return 0
  const then = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))
}

function getDaysOutLevel(days: number): "normal" | "warning" | "critical" {
  if (days >= DAYS_OUT_CRITICAL_THRESHOLD) return "critical"
  if (days >= DAYS_OUT_WARNING_THRESHOLD) return "warning"
  return "normal"
}

function getRemainingQuantity(item: TransitSummaryItem): number {
  if (typeof item.remainingQuantity === "number") return item.remainingQuantity
  if (typeof item.sentQuantity === "number") {
    return Math.max(0, item.sentQuantity - (item.returnedQuantity ?? 0) - (item.consumedQuantity ?? 0))
  }
  return 1
}

function hasNoClosingMovement(item: TransitSummaryItem): boolean {
  if (typeof item.sentQuantity === "number") {
    return (item.returnedQuantity ?? 0) + (item.consumedQuantity ?? 0) === 0
  }
  return !item.consumoId
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-slate-300 px-4 py-8">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-slate-100 p-3">
          <Truck className="size-6 text-slate-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800">Sin material en tránsito</p>
          <p className="max-w-[320px] text-xs text-slate-500">
            No quedan artículos abiertos fuera del depósito para esta cirugía.
          </p>
        </div>
      </div>
    </div>
  )
}

function TransitTypeBadge({ type }: { type: TransitType }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold", TRANSIT_TYPE_COLORS[type])}>
      {type}
    </span>
  )
}

function DaysOutIndicator({ days }: { days: number }) {
  if (days <= 0) return <span className="text-xs text-muted-foreground">—</span>

  const level = getDaysOutLevel(days)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        level === "critical" && "bg-red-100 text-red-800",
        level === "warning" && "bg-amber-100 text-amber-800",
        level === "normal" && "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="size-3" />
      {days}d
    </span>
  )
}

function SummaryStats({ items }: { items: TransitSummaryItem[] }) {
  const totalUnitsOpen = items.reduce((sum, item) => sum + getRemainingQuantity(item), 0)
  const noClosingMovement = items.filter(hasNoClosingMovement).length
  const criticalCount = items.filter((item) => getDaysOutLevel(daysSince(item.surgeryDate)) === "critical").length
  const avgDaysOut = items.length === 0 ? 0 : Math.round(items.reduce((sum, item) => sum + daysSince(item.surgeryDate), 0) / items.length)

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
        <p className="text-base font-bold text-slate-900">{items.length}</p>
        <p className="text-[10px] text-slate-500">Ítems abiertos</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
        <p className="text-base font-bold text-slate-900">{totalUnitsOpen}</p>
        <p className="text-[10px] text-slate-500">Unidades abiertas</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
        <p className="text-base font-bold text-slate-900">{noClosingMovement}</p>
        <p className="text-[10px] text-slate-500">Sin cierre parcial</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
        <p className={cn("text-base font-bold", criticalCount > 0 ? "text-red-600" : "text-slate-900")}>{avgDaysOut}d</p>
        <p className="text-[10px] text-slate-500">Días desde salida</p>
      </div>
    </div>
  )
}

function TransitOverview({ items, source }: { items: TransitSummaryItem[]; source: TransitSource }) {
  const cxItems = items.filter((item) => item.type === "En tránsito CX").length
  const permanentItems = items.filter((item) => item.type === "En tránsito permanente").length
  const noClosingMovement = items.filter(hasNoClosingMovement).length

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-[10px] font-medium text-slate-500">Resumen:</span>
      <span className="text-[10px] text-slate-500">Fuente: <strong className="text-slate-900">{source === "remitos" ? "remitos abiertos" : "fallback"}</strong></span>
      {cxItems > 0 && <span className="text-[10px] text-slate-500">CX: <strong className="text-slate-900">{cxItems}</strong></span>}
      {permanentItems > 0 && <span className="text-[10px] text-slate-500">Permanente: <strong className="text-slate-900">{permanentItems}</strong></span>}
      {noClosingMovement > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
          <AlertTriangle className="size-3" />
          {noClosingMovement} sin cierre parcial
        </span>
      )}
    </div>
  )
}

function MaterialTransitoTable({ items, source }: { items: TransitSummaryItem[]; source: TransitSource }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="divide-y divide-slate-200 sm:hidden">
        {items.map((item) => {
          const daysOut = daysSince(item.surgeryDate)
          const remainingQuantity = getRemainingQuantity(item)
          const noClosingMovement = hasNoClosingMovement(item)
          const hasQuantities = typeof item.sentQuantity === "number"

          return (
            <div key={item.id} className="space-y-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{item.articleName}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{item.articleCode}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                <TransitTypeBadge type={item.type} />
                <span className="rounded bg-slate-50 px-2 py-0.5 font-mono">{item.nrNumber ?? item.comprobanteSalida ?? "—"}</span>
                  {noClosingMovement ? (
                  <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">Sin cierre</Badge>
                ) : (
                  <Badge variant="outline" className="border-sky-300 text-[10px] text-sky-700">Parcial</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-500">Destino</p>
                  <p className="truncate font-medium text-slate-900">{item.institution}</p>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-500">Salida</p>
                  <p className="font-medium text-slate-900">{formatDate(item.surgeryDate)}</p>
                  <div className="mt-1"><DaysOutIndicator days={daysOut} /></div>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-500">Abierto</p>
                  <p className="font-semibold text-slate-900">{remainingQuantity}{hasQuantities ? ` / ${item.sentQuantity}` : ""}</p>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-500">Cierre</p>
                  {hasQuantities ? (
                    <p className="text-slate-900">Cons <strong className="text-emerald-700">{item.consumedQuantity ?? 0}</strong> · Dev <strong className="text-orange-700">{item.returnedQuantity ?? 0}</strong></p>
                  ) : (
                    <p className="text-slate-500">Sin detalle</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-[11px]">Artículo</TableHead>
            <TableHead className="text-[11px]">Remito / ref.</TableHead>
            <TableHead className="text-[11px]">Destino</TableHead>
            <TableHead className="text-[11px]">Salida / referencia</TableHead>
            <TableHead className="text-[11px]">Abierto</TableHead>
            <TableHead className="text-[11px]">Cierre</TableHead>
            <TableHead className="text-[11px] text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const daysOut = daysSince(item.surgeryDate)
            const remainingQuantity = getRemainingQuantity(item)
            const noClosingMovement = hasNoClosingMovement(item)
            const hasQuantities = typeof item.sentQuantity === "number"

            return (
              <TableRow key={item.id}>
                <TableCell className="max-w-[220px] text-xs">
                  <div className="truncate font-medium" title={item.articleName}>{item.articleName}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{item.articleCode}</div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="inline-flex items-center gap-1.5">
                    <FileText className="size-3 text-muted-foreground" />
                    <span className="font-mono">{item.nrNumber ?? item.comprobanteSalida ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px] text-xs">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    <div className="truncate">
                      <div className="truncate font-medium" title={item.institution}>{item.institution}</div>
                      {item.institutionCity && <div className="text-[10px] text-muted-foreground">{item.institutionCity}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Truck className="size-3 text-muted-foreground shrink-0" />
                    <span>{formatDate(item.surgeryDate)}</span>
                  </div>
                  <div className="mt-1"><DaysOutIndicator days={daysOut} /></div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {source === "remitos" ? "Fecha de remito" : "Referencia por cirugía"}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-semibold text-slate-900">{remainingQuantity}</div>
                  {hasQuantities && (
                    <div className="text-[10px] text-slate-500">de {item.sentQuantity}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {hasQuantities ? (
                    <div className="space-y-0.5 text-[10px] text-slate-500">
                      <div>Cons: <strong className="text-emerald-700">{item.consumedQuantity ?? 0}</strong></div>
                      <div>Dev: <strong className="text-orange-700">{item.returnedQuantity ?? 0}</strong></div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sin detalle</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-xs">
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <TransitTypeBadge type={item.type} />
                    {noClosingMovement ? (
                      <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">Sin cierre</Badge>
                    ) : (
                      <Badge variant="outline" className="border-sky-300 text-[10px] text-sky-700">Parcial</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

function AttentionNote({ items }: { items: TransitSummaryItem[] }) {
  const itemsToReview = useMemo(
    () => items.filter((item) => getDaysOutLevel(daysSince(item.surgeryDate)) !== "normal"),
    [items]
  )

  if (itemsToReview.length === 0) return null

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-800">Seguimiento sugerido</span>
      </div>
      <p className="text-[10px] text-amber-700">
        {itemsToReview.length} ítem{itemsToReview.length !== 1 ? "s" : ""} con varios días fuera del depósito. Conviene revisar si falta consumo o devolución visible.
      </p>
    </div>
  )
}

export function MaterialTransitoPanel({ surgery, materialTransito, source }: MaterialTransitoPanelProps) {
  if (materialTransito.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-950">Material en tránsito</span>
            <Badge variant="outline" className="text-[10px]">
              {materialTransito.length} ítem{materialTransito.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500">
            {source === "remitos"
              ? "Abiertos reales calculados desde remitos con saldo pendiente."
              : "Fallback prudente cuando todavía no hay remitos abiertos visibles."}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5">Institución: {surgery.institution}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">CX: {surgery.id}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <MapPin className="size-3" />
          <span>{surgery.institution}</span>
          <span>·</span>
          <Package className="size-3" />
          <span>{source === "remitos" ? "Fuente remitos" : "Fuente fallback"}</span>
        </div>
      </div>

      <SummaryStats items={materialTransito} />
      <TransitOverview items={materialTransito} source={source} />
      <AttentionNote items={materialTransito} />

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
        {source === "remitos"
          ? "La fecha base para días desde salida viene del remito."
          : "La fecha base viene de la cirugía porque no hay remitos abiertos para derivar salida real."}
      </div>

      <div className="space-y-1.5">
        <p className={SUBSECTION_TITLE_CLS}>Detalle de artículos en tránsito</p>
        <div className="space-y-2 rounded-md border border-slate-200 bg-white/70 px-3 py-3">
          <MaterialTransitoTable items={materialTransito} source={source} />
        </div>
      </div>
    </div>
  )
}

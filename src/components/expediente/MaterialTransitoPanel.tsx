"use client"

import React, { useMemo } from "react"
import type { Surgery, MaterialTransito, TransitType } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  ArrowRightLeft,
  MapPin,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  RotateCcw,
  CalendarClock,
  FileText,
  Map,
  ClipboardEdit,
  Undo2,
  Warehouse,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────

interface MaterialTransitoPanelProps {
  surgery: Surgery
  materialTransito: MaterialTransito[]
}

// ─── Constants ────────────────────────────────────────────────────

const TRANSIT_TYPE_COLORS: Record<TransitType, string> = {
  "En tránsito CX": "bg-sky-100 text-sky-800 border-sky-300",
  "En tránsito permanente": "bg-amber-100 text-amber-800 border-amber-300",
}

const TRANSIT_TYPE_DOT_COLORS: Record<TransitType, string> = {
  "En tránsito CX": "bg-sky-500",
  "En tránsito permanente": "bg-amber-500",
}

/** Threshold (in days) after which "días fuera" is considered overdue */
const DAYS_OUT_WARNING_THRESHOLD = 7
const DAYS_OUT_CRITICAL_THRESHOLD = 14

// ─── Helpers ──────────────────────────────────────────────────────

/** Calculate days since a given date string */
function daysSince(dateStr: string): number {
  if (!dateStr) return 0
  const then = new Date(dateStr + "T00:00:00")
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/** Determine the "days out" urgency level */
function getDaysOutLevel(days: number): "normal" | "warning" | "critical" {
  if (days >= DAYS_OUT_CRITICAL_THRESHOLD) return "critical"
  if (days >= DAYS_OUT_WARNING_THRESHOLD) return "warning"
  return "normal"
}

/** Check if material is "pendiente de retiro" (no consumoId assigned means not yet consumed/returned) */
function isPendienteRetiro(item: MaterialTransito): boolean {
  return !item.consumoId
}

// ─── Sub-components ───────────────────────────────────────────────

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="rounded-full bg-muted p-4">
          <Truck className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Sin material en tránsito
          </p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            No hay materiales en tránsito asociados a esta cirugía. Los artículos
            enviados a institución aparecerán aquí cuando se registre la salida.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function TransitTypeBadge({ type }: { type: TransitType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
        TRANSIT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700 border-gray-300"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          TRANSIT_TYPE_DOT_COLORS[type] ?? "bg-gray-500"
        )}
      />
      {type}
    </span>
  )
}

function DaysOutIndicator({ days }: { days: number }) {
  const level = getDaysOutLevel(days)

  if (days <= 0) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              level === "critical" && "bg-red-100 text-red-800",
              level === "warning" && "bg-amber-100 text-amber-800",
              level === "normal" && "bg-muted text-muted-foreground"
            )}
          >
            <Clock className="size-3" />
            {days}d
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {days} día{days !== 1 ? "s" : ""} fuera del depósito
          {level === "critical" && " — Retorno urgente"}
          {level === "warning" && " — Verificar estado"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function PendienteRetiroIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            <AlertTriangle className="size-3" />
            Pend. retiro
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Pendiente de retiro — aún no se registró consumo ni devolución
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ConsumoAsignadoIndicator({ consumoId }: { consumoId?: string }) {
  if (!consumoId) {
    return <span className="text-xs text-muted-foreground">Sin asignar</span>
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
      <FileText className="size-3" />
      {consumoId}
    </span>
  )
}

function SummaryStats({ items }: { items: MaterialTransito[] }) {
  const totalItems = items.length
  const cxCount = items.filter((i) => i.type === "En tránsito CX").length
  const permanenteCount = items.filter((i) => i.type === "En tránsito permanente").length
  const pendienteRetiroCount = items.filter(isPendienteRetiro).length

  const avgDaysOut = useMemo(() => {
    if (items.length === 0) return 0
    const totalDays = items.reduce((sum, i) => sum + daysSince(i.surgeryDate), 0)
    return Math.round(totalDays / items.length)
  }, [items])

  const criticalCount = useMemo(
    () => items.filter((i) => getDaysOutLevel(daysSince(i.surgeryDate)) === "critical").length,
    [items]
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div className="rounded-lg border bg-muted/20 p-3 text-center">
        <p className="text-lg font-bold text-foreground">{totalItems}</p>
        <p className="text-[10px] text-muted-foreground">En tránsito</p>
      </div>
      <div className="rounded-lg border bg-muted/20 p-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" />
          <p className="text-lg font-bold text-foreground">{cxCount}</p>
        </div>
        <p className="text-[10px] text-muted-foreground">Tránsito CX</p>
      </div>
      <div className="rounded-lg border bg-muted/20 p-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          <p className="text-lg font-bold text-foreground">{permanenteCount}</p>
        </div>
        <p className="text-[10px] text-muted-foreground">Permanente</p>
      </div>
      <div className="rounded-lg border bg-muted/20 p-3 text-center">
        <p className="text-lg font-bold text-foreground">{pendienteRetiroCount}</p>
        <p className="text-[10px] text-muted-foreground">Pend. retiro</p>
      </div>
      <div className="rounded-lg border bg-muted/20 p-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <p className={cn(
            "text-lg font-bold",
            criticalCount > 0 ? "text-red-600" : "text-foreground"
          )}>
            {avgDaysOut}d
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">Prom. días fuera</p>
      </div>
    </div>
  )
}

function MaterialTransitoTable({ items }: { items: MaterialTransito[] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-[11px]">Artículo</TableHead>
            <TableHead className="text-[11px]">NR</TableHead>
            <TableHead className="text-[11px]">Institución destino</TableHead>
            <TableHead className="text-[11px]">Tipo tránsito</TableHead>
            <TableHead className="text-[11px]">Fecha salida</TableHead>
            <TableHead className="text-[11px]">Depósito origen</TableHead>
            <TableHead className="text-[11px]">Consumo asignado</TableHead>
            <TableHead className="text-[11px] text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const daysOut = daysSince(item.surgeryDate)
            const pendiente = isPendienteRetiro(item)

            return (
              <TableRow key={item.id}>
                {/* Article name + code */}
                <TableCell className="text-xs max-w-[200px]">
                  <div className="font-medium truncate" title={item.articleName}>
                    {item.articleName}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {item.articleCode}
                  </div>
                </TableCell>

                {/* NR Number */}
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {item.nrNumber ?? "—"}
                </TableCell>

                {/* Institution destination */}
                <TableCell className="text-xs max-w-[180px]">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="truncate">
                      <div className="truncate font-medium" title={item.institution}>
                        {item.institution}
                      </div>
                      {item.institutionCity && (
                        <div className="text-[10px] text-muted-foreground">
                          {item.institutionCity}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Transit type */}
                <TableCell className="text-xs">
                  <TransitTypeBadge type={item.type} />
                </TableCell>

                {/* Exit date */}
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="size-3 text-muted-foreground shrink-0" />
                    <span>{formatDate(item.surgeryDate)}</span>
                  </div>
                  <div className="mt-0.5">
                    <DaysOutIndicator days={daysOut} />
                  </div>
                </TableCell>

                {/* Deposit of origin */}
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate" title={item.deposit}>
                      {item.deposit}
                    </span>
                  </div>
                </TableCell>

                {/* Assigned consumption */}
                <TableCell className="text-xs">
                  <ConsumoAsignadoIndicator consumoId={item.consumoId} />
                </TableCell>

                {/* Status indicators */}
                <TableCell className="text-xs text-center">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {pendiente && <PendienteRetiroIndicator />}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function CriticalItemsAlert({ items }: { items: MaterialTransito[] }) {
  const criticalItems = useMemo(
    () =>
      items.filter(
        (i) =>
          getDaysOutLevel(daysSince(i.surgeryDate)) === "critical" ||
          (getDaysOutLevel(daysSince(i.surgeryDate)) === "warning" && isPendienteRetiro(i))
      ),
    [items]
  )

  if (criticalItems.length === 0) return null

  const trulyCritical = criticalItems.filter(
    (i) => getDaysOutLevel(daysSince(i.surgeryDate)) === "critical"
  )
  const warnings = criticalItems.filter(
    (i) => getDaysOutLevel(daysSince(i.surgeryDate)) === "warning"
  )

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-800">
            Atención — Material en tránsito prolongado
          </p>
          <div className="text-[10px] text-amber-700 space-y-0.5">
            {trulyCritical.length > 0 && (
              <p>
                <strong>{trulyCritical.length}</strong> artículo{trulyCritical.length !== 1 ? "s" : ""} con más de {DAYS_OUT_CRITICAL_THRESHOLD} días fuera del depósito.
                Se recomienda reclamar retorno inmediatamente.
              </p>
            )}
            {warnings.length > 0 && (
              <p>
                <strong>{warnings.length}</strong> artículo{warnings.length !== 1 ? "s" : ""} con más de {DAYS_OUT_WARNING_THRESHOLD} días sin consumo asignado.
                Verificar estado con la institución.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {criticalItems.map((item) => (
              <Badge
                key={item.id}
                variant="outline"
                className={cn(
                  "text-[9px] h-5",
                  getDaysOutLevel(daysSince(item.surgeryDate)) === "critical"
                    ? "border-red-300 text-red-700"
                    : "border-amber-300 text-amber-700"
                )}
              >
                {item.articleCode} ({daysSince(item.surgeryDate)}d)
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TransitOverview({ items }: { items: MaterialTransito[] }) {
  const cxItems = items.filter((i) => i.type === "En tránsito CX")
  const permItems = items.filter((i) => i.type === "En tránsito permanente")
  const pendienteItems = items.filter(isPendienteRetiro)

  if (items.length === 0) return null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[10px] text-muted-foreground font-medium">
        Resumen:
      </span>
      {cxItems.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-sky-500" />
          <span className="text-[10px] text-muted-foreground">
            CX: <strong className="text-foreground">{cxItems.length}</strong>
          </span>
        </div>
      )}
      {permItems.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-muted-foreground">
            Permanente: <strong className="text-foreground">{permItems.length}</strong>
          </span>
        </div>
      )}
      {pendienteItems.length > 0 && (
        <div className="flex items-center gap-1">
          <AlertTriangle className="size-3 text-amber-600" />
          <span className="text-[10px] text-amber-700 font-medium">
            {pendienteItems.length} pendiente{pendienteItems.length !== 1 ? "s" : ""} de retiro
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function MaterialTransitoPanel({
  surgery,
  materialTransito,
}: MaterialTransitoPanelProps) {
  const items = materialTransito

  // ── Empty state ──
  if (items.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <ArrowRightLeft className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Material en Tránsito
              </span>
              <Badge variant="outline" className="text-[10px]">
                {items.length} ítem{items.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Artículos enviados a institución que aún no fueron devueltos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="size-3" />
            <span>{surgery.institution}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Package className="size-3" />
            <span>Cirugía {surgery.id}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Summary stats ── */}
      <SummaryStats items={items} />

      {/* ── Transit overview bar ── */}
      <TransitOverview items={items} />

      {/* ── Critical items alert ── */}
      <CriticalItemsAlert items={items} />

      {/* ── Main table ── */}
      <Card className="py-0">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Package className="size-3.5" />
            Detalle de artículos en tránsito
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="max-h-96 overflow-y-auto">
            <MaterialTransitoTable items={items} />
          </div>
        </CardContent>
      </Card>

      {/* ── Deposits summary ── */}
      <DepositSummary items={items} />

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5">
          <Map className="size-3" />
          Ver mapa
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5">
          <ClipboardEdit className="size-3" />
          Registrar evento
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5">
          <RotateCcw className="size-3" />
          Reclamar retorno
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5">
          <Undo2 className="size-3" />
          Registrar devolución
        </Button>
      </div>
    </div>
  )
}

// ─── Additional Sub-component ─────────────────────────────────────

function DepositSummary({ items }: { items: MaterialTransito[] }) {
  const depositCounts = useMemo(() => {
    const record: Record<string, { count: number; cx: number; perm: number }> = {}
    for (const item of items) {
      const existing = record[item.deposit] ?? { count: 0, cx: 0, perm: 0 }
      existing.count++
      if (item.type === "En tránsito CX") existing.cx++
      else existing.perm++
      record[item.deposit] = existing
    }
    return Object.entries(record).map(([deposit, counts]) => ({
      deposit,
      ...counts,
    }))
  }, [items])

  if (depositCounts.length <= 1) return null

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Warehouse className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Distribución por depósito</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {depositCounts.map((d) => (
          <div key={d.deposit} className="rounded-md border bg-background p-2">
            <p className="text-[10px] text-muted-foreground mb-0.5 truncate" title={d.deposit}>
              {d.deposit}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-semibold">{d.count}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {d.cx > 0 && (
                  <span className="flex items-center gap-0.5">
                    <span className="size-1.5 rounded-full bg-sky-500" />
                    {d.cx} CX
                  </span>
                )}
                {d.perm > 0 && (
                  <span className="flex items-center gap-0.5">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    {d.perm} Perm.
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

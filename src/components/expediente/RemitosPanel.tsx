"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import {
  Truck, Package, ArrowLeftRight, MoreHorizontal,
  Eye, Printer, Edit, Search, ChevronDown, ChevronRight,
  RotateCcw, MapPin, BoxIcon, ClipboardList,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { LOGISTICS_STATE_OUTLINED_COLORS } from "@/lib/shared-constants"
import { cn } from "@/lib/utils"
import type { Surgery, Remito, RemitoItem, Box, LogisticsState } from "@/types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface RemitosPanelProps {
  surgery: Surgery
  remitos: Remito[]
  box?: Box
}

// ─── State badge color map — imported from shared-constants ───
const LOGISTICS_STATE_COLORS: Record<LogisticsState, string> = LOGISTICS_STATE_OUTLINED_COLORS as Record<LogisticsState, string>

// ─── Devolución (return) states ───────────────────────────────────────────────

const RETURN_STATES: LogisticsState[] = ["Devuelto", "Controlado"]

function isReturnState(state: LogisticsState): boolean {
  return RETURN_STATES.includes(state)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LogisticsBadge({ state }: { state: LogisticsState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
        LOGISTICS_STATE_COLORS[state] ?? "bg-gray-100 text-gray-700 border-gray-300"
      )}
    >
      {state}
    </span>
  )
}

function RemitoItemTable({ items }: { items: RemitoItem[] }) {
  const totalSent = items.reduce((s, i) => s + i.sentQuantity, 0)
  const totalReturned = items.reduce((s, i) => s + i.returnedQuantity, 0)
  const totalConsumed = items.reduce((s, i) => s + i.consumedQuantity, 0)

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-[10px] h-7">Código</TableHead>
            <TableHead className="text-[10px] h-7">Nombre</TableHead>
            <TableHead className="text-[10px] h-7 text-right w-20">Enviado</TableHead>
            <TableHead className="text-[10px] h-7 text-right w-20">Devuelto</TableHead>
            <TableHead className="text-[10px] h-7 text-right w-20">Consumido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.stockItemId} className="group">
              <TableCell className="py-1.5 text-xs font-mono text-muted-foreground">
                {item.code}
              </TableCell>
              <TableCell className="py-1.5 text-xs font-medium">
                {item.name}
              </TableCell>
              <TableCell className="py-1.5 text-xs text-right tabular-nums">
                {item.sentQuantity}
              </TableCell>
              <TableCell className="py-1.5 text-xs text-right tabular-nums">
                {item.returnedQuantity > 0 ? (
                  <span className="text-orange-700">{item.returnedQuantity}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 text-xs text-right tabular-nums">
                {item.consumedQuantity > 0 ? (
                  <span className="text-emerald-700 font-medium">{item.consumedQuantity}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          {items.length > 1 && (
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-t-2">
              <TableCell className="py-1.5" />
              <TableCell className="py-1.5 text-xs font-semibold">Total</TableCell>
              <TableCell className="py-1.5 text-xs font-semibold text-right tabular-nums">
                {totalSent}
              </TableCell>
              <TableCell className="py-1.5 text-xs font-semibold text-right tabular-nums text-orange-700">
                {totalReturned}
              </TableCell>
              <TableCell className="py-1.5 text-xs font-semibold text-right tabular-nums text-emerald-700">
                {totalConsumed}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function RemitoCard({
  remito,
  box,
  defaultOpen,
}: {
  remito: Remito
  box?: Box
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const hasReturns = isReturnState(remito.state)
  const pendingReturn = remito.items.some(
    (item) => item.returnedQuantity === 0 && item.consumedQuantity < item.sentQuantity
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        {/* ── Card header / trigger ── */}
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none py-3 px-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Expand icon */}
                {open ? (
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                )}

                {/* NR number */}
                <span className="text-sm font-semibold font-mono tracking-tight">
                  {remito.id}
                </span>

                <Separator orientation="vertical" className="h-4" />

                {/* Date */}
                <span className="text-xs text-muted-foreground">
                  {formatDate(remito.date)}
                </span>

                <Separator orientation="vertical" className="h-4" />

                {/* Destination */}
                <span className="text-xs text-muted-foreground truncate max-w-[220px] flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  {remito.destination}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Box info */}
                {box && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <BoxIcon className="size-3" />
                    {box.name}
                  </span>
                )}

                {/* State badge */}
                <LogisticsBadge state={remito.state} />

                {/* Return indicator */}
                {hasReturns && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-orange-700 font-medium">
                    <RotateCcw className="size-3" />
                    Devolución
                  </span>
                )}

                {/* Pending return warning */}
                {!hasReturns && pendingReturn && (
                  <Badge variant="outline" className="text-[9px] h-5 border-amber-300 text-amber-700">
                    Pend. devolución
                  </Badge>
                )}

                {/* Items count */}
                <span className="text-[10px] text-muted-foreground">
                  {remito.items.length} ítem{remito.items.length !== 1 ? "s" : ""}
                </span>

                {/* Actions (not clickable for trigger) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <Eye className="size-4 mr-2" /> Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Printer className="size-4 mr-2" /> Imprimir
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="size-4 mr-2" /> Modificar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Search className="size-4 mr-2" /> Ver trazabilidad
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        {/* ── Collapsible body ── */}
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            {/* ── Detail summary ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border bg-muted/20 p-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">NR</p>
                <p className="text-xs font-semibold font-mono">{remito.id}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Fecha</p>
                <p className="text-xs font-medium">{formatDate(remito.date)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Destino</p>
                <p className="text-xs font-medium truncate">{remito.destination}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Estado</p>
                <LogisticsBadge state={remito.state} />
              </div>
            </div>

            {/* Box info (if available) */}
            {box && (
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">Caja / Material</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Caja</p>
                    <p className="text-xs font-medium">{box.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Tipo</p>
                    <p className="text-xs">{box.type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Estado caja</p>
                    <LogisticsBadge state={box.state} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Contenidos</p>
                    <p className="text-xs">{box.contents.length} ítems</p>
                  </div>
                </div>
                {box.preparedAt && (
                  <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
                    {box.preparedAt && <span>Preparado: {formatDate(box.preparedAt)}</span>}
                    {box.sentAt && <span>Enviado: {formatDate(box.sentAt)}</span>}
                    {box.returnedAt && <span>Devuelto: {formatDate(box.returnedAt)}</span>}
                  </div>
                )}
              </div>
            )}

            {/* ── Devolución section ── */}
            {hasReturns && (
              <div className="rounded-md border border-orange-200 bg-orange-50/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowLeftRight className="size-3.5 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-800">Devolución registrada</span>
                </div>
                <p className="text-[10px] text-orange-700">
                  Este remito tiene devolución confirmada. Los materiales devueltos han sido contabilizados
                  en las cantidades de devolución de cada ítem.
                </p>
              </div>
            )}

            {/* ── Items table ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Ítems del remito</span>
              </div>
              <RemitoItemTable items={remito.items} />
            </div>

            {/* ── Inline action buttons ── */}
            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5">
                <Eye className="size-3" /> Abrir
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5">
                <Printer className="size-3" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5">
                <Edit className="size-3" /> Modificar
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5">
                <Search className="size-3" /> Ver trazabilidad
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RemitosPanel({ surgery, remitos, box }: RemitosPanelProps) {
  // Summary calculations
  const totalRemitos = remitos.length
  const totalItems = remitos.reduce((s, r) => s + r.items.length, 0)
  const totalSent = remitos.reduce(
    (s, r) => s + r.items.reduce((si, i) => si + i.sentQuantity, 0),
    0
  )
  const totalReturned = remitos.reduce(
    (s, r) => s + r.items.reduce((si, i) => si + i.returnedQuantity, 0),
    0
  )
  const totalConsumed = remitos.reduce(
    (s, r) => s + r.items.reduce((si, i) => si + i.consumedQuantity, 0),
    0
  )

  // Most advanced logistics state
  const hasReturn = remitos.some((r) => isReturnState(r.state))
  const hasPending = remitos.some((r) =>
    r.items.some(
      (item) =>
        item.returnedQuantity === 0 && item.consumedQuantity < item.sentQuantity
    )
  )

  // Unique logistics states for quick summary
  const uniqueStates = Array.from(new Set(remitos.map((r) => r.state)))

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Remitos</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {totalRemitos} remito{totalRemitos !== 1 ? "s" : ""}
          </Badge>
          {totalItems > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {totalItems} ítems
            </Badge>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {totalRemitos === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Sin remitos asociados
          </p>
          <p className="text-xs text-muted-foreground">
            Los remitos de entrega aparecerán aquí cuando se prepare y envíe el
            material para esta cirugía
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Remitos</p>
              <p className="text-sm font-semibold">{totalRemitos}</p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Ítems</p>
              <p className="text-sm font-semibold">{totalItems}</p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Enviado</p>
              <p className="text-sm font-semibold tabular-nums">{totalSent}</p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Devuelto</p>
              <p className="text-sm font-semibold tabular-nums text-orange-700">
                {totalReturned}
              </p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Consumido</p>
              <p className="text-sm font-semibold tabular-nums text-emerald-700">
                {totalConsumed}
              </p>
            </div>
          </div>

          {/* ── Status overview bar ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-medium">
              Estados:
            </span>
            {uniqueStates.map((state) => (
              <div key={state} className="flex items-center gap-1">
                <LogisticsBadge state={state} />
                <span className="text-[10px] text-muted-foreground">
                  ({remitos.filter((r) => r.state === state).length})
                </span>
              </div>
            ))}
            {hasReturn && (
              <span className="inline-flex items-center gap-1 text-[10px] text-orange-700 font-medium ml-2">
                <RotateCcw className="size-3" />
                Devolución registrada
              </span>
            )}
            {hasPending && !hasReturn && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium ml-2">
                <ArrowLeftRight className="size-3" />
                Pendiente devolución
              </span>
            )}
          </div>

          {/* ── Remito cards ── */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
            {remitos.map((remito, idx) => (
              <RemitoCard
                key={remito.id}
                remito={remito}
                box={box && remito.boxId === box.id ? box : undefined}
                defaultOpen={idx === 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

"use client"

import React, { useMemo, useState } from "react"
import type {
  Surgery,
  Remito,
  Consumo,
  Box,
  ConsumoItem,
  BoxContent,
} from "@/types"
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
import { formatDate } from "@/lib/formatters"
import { PREP_STATE_COLORS, CONSUMO_STATE_COLORS } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import {
  Search,
  Package,
  ArrowRightLeft,
  Link2,
  FileText,
  Tag,
  Hash,
  Download,
  Layers,
  BoxIcon,
  Syringe,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ArrowDownUp,
  Clock,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────

interface TrazabilidadPanelProps {
  surgery: Surgery
  remitos: Remito[]
  consumo?: Consumo
  box?: Box
}

// ─── Trace view mode ──────────────────────────────────────────────

type TraceViewMode = "all" | "byLot" | "bySerial"

// ─── Unified trace row ────────────────────────────────────────────

interface TraceRow {
  stockItemId: string
  name: string
  code: string
  lot: string
  serial?: string
  expiry?: string
  quantity: number        // from box/remito (sent)
  consumed: number        // from consumo
  returned: number        // from consumo
  source: "box" | "remito" | "consumo"
  sourceId: string        // box id or remito id or consumo id
  sourceDate?: string
  department?: string
  brand?: string
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Build unified trace rows from all data sources */
function buildTraceRows(
  box: Box | undefined,
  remitos: Remito[],
  consumo: Consumo | undefined
): TraceRow[] {
  const rows: TraceRow[] = []
  const seen = new Map<string, TraceRow>() // stockItemId → merged row

  // 1. Box contents → material entries
  if (box) {
    for (const content of box.contents) {
      const key = content.stockItemId
      seen.set(key, {
        stockItemId: content.stockItemId,
        name: content.name,
        code: content.code,
        lot: "",
        serial: undefined,
        expiry: undefined,
        quantity: content.quantity,
        consumed: 0,
        returned: 0,
        source: "box",
        sourceId: box.id,
        sourceDate: box.preparedAt,
        department: undefined,
        brand: undefined,
      })
    }
  }

  // 2. Remito items → sent/returned/consumed quantities
  for (const remito of remitos) {
    for (const item of remito.items) {
      const existing = seen.get(item.stockItemId)
      if (existing) {
        // Merge: update sent quantity (sum), track source
        existing.quantity += item.sentQuantity
        existing.consumed += item.consumedQuantity
        existing.returned += item.returnedQuantity
        existing.sourceDate = remito.date
      } else {
        seen.set(item.stockItemId, {
          stockItemId: item.stockItemId,
          name: item.name,
          code: item.code,
          lot: "",
          serial: undefined,
          expiry: undefined,
          quantity: item.sentQuantity,
          consumed: item.consumedQuantity,
          returned: item.returnedQuantity,
          source: "remito",
          sourceId: remito.id,
          sourceDate: remito.date,
          department: undefined,
          brand: undefined,
        })
      }
    }
  }

  // 3. Consumo items → enrich with lot, serial, expiry, department, brand
  if (consumo) {
    for (const item of consumo.items) {
      const existing = seen.get(item.stockItemId)
      if (existing) {
        existing.lot = item.lot
        existing.serial = item.serial
        existing.expiry = item.expiry
        existing.department = item.department
        existing.brand = item.brand
        existing.consumed = item.consumed
        existing.returned = item.returned
        existing.source = "consumo"
        existing.sourceId = consumo.id
      } else {
        seen.set(item.stockItemId, {
          stockItemId: item.stockItemId,
          name: item.name,
          code: item.code,
          lot: item.lot,
          serial: item.serial,
          expiry: item.expiry,
          quantity: 0,
          consumed: item.consumed,
          returned: item.returned,
          source: "consumo",
          sourceId: consumo.id,
          sourceDate: consumo.validatedAt,
          department: item.department,
          brand: item.brand,
        })
      }
    }
  }

  // Convert map to array
  for (const row of seen.values()) {
    rows.push(row)
  }

  return rows
}

/** Check if a row is an implant (consumed > 0) */
function isImplant(row: TraceRow): boolean {
  return row.consumed > 0
}

/** Check if a row has a difference (sent - consumed - returned !== 0) */
function hasDifference(row: TraceRow): boolean {
  return row.quantity - row.consumed - row.returned !== 0
}

// ─── Sub-components ───────────────────────────────────────────────

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="rounded-full bg-muted p-4">
          <Search className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Sin datos de trazabilidad</p>
          <p className="text-xs text-muted-foreground">
            No se encontraron registros de entradas, salidas ni consumo para esta cirugía.
            Los datos de trazabilidad aparecerán cuando se prepare el material y se registre el consumo.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function BoxInfoCard({ box }: { box: Box }) {
  const stateColor = PREP_STATE_COLORS[box.state] ?? "bg-gray-400 text-white"

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 mb-2">
        <BoxIcon className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold">Caja utilizada</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Nombre</p>
          <p className="text-xs font-medium truncate" title={box.name}>{box.name}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Tipo</p>
          <p className="text-xs">{box.type}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Estado</p>
          <Badge className={cn("text-[10px] px-1.5 py-0", stateColor)}>
            {box.state}
          </Badge>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Contenidos</p>
          <p className="text-xs">{box.contents.length} ítems</p>
        </div>
      </div>
      {(box.preparedAt || box.sentAt || box.returnedAt) && (
        <div className="mt-2 flex items-center gap-4 flex-wrap text-[10px] text-muted-foreground">
          {box.preparedAt && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> Prep: {formatDate(box.preparedAt)}
            </span>
          )}
          {box.sentAt && (
            <span className="flex items-center gap-1">
              <ArrowRightLeft className="size-3" /> Env: {formatDate(box.sentAt)}
            </span>
          )}
          {box.returnedAt && (
            <span className="flex items-center gap-1">
              <Package className="size-3" /> Dev: {formatDate(box.returnedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TraceSummaryCards({ rows }: { rows: TraceRow[] }) {
  const totalItems = rows.length
  const totalSent = rows.reduce((s, r) => s + r.quantity, 0)
  const totalConsumed = rows.reduce((s, r) => s + r.consumed, 0)
  const totalReturned = rows.reduce((s, r) => s + r.returned, 0)
  const implantCount = rows.filter(isImplant).length
  const diffCount = rows.filter(hasDifference).length

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
        <p className="text-base font-bold text-foreground">{totalItems}</p>
        <p className="text-[10px] text-muted-foreground">Ítems</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
        <p className="text-base font-bold text-foreground">{totalSent}</p>
        <p className="text-[10px] text-muted-foreground">Enviados</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
        <p className="text-base font-bold text-foreground">{totalConsumed}</p>
        <p className="text-[10px] text-muted-foreground">Consumidos</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
        <p className="text-base font-bold text-foreground">{totalReturned}</p>
        <p className="text-[10px] text-muted-foreground">Devueltos</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
        <p className="text-base font-bold text-emerald-700">{implantCount}</p>
        <p className="text-[10px] text-muted-foreground">Implantes</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
        <p className={cn("text-base font-bold", diffCount > 0 ? "text-amber-700" : "text-foreground")}>
          {diffCount}
        </p>
        <p className="text-[10px] text-muted-foreground">Diferencias</p>
      </div>
    </div>
  )
}

function ConsumoStateIndicator({ state }: { state: string }) {
  const color = CONSUMO_STATE_COLORS[state] ?? "bg-gray-400 text-white"
  return (
    <Badge className={cn("text-[10px] px-1.5 py-0", color)}>
      {state}
    </Badge>
  )
}

function TraceTimelineStep({
  label,
  date,
  icon: Icon,
  active,
  isLast,
}: {
  label: string
  date?: string
  icon: React.ElementType
  active: boolean
  isLast: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "size-6 rounded-full flex items-center justify-center border-2 shrink-0",
            active
              ? "bg-foreground border-foreground text-background"
              : "bg-muted border-muted-foreground/30 text-muted-foreground"
          )}
        >
          <Icon className="size-3" />
        </div>
        {!isLast && (
          <div className={cn("w-px flex-1 min-h-[16px]", active ? "bg-foreground/40" : "bg-border")} />
        )}
      </div>
      {/* Content */}
      <div className="pb-4 min-w-0">
        <p className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </p>
        {date && (
          <p className="text-[10px] text-muted-foreground">{formatDate(date)}</p>
        )}
      </div>
    </div>
  )
}

function TraceTimeline({
  box,
  remitos,
  consumo,
}: {
  box?: Box
  remitos: Remito[]
  consumo?: Consumo
}) {
  const firstRemito = remitos[0]

  const steps = [
    {
      label: "Preparación",
      date: box?.preparedAt,
      icon: Package,
      active: !!box?.preparedAt,
    },
    {
      label: "Envío",
      date: firstRemito?.date ?? box?.sentAt,
      icon: ArrowRightLeft,
      active: !!firstRemito || !!box?.sentAt,
    },
    {
      label: "Consumo",
      date: consumo?.validatedAt,
      icon: Syringe,
      active: !!consumo,
    },
    {
      label: "Devolución",
      date: box?.returnedAt,
      icon: Package,
      active: !!box?.returnedAt,
    },
  ]

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Cronología</span>
      </div>
      <div>
        {steps.map((step, idx) => (
          <TraceTimelineStep
            key={step.label}
            label={step.label}
            date={step.date}
            icon={step.icon}
            active={step.active}
            isLast={idx === steps.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

function TraceTable({ rows }: { rows: TraceRow[] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-[11px]">Artículo</TableHead>
            <TableHead className="text-[11px]">Código</TableHead>
            <TableHead className="text-[11px]">Lote</TableHead>
            <TableHead className="text-[11px]">Vto.</TableHead>
            <TableHead className="text-[11px]">Serie</TableHead>
            <TableHead className="text-[11px] text-center">Enviado</TableHead>
            <TableHead className="text-[11px] text-center">Consumido</TableHead>
            <TableHead className="text-[11px] text-center">Devuelto</TableHead>
            <TableHead className="text-[11px] text-center">Dif.</TableHead>
            <TableHead className="text-[11px]">Origen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const diff = row.quantity - row.consumed - row.returned
            const implant = isImplant(row)
            const difference = hasDifference(row)

            return (
              <TableRow key={row.stockItemId} className="group">
                {/* Article */}
                <TableCell className="text-xs font-medium max-w-[180px]">
                  <div className="flex items-center gap-1.5">
                    {implant && (
                      <Syringe className="size-3 text-emerald-600 shrink-0" />
                    )}
                    <span className="truncate" title={row.name}>{row.name}</span>
                  </div>
                  {row.department && (
                    <span className="block text-[10px] text-muted-foreground">{row.department}</span>
                  )}
                </TableCell>
                {/* Code */}
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {row.code}
                </TableCell>
                {/* Lot */}
                <TableCell className="text-xs font-mono">
                  {row.lot || <span className="text-muted-foreground">—</span>}
                </TableCell>
                {/* Expiry */}
                <TableCell className="text-xs text-muted-foreground">
                  {row.expiry ? formatDate(row.expiry) : "—"}
                </TableCell>
                {/* Serial */}
                <TableCell className="text-xs font-mono">
                  {row.serial ? (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="size-3 text-muted-foreground" />
                      {row.serial}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                {/* Sent */}
                <TableCell className="text-xs text-center tabular-nums">
                  {row.quantity}
                </TableCell>
                {/* Consumed */}
                <TableCell className="text-xs text-center tabular-nums">
                  {row.consumed > 0 ? (
                    <span className="font-semibold text-emerald-700">{row.consumed}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                {/* Returned */}
                <TableCell className="text-xs text-center tabular-nums">
                  {row.returned > 0 ? (
                    <span className="text-orange-700">{row.returned}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                {/* Difference */}
                <TableCell className="text-xs text-center">
                  {diff === 0 ? (
                    <span className="text-muted-foreground">0</span>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {diff > 0 ? `−${diff}` : `+${Math.abs(diff)}`}
                    </Badge>
                  )}
                </TableCell>
                {/* Source */}
                <TableCell className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CircleDot className="size-2.5" />
                    <span className="capitalize">{row.source}</span>
                  </div>
                  {row.sourceDate && (
                    <span className="block text-[10px]">{formatDate(row.sourceDate)}</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function LotView({ rows }: { rows: TraceRow[] }) {
  // Group by lot
  const byLot = useMemo(() => {
    const map = new Map<string, TraceRow[]>()
    for (const row of rows) {
      const key = row.lot || "Sin lote"
      const arr = map.get(key) ?? []
      arr.push(row)
      map.set(key, arr)
    }
    return map
  }, [rows])

  return (
    <div className="space-y-3">
      {Array.from(byLot.entries()).map(([lot, items]) => (
        <div key={lot} className="rounded-lg border">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
            <Tag className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">
              Lote: <span className="font-mono">{lot}</span>
            </span>
            <Badge variant="outline" className="text-[10px] ml-auto">
              {items.length} ítem{items.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] h-7">Artículo</TableHead>
                <TableHead className="text-[10px] h-7">Código</TableHead>
                <TableHead className="text-[10px] h-7">Serie</TableHead>
                <TableHead className="text-[10px] h-7">Vto.</TableHead>
                <TableHead className="text-[10px] h-7 text-center">Enviado</TableHead>
                <TableHead className="text-[10px] h-7 text-center">Consumido</TableHead>
                <TableHead className="text-[10px] h-7 text-center">Devuelto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.stockItemId}>
                  <TableCell className="text-xs font-medium py-1.5 max-w-[180px] truncate" title={row.name}>
                    {row.name}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground py-1.5">
                    {row.code}
                  </TableCell>
                  <TableCell className="text-xs font-mono py-1.5">
                    {row.serial || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">
                    {row.expiry ? formatDate(row.expiry) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-center py-1.5 tabular-nums">{row.quantity}</TableCell>
                  <TableCell className="text-xs text-center py-1.5 tabular-nums">
                    {row.consumed > 0 ? (
                      <span className="font-semibold text-emerald-700">{row.consumed}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-center py-1.5 tabular-nums">
                    {row.returned > 0 ? (
                      <span className="text-orange-700">{row.returned}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}

function SerialView({ rows }: { rows: TraceRow[] }) {
  const serialRows = rows.filter((r) => r.serial)

  if (serialRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Hash className="size-6 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          No hay ítems con número de serie registrado
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-[11px]">Artículo</TableHead>
            <TableHead className="text-[11px]">Código</TableHead>
            <TableHead className="text-[11px]">Nº Serie</TableHead>
            <TableHead className="text-[11px]">Lote</TableHead>
            <TableHead className="text-[11px]">Vto.</TableHead>
            <TableHead className="text-[11px] text-center">Consumido</TableHead>
            <TableHead className="text-[11px]">Marca</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {serialRows.map((row) => (
            <TableRow key={row.stockItemId}>
              <TableCell className="text-xs font-medium max-w-[180px] truncate" title={row.name}>
                {row.name}
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {row.code}
              </TableCell>
              <TableCell className="text-xs font-mono font-semibold">
                <div className="flex items-center gap-1">
                  <Hash className="size-3 text-muted-foreground" />
                  {row.serial}
                </div>
              </TableCell>
              <TableCell className="text-xs font-mono">{row.lot}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.expiry ? formatDate(row.expiry) : "—"}
              </TableCell>
              <TableCell className="text-xs text-center">
                {row.consumed > 0 ? (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">
                    Sí ({row.consumed})
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">No</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.brand || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ImplantesSection({ rows }: { rows: TraceRow[] }) {
  const [open, setOpen] = useState(false)
  const implants = rows.filter(isImplant)

  if (implants.length === 0) return null

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Syringe className="size-4 text-emerald-600" />
          <span className="text-xs font-semibold text-foreground">
            Implantes asociados ({implants.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px]">Artículo</TableHead>
                <TableHead className="text-[10px]">Código</TableHead>
                <TableHead className="text-[10px]">Lote</TableHead>
                <TableHead className="text-[10px]">Serie</TableHead>
                <TableHead className="text-[10px]">Vto.</TableHead>
                <TableHead className="text-[10px]">Marca</TableHead>
                <TableHead className="text-[10px] text-center">Cant.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {implants.map((row) => (
                <TableRow key={row.stockItemId}>
                  <TableCell className="text-xs font-medium max-w-[160px] truncate" title={row.name}>
                    <div className="flex items-center gap-1.5">
                      <Syringe className="size-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{row.code}</TableCell>
                  <TableCell className="text-xs font-mono">{row.lot || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{row.serial || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.expiry ? formatDate(row.expiry) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.brand || "—"}</TableCell>
                  <TableCell className="text-xs text-center font-semibold text-emerald-700">
                    {row.consumed}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function DifferencesSection({ rows }: { rows: TraceRow[] }) {
  const [open, setOpen] = useState(false)
  const diffRows = rows.filter(hasDifference)

  if (diffRows.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-800">
            Diferencias detectadas ({diffRows.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-amber-600" />
        ) : (
          <ChevronDown className="size-4 text-amber-600" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px]">Artículo</TableHead>
                <TableHead className="text-[10px]">Código</TableHead>
                <TableHead className="text-[10px]">Lote</TableHead>
                <TableHead className="text-[10px] text-center">Enviado</TableHead>
                <TableHead className="text-[10px] text-center">Consumido</TableHead>
                <TableHead className="text-[10px] text-center">Devuelto</TableHead>
                <TableHead className="text-[10px] text-center">Faltante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diffRows.map((row) => {
                const diff = row.quantity - row.consumed - row.returned
                return (
                  <TableRow key={row.stockItemId}>
                    <TableCell className="text-xs font-medium max-w-[160px] truncate" title={row.name}>
                      {row.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{row.code}</TableCell>
                    <TableCell className="text-xs font-mono">{row.lot || "—"}</TableCell>
                    <TableCell className="text-xs text-center">{row.quantity}</TableCell>
                    <TableCell className="text-xs text-center">{row.consumed}</TableCell>
                    <TableCell className="text-xs text-center">{row.returned}</TableCell>
                    <TableCell className="text-xs text-center">
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {diff > 0 ? `Falta ${diff}` : `Sobra ${Math.abs(diff)}`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function TrazabilidadPanel({
  surgery,
  remitos,
  consumo,
  box,
}: TrazabilidadPanelProps) {
  const [viewMode, setViewMode] = useState<TraceViewMode>("all")

  const traceRows = useMemo(
    () => buildTraceRows(box, remitos, consumo),
    [box, remitos, consumo]
  )

  const hasData = traceRows.length > 0 || !!box || remitos.length > 0

  // ── Empty state ──
  if (!hasData) {
    return <EmptyState />
  }

  // ── View mode toggle labels ──
  const viewModeButtons: { mode: TraceViewMode; label: string; icon: React.ElementType }[] = [
    { mode: "all", label: "Vista completa", icon: Layers },
    { mode: "byLot", label: "Ver por lote", icon: Tag },
    { mode: "bySerial", label: "Ver por serie", icon: Hash },
  ]

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Trazabilidad</span>
              <Badge variant="outline" className="text-[10px]">
                {surgery.expedienteNumber ?? surgery.id}
              </Badge>
              {consumo && <ConsumoStateIndicator state={consumo.state} />}
            </div>
            <p className="text-xs text-muted-foreground">
              Seguimiento completo de materiales enviados, consumidos y devueltos
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Box info ── */}
      {box && <BoxInfoCard box={box} />}

      {/* ── Timeline ── */}
      <TraceTimeline box={box} remitos={remitos} consumo={consumo} />

      {/* ── Summary cards ── */}
      {traceRows.length > 0 && <TraceSummaryCards rows={traceRows} />}

      {/* ── Main trace data ── */}
      {traceRows.length > 0 ? (
        <Card className="py-0">
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <FileText className="size-3.5" />
                Detalle de trazabilidad
              </CardTitle>
              {/* View mode toggle */}
              <div className="flex items-center gap-1">
                {viewModeButtons.map(({ mode, label, icon: Icon }) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => setViewMode(mode)}
                  >
                    <Icon className="size-3" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {viewMode === "all" && <TraceTable rows={traceRows} />}
            {viewMode === "byLot" && <LotView rows={traceRows} />}
            {viewMode === "bySerial" && <SerialView rows={traceRows} />}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Package className="size-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            No hay ítems de trazabilidad registrados
          </p>
        </div>
      )}

      {/* ── Implantes asociados ── */}
      {traceRows.length > 0 && <ImplantesSection rows={traceRows} />}

      {/* ── Differences ── */}
      {traceRows.length > 0 && <DifferencesSection rows={traceRows} />}

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1.5"
          onClick={() => setViewMode("byLot")}
        >
          <Tag className="size-3" />
          Ver por lote
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1.5"
          onClick={() => setViewMode("bySerial")}
        >
          <Hash className="size-3" />
          Ver por serie
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1.5"
        >
          <Download className="size-3" />
          Exportar trazabilidad
        </Button>
        {consumo && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1.5"
          >
            <Link2 className="size-3" />
            Ver consumo
          </Button>
        )}
        {remitos.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1.5"
          >
            <ArrowRightLeft className="size-3" />
            Ver remitos
          </Button>
        )}
      </div>
    </div>
  )
}

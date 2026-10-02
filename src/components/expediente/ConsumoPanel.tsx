"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { Surgery, Consumo, ConsumoItem, Remito, Box } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { CONSUMO_STATE_COLORS } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import {
  Activity,
  Package,
  Check,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
} from "lucide-react"
import { useConsumos } from "@/hooks/useConsumos"
import { useRemitos } from "@/hooks/useRemitos"
import { useTrazabilidad } from "@/hooks/useTrazabilidad"
import { getConsumoVisibleNumber, type ConsumoApiItem, type ConsumoApiRow, type ConsumoState } from "@/lib/api/consumos"
import { getRemitoVisibleNumber, type RemitoApiRow } from "@/lib/api/remitos"
import type { TraceItemRow } from "@/lib/api/trazabilidad"
import { DevolucionesPanel } from "@/components/expediente/DevolucionesPanel"
import { ComparativaOperativaV0 } from "@/components/comparativa/ComparativaOperativaV0"
import { buildCajasAccountingPayload, findCajasDispatchForRemito } from "@/lib/cajas-intent"

interface ConsumoPanelProps {
  surgery: Surgery
  consumo?: Consumo
  remitos: Remito[]
  box?: Box
  editingConsumo: Record<string, { consumed: number; returned: number }>
  setEditingConsumo: (v: Record<string, { consumed: number; returned: number }>) => void
  freshnessKey?: number
  onDevolucionConfirmed?: () => void
}

type ConsumoPanelState = Consumo["state"] | ConsumoState | string

type PanelConsumoItem = ConsumoItem & {
  sentQuantity?: number
}

type PanelConsumo = Omit<Consumo, "items" | "state" | "validatedBy"> & {
  apiId?: string
  id: string
  state: ConsumoPanelState
  items: PanelConsumoItem[]
  validatedBy?: string
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

type CanonicalConsumoItemQuantities = Pick<
  TraceItemRow,
  "sentQuantity" | "consumedQuantity" | "returnedQuantity"
>

export function buildCanonicalConsumoItemQuantities(traceItems: TraceItemRow[]) {
  const byConsumoItemId = new Map<string, CanonicalConsumoItemQuantities>()
  const byRemitoItemId = new Map<string, CanonicalConsumoItemQuantities>()

  for (const item of traceItems) {
    for (const consumoItemId of item.consumoItemIds) byConsumoItemId.set(consumoItemId, item)
    if (item.remitoItemId) byRemitoItemId.set(item.remitoItemId, item)
  }

  return { byConsumoItemId, byRemitoItemId }
}

export function mapConsumoApiItemToPanelItem(
  item: ConsumoApiItem,
  canonicalQuantities: ReturnType<typeof buildCanonicalConsumoItemQuantities>
): PanelConsumoItem {
  const stockItemId = item.remitoItemId ?? item.sku ?? item.id
  const canonical = canonicalQuantities.byConsumoItemId.get(item.id)
    ?? (item.remitoItemId ? canonicalQuantities.byRemitoItemId.get(item.remitoItemId) : undefined)

  return {
    stockItemId,
    name: item.description,
    code: item.sku ?? item.remitoItemId ?? item.id,
    lot: item.lotNumber ?? metadataString(item.metadata, "lotNumber") ?? metadataString(item.metadata, "lot") ?? metadataString(item.metadata, "lote") ?? "Sin dato",
    serial: item.serialNumber ?? metadataString(item.metadata, "serialNumber") ?? metadataString(item.metadata, "serial"),
    department: metadataString(item.metadata, "department") ?? "Sin dato",
    rubro: metadataString(item.metadata, "rubro") ?? "Sin dato",
    brand: metadataString(item.metadata, "brand") ?? "Sin dato",
    expiry: item.expirationDate ?? metadataString(item.metadata, "expirationDate") ?? metadataString(item.metadata, "expiry") ?? metadataString(item.metadata, "vencimiento"),
    consumed: canonical?.consumedQuantity ?? toNumber(item.consumedQuantity),
    returned: canonical?.returnedQuantity ?? 0,
    observacionesFaltante: metadataString(item.metadata, "observacionesFaltante"),
    remitoOrigen: item.remitoItemId ?? undefined,
    sentQuantity: toNumber(item.requestedQuantity),
  }
}

function mapConsumoApiToPanelConsumo(
  consumo: ConsumoApiRow,
  canonicalQuantities: ReturnType<typeof buildCanonicalConsumoItemQuantities>
): PanelConsumo {
  return {
    apiId: consumo.id,
    id: getConsumoVisibleNumber(consumo),
    surgeryId: consumo.surgeryId ?? "",
    boxId: typeof consumo.metadata?.boxId === "string" ? consumo.metadata.boxId : "Sin caja",
    remitoId: consumo.remitoId,
    items: (consumo.items ?? []).map((item) => mapConsumoApiItemToPanelItem(item, canonicalQuantities)),
    validatedBy: consumo.updatedById ?? consumo.createdById ?? undefined,
    validatedAt: consumo.validatedAt ?? undefined,
    state: consumo.state,
    origen: "remito",
  }
}

function buildConsumoItemsFromRemito(remito: RemitoApiRow) {
  return remito.items.map((item) => ({
    remitoItemId: item.id,
    sku: item.sku ?? item.itemId ?? undefined,
    description: item.description,
    requestedQuantity: item.quantity,
      consumedQuantity: 0,
      unit: item.unit ?? undefined,
      lotNumber: item.lotNumber ?? undefined,
      serialNumber: item.serialNumber ?? undefined,
      expirationDate: item.expirationDate ?? undefined,
      metadata: {
      ...(item.metadata ?? {}),
      remitoVisibleNumber: getRemitoVisibleNumber(remito),
      remitoItemId: item.id,
    },
  }))
}

function getSentMap(remitos: Remito[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of remitos) {
    for (const item of r.items) {
      const prev = map.get(item.stockItemId) ?? 0
      map.set(item.stockItemId, prev + item.sentQuantity)
    }
  }
  return map
}

interface FaltanteEntry {
  stockItemId: string
  name: string
  code: string
  lot: string
  sent: number
  consumed: number
  returned: number
  difference: number
}

function computeFaltantes(items: PanelConsumoItem[], remitos: Remito[]): FaltanteEntry[] {
  const sentMap = getSentMap(remitos)
  const result: FaltanteEntry[] = []

  for (const item of items) {
    const sent = item.sentQuantity ?? sentMap.get(item.stockItemId) ?? 0
    const diff = sent - item.consumed - item.returned
    if (diff !== 0) {
      result.push({
        stockItemId: item.stockItemId,
        name: item.name,
        code: item.code,
        lot: item.lot,
        sent,
        consumed: item.consumed,
        returned: item.returned,
        difference: diff,
      })
    }
  }

  return result
}

function totalConsumed(items: PanelConsumoItem[]): number {
  return items.reduce((sum, i) => sum + i.consumed, 0)
}

function totalReturned(items: PanelConsumoItem[]): number {
  return items.reduce((sum, i) => sum + i.returned, 0)
}

function totalSent(items: PanelConsumoItem[], sentMap: Map<string, number>): number {
  return items.reduce((sum, item) => sum + (item.sentQuantity ?? sentMap.get(item.stockItemId) ?? 0), 0)
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="rounded-full bg-muted p-4">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-foreground">Sin consumo registrado</p>
          <p className="text-xs text-muted-foreground">
            Aún no hay consumos backend asociados a esta cirugía.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusState({ title, message, retryLabel, onRetry, loading }: { title: string; message: string; retryLabel?: string; onRetry?: () => void; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="rounded-full bg-muted p-4">
          {loading ? <Loader2 className="size-8 animate-spin text-muted-foreground" /> : <AlertTriangle className="size-8 text-muted-foreground" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        {onRetry && retryLabel ? <Button size="sm" variant="outline" onClick={onRetry}>{retryLabel}</Button> : null}
      </CardContent>
    </Card>
  )
}

function ConsumoHeader({ surgery, consumo, box }: { surgery: Surgery; consumo: PanelConsumo; box?: Box }) {
  const stateColor = (CONSUMO_STATE_COLORS as Record<string, string>)[consumo.state] ?? "bg-gray-400 text-white"

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardContent className="p-0">
        <div className="border-b bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <Activity className="size-5 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-primary-foreground">
                    Consumo
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-950 dark:text-slate-100">{consumo.id}</span>
                  <Badge className={cn("px-1.5 py-0 text-[10px] font-semibold", stateColor)}>{consumo.state}</Badge>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Registro operativo de materiales consumidos</p>
                  <p className="text-xs text-muted-foreground">
                    Expediente {surgery.expedienteNumber ?? surgery.id} · Caja {box?.name ?? consumo.boxId}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[290px]">
              <div className="rounded-md border bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Estado</p>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={cn(
                      "size-2 rounded-full",
                      consumo.state === "Facturado"
                        ? "bg-blue-500"
                        : consumo.state === "Validado"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                    )}
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{consumo.state}</span>
                </div>
              </div>

              <div className="rounded-md border bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Validación</p>
                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {consumo.validatedBy ? `Por ${consumo.validatedBy}` : "Pendiente"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {consumo.validatedAt ? formatDate(consumo.validatedAt) : "Sin confirmar"}
                </p>
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

function SummaryMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string | number
  helper: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "success" | "warning" | "danger"
}) {
  const toneClasses = {
    default: "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    warning: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    danger: "border-red-200 bg-red-50/70 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
  }[tone]

  return (
    <div className={cn("rounded-lg border px-4 py-3", toneClasses)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.02em]">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
        </div>
        <div className="rounded-md border bg-white/80 p-2 dark:border-current/20 dark:bg-slate-900/80">
          <Icon className="size-4 text-current" />
        </div>
      </div>
    </div>
  )
}

function ConsumoSummaryCards({
  consumo,
  items,
  sentMap,
  faltantes,
}: {
  consumo: PanelConsumo
  items: PanelConsumoItem[]
  sentMap: Map<string, number>
  faltantes: FaltanteEntry[]
}) {
  const consumed = totalConsumed(items)
  const returned = totalReturned(items)
  const sent = totalSent(items, sentMap)
  const differenceUnits = faltantes.reduce((sum, item) => sum + Math.abs(item.difference), 0)

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SummaryMetricCard
        label="Estado"
        value={consumo.state}
        helper={`${consumed} consumidos · ${returned} devueltos`}
        icon={Activity}
        tone={consumo.state === "Facturado" ? "success" : consumo.state === "Validado" ? "default" : "warning"}
      />
      <SummaryMetricCard
        label="Material"
        value={`${items.length} ítems`}
        helper={`${sent} unidades remitidas`}
        icon={Package}
      />
      <SummaryMetricCard
        label="Diferencias"
        value={faltantes.length === 0 ? "Sin desvíos" : `${faltantes.length} casos`}
        helper={faltantes.length === 0 ? "Consumo conciliado" : `${differenceUnits} unidades con diferencia`}
        icon={AlertTriangle}
        tone={faltantes.length === 0 ? "success" : "danger"}
      />
      <SummaryMetricCard
        label="Validación"
        value={consumo.validatedBy ? "Registrada" : "Pendiente"}
        helper={consumo.validatedBy ? `Usuario: ${consumo.validatedBy}` : "Esperando confirmación operativa"}
        icon={FileCheck}
        tone={consumo.validatedBy ? "success" : "warning"}
      />
    </div>
  )
}

function ConsumoItemsTable({
  items,
  sentMap,
  editingConsumo,
  setEditingConsumo,
  isEditing,
}: {
  items: PanelConsumoItem[]
  sentMap: Map<string, number>
  editingConsumo: Record<string, { consumed: number; returned: number }>
  setEditingConsumo: (v: Record<string, { consumed: number; returned: number }>) => void
  isEditing: boolean
}) {
  const totals = items.reduce(
    (acc, item) => {
      const sent = item.sentQuantity ?? sentMap.get(item.stockItemId) ?? 0
      acc.sent += sent
      acc.consumed += item.consumed
      acc.returned += item.returned
      acc.diff += sent - item.consumed - item.returned
      return acc
    },
    { sent: 0, consumed: 0, returned: 0, diff: 0 }
  )

  return (
    <div className="overflow-hidden rounded-lg border bg-white dark:border-slate-800 dark:bg-slate-900/80">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-950/70 dark:hover:bg-slate-950/70">
            <TableHead className="h-9 text-[11px] font-semibold text-slate-600 dark:text-slate-400">Artículo</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-slate-600 dark:text-slate-400">Código</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-slate-600 dark:text-slate-400">Lote</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-slate-600 dark:text-slate-400">Depto.</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-slate-600 dark:text-slate-400">Marca</TableHead>
            <TableHead className="h-9 text-[11px] font-semibold text-slate-600 dark:text-slate-400">Vto.</TableHead>
            <TableHead className="h-9 text-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">Enviado</TableHead>
            <TableHead className="h-9 text-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">Consumido</TableHead>
            <TableHead className="h-9 text-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">Devuelto</TableHead>
            <TableHead className="h-9 text-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">Dif.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const sent = item.sentQuantity ?? sentMap.get(item.stockItemId) ?? 0
            const diff = sent - item.consumed - item.returned
            const edit = editingConsumo[item.stockItemId]

            return (
              <TableRow key={item.stockItemId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <TableCell className="max-w-[220px] py-2 text-xs font-medium" title={item.name}>
                  <div>
                    <span className="block truncate text-slate-900 dark:text-slate-100">{item.name}</span>
                    {item.serial && (
                      <span className="block text-[10px] text-muted-foreground">Serie: {item.serial}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2 font-mono text-xs text-muted-foreground">{item.code}</TableCell>
                <TableCell className="py-2 text-xs font-mono">{item.lot}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{item.department}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{item.brand}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">
                  {item.expiry ? formatDate(item.expiry) : "—"}
                </TableCell>
                <TableCell className="py-2 text-center text-xs tabular-nums">{sent}</TableCell>
                <TableCell className="py-2 text-center text-xs tabular-nums">
                  {isEditing && edit !== undefined ? (
                    <input
                      type="number"
                      min={0}
                      value={edit.consumed}
                      onChange={(e) =>
                        setEditingConsumo({
                          ...editingConsumo,
                          [item.stockItemId]: {
                            ...edit,
                            consumed: Number(e.target.value),
                          },
                        })
                      }
                      className="w-14 rounded border bg-background px-1.5 py-0.5 text-center text-xs"
                    />
                  ) : (
                      <span className={cn(item.consumed > 0 && "font-semibold text-slate-900 dark:text-slate-100")}>{item.consumed}</span>
                  )}
                </TableCell>
                <TableCell className="py-2 text-center text-xs tabular-nums">
                  {isEditing && edit !== undefined ? (
                    <input
                      type="number"
                      min={0}
                      value={edit.returned}
                      onChange={(e) =>
                        setEditingConsumo({
                          ...editingConsumo,
                          [item.stockItemId]: {
                            ...edit,
                            returned: Number(e.target.value),
                          },
                        })
                      }
                      className="w-14 rounded border bg-background px-1.5 py-0.5 text-center text-xs"
                    />
                  ) : (
                    <span className={cn(item.returned > 0 ? "font-medium text-amber-700" : "text-muted-foreground")}>
                      {item.returned}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-2 text-center text-xs tabular-nums">
                  {diff === 0 ? (
                    <span className="text-muted-foreground">0</span>
                  ) : (
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                      {diff > 0 ? `−${diff}` : `+${Math.abs(diff)}`}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            )
          })}

          {items.length > 1 && (
            <TableRow className="border-t-2 bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-950/60">
              <TableCell className="py-2 text-xs font-semibold text-slate-900 dark:text-slate-100">Totales</TableCell>
              <TableCell className="py-2" />
              <TableCell className="py-2" />
              <TableCell className="py-2" />
              <TableCell className="py-2" />
              <TableCell className="py-2" />
              <TableCell className="py-2 text-center text-xs font-semibold tabular-nums">{totals.sent}</TableCell>
              <TableCell className="py-2 text-center text-xs font-semibold tabular-nums">{totals.consumed}</TableCell>
              <TableCell className="py-2 text-center text-xs font-semibold text-amber-700 tabular-nums">{totals.returned}</TableCell>
              <TableCell className="py-2 text-center text-xs font-semibold tabular-nums">
                {totals.diff === 0 ? (
                  <span className="text-muted-foreground">0</span>
                ) : (
                  <span className={cn(totals.diff > 0 ? "text-destructive" : "text-emerald-700")}>
                    {totals.diff > 0 ? `−${totals.diff}` : `+${Math.abs(totals.diff)}`}
                  </span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function FaltantesSection({ faltantes }: { faltantes: FaltanteEntry[] }) {
  const [open, setOpen] = useState(false)
  const triggerId = "consumo-faltantes-trigger"
  const contentId = "consumo-faltantes-details"

  if (faltantes.length === 0) return null

  return (
    <Card className="overflow-hidden border-destructive/30 bg-destructive/5 py-0">
      <button
        id={triggerId}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-destructive"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <div>
            <span className="text-xs font-semibold text-destructive">Diferencias / Faltantes ({faltantes.length})</span>
            <p className="text-[10px] text-destructive/80">Control de desvíos entre remito, consumo y devolución</p>
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-destructive" /> : <ChevronDown className="size-4 text-destructive" />}
      </button>

      <div id={contentId} role="region" aria-labelledby={triggerId} hidden={!open} className="border-t border-destructive/15 px-4 pb-4 pt-2">
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
              {faltantes.map((f) => (
                <TableRow key={f.stockItemId}>
                  <TableCell className="max-w-[160px] truncate text-xs font-medium" title={f.name}>{f.name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{f.code}</TableCell>
                  <TableCell className="text-xs font-mono">{f.lot}</TableCell>
                  <TableCell className="text-center text-xs">{f.sent}</TableCell>
                  <TableCell className="text-center text-xs">{f.consumed}</TableCell>
                  <TableCell className="text-center text-xs">{f.returned}</TableCell>
                  <TableCell className="text-center text-xs">
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                      {f.difference > 0 ? `Falta ${f.difference}` : `Sobra ${Math.abs(f.difference)}`}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
    </Card>
  )
}

function DevolucionSection({ items }: { items: PanelConsumoItem[] }) {
  const returnedItems = items.filter((i) => i.returned > 0)
  const [open, setOpen] = useState(false)
  const triggerId = "consumo-devoluciones-trigger"
  const contentId = "consumo-devoluciones-details"

  if (returnedItems.length === 0) return null

  return (
    <Card className="overflow-hidden py-0">
      <button
        id={triggerId}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <div className="flex items-center gap-2">
          <RotateCcw className="size-4 text-muted-foreground" />
          <div>
            <span className="text-xs font-semibold text-foreground">Devoluciones ({returnedItems.length} ítems)</span>
            <p className="text-[10px] text-muted-foreground">Material devuelto para control y reingreso</p>
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      <div id={contentId} role="region" aria-labelledby={triggerId} hidden={!open} className="border-t px-4 pb-4 pt-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px]">Artículo</TableHead>
                <TableHead className="text-[10px]">Código</TableHead>
                <TableHead className="text-[10px]">Lote</TableHead>
                <TableHead className="text-[10px]">Marca</TableHead>
                <TableHead className="text-[10px] text-center">Cant. Devuelta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnedItems.map((item) => (
                <TableRow key={item.stockItemId}>
                  <TableCell className="text-xs font-medium">{item.name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{item.code}</TableCell>
                  <TableCell className="text-xs font-mono">{item.lot}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.brand}</TableCell>
                  <TableCell className="text-center text-xs font-semibold text-amber-700">{item.returned}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
    </Card>
  )
}

function ConsumoStateTimeline({ state }: { state: ConsumoPanelState }) {
  const steps = [
    { label: "Borrador", active: state === "Borrador" || state === "Pendiente" || state === "Validado" || state === "Facturado", done: state !== "Borrador" },
    { label: "Pendiente", active: state === "Pendiente" || state === "Validado" || state === "Facturado", done: state === "Validado" || state === "Facturado" },
    { label: "Validado", active: state === "Validado" || state === "Facturado", done: state === "Facturado" },
    { label: "Facturado", active: state === "Facturado", done: false },
  ]

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => (
        <React.Fragment key={step.label}>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-bold",
                step.done
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : step.active
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-muted bg-muted text-muted-foreground"
              )}
            >
              {step.done ? <Check className="size-3" /> : idx + 1}
            </div>
            <span className={cn("text-[10px] font-medium", step.done || step.active ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={cn("h-px min-w-[20px] flex-1", step.done ? "bg-emerald-400" : "bg-border")} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function ConsumoActionBar({
  state,
  mutating,
  onEmit,
  onValidate,
  onRemoveDraft,
}: {
  state: ConsumoPanelState
  mutating: boolean
  onEmit?: () => void
  onValidate?: () => void
  onRemoveDraft?: () => void
}) {
  const hasAvailableAction = Boolean(
    (state === "Borrador" && (onEmit || onRemoveDraft)) ||
    (state === "Pendiente" && onValidate)
  )

  if (!hasAvailableAction) return null

  return (
    <Card className="border-slate-200 bg-slate-50/60 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Acciones de consumo</p>
          <p className="text-[11px] text-muted-foreground">Acciones mínimas soportadas por backend para el consumo seleccionado.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state === "Borrador" && onEmit ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={onEmit} disabled={mutating}>
              {mutating ? <Loader2 className="size-3.5 animate-spin" /> : <FileCheck className="size-3.5" />}
              Emitir consumo
            </Button>
          ) : null}

          {state === "Pendiente" && onValidate ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white" onClick={onValidate} disabled={mutating}>
              {mutating ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Validar consumo
            </Button>
          ) : null}

          {state === "Borrador" && onRemoveDraft ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-destructive" onClick={onRemoveDraft} disabled={mutating}>
              {mutating ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Eliminar borrador
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

type ConsumoPanelBackendProps = ConsumoPanelProps & { surgeryBackendId: string }

function ConsumoPanelBackend({
  surgery,
  surgeryBackendId,
  consumo,
  remitos,
  box,
  editingConsumo,
  setEditingConsumo,
  freshnessKey = 0,
  onDevolucionConfirmed,
}: ConsumoPanelBackendProps) {
  const hasObservedFreshnessKey = useRef(false)
  const consumoFilters = useMemo(() => ({ surgeryId: surgeryBackendId, take: 50 }), [surgeryBackendId])
  const remitoFilters = useMemo(() => ({ surgeryId: surgeryBackendId, take: 100 }), [surgeryBackendId])
  const {
    companyId,
    consumos: backendConsumos,
    loading: consumosLoading,
    ready: consumosReady,
    error: consumosError,
    blocked: consumosBlocked,
    mutatingId,
    refresh: refreshConsumos,
    createDraft,
    emit,
    validate,
    removeDraft,
  } = useConsumos(consumoFilters)
  const { remitos: backendRemitos, loading: remitosLoading, refresh: refreshRemitos } = useRemitos(remitoFilters)
  const {
    trace,
    refresh: refreshTrace,
  } = useTrazabilidad(surgeryBackendId)

  useEffect(() => {
    if (!hasObservedFreshnessKey.current) {
      hasObservedFreshnessKey.current = true
      return
    }
    void Promise.all([refreshConsumos(), refreshRemitos(), refreshTrace()])
  }, [freshnessKey, refreshConsumos, refreshRemitos, refreshTrace])

  const canonicalQuantities = useMemo(
    () => buildCanonicalConsumoItemQuantities(trace?.items ?? []),
    [trace]
  )
  const backendPanelConsumos = useMemo(
    () => backendConsumos.map((row) => mapConsumoApiToPanelConsumo(row, canonicalQuantities)),
    [backendConsumos, canonicalQuantities]
  )
  const [selectedConsumoId, setSelectedConsumoId] = useState<string | null>(null)
  const [selectedRemitoId, setSelectedRemitoId] = useState<string | null>(null)
  const eligibleDeliveredRemitos = useMemo(
    () => backendRemitos.filter((remito) => remito.state === "Entregado"),
    [backendRemitos]
  )
  const effectiveSelectedConsumoId = selectedConsumoId ?? backendPanelConsumos[0]?.apiId ?? null
  const panelConsumo = backendPanelConsumos.find((row) => row.apiId === effectiveSelectedConsumoId) ?? backendPanelConsumos[0] ?? (consumo as PanelConsumo | undefined)
  const remitoSelectionId = selectedRemitoId ?? panelConsumo?.remitoId ?? (eligibleDeliveredRemitos.length === 1 ? eligibleDeliveredRemitos[0]?.id : null)
  const selectedRemito = eligibleDeliveredRemitos.find((remito) => remito.id === remitoSelectionId) ?? null

  const sentMap = useMemo(() => getSentMap(remitos), [remitos])
  const faltantes = useMemo(() => (panelConsumo ? computeFaltantes(panelConsumo.items, remitos) : []), [panelConsumo, remitos])

  if (!consumosReady || consumosLoading) {
    return <StatusState title="Cargando consumos" message="Buscando consumos backend asociados a esta cirugía." loading />
  }

  if (consumosBlocked) {
    return <StatusState title="Consumo no disponible" message="No hay empresa activa o la cirugía no tiene ID server-side disponible." />
  }

  if (consumosError) {
    return <StatusState title="No se pudieron cargar los consumos" message={consumosError} retryLabel="Reintentar" onRetry={() => void refreshConsumos()} />
  }

  const handleCreateFromRemito = async () => {
    if (!selectedRemito) {
      toast.error("Seleccioná un remito para crear el consumo")
      return
    }
    if (selectedRemito.items.length === 0) {
      toast.error("El remito seleccionado no tiene ítems")
      return
    }

    try {
      const created = await createDraft({
        surgeryId: surgeryBackendId,
        remitoId: selectedRemito.id,
        items: buildConsumoItemsFromRemito(selectedRemito),
        metadata: {
          source: "ficha_cx",
          remitoVisibleNumber: getRemitoVisibleNumber(selectedRemito),
          boxId: selectedRemito.boxId,
        },
      })
      setSelectedConsumoId(created.id)
      toast.success(`Consumo ${getConsumoVisibleNumber(created)} creado desde remito`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el consumo")
    }
  }

  if (!panelConsumo) {
    return (
      <div className="space-y-4">
        <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="flex-1 space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Remito base</span>
              <select
                value={selectedRemito?.id ?? ""}
                onChange={(event) => setSelectedRemitoId(event.target.value || null)}
                className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                disabled={remitosLoading || eligibleDeliveredRemitos.length === 0}
              >
                {eligibleDeliveredRemitos.length === 0 ? <option value="">Sin Remitos entregados elegibles</option> : null}
                {eligibleDeliveredRemitos.length > 1 ? <option value="">Seleccioná un Remito entregado</option> : null}
                {eligibleDeliveredRemitos.map((remito) => (
                  <option key={remito.id} value={remito.id}>
                    {getRemitoVisibleNumber(remito)} · {remito.state} · {remito.items.length} ítem{remito.items.length !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            {eligibleDeliveredRemitos.length !== 1 ? (
              <p className="text-xs text-muted-foreground" role="status">
                {eligibleDeliveredRemitos.length === 0
                  ? "No hay Remitos entregados para esta cirugía."
                  : "Seleccioná el Remito entregado que corresponde al consumo."}
              </p>
            ) : null}
            <Button size="sm" className="h-9 gap-1.5" onClick={() => void handleCreateFromRemito()} disabled={!selectedRemito || mutatingId === "__create__"}>
              {mutatingId === "__create__" ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Crear consumo desde remito
            </Button>
          </CardContent>
        </Card>
        <EmptyState />
        <ComparativaOperativaV0 surgeryId={surgeryBackendId} />
        <DevolucionesPanel surgeryId={surgeryBackendId} selectedRemito={selectedRemito} selectedConsumo={null} onConfirmed={onDevolucionConfirmed} />
      </div>
    )
  }

  const { items, state } = panelConsumo
  const isBackendConsumo = Boolean(panelConsumo.apiId)
  const mutating = Boolean(panelConsumo.apiId && mutatingId === panelConsumo.apiId)

  const handleValidate = async () => {
    if (!panelConsumo.apiId) return
    try {
      let cajasAccounting: unknown = undefined
      if (companyId && surgeryBackendId && selectedRemito?.id) {
        const cajasInfo = await findCajasDispatchForRemito(
          companyId,
          surgeryBackendId,
          selectedRemito.id,
        )
        if (cajasInfo) {
          const rawConsumo = backendConsumos.find((c) => c.id === panelConsumo.apiId)
          if (rawConsumo) {
            const payload = buildCajasAccountingPayload(
              cajasInfo.dispatch,
              rawConsumo,
              "consumption",
            )
            if (payload) cajasAccounting = payload
          }
        }
      }
      await validate(panelConsumo.apiId, cajasAccounting ? { cajasAccounting } : undefined)
      toast.success(`Consumo ${panelConsumo.id} validado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo validar el consumo")
    }
  }

  const handleEmit = async () => {
    if (!panelConsumo.apiId) return
    try {
      await emit(panelConsumo.apiId)
      toast.success(`Consumo ${panelConsumo.id} emitido`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo emitir el consumo")
    }
  }

  const handleRemoveDraft = async () => {
    if (!panelConsumo.apiId) return
    const confirmed = window.confirm(`¿Eliminar el borrador ${panelConsumo.id}?`)
    if (!confirmed) return

    try {
      await removeDraft(panelConsumo.apiId)
      toast.success(`Borrador ${panelConsumo.id} eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el borrador")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Remito base</span>
              <select
                value={selectedRemito?.id ?? ""}
                onChange={(event) => setSelectedRemitoId(event.target.value || null)}
                className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                disabled={remitosLoading || eligibleDeliveredRemitos.length === 0}
              >
                {eligibleDeliveredRemitos.length === 0 ? <option value="">Sin Remitos entregados elegibles</option> : null}
                {eligibleDeliveredRemitos.length > 1 ? <option value="">Seleccioná un Remito entregado</option> : null}
                {eligibleDeliveredRemitos.map((remito) => (
                  <option key={remito.id} value={remito.id}>
                    {getRemitoVisibleNumber(remito)} · {remito.state} · {remito.items.length} ítem{remito.items.length !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Consumo seleccionado</span>
              <select
                value={panelConsumo?.apiId ?? ""}
                onChange={(event) => setSelectedConsumoId(event.target.value || null)}
                className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                disabled={backendPanelConsumos.length === 0}
              >
                {backendPanelConsumos.length === 0 ? <option value="">Sin consumos backend</option> : null}
                {backendPanelConsumos.map((row) => (
                  <option key={row.apiId ?? row.id} value={row.apiId ?? ""}>
                    {row.id} · {row.state} · remito {row.remitoId}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {eligibleDeliveredRemitos.length !== 1 ? (
            <p className="text-xs text-muted-foreground" role="status">
              {eligibleDeliveredRemitos.length === 0
                ? "No hay Remitos entregados para esta cirugía."
                : "Seleccioná el Remito entregado que corresponde al consumo."}
            </p>
          ) : null}
          <Button size="sm" className="h-9 gap-1.5" onClick={() => void handleCreateFromRemito()} disabled={!selectedRemito || mutatingId === "__create__"}>
            {mutatingId === "__create__" ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Crear consumo desde remito
          </Button>
        </CardContent>
      </Card>

      <ConsumoHeader surgery={surgery} consumo={panelConsumo} box={box} />

      <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Resumen operativo</p>
              <p className="text-[11px] text-muted-foreground">
                Estado del consumo, material remitido, diferencias y control de validación desde backend.
              </p>
            </div>
            <div className="min-w-0 lg:min-w-[320px]">
              <ConsumoStateTimeline state={state} />
            </div>
          </div>

          <ConsumoSummaryCards consumo={panelConsumo} items={items} sentMap={sentMap} faltantes={faltantes} />
        </CardContent>
      </Card>

      <ComparativaOperativaV0 surgeryId={surgeryBackendId} />

      <ConsumoActionBar
        state={state}
        mutating={mutating}
        onEmit={isBackendConsumo && state === "Borrador" ? () => void handleEmit() : undefined}
        onValidate={isBackendConsumo && state === "Pendiente" ? () => void handleValidate() : undefined}
        onRemoveDraft={isBackendConsumo && state === "Borrador" ? () => void handleRemoveDraft() : undefined}
      />

      <Card className="overflow-hidden border-slate-200 py-0 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <CardHeader className="border-b bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <FileText className="size-3.5" />
              Detalle de artículos
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>{items.length} ítems</span>
              <span>{totalConsumed(items)} consumidos</span>
              <span>{totalReturned(items)} devueltos</span>
              <span>{faltantes.length} diferencias</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4">
          <ConsumoItemsTable
            items={items}
            sentMap={sentMap}
            editingConsumo={editingConsumo}
            setEditingConsumo={setEditingConsumo}
            isEditing={false}
          />
        </CardContent>
      </Card>

      <FaltantesSection faltantes={faltantes} />
      <DevolucionSection items={items} />
      <DevolucionesPanel surgeryId={surgeryBackendId} selectedRemito={selectedRemito} selectedConsumo={panelConsumo?.apiId ? backendConsumos.find((row) => row.id === panelConsumo.apiId) ?? null : null} onConfirmed={onDevolucionConfirmed} />
    </div>
  )
}

export function ConsumoPanel(props: ConsumoPanelProps) {
  const surgeryBackendId = props.surgery.backendId?.trim()

  if (!surgeryBackendId) {
    return <StatusState title="Consumo no disponible" message="La cirugía no tiene ID server-side disponible." />
  }

  return <ConsumoPanelBackend {...props} surgeryBackendId={surgeryBackendId} />
}

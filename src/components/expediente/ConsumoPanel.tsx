"use client"

import React, { useMemo, useState } from "react"
import type { Surgery, Consumo, ConsumoItem, Remito, Box } from "@/types"
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
import { formatDate, formatCurrency } from "@/lib/formatters"
import { CONSUMO_STATE_COLORS } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import {
  Activity,
  Package,
  ArrowRightLeft,
  Check,
  ClipboardEdit,
  Eye,
  AlertTriangle,
  RotateCcw,
  Plus,
  FileCheck,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────
interface ConsumoPanelProps {
  surgery: Surgery
  consumo?: Consumo
  remitos: Remito[]
  box?: Box
  editingConsumo: Record<string, { consumed: number; returned: number }>
  setEditingConsumo: (v: Record<string, { consumed: number; returned: number }>) => void
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Build a map of stockItemId → sent quantity from the first remito */
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

/** Compute faltantes: items where consumed ≠ sent (items that went missing or had differences) */
interface FaltanteEntry {
  stockItemId: string
  name: string
  code: string
  lot: string
  sent: number
  consumed: number
  returned: number
  difference: number // sent - consumed - returned
}

function computeFaltantes(
  items: ConsumoItem[],
  remitos: Remito[]
): FaltanteEntry[] {
  const sentMap = getSentMap(remitos)
  const result: FaltanteEntry[] = []

  for (const item of items) {
    const sent = sentMap.get(item.stockItemId) ?? 0
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

/** Total units consumed across all items */
function totalConsumed(items: ConsumoItem[]): number {
  return items.reduce((sum, i) => sum + i.consumed, 0)
}

/** Total units returned across all items */
function totalReturned(items: ConsumoItem[]): number {
  return items.reduce((sum, i) => sum + i.returned, 0)
}

// ─── Sub-components ───────────────────────────────────────────────

function EmptyState({ onCargar }: { onCargar: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="rounded-full bg-muted p-4">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Sin consumo registrado</p>
          <p className="text-xs text-muted-foreground">
            Aún no se cargó el consumo para esta cirugía. Hacé clic en &quot;Cargar consumo&quot; para
            registrar los artículos consumidos y devueltos.
          </p>
        </div>
        <Button onClick={onCargar} size="sm" className="mt-2">
          <Plus className="size-4" />
          Cargar consumo
        </Button>
      </CardContent>
    </Card>
  )
}

function ConsumoHeader({
  consumo,
  box,
}: {
  consumo: Consumo
  box?: Box
}) {
  const stateColor = CONSUMO_STATE_COLORS[consumo.state] ?? "bg-gray-400 text-white"

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Activity className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{consumo.id}</span>
            <Badge className={cn("text-[10px] px-1.5 py-0", stateColor)}>
              {consumo.state}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Caja: {box?.name ?? consumo.boxId}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {consumo.validatedBy && (
          <div className="flex items-center gap-1">
            <FileCheck className="size-3.5" />
            <span>Validado por <strong className="text-foreground">{consumo.validatedBy}</strong></span>
          </div>
        )}
        {consumo.validatedAt && (
          <div className="flex items-center gap-1">
            <Check className="size-3.5" />
            <span>{formatDate(consumo.validatedAt)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ConsumoSummaryCards({ items }: { items: ConsumoItem[] }) {
  const consumed = totalConsumed(items)
  const returned = totalReturned(items)
  const uniqueItems = items.length

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border bg-muted/30 p-3 text-center">
        <p className="text-lg font-bold text-foreground">{consumed}</p>
        <p className="text-[10px] text-muted-foreground">Consumidos</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 text-center">
        <p className="text-lg font-bold text-foreground">{returned}</p>
        <p className="text-[10px] text-muted-foreground">Devueltos</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 text-center">
        <p className="text-lg font-bold text-foreground">{uniqueItems}</p>
        <p className="text-[10px] text-muted-foreground">Ítems</p>
      </div>
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
  items: ConsumoItem[]
  sentMap: Map<string, number>
  editingConsumo: Record<string, { consumed: number; returned: number }>
  setEditingConsumo: (v: Record<string, { consumed: number; returned: number }>) => void
  isEditing: boolean
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-[11px]">Artículo</TableHead>
            <TableHead className="text-[11px]">Código</TableHead>
            <TableHead className="text-[11px]">Lote</TableHead>
            <TableHead className="text-[11px]">Depto.</TableHead>
            <TableHead className="text-[11px]">Marca</TableHead>
            <TableHead className="text-[11px]">Vto.</TableHead>
            <TableHead className="text-[11px] text-center">Enviado</TableHead>
            <TableHead className="text-[11px] text-center">Consumido</TableHead>
            <TableHead className="text-[11px] text-center">Devuelto</TableHead>
            <TableHead className="text-[11px] text-center">Dif.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const sent = sentMap.get(item.stockItemId) ?? 0
            const diff = sent - item.consumed - item.returned
            const edit = editingConsumo[item.stockItemId]

            return (
              <TableRow key={item.stockItemId}>
                {/* Article */}
                <TableCell className="text-xs font-medium max-w-[180px] truncate" title={item.name}>
                  <div>
                    {item.name}
                    {item.serial && (
                      <span className="block text-[10px] text-muted-foreground">
                        Serie: {item.serial}
                      </span>
                    )}
                  </div>
                </TableCell>
                {/* Code */}
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {item.code}
                </TableCell>
                {/* Lot */}
                <TableCell className="text-xs font-mono">{item.lot}</TableCell>
                {/* Department */}
                <TableCell className="text-xs text-muted-foreground">{item.department}</TableCell>
                {/* Brand */}
                <TableCell className="text-xs text-muted-foreground">{item.brand}</TableCell>
                {/* Expiry */}
                <TableCell className="text-xs text-muted-foreground">
                  {item.expiry ? formatDate(item.expiry) : "—"}
                </TableCell>
                {/* Sent */}
                <TableCell className="text-xs text-center">{sent}</TableCell>
                {/* Consumed */}
                <TableCell className="text-xs text-center">
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
                    <span className={cn(item.consumed > 0 && "font-semibold text-foreground")}>
                      {item.consumed}
                    </span>
                  )}
                </TableCell>
                {/* Returned */}
                <TableCell className="text-xs text-center">
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
                    item.returned
                  )}
                </TableCell>
                {/* Difference */}
                <TableCell className="text-xs text-center">
                  {diff === 0 ? (
                    <span className="text-muted-foreground">0</span>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {diff > 0 ? `−${diff}` : `+${Math.abs(diff)}`}
                    </Badge>
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

function FaltantesSection({ faltantes }: { faltantes: FaltanteEntry[] }) {
  const [open, setOpen] = useState(false)

  if (faltantes.length === 0) return null

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <span className="text-xs font-semibold text-destructive">
            Diferencias / Faltantes ({faltantes.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-destructive" />
        ) : (
          <ChevronDown className="size-4 text-destructive" />
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
              {faltantes.map((f) => (
                <TableRow key={f.stockItemId}>
                  <TableCell className="text-xs font-medium max-w-[160px] truncate" title={f.name}>
                    {f.name}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {f.code}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{f.lot}</TableCell>
                  <TableCell className="text-xs text-center">{f.sent}</TableCell>
                  <TableCell className="text-xs text-center">{f.consumed}</TableCell>
                  <TableCell className="text-xs text-center">{f.returned}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {f.difference > 0 ? `Falta ${f.difference}` : `Sobra ${Math.abs(f.difference)}`}
                    </Badge>
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

function DevolucionSection({ items }: { items: ConsumoItem[] }) {
  const returnedItems = items.filter((i) => i.returned > 0)
  const [open, setOpen] = useState(false)

  if (returnedItems.length === 0) return null

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <RotateCcw className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Devoluciones ({returnedItems.length} ítems)
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
                  <TableCell className="text-xs text-center font-semibold">{item.returned}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function ConsumoStateTimeline({ state }: { state: Consumo["state"] }) {
  const steps = [
    { label: "Pendiente", active: state === "Pendiente" || state === "Validado" || state === "Facturado", done: state !== "Pendiente" },
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
                "size-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                step.done
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : step.active
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-muted text-muted-foreground border-muted"
              )}
            >
              {step.done ? <Check className="size-3" /> : idx + 1}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium",
                step.done || step.active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={cn(
                "h-px flex-1 min-w-[20px]",
                step.done ? "bg-emerald-400" : "bg-border"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function ConsumoPanel({
  surgery,
  consumo,
  remitos,
  box,
  editingConsumo,
  setEditingConsumo,
}: ConsumoPanelProps) {
  const [isEditing, setIsEditing] = useState(false)

  const sentMap = useMemo(() => getSentMap(remitos), [remitos])
  const faltantes = useMemo(
    () => (consumo ? computeFaltantes(consumo.items, remitos) : []),
    [consumo, remitos]
  )

  // ── Empty state ──
  if (!consumo) {
    return <EmptyState onCargar={() => { /* TODO: open consumo dialog */ }} />
  }

  const { items, state } = consumo

  // ── Initialize editing state from current consumo ──
  const handleStartEdit = () => {
    const initial: Record<string, { consumed: number; returned: number }> = {}
    for (const item of items) {
      initial[item.stockItemId] = { consumed: item.consumed, returned: item.returned }
    }
    setEditingConsumo(initial)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    // TODO: persist editingConsumo via API
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingConsumo({})
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <ConsumoHeader consumo={consumo} box={box} />

      <Separator />

      {/* ── State timeline ── */}
      <ConsumoStateTimeline state={state} />

      {/* ── Summary cards ── */}
      <ConsumoSummaryCards items={items} />

      {/* ── Items table ── */}
      <Card className="py-0">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <FileText className="size-3.5" />
            Detalle de artículos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <ConsumoItemsTable
            items={items}
            sentMap={sentMap}
            editingConsumo={editingConsumo}
            setEditingConsumo={setEditingConsumo}
            isEditing={isEditing}
          />
        </CardContent>
      </Card>

      {/* ── Faltantes / Diferencias ── */}
      <FaltantesSection faltantes={faltantes} />

      {/* ── Devoluciones ── */}
      <DevolucionSection items={items} />

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!isEditing && state === "Pendiente" && (
          <>
            <Button size="sm" variant="outline" onClick={handleStartEdit}>
              <ClipboardEdit className="size-3.5" />
              Editar consumo
            </Button>
            <Button size="sm" variant="outline">
              <Check className="size-3.5" />
              Validar consumo
            </Button>
          </>
        )}

        {isEditing && (
          <>
            <Button size="sm" onClick={handleSaveEdit}>
              <Check className="size-3.5" />
              Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              Cancelar
            </Button>
          </>
        )}

        {!isEditing && state === "Validado" && (
          <Button size="sm" variant="outline">
            <Eye className="size-3.5" />
            Ver diferencias
          </Button>
        )}

        {!isEditing && items.some((i) => i.returned > 0) && (
          <Button size="sm" variant="outline">
            <RotateCcw className="size-3.5" />
            Ver devolución
          </Button>
        )}

        {!isEditing && state === "Facturado" && (
          <Button size="sm" variant="secondary">
            <ArrowRightLeft className="size-3.5" />
            Ver facturación
          </Button>
        )}
      </div>
    </div>
  )
}

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, ChevronDown, ChevronRight, Check, Loader2, Plus, RotateCcw, Send, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDevoluciones } from "@/hooks/useDevoluciones"
import { getDevolucionVisibleNumber, type DevolucionApiRow } from "@/lib/api/devoluciones"
import { getConsumoVisibleNumber, type ConsumoApiRow } from "@/lib/api/consumos"
import { getRemitoVisibleNumber, type RemitoApiRow } from "@/lib/api/remitos"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface DevolucionesPanelProps {
  surgeryId: string
  selectedRemito?: RemitoApiRow | null
  selectedConsumo?: ConsumoApiRow | null
  onConfirmed?: () => void
}

type DevolucionSourceItem = {
  id: string
  remitoItemId?: string
  consumoItemId?: string
  sku?: string
  description: string
  maxQuantity: number
  unit?: string
  lotNumber?: string
  serialNumber?: string
  expirationDate?: string
}

const DEVOLUCION_STATE_COLORS: Record<string, string> = {
  Borrador: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  Pendiente: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  Confirmada: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  Rechazada: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
  Anulada: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function StateBadge({ state }: { state: string }) {
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold", DEVOLUCION_STATE_COLORS[state] ?? DEVOLUCION_STATE_COLORS.Borrador)}>
      {state}
    </span>
  )
}

function EmptyState() {
  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <RotateCcw className="size-7 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Sin devoluciones backend asociadas</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Las devoluciones reales aparecerán acá cuando se registren contra remito/consumo de esta cirugía.
        </p>
      </CardContent>
    </Card>
  )
}

function StatusState({ title, message, retryLabel, onRetry, loading }: { title: string; message: string; retryLabel?: string; onRetry?: () => void; loading?: boolean }) {
  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        {loading ? <Loader2 className="size-7 animate-spin text-muted-foreground" /> : <AlertTriangle className="size-7 text-muted-foreground" />}
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        {onRetry && retryLabel ? <Button size="sm" variant="outline" onClick={onRetry}>{retryLabel}</Button> : null}
      </CardContent>
    </Card>
  )
}

function DevolucionItemsTable({ devolucion }: { devolucion: DevolucionApiRow }) {
  const items = devolucion.items ?? []
  const total = items.reduce((sum, item) => sum + toNumber(item.returnedQuantity), 0)

  if (items.length === 0) {
    return <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">Sin ítems informados en esta devolución.</p>
  }

  return (
    <div className="overflow-hidden rounded-md border bg-white dark:border-slate-800 dark:bg-slate-900/80">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="h-8 text-[10px]">Artículo</TableHead>
            <TableHead className="h-8 text-[10px]">SKU</TableHead>
            <TableHead className="h-8 text-[10px]">Remito item</TableHead>
            <TableHead className="h-8 text-[10px]">Consumo item</TableHead>
            <TableHead className="h-8 text-right text-[10px]">Devuelto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-[220px] py-1.5 text-xs font-medium" title={item.description}>{item.description}</TableCell>
              <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">{item.sku ?? "—"}</TableCell>
              <TableCell className="py-1.5 font-mono text-[10px] text-muted-foreground">{item.remitoItemId ?? "—"}</TableCell>
              <TableCell className="py-1.5 font-mono text-[10px] text-muted-foreground">{item.consumoItemId ?? "—"}</TableCell>
              <TableCell className="py-1.5 text-right text-xs font-semibold text-orange-700 tabular-nums">
                {toNumber(item.returnedQuantity)} {item.unit ?? ""}
              </TableCell>
            </TableRow>
          ))}
          {items.length > 1 ? (
            <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/30">
              <TableCell className="py-1.5" />
              <TableCell className="py-1.5" />
              <TableCell className="py-1.5" />
              <TableCell className="py-1.5 text-xs font-semibold">Total</TableCell>
              <TableCell className="py-1.5 text-right text-xs font-semibold text-orange-700 tabular-nums">{total}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}

function DevolucionCard({ devolucion, mutating, onConfirm, onSubmitDraft, onRemoveDraft }: { devolucion: DevolucionApiRow; mutating: boolean; onConfirm: (devolucion: DevolucionApiRow) => void; onSubmitDraft: (devolucion: DevolucionApiRow) => void; onRemoveDraft: (devolucion: DevolucionApiRow) => void }) {
  const [open, setOpen] = useState(false)
  const visibleNumber = getDevolucionVisibleNumber(devolucion)
  const totalReturned = (devolucion.items ?? []).reduce((sum, item) => sum + toNumber(item.returnedQuantity), 0)
  const triggerId = `devolucion-trigger-${devolucion.id}`
  const contentId = `devolucion-details-${devolucion.id}`

  return (
    <Card className="overflow-hidden py-0">
      <button
        id={triggerId}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
            <span className="font-mono text-sm font-semibold tracking-tight">{visibleNumber}</span>
            <StateBadge state={devolucion.state} />
            <Badge variant="outline" className="h-5 text-[10px]">{devolucion.items?.length ?? 0} ítem{(devolucion.items?.length ?? 0) !== 1 ? "s" : ""}</Badge>
            {totalReturned > 0 ? <Badge variant="outline" className="h-5 border-orange-300 text-[10px] text-orange-700">{totalReturned} devuelto{totalReturned !== 1 ? "s" : ""}</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Remito <span className="font-mono">{devolucion.remitoId}</span>
            {devolucion.consumoId ? <> · Consumo <span className="font-mono">{devolucion.consumoId}</span></> : null}
          </p>
        </div>
        <div className="shrink-0 text-right text-[10px] text-muted-foreground">
          <p>{devolucion.validatedAt ? `Validada ${formatDate(devolucion.validatedAt)}` : "Sin validar"}</p>
          <p>Creada {formatDate(devolucion.createdAt)}</p>
        </div>
      </button>

      <CardContent id={contentId} role="region" aria-labelledby={triggerId} hidden={!open} className="space-y-3 border-t px-4 pb-4 pt-3">
          <div className="grid gap-2 rounded-md border bg-muted/20 p-2.5 sm:grid-cols-4">
            <div>
              <p className="mb-0.5 text-[10px] text-muted-foreground">Devolución</p>
              <p className="font-mono text-xs font-semibold">{visibleNumber}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] text-muted-foreground">Remito</p>
              <p className="truncate font-mono text-xs font-medium">{devolucion.remitoId}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] text-muted-foreground">Consumo</p>
              <p className="truncate font-mono text-xs font-medium">{devolucion.consumoId ?? "—"}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] text-muted-foreground">Motivo</p>
              <p className="truncate text-xs font-medium">{devolucion.reason || "Sin motivo"}</p>
            </div>
          </div>

          <DevolucionItemsTable devolucion={devolucion} />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {devolucion.state === "Pendiente" ? (
              <Button size="sm" className="h-7 gap-1.5 text-[10px]" onClick={() => onConfirm(devolucion)} disabled={mutating}>
                {mutating ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Confirmar devolución
              </Button>
            ) : null}
            {devolucion.state === "Borrador" ? (
              <>
                <Button size="sm" className="h-7 gap-1.5 text-[10px]" onClick={() => onSubmitDraft(devolucion)} disabled={mutating}>
                  {mutating ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                  Enviar a pendiente
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[10px] text-destructive" onClick={() => onRemoveDraft(devolucion)} disabled={mutating}>
                  {mutating ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                  Eliminar borrador
                </Button>
              </>
            ) : null}
          </div>
      </CardContent>
    </Card>
  )
}

export function DevolucionesPanel({ surgeryId, selectedRemito, selectedConsumo, onConfirmed }: DevolucionesPanelProps) {
  const filters = useMemo(() => ({ surgeryId: surgeryId || "__missing_surgery__", take: 50 }), [surgeryId])
  const { devoluciones, loading, ready, error, blocked, mutatingId, refresh, transition, confirm, createDraft, removeDraft } = useDevoluciones(filters)
  const [selectedItemId, setSelectedItemId] = useState<string>("")
  const [returnedQuantity, setReturnedQuantity] = useState("1")
  const [reason, setReason] = useState("")

  const sourceItems = useMemo<DevolucionSourceItem[]>(() => {
    if (selectedConsumo?.items?.length) {
      return selectedConsumo.items.map((item) => ({
        id: item.id,
        remitoItemId: item.remitoItemId ?? undefined,
        consumoItemId: item.id,
        sku: item.sku ?? undefined,
        description: item.description,
        maxQuantity: toNumber(item.consumedQuantity) || toNumber(item.requestedQuantity) || 1,
        unit: item.unit ?? undefined,
        lotNumber: item.lotNumber ?? undefined,
        serialNumber: item.serialNumber ?? undefined,
        expirationDate: item.expirationDate ?? undefined,
      }))
    }

    return (selectedRemito?.items ?? []).map((item) => ({
      id: item.id,
      remitoItemId: item.id,
      sku: item.sku ?? item.itemId ?? undefined,
      description: item.description,
      maxQuantity: toNumber(item.quantity) || 1,
      unit: item.unit ?? undefined,
      lotNumber: item.lotNumber ?? undefined,
      serialNumber: item.serialNumber ?? undefined,
      expirationDate: item.expirationDate ?? undefined,
    }))
  }, [selectedConsumo, selectedRemito])

  const effectiveSelectedItem = sourceItems.find((item) => item.id === selectedItemId) ?? sourceItems[0]
  const parsedReturnedQuantity = Number(returnedQuantity)
  const quantityValidationMessage = !effectiveSelectedItem
    ? "Seleccioná un ítem para devolver."
    : returnedQuantity.trim() === ""
      ? "Ingresá una cantidad para devolver."
      : !Number.isFinite(parsedReturnedQuantity) || parsedReturnedQuantity <= 0
        ? "La cantidad devuelta debe ser mayor a cero."
        : parsedReturnedQuantity > effectiveSelectedItem.maxQuantity
          ? `La cantidad no puede superar el máximo disponible de ${effectiveSelectedItem.maxQuantity} unidad(es).`
          : null
  const quantityDescribedBy = effectiveSelectedItem
    ? quantityValidationMessage ? "devolucion-quantity-helper devolucion-quantity-error" : "devolucion-quantity-helper"
    : quantityValidationMessage ? "devolucion-quantity-error" : undefined
  const canCreateDraft = Boolean(selectedRemito && effectiveSelectedItem && !quantityValidationMessage && mutatingId !== "__create__")

  useEffect(() => {
    if (!effectiveSelectedItem) return

    setReturnedQuantity((currentQuantity) => {
      const currentValue = Number(currentQuantity)
      if (!currentQuantity.trim() || !Number.isFinite(currentValue) || currentValue <= 0) return "1"

      return String(Math.min(currentValue, effectiveSelectedItem.maxQuantity))
    })
  }, [effectiveSelectedItem?.id, effectiveSelectedItem?.maxQuantity])

  const totals = useMemo(() => ({
    count: devoluciones.length,
    items: devoluciones.reduce((sum, devolucion) => sum + (devolucion.items?.length ?? 0), 0),
    returned: devoluciones.reduce((sum, devolucion) => sum + (devolucion.items ?? []).reduce((itemSum, item) => itemSum + toNumber(item.returnedQuantity), 0), 0),
    pending: devoluciones.filter((devolucion) => devolucion.state === "Pendiente").length,
    confirmed: devoluciones.filter((devolucion) => devolucion.state === "Confirmada").length,
  }), [devoluciones])

  const handleConfirm = async (devolucion: DevolucionApiRow) => {
    try {
      await confirm(devolucion.id)
      onConfirmed?.()
      toast.success(`Devolución ${getDevolucionVisibleNumber(devolucion)} confirmada`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la devolución")
    }
  }

  const handleSubmitDraft = async (devolucion: DevolucionApiRow) => {
    try {
      await transition(devolucion.id, "Pendiente")
      toast.success(`Devolución ${getDevolucionVisibleNumber(devolucion)} enviada a pendiente`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la devolución a pendiente")
    }
  }

  const handleRemoveDraft = async (devolucion: DevolucionApiRow) => {
    const visibleNumber = getDevolucionVisibleNumber(devolucion)
    const confirmed = window.confirm(`¿Eliminar el borrador ${visibleNumber}?`)
    if (!confirmed) return

    try {
      await removeDraft(devolucion.id)
      toast.success(`Borrador ${visibleNumber} eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el borrador")
    }
  }

  const handleCreateDraft = async () => {
    if (!selectedRemito) {
      toast.error("Seleccioná un remito para crear la devolución")
      return
    }
    if (!effectiveSelectedItem) {
      toast.error("Seleccioná un ítem para devolver")
      return
    }
    if (quantityValidationMessage) {
      toast.error(quantityValidationMessage)
      return
    }

    try {
      const created = await createDraft({
        surgeryId,
        remitoId: selectedRemito.id,
        consumoId: selectedConsumo?.id,
        reason: reason.trim() || undefined,
        items: [{
          remitoItemId: effectiveSelectedItem.remitoItemId,
          consumoItemId: effectiveSelectedItem.consumoItemId,
          sku: effectiveSelectedItem.sku,
          description: effectiveSelectedItem.description,
          returnedQuantity: parsedReturnedQuantity,
          unit: effectiveSelectedItem.unit,
          lotNumber: effectiveSelectedItem.lotNumber,
          serialNumber: effectiveSelectedItem.serialNumber,
          expirationDate: effectiveSelectedItem.expirationDate,
        }],
        metadata: {
          source: "ficha_cx",
          remitoVisibleNumber: getRemitoVisibleNumber(selectedRemito),
          consumoVisibleNumber: selectedConsumo ? getConsumoVisibleNumber(selectedConsumo) : undefined,
        },
      })
      setSelectedItemId("")
      setReturnedQuantity("1")
      setReason("")
      toast.success(`Devolución ${getDevolucionVisibleNumber(created)} creada`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la devolución")
    }
  }

  const createForm = (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader className="border-b bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
          <Plus className="size-3.5" /> Nueva devolución
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Fuente: {selectedRemito ? getRemitoVisibleNumber(selectedRemito) : "sin remito seleccionado"}
          {selectedConsumo ? ` · ${getConsumoVisibleNumber(selectedConsumo)}` : ""}. Al confirmar, actualiza cantidades y estado del remito en la misma transacción.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 pt-4 md:grid-cols-[minmax(0,1fr)_110px_minmax(160px,220px)_auto] md:items-end">
        <label className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ítem</span>
          <select
            value={effectiveSelectedItem?.id ?? ""}
            onChange={(event) => setSelectedItemId(event.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-xs"
            disabled={sourceItems.length === 0}
          >
            {sourceItems.length === 0 ? <option value="">Sin ítems disponibles</option> : null}
            {sourceItems.map((item) => (
              <option key={item.id} value={item.id}>{item.description} · máx. {item.maxQuantity}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cantidad</span>
          <input
            type="number"
            min={1}
            max={effectiveSelectedItem?.maxQuantity}
            value={returnedQuantity}
            onChange={(event) => setReturnedQuantity(event.target.value)}
            aria-describedby={quantityDescribedBy}
            aria-invalid={Boolean(quantityValidationMessage)}
            className="h-9 w-full rounded-md border bg-background px-2 text-xs"
          />
          {effectiveSelectedItem ? (
            <p id="devolucion-quantity-helper" className="text-[11px] text-muted-foreground">
              Máximo disponible: {effectiveSelectedItem.maxQuantity} unidad(es)
            </p>
          ) : null}
          {quantityValidationMessage ? (
            <p id="devolucion-quantity-error" role="alert" className="text-[11px] font-medium text-destructive">
              {quantityValidationMessage}
            </p>
          ) : null}
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Motivo</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Opcional"
            className="h-9 w-full rounded-md border bg-background px-2 text-xs"
          />
        </label>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => void handleCreateDraft()} disabled={!canCreateDraft}>
          {mutatingId === "__create__" ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Crear borrador
        </Button>
      </CardContent>
    </Card>
  )

  if (!ready || loading) {
    return <div className="space-y-3">{createForm}<StatusState title="Cargando devoluciones" message="Buscando devoluciones backend asociadas a esta cirugía." loading /></div>
  }

  if (blocked) {
    return <div className="space-y-3">{createForm}<StatusState title="Devoluciones no disponibles" message="No hay empresa activa o la cirugía no tiene ID server-side disponible." /></div>
  }

  if (error) {
    return <div className="space-y-3">{createForm}<StatusState title="No se pudieron cargar las devoluciones" message={error} retryLabel="Reintentar" onRetry={() => void refresh()} /></div>
  }

  if (devoluciones.length === 0) {
    return <div className="space-y-3">{createForm}<EmptyState /></div>
  }

  return (
    <div className="space-y-3">
    {createForm}
    <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader className="border-b bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <RotateCcw className="size-3.5" />
              Devoluciones reales
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Entidad propia de devolución asociada a remito/consumo. La confirmación aplica cantidades y recalcula el estado del remito.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{totals.count} devolución{totals.count !== 1 ? "es" : ""}</Badge>
            <Badge variant="outline" className="text-[10px]">{totals.items} ítem{totals.items !== 1 ? "s" : ""}</Badge>
            <Badge variant="outline" className="border-orange-300 text-[10px] text-orange-700">{totals.returned} devuelto{totals.returned !== 1 ? "s" : ""}</Badge>
            {totals.pending > 0 ? <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">{totals.pending} pendiente{totals.pending !== 1 ? "s" : ""}</Badge> : null}
            {totals.confirmed > 0 ? <Badge variant="outline" className="border-emerald-300 text-[10px] text-emerald-700">{totals.confirmed} confirmada{totals.confirmed !== 1 ? "s" : ""}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 px-4 pb-4 pt-4">
        {devoluciones.map((devolucion) => (
          <DevolucionCard
            key={devolucion.id}
            devolucion={devolucion}
            mutating={mutatingId === devolucion.id}
            onConfirm={(target) => void handleConfirm(target)}
            onSubmitDraft={(target) => void handleSubmitDraft(target)}
            onRemoveDraft={(target) => void handleRemoveDraft(target)}
          />
        ))}
      </CardContent>
    </Card>
    </div>
  )
}

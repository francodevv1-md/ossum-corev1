"use client"

import React, { useMemo, useState } from "react"
import { ArrowLeftRight, Pencil, Plus, Printer, RefreshCw, Search, Send, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useRemitos } from "@/hooks/useRemitos"
import {
  getRemitoDestinatarioName,
  getRemitoVisibleNumber,
  REMITO_STATES,
  type RemitoApiItem,
  type RemitoApiRow,
  type RemitoState,
} from "@/lib/api/remitos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildOperationalRemitoPrintHtml } from "@/lib/remito-print-template"
import { RemitoStateSurface } from "@/components/remitos/RemitoStateSurface"

const STATE_FILTER_OPTIONS = [{ value: "", label: "Todos los estados" }, ...REMITO_STATES.map((state) => ({ value: state, label: state }))]

const NEXT_STATE_OPTIONS: Partial<Record<RemitoState, RemitoState[]>> = {
  Emitido: ["En_transito", "Entregado", "Anulado"],
  En_transito: ["Entregado", "Parcialmente_devuelto", "Anulado"],
  Entregado: ["Parcialmente_devuelto", "Devuelto", "Anulado"],
  Parcialmente_devuelto: ["Devuelto", "Anulado"],
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date)
}

function formatTimeOnly(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(date)
}

function formatQuantity(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0)
  if (!Number.isFinite(numberValue)) return String(value ?? "—")
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(numberValue)
}

function stateTone(state: string) {
  if (state === "Anulado") return "destructive"
  if (state === "Devuelto" || state === "Entregado") return "default"
  if (state === "Borrador") return "secondary"
  return "outline"
}

function originLabel(origin: string) {
  const labels: Record<string, string> = {
    box: "Caja",
    presupuesto: "Presupuesto",
    manual: "Manual",
    mixto: "Mixto",
  }
  return labels[origin] ?? origin
}

function entryExitLabel(remito: Pick<RemitoApiRow, "origin" | "state">) {
  if (remito.state === "Devuelto" || remito.state === "Parcialmente_devuelto") return "E"
  if (remito.state === "Anulado" || remito.state === "Borrador") return "—"
  if (remito.origin === "box" || remito.origin === "presupuesto" || remito.origin === "mixto" || remito.origin === "manual") return "S"
  return "—"
}

function getContactCode(remito: Pick<RemitoApiRow, "destinatarioSnapshot">) {
  const code = remito.destinatarioSnapshot?.codigoContacto
  return typeof code === "string" && code.trim() ? code.trim() : "—"
}

function getObservations(remito: Pick<RemitoApiRow, "metadata">) {
  const observations = remito.metadata?.observaciones
  return typeof observations === "string" ? observations : ""
}

function getDepositLabel(remito: Pick<RemitoApiRow, "boxId">) {
  return remito.boxId ? `Caja ${remito.boxId}` : "—"
}

function canDevolver(remito: RemitoApiRow) {
  return remito.state === "Entregado" || remito.state === "Parcialmente_devuelto"
}

function buildPrintHtml(remito: RemitoApiRow) {
  const destinatario = remito.destinatarioSnapshot
  const observations = typeof remito.metadata?.observaciones === "string" ? remito.metadata.observaciones : null

  return buildOperationalRemitoPrintHtml({
    title: `Remito ${getRemitoVisibleNumber(remito)}`,
    documentNumber: getRemitoVisibleNumber(remito),
    state: remito.state,
    origin: originLabel(remito.origin),
    issuedAt: formatDate(remito.issuedAt),
    createdAt: formatDate(remito.createdAt),
    destinationName: destinatario?.nombre ?? "Sin destinatario",
    cuitDni: destinatario?.cuitDni,
    address: remito.shippingAddressSnapshot?.domicilio ?? destinatario?.domicilio,
    locality: remito.shippingAddressSnapshot?.localidad ?? destinatario?.localidad,
    province: remito.shippingAddressSnapshot?.provincia ?? destinatario?.provincia,
    surgeryLabel: remito.surgeryId,
    boxId: remito.boxId,
    presupuestoId: remito.presupuestoId,
    internalId: remito.id,
    observations,
    metaFields: [
      { label: "Entregado", value: formatDate(remito.deliveredAt) },
      { label: "Devuelto", value: formatDate(remito.returnedAt) },
      { label: "Sucursal", value: remito.branchId ?? "—" },
      { label: "Motivo salida", value: remito.salidaReason },
      { label: "Transporte", value: remito.transportSnapshot?.nombre ?? "—" },
      { label: "Bultos", value: remito.packageCount == null ? "—" : String(remito.packageCount) },
      { label: "Valor declarado", value: remito.declaredValue == null ? "—" : String(remito.declaredValue) },
    ],
    includeReturned: true,
    items: remito.items.map((item) => ({
      code: item.sku,
      description: item.description,
      quantity: formatQuantity(item.quantity),
      unit: item.unit,
      returnedQuantity: formatQuantity(item.returnedQuantity),
    })),
  })
}

function printRemito(remito: RemitoApiRow) {
  const printWindow = window.open("", "_blank", "width=900,height=700")
  if (!printWindow) {
    toast.error("El navegador bloqueó la ventana de impresión")
    return
  }
  printWindow.document.open()
  printWindow.document.write(buildPrintHtml(remito))
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function DevolucionDialog({
  remito,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  remito: RemitoApiRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (items: Array<{ itemId: string; returnedQuantity: number }>) => Promise<void>
  loading: boolean
}) {
  const [values, setValues] = useState<Record<string, number>>({})

  const submit = async () => {
    const items = Object.entries(values)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, returnedQuantity]) => ({ itemId, returnedQuantity }))
    if (items.length === 0) {
      toast.error("Ingresá al menos una cantidad a devolver")
      return
    }
    await onConfirm(items)
    setValues({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar devolución</DialogTitle>
          <DialogDescription>{remito ? `${getRemitoVisibleNumber(remito)} — validación humana explícita` : ""}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] space-y-3 overflow-y-auto py-2">
           {remito?.items.map((item) => {
             const available = Math.max(0, Number(item.quantity) - Number(item.returnedQuantity ?? 0))
             const returnQuantityInputId = `devolucion-item-${item.id}`
             return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sku ?? "Sin SKU"} · Enviado {formatQuantity(item.quantity)} · Ya devuelto {formatQuantity(item.returnedQuantity)}
                  </p>
                </div>
                <div className="w-28">
                  <Label htmlFor={returnQuantityInputId} className="text-xs">Devolver {item.description} ({item.id})</Label>
                  <Input
                    id={returnQuantityInputId}
                    type="number"
                    min={0}
                    max={available}
                    step="0.0001"
                    value={values[item.id] ?? 0}
                    onChange={(event) => setValues((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Registrando..." : "Confirmar devolución"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ItemsTable({ items }: { items: RemitoApiItem[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">SKU</th>
            <th className="px-3 py-2 text-left font-medium">Descripción</th>
            <th className="px-3 py-2 text-right font-medium">Cantidad</th>
            <th className="px-3 py-2 text-left font-medium">Unidad</th>
            <th className="px-3 py-2 text-right font-medium">Devuelto</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.sku ?? "—"}</td>
              <td className="px-3 py-2 font-medium">{item.description}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(item.quantity)}</td>
              <td className="px-3 py-2">{item.unit ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(item.returnedQuantity)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Sin ítems</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const compactButtonClass = "h-8 px-3 text-xs"
const compactFieldClass = "h-9 bg-background text-sm"

export default function RemitosPage() {
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [devolucionOpen, setDevolucionOpen] = useState(false)
  const router = useRouter()
  const filters = useMemo(() => ({ state: stateFilter || undefined, take: 100 }), [stateFilter])
  const {
    remitos,
    selectedRemito,
    loading,
    ready,
    error,
    mutatingId,
    blocked,
    refresh,
    selectRemito,
    emit,
    transition,
    devolucion,
  } = useRemitos(filters)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return remitos
    return remitos.filter((remito) => {
      const haystack = [
        remito.id,
        getRemitoVisibleNumber(remito),
        remito.state,
        remito.origin,
        remito.surgeryId,
        remito.boxId,
        remito.branchId,
        remito.salidaReason,
        remito.shippingAddressSnapshot?.domicilio,
        remito.transportSnapshot?.nombre,
        remito.presupuestoId,
        getContactCode(remito),
        getRemitoDestinatarioName(remito),
        getObservations(remito),
        ...remito.items.flatMap((item) => [item.sku, item.description, item.itemId, item.boxId]),
      ].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(query)
    })
  }, [remitos, search])

  const handleEmit = async (remito: RemitoApiRow) => {
    await emit(remito.id)
    toast.success(`Remito ${getRemitoVisibleNumber(remito)} emitido`)
  }

  const handleTransition = async (remito: RemitoApiRow, state: RemitoState) => {
    await transition(remito.id, state)
    toast.success(`Remito actualizado a ${state}`)
  }

  const handleDevolucion = async (items: Array<{ itemId: string; returnedQuantity: number }>) => {
    if (!selectedRemito) return
    await devolucion(selectedRemito.id, items)
    toast.success("Devolución registrada")
    setDevolucionOpen(false)
  }

  const clearFilters = () => {
    setSearch("")
    setStateFilter("")
  }

  const hasFilters = Boolean(search || stateFilter)
  const isInitialLoading = loading && !ready
  const isRefreshing = loading && ready
  const contentState = blocked
    ? "blocked"
    : error && remitos.length === 0
      ? "error"
      : remitos.length === 0
        ? hasFilters ? "no-match" : "empty"
        : filtered.length === 0
          ? "no-match"
          : null

  return (
    <div className="min-h-full bg-background p-4 sm:p-6">
      <main className="mx-auto max-w-[1600px] space-y-4" aria-busy={isRefreshing}>
        <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Remitos</h1>
              <span className="text-sm text-muted-foreground">{ready ? `${filtered.length} visible${filtered.length === 1 ? "" : "s"}` : "Listado operativo"}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Emisión, seguimiento y devolución por empresa.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" className={compactButtonClass} onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className="size-3.5" />
              <span className="sr-only sm:not-sr-only">Actualizar</span>
            </Button>
            <Button type="button" size="sm" className={compactButtonClass} onClick={() => router.push("/remitos/nuevo")} disabled={blocked}>
              <Plus className="size-3.5" /> Nuevo remito
            </Button>
          </div>
        </header>

        <section className="rounded-lg border bg-card p-3 sm:p-4" aria-label="Filtros de remitos">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="grid min-w-0 flex-1 gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Buscar</span>
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Número, destinatario, ítem u observación" className={`${compactFieldClass} pl-9`} />
              </span>
            </label>
            <label className="grid gap-1.5 sm:w-56">
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className={`${compactFieldClass} rounded-md border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
                {STATE_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {hasFilters && <Button type="button" size="sm" variant="ghost" className={compactButtonClass} onClick={clearFilters}><X className="size-3.5" /> Limpiar</Button>}
          </div>
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
            {isInitialLoading ? "Cargando resultados…" : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} visible${filtered.length === 1 ? "" : "s"}${hasFilters ? " con filtros activos" : ""}.`}
          </p>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-start">
          <section className="overflow-hidden rounded-lg border bg-card" aria-label="Resultados de remitos">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-medium">Resultados</h2>
              {isRefreshing && <span className="text-xs text-muted-foreground" role="status">Actualizando…</span>}
            </div>
            {error && remitos.length > 0 && <div className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive" role="alert">{error}</div>}
            {isInitialLoading ? <RemitoStateSurface kind="loading" /> : contentState ? (
              contentState === "error" ? <RemitoStateSurface kind="error" message={error ?? "Error desconocido"} onRetry={() => void refresh()} /> :
                contentState === "blocked" ? <RemitoStateSurface kind="blocked" /> :
                  contentState === "no-match" ? <RemitoStateSurface kind="no-match" onClear={clearFilters} /> : <RemitoStateSurface kind="empty" />
            ) : (
              <div className="max-h-[62vh] overflow-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-muted/95 text-xs text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Documento</th>
                      <th className="px-4 py-3 text-left font-medium">Destinatario</th>
                      <th className="px-4 py-3 text-left font-medium">Movimiento / fecha</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3 text-right font-medium">Ítems</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((remito) => {
                      const selected = selectedRemito?.id === remito.id
                      return (
                        <tr key={remito.id} className={`border-b last:border-0 ${selected ? "bg-accent/60" : "hover:bg-muted/50"}`}>
                          <td className="p-0">
                            <button type="button" onClick={() => void selectRemito(remito)} aria-pressed={selected} className="flex min-h-14 w-full flex-col justify-center px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                              <span className="font-mono text-xs font-semibold">{getRemitoVisibleNumber(remito)}</span>
                              <span className="mt-0.5 text-xs text-muted-foreground">{remito.branchId ?? "Sin sucursal"} · {getDepositLabel(remito)}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3"><p className="font-medium">{getRemitoDestinatarioName(remito)}</p><p className="mt-0.5 font-mono text-xs text-muted-foreground">{getContactCode(remito)}</p></td>
                          <td className="px-4 py-3"><p className="font-medium">{entryExitLabel(remito) === "—" ? originLabel(remito.origin) : `${entryExitLabel(remito)} · ${originLabel(remito.origin)}`}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDateOnly(remito.issuedAt ?? remito.createdAt)} · {formatTimeOnly(remito.issuedAt ?? remito.createdAt)}</p></td>
                          <td className="px-4 py-3"><Badge variant={stateTone(remito.state)}>{remito.state}</Badge></td>
                          <td className="px-4 py-3 text-right tabular-nums">{remito.items.length}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="rounded-lg border bg-card xl:sticky xl:top-4" aria-label="Detalle del remito">
            <div className="border-b px-4 py-3"><h2 className="text-sm font-medium">Detalle</h2></div>
            {!selectedRemito ? <RemitoStateSurface kind="unselected" /> : (
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="font-mono text-sm font-semibold">{getRemitoVisibleNumber(selectedRemito)}</p><p className="mt-1 truncate text-sm text-muted-foreground">{getRemitoDestinatarioName(selectedRemito)}</p></div>
                  <Badge variant={stateTone(selectedRemito.state)}>{selectedRemito.state}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y py-3 text-sm">
                  {[["Origen", originLabel(selectedRemito.origin)], ["Motivo", selectedRemito.salidaReason], ["Sucursal", selectedRemito.branchId ?? "—"], ["Cirugía", selectedRemito.surgeryId ?? "—"], ["Emitido", formatDate(selectedRemito.issuedAt)], ["Entregado", formatDate(selectedRemito.deliveredAt)], ["Devuelto", formatDate(selectedRemito.returnedAt)], ["Creado", formatDate(selectedRemito.createdAt)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words">{value}</dd></div>)}
                </dl>
                <div className="flex flex-wrap gap-2" aria-label="Acciones del remito seleccionado">
                  <Button type="button" size="sm" variant="outline" className={compactButtonClass} onClick={() => printRemito(selectedRemito)}><Printer className="size-3.5" /> Imprimir</Button>
                  {selectedRemito.state === "Borrador" && <><Button type="button" size="sm" variant="outline" className={compactButtonClass} onClick={() => router.push(`/remitos/${selectedRemito.id}/editar`)} disabled={mutatingId === selectedRemito.id}><Pencil className="size-3.5" /> Modificar</Button><Button type="button" size="sm" className={compactButtonClass} onClick={() => void handleEmit(selectedRemito)} disabled={mutatingId === selectedRemito.id}><Send className="size-3.5" /> {mutatingId === selectedRemito.id ? "Emitiendo…" : "Emitir"}</Button></>}
                  {canDevolver(selectedRemito) && <Button type="button" size="sm" variant="outline" className={compactButtonClass} onClick={() => setDevolucionOpen(true)} disabled={mutatingId === selectedRemito.id}><ArrowLeftRight className="size-3.5" /> Devolución</Button>}
                  {(NEXT_STATE_OPTIONS[selectedRemito.state as RemitoState] ?? []).map((state) => <Button type="button" key={state} size="sm" variant="secondary" className={compactButtonClass} onClick={() => void handleTransition(selectedRemito, state)} disabled={mutatingId === selectedRemito.id}>{state}</Button>)}
                </div>
                <div><h3 className="mb-2 text-sm font-medium">Ítems ({selectedRemito.items.length})</h3><ItemsTable items={selectedRemito.items} /></div>
              </div>
            )}
          </aside>
        </div>
      </main>

      <DevolucionDialog
        remito={selectedRemito}
        open={devolucionOpen}
        onOpenChange={setDevolucionOpen}
        onConfirm={handleDevolucion}
        loading={Boolean(selectedRemito && mutatingId === selectedRemito.id)}
      />
    </div>
  )
}

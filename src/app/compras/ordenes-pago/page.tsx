"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  Banknote, Clock, CheckCircle2, DollarSign,
  Plus, Eye, MoreHorizontal, CreditCard,
} from "lucide-react"
import type { MedioPago, OrdenPagoState } from "@/types"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Pagada", label: "Pagada" },
  { value: "Anulada", label: "Anulada" },
]

const MEDIO_PAGO_OPTIONS = [
  { value: "", label: "Todos los medios" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Retención", label: "Retención" },
]

export default function OrdenesPagoPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [medioFilter, setMedioFilter] = useState("")

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payId, setPayId] = useState("")

  // Create form
  const [formProveedorId, setFormProveedorId] = useState("")
  const [formOrdenCompraId, setFormOrdenCompraId] = useState("")
  const [formFacturaCompraId, setFormFacturaCompraId] = useState("")
  const [formImporte, setFormImporte] = useState(0)
  const [formVencimiento, setFormVencimiento] = useState("")
  const [formMedioPago, setFormMedioPago] = useState<MedioPago>("Transferencia")
  const [formObservaciones, setFormObservaciones] = useState("")

  // Detail
  const [detailOP, setDetailOP] = useState<typeof store.ordenesPago[0] | null>(null)

  const ordenesPago = store.ordenesPago
  const proveedores = store.proveedores.filter((p) => p.active)
  const ordenesCompra = store.ordenesCompra

  const filtered = useMemo(() => {
    let data = ordenesPago.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (op) =>
          op.id.toLowerCase().includes(q) ||
          op.proveedorName.toLowerCase().includes(q) ||
          (op.ordenCompraId && op.ordenCompraId.toLowerCase().includes(q))
      )
    }
    if (stateFilter) data = data.filter((op) => op.state === stateFilter)
    if (medioFilter) data = data.filter((op) => op.medioPago === medioFilter)
    return data.sort((a, b) => b.vencimiento.localeCompare(a.vencimiento))
  }, [ordenesPago, search, stateFilter, medioFilter])

  const stats = useMemo(() => {
    const total = ordenesPago.length
    const pendientes = ordenesPago.filter((op) => op.state === "Pendiente").length
    const pagadas = ordenesPago.filter((op) => op.state === "Pagada").length
    const montoTotal = ordenesPago.reduce((sum, op) => sum + op.importe, 0)
    const montoPendiente = ordenesPago.filter((op) => op.state === "Pendiente").reduce((sum, op) => sum + op.importe, 0)
    return { total, pendientes, pagadas, montoTotal, montoPendiente }
  }, [ordenesPago])

  const handleCreate = () => {
    if (!formProveedorId || formImporte <= 0 || !formVencimiento) {
      toast.error("Complete los campos obligatorios")
      return
    }
    const prov = proveedores.find((p) => p.id === formProveedorId)
    if (!prov) return

    store.createOrdenPago({
      proveedorId: formProveedorId,
      proveedorName: prov.name,
      ordenCompraId: formOrdenCompraId || undefined,
      facturaCompraId: formFacturaCompraId || undefined,
      importe: formImporte,
      vencimiento: formVencimiento,
      state: "Pendiente",
      medioPago: formMedioPago,
      observaciones: formObservaciones || undefined,
    })
    toast.success("Orden de pago creada exitosamente")
    setCreateDialogOpen(false)
    resetCreateForm()
  }

  const resetCreateForm = () => {
    setFormProveedorId("")
    setFormOrdenCompraId("")
    setFormFacturaCompraId("")
    setFormImporte(0)
    setFormVencimiento("")
    setFormMedioPago("Transferencia")
    setFormObservaciones("")
  }

  const handleMarkPaid = () => {
    if (!payId) return
    useOrtoTrackStore.setState({
      ordenesPago: ordenesPago.map((op) =>
        op.id === payId
          ? { ...op, state: "Pagada" as OrdenPagoState, fechaPago: new Date().toISOString().split("T")[0] }
          : op
      ),
    })
    toast.success("Orden de pago marcada como pagada")
    setPayDialogOpen(false)
    setPayId("")
  }

  const isOverdue = (vencimiento: string, state: string) =>
    state === "Pendiente" && new Date(vencimiento) < new Date()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Órdenes de Pago</h1>
          <p className="text-sm text-muted-foreground">Gestión de pagos a proveedores</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" /> Nueva OP
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard title="Total OP" value={stats.total} icon={Banknote} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
        <StatsCard title="Pagadas" value={stats.pagadas} icon={CheckCircle2} />
        <StatsCard title="Monto total" value={formatCurrency(stats.montoTotal)} icon={DollarSign} />
        <StatsCard title="Monto pendiente" value={formatCurrency(stats.montoPendiente)} icon={CreditCard} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="OP, proveedor, OC..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={medioFilter} onChange={setMedioFilter} options={MEDIO_PAGO_OPTIONS} />
            {(stateFilter || medioFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setMedioFilter("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">{filtered.length} orden{filtered.length !== 1 ? "es" : ""} de pago</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Proveedor</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">OC vinculada</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Importe</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Vencimiento</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Medio</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha pago</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((op) => (
                  <tr
                    key={op.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isOverdue(op.vencimiento, op.state) ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                  >
                    <td className="px-3 py-2.5 font-medium text-primary">{op.id}</td>
                    <td className="px-3 py-2.5">{op.proveedorName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{op.ordenCompraId || op.facturaCompraId || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(op.importe)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={isOverdue(op.vencimiento, op.state) ? "text-red-600 font-medium" : ""}>
                        {formatDate(op.vencimiento)}
                      </span>
                      {isOverdue(op.vencimiento, op.state) && (
                        <Badge variant="destructive" className="text-[9px] ml-1">Vencida</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">{op.medioPago}</Badge>
                    </td>
                    <td className="px-3 py-2.5"><StateBadge status={op.state} /></td>
                    <td className="px-3 py-2.5 text-xs">{op.fechaPago ? formatDate(op.fechaPago) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setDetailOP(op); setDetailDialogOpen(true) }}>
                              <Eye className="size-4" /> Ver detalle
                            </DropdownMenuItem>
                            {op.state === "Pendiente" && (
                              <DropdownMenuItem onClick={() => { setPayId(op.id); setPayDialogOpen(true) }}>
                                <CheckCircle2 className="size-4" /> Marcar como pagada
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron órdenes de pago
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create OP Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Pago</DialogTitle>
            <DialogDescription>Registrar pago a proveedor</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Select value={formProveedorId} onValueChange={setFormProveedorId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>OC vinculada</Label>
                <Select value={formOrdenCompraId} onValueChange={setFormOrdenCompraId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {ordenesCompra
                      .filter((oc) => !formProveedorId || oc.proveedorId === formProveedorId)
                      .map((oc) => (
                        <SelectItem key={oc.id} value={oc.id}>{oc.id} — {oc.proveedorName} ({formatCurrency(oc.total)})</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Factura vinculada</Label>
                <Input value={formFacturaCompraId} onChange={(e) => setFormFacturaCompraId(e.target.value)} placeholder="FC-XXXX (opcional)" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importe *</Label>
                <Input type="number" value={formImporte || ""} onChange={(e) => setFormImporte(Number(e.target.value) || 0)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Vencimiento *</Label>
                <Input type="date" value={formVencimiento} onChange={(e) => setFormVencimiento(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <Select value={formMedioPago} onValueChange={(v) => setFormMedioPago(v as MedioPago)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Transferencia", "Cheque", "Efectivo", "Tarjeta", "Retención"] as MedioPago[]).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={formObservaciones} onChange={(e) => setFormObservaciones(e.target.value)} placeholder="Referencia, cheque Nº..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!formProveedorId || formImporte <= 0 || !formVencimiento} className="bg-emerald-600 hover:bg-emerald-700">
              Crear OP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Orden de Pago</DialogTitle>
            <DialogDescription>{detailOP?.id}</DialogDescription>
          </DialogHeader>
          {detailOP && (
            <div className="grid grid-cols-2 gap-3 py-4 text-sm">
              <div><span className="text-muted-foreground">Proveedor:</span><p className="font-medium">{detailOP.proveedorName}</p></div>
              <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={detailOP.state} /></p></div>
              <div><span className="text-muted-foreground">Importe:</span><p className="font-bold text-lg">{formatCurrency(detailOP.importe)}</p></div>
              <div><span className="text-muted-foreground">Medio:</span><p><Badge variant="outline" className="text-[10px]">{detailOP.medioPago}</Badge></p></div>
              <div><span className="text-muted-foreground">Vencimiento:</span><p>{formatDate(detailOP.vencimiento)}</p></div>
              <div><span className="text-muted-foreground">Fecha pago:</span><p>{detailOP.fechaPago ? formatDate(detailOP.fechaPago) : "—"}</p></div>
              <div><span className="text-muted-foreground">OC vinculada:</span><p className="font-mono">{detailOP.ordenCompraId || "—"}</p></div>
              <div><span className="text-muted-foreground">FC vinculada:</span><p className="font-mono">{detailOP.facturaCompraId || "—"}</p></div>
              {detailOP.observaciones && (
                <div className="col-span-2 border rounded-lg p-3">
                  <span className="text-xs font-medium text-muted-foreground">Observaciones</span>
                  <p className="mt-1">{detailOP.observaciones}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark as Paid Dialog ── */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
            <DialogDescription>¿Marcar esta orden de pago como pagada?</DialogDescription>
          </DialogHeader>
          {payId && (() => {
            const op = ordenesPago.find((o) => o.id === payId)
            return op ? (
              <div className="py-4 space-y-2 text-sm">
                <div className="border rounded-lg p-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">ID:</span><span className="font-medium">{op.id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Proveedor:</span><span>{op.proveedorName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Importe:</span><span className="font-bold">{formatCurrency(op.importe)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Medio:</span><span>{op.medioPago}</span></div>
                </div>
              </div>
            ) : null
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleMarkPaid} className="bg-emerald-600 hover:bg-emerald-700">
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useOrdenesCompra } from "@/hooks/useOrdenesCompra"
import { useProveedores } from "@/hooks/useProveedores"
import { CreateOrdenCompraDialog } from "@/components/compras/CreateOrdenCompraDialog"
import { ReceiveOrdenCompraDialog } from "@/components/compras/ReceiveOrdenCompraDialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { searchArticlesApi } from "@/lib/api/articles"
import type { OrdenCompraApiRow } from "@/lib/api/ordenes-compra"
import { formatCurrency, formatDate } from "@/lib/formatters"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
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
  FileText, Clock, Truck, Package, DollarSign,
  Plus, Eye, MoreHorizontal, ChevronDown, ChevronRight,
  CheckCircle2,
} from "lucide-react"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Borrador", label: "Borrador" },
  { value: "Emitida", label: "Emitida" },
  { value: "Enviada", label: "Enviada" },
  { value: "Parcialmente_recibida", label: "Parcialmente recibida" },
  { value: "Recibida", label: "Recibida" },
  { value: "Cancelada", label: "Cancelada" },
]

export default function OrdenesCompraPage() {
  const { activeCompany } = useAuth()
  const { ordenes: backendOrdenes, error: backendError, create, enviar, recibir } = useOrdenesCompra()
  const { proveedores: backendProveedores } = useProveedores()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [provFilter, setProvFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [catalog, setCatalog] = useState<Array<{ id: string; code: string; name: string }>>([])

  // Detail
  const [detailOC, setDetailOC] = useState<OrdenCompraApiRow | null>(null)
  const [receiveOC, setReceiveOC] = useState<OrdenCompraApiRow | null>(null)

  const ordenes = backendOrdenes
  const proveedores = backendProveedores

  useEffect(() => {
    let cancelled = false
    if (!activeCompany?.id) {
      setCatalog([])
      return
    }
    void searchArticlesApi(activeCompany.id, "", 100).then(rows => {
      if (!cancelled) setCatalog(rows.map(row => ({ id: row.id, code: row.sku, name: row.description })))
    }).catch(() => {
      if (!cancelled) setCatalog([])
    })
    return () => { cancelled = true }
  }, [activeCompany?.id])

  const provFilterOptions = useMemo(() => [
    { value: "", label: "Todos los proveedores" },
    ...proveedores.map((p) => ({ value: p.id, label: p.name })),
  ], [proveedores])

  const filtered = useMemo(() => {
    let data = ordenes.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (oc) =>
          oc.id.toLowerCase().includes(q) ||
          oc.proveedorName.toLowerCase().includes(q) ||
          oc.items.some((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q))
      )
    }
    if (stateFilter) data = data.filter((oc) => oc.state === stateFilter)
    if (provFilter) data = data.filter((oc) => oc.proveedorId === provFilter)
    return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [ordenes, search, stateFilter, provFilter])

  const stats = useMemo(() => {
    const total = ordenes.length
    const emitidas = ordenes.filter((oc) => oc.state === "Emitida").length
    const enTransito = ordenes.filter((oc) => oc.state === "Enviada").length
    const recibidas = ordenes.filter((oc) => oc.state === "Recibida").length
    const monto = ordenes.reduce((sum, oc) => sum + Number(oc.total), 0)
    return { total, emitidas, enTransito, recibidas, monto }
  }, [ordenes])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }


  const handleMarcarEnviada = async (id: string) => { try { await enviar(id); toast.success("OC marcada como enviada") } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo enviar la OC") } }

  const handleRegistrarRecepcion = (ordenCompra: OrdenCompraApiRow) => {
    setReceiveOC(ordenCompra)
    setReceiveDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Órdenes de Compra</h1>
          <p className="text-sm text-muted-foreground">Gestión de órdenes de compra a proveedores</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" /> Nueva OC
        </Button>
      </div>

      {backendError && <p className="text-sm text-destructive">{backendError}</p>}
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard title="Total OC" value={stats.total} icon={FileText} />
        <StatsCard title="Emitidas" value={stats.emitidas} icon={Clock} />
        <StatsCard title="En tránsito" value={stats.enTransito} icon={Truck} />
        <StatsCard title="Recibidas" value={stats.recibidas} icon={CheckCircle2} />
        <StatsCard title="Monto total" value={formatCurrency(stats.monto)} icon={DollarSign} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="OC, proveedor, artículo..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={provFilter} onChange={setProvFilter} options={provFilterOptions} />
            {(stateFilter || provFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setProvFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} orden{filtered.length !== 1 ? "es" : ""} de compra</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Proveedor</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Items</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((oc) => {
                  const isExpanded = expandedRows.has(oc.id)
                  return (
                    <React.Fragment key={oc.id}>
                      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(oc.id)}>
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-primary">{oc.id}</td>
                        <td className="px-3 py-2.5">{oc.proveedorName}</td>
                        <td className="px-3 py-2.5 text-right">{oc.items.length}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(Number(oc.total))}</td>
                        <td className="px-3 py-2.5"><StateBadge status={oc.stateLabel} /></td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(oc.createdAt)}</td>
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
                                <DropdownMenuItem onClick={() => { setDetailOC(oc); setDetailDialogOpen(true) }}>
                                  <Eye className="size-4" /> Ver detalle
                                </DropdownMenuItem>
                                {oc.state === "Emitida" && (
                                  <DropdownMenuItem onClick={() => handleMarcarEnviada(oc.id)}>
                                    <Truck className="size-4" /> Marcar enviada
                                  </DropdownMenuItem>
                                )}
                                {(oc.state === "Enviada" || oc.state === "Parcialmente_recibida") && (
                                  <DropdownMenuItem onClick={() => handleRegistrarRecepcion(oc)}>
                                    <Package className="size-4" /> Registrar recepción
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="space-y-2">
                              <span className="text-xs font-medium text-muted-foreground">Items de la OC</span>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b">
                                    <th className="py-1.5 text-left font-medium text-muted-foreground">Artículo</th>
                                    <th className="py-1.5 text-left font-medium text-muted-foreground">Código</th>
                                    <th className="py-1.5 text-right font-medium text-muted-foreground">Cant.</th>
                                    <th className="py-1.5 text-right font-medium text-muted-foreground">Precio unit.</th>
                                    <th className="py-1.5 text-right font-medium text-muted-foreground">Subtotal</th>
                                    <th className="py-1.5 text-right font-medium text-muted-foreground">Recibido</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {oc.items.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                      <td className="py-1.5 flex items-center gap-1">
                                        {item.isArticuloZ && <Badge variant="outline" className="text-[8px] px-1 py-0">Z</Badge>}
                                        {item.name}
                                      </td>
                                      <td className="py-1.5 font-mono">{item.code}</td>
                                      <td className="py-1.5 text-right">{item.quantity}</td>
                                      <td className="py-1.5 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                                      <td className="py-1.5 text-right font-medium">{formatCurrency(Number(item.subtotal))}</td>
                                      <td className="py-1.5 text-right">
                                        <span className={Number(item.received) >= Number(item.quantity) ? "text-emerald-600" : Number(item.received) > 0 ? "text-amber-600" : "text-muted-foreground"}>
                                          {item.received}/{item.quantity}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron órdenes de compra
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalle de Orden de Compra</DialogTitle>
            <DialogDescription>{detailOC?.id} — {detailOC?.proveedorName}</DialogDescription>
          </DialogHeader>
          {detailOC && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Proveedor:</span><p className="font-medium">{detailOC.proveedorName}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={detailOC.stateLabel} /></p></div>
                <div><span className="text-muted-foreground">Fecha creación:</span><p>{formatDate(detailOC.createdAt)}</p></div>
                <div><span className="text-muted-foreground">Fecha envío:</span><p>{detailOC.enviadaAt ? formatDate(detailOC.enviadaAt) : "—"}</p></div>
                <div><span className="text-muted-foreground">Fecha recepción:</span><p>{detailOC.recibidaAt ? formatDate(detailOC.recibidaAt) : "—"}</p></div>
                <div><span className="text-muted-foreground">Total:</span><p className="font-bold text-lg">{formatCurrency(Number(detailOC.total))}</p></div>
              </div>
              {detailOC.observaciones && (
                <div className="border rounded-lg p-3 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Observaciones</span>
                  <p className="mt-1">{detailOC.observaciones}</p>
                </div>
              )}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Items ({detailOC.items.length})</span>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Artículo</th>
                        <th className="px-3 py-2 text-right font-medium">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium">Precio</th>
                        <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                        <th className="px-3 py-2 text-right font-medium">Recibido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOC.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {item.isArticuloZ && <Badge variant="outline" className="text-[8px] px-1 py-0">Z</Badge>}
                              {item.name}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(item.subtotal))}</td>
                          <td className="px-3 py-2 text-right">{item.received}/{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {detailOC.necesidadCompraIds.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Necesidades vinculadas: {detailOC.necesidadCompraIds.join(", ")}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateOrdenCompraDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} proveedores={proveedores} catalog={catalog} onSubmit={async payload => { await create(payload); toast.success("Orden de compra creada") }} />
      <ReceiveOrdenCompraDialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen} ordenCompra={receiveOC} onSubmit={async payload => { if (!receiveOC) return; await recibir(receiveOC.id, payload); toast.success("Recepción registrada") }} />
      <SurgeryDrawer />
    </div>
  )
}

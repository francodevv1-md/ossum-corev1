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
  ArrowRightLeft, CheckCircle2, Clock, Package,
  MoreHorizontal, Eye, FileText, ChevronDown, ChevronRight,
} from "lucide-react"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Recibido", label: "Recibido" },
  { value: "Verificado", label: "Verificado" },
]

export default function MovimientosPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [provFilter, setProvFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailMov, setDetailMov] = useState<typeof store.movimientosCompra[0] | null>(null)
  const [ocDialogOpen, setOcDialogOpen] = useState(false)
  const [ocDetail, setOcDetail] = useState<typeof store.ordenesCompra[0] | null>(null)

  const movimientos = store.movimientosCompra
  const proveedores = store.proveedores.filter((p) => p.active)

  const provFilterOptions = useMemo(() => [
    { value: "", label: "Todos los proveedores" },
    ...proveedores.map((p) => ({ value: p.id, label: p.name })),
  ], [proveedores])

  const filtered = useMemo(() => {
    let data = movimientos.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.proveedorName.toLowerCase().includes(q) ||
          m.ordenCompraId.toLowerCase().includes(q) ||
          (m.remitoEntrada && m.remitoEntrada.toLowerCase().includes(q))
      )
    }
    if (stateFilter) data = data.filter((m) => m.state === stateFilter)
    if (provFilter) data = data.filter((m) => m.proveedorId === provFilter)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [movimientos, search, stateFilter, provFilter])

  const stats = useMemo(() => {
    const total = movimientos.length
    const verificados = movimientos.filter((m) => m.state === "Verificado").length
    const recibidos = movimientos.filter((m) => m.state === "Recibido").length
    const pendientes = movimientos.filter((m) => m.state === "Pendiente").length
    return { total, verificados, recibidos, pendientes }
  }, [movimientos])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleVerOC = (ocId: string) => {
    const oc = store.ordenesCompra.find((o) => o.id === ocId)
    if (oc) {
      setOcDetail(oc)
      setOcDialogOpen(true)
    } else {
      toast.info("OC no encontrada")
    }
  }

  const handleVerificar = (id: string) => {
    useOrtoTrackStore.setState({
      movimientosCompra: movimientos.map((m) =>
        m.id === id ? { ...m, state: "Verificado" as const } : m
      ),
    })
    toast.success(`Movimiento ${id} verificado`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Movimientos de Compra</h1>
          <p className="text-sm text-muted-foreground">Recepciones y verificaciones de mercadería</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={ArrowRightLeft} />
        <StatsCard title="Verificados" value={stats.verificados} icon={CheckCircle2} />
        <StatsCard title="Recibidos" value={stats.recibidos} icon={Package} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Proveedor, OC, remito..." className="w-full sm:w-72" />
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
            <span className="text-sm text-muted-foreground">{filtered.length} movimiento{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">OC</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Proveedor</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Remito</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((mov) => {
                  const isExpanded = expandedRows.has(mov.id)
                  return (
                    <React.Fragment key={mov.id}>
                      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(mov.id)}>
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-primary">{mov.id}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{mov.ordenCompraId}</td>
                        <td className="px-3 py-2.5">{mov.proveedorName}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{mov.remitoEntrada || "—"}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(mov.total)}</td>
                        <td className="px-3 py-2.5"><StateBadge status={mov.state} /></td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(mov.date)}</td>
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
                                <DropdownMenuItem onClick={() => { setDetailMov(mov); setDetailDialogOpen(true) }}>
                                  <Eye className="size-4" /> Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleVerOC(mov.ordenCompraId)}>
                                  <FileText className="size-4" /> Ver OC
                                </DropdownMenuItem>
                                {mov.state === "Recibido" && (
                                  <DropdownMenuItem onClick={() => handleVerificar(mov.id)}>
                                    <CheckCircle2 className="size-4" /> Verificar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={9} className="px-6 py-3">
                            <div className="space-y-2">
                              <span className="text-xs font-medium text-muted-foreground">Items del movimiento</span>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b">
                                    <th className="py-1.5 text-left font-medium text-muted-foreground">Artículo</th>
                                    <th className="py-1.5 text-left font-medium text-muted-foreground">Código</th>
                                    <th className="py-1.5 text-right font-medium text-muted-foreground">Cantidad</th>
                                    <th className="py-1.5 text-right font-medium text-muted-foreground">Precio unit.</th>
                                    <th className="py-1.5 text-right font-medium text-muted-foreground">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mov.items.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                      <td className="py-1.5">{item.name}</td>
                                      <td className="py-1.5 font-mono">{item.code}</td>
                                      <td className="py-1.5 text-right">{item.quantity}</td>
                                      <td className="py-1.5 text-right">{formatCurrency(item.unitPrice)}</td>
                                      <td className="py-1.5 text-right font-medium">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="font-medium">
                                    <td colSpan={4} className="py-1.5 text-right">Total:</td>
                                    <td className="py-1.5 text-right">{formatCurrency(mov.total)}</td>
                                  </tr>
                                </tfoot>
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
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron movimientos
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Movimiento</DialogTitle>
            <DialogDescription>{detailMov?.id}</DialogDescription>
          </DialogHeader>
          {detailMov && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">OC:</span><p className="font-mono">{detailMov.ordenCompraId}</p></div>
                <div><span className="text-muted-foreground">Proveedor:</span><p className="font-medium">{detailMov.proveedorName}</p></div>
                <div><span className="text-muted-foreground">Remito:</span><p className="font-mono">{detailMov.remitoEntrada || "—"}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={detailMov.state} /></p></div>
                <div><span className="text-muted-foreground">Fecha:</span><p>{formatDate(detailMov.date)}</p></div>
                <div><span className="text-muted-foreground">Total:</span><p className="font-bold text-lg">{formatCurrency(detailMov.total)}</p></div>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Items ({detailMov.items.length})</span>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Artículo</th>
                        <th className="px-3 py-2 text-right font-medium">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium">Precio</th>
                        <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailMov.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.unitPrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── OC Detail Dialog ── */}
      <Dialog open={ocDialogOpen} onOpenChange={setOcDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de OC</DialogTitle>
            <DialogDescription>{ocDetail?.id} — {ocDetail?.proveedorName}</DialogDescription>
          </DialogHeader>
          {ocDetail && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={ocDetail.state} /></p></div>
                <div><span className="text-muted-foreground">Total:</span><p className="font-bold">{formatCurrency(ocDetail.total)}</p></div>
                <div><span className="text-muted-foreground">Fecha creación:</span><p>{formatDate(ocDetail.createdAt)}</p></div>
                <div><span className="text-muted-foreground">Items:</span><p>{ocDetail.items.length}</p></div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Artículo</th>
                      <th className="px-3 py-2 text-right font-medium">Cant.</th>
                      <th className="px-3 py-2 text-right font-medium">Recibido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocDetail.items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{item.received}/{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOcDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

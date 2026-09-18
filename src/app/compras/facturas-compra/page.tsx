"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
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
import { useRouter } from "next/navigation"
import {
  Receipt, Clock, CheckCircle2, DollarSign,
  Eye, MoreHorizontal, FileText, CreditCard,
  ChevronDown, ChevronRight, Sparkles,
} from "lucide-react"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Pagada", label: "Pagada" },
  { value: "Anulada", label: "Anulada" },
]

export default function FacturasCompraPage() {
  const store = useOrtoTrackStore()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [provFilter, setProvFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailFC, setDetailFC] = useState<typeof store.facturasCompra[0] | null>(null)
  const [ocDialogOpen, setOcDialogOpen] = useState(false)
  const [ocDetail, setOcDetail] = useState<typeof store.ordenesCompra[0] | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payFCId, setPayFCId] = useState("")

  const facturas = store.facturasCompra
  const proveedores = store.proveedores.filter((p) => p.active)

  const provFilterOptions = useMemo(() => [
    { value: "", label: "Todos los proveedores" },
    ...proveedores.map((p) => ({ value: p.id, label: p.name })),
  ], [proveedores])

  const filtered = useMemo(() => {
    let data = facturas.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (fc) =>
          fc.id.toLowerCase().includes(q) ||
          fc.proveedorName.toLowerCase().includes(q) ||
          fc.number.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((fc) => fc.state === stateFilter)
    if (provFilter) data = data.filter((fc) => fc.proveedorId === provFilter)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [facturas, search, stateFilter, provFilter])

  const stats = useMemo(() => {
    const total = facturas.length
    const pendientes = facturas.filter((fc) => fc.state === "Pendiente").length
    const pagadas = facturas.filter((fc) => fc.state === "Pagada").length
    const monto = facturas.reduce((sum, fc) => sum + fc.total, 0)
    return { total, pendientes, pagadas, monto }
  }, [facturas])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleVerOC = (ocId: string | undefined) => {
    if (!ocId) {
      toast.info("Sin OC vinculada")
      return
    }
    const oc = store.ordenesCompra.find((o) => o.id === ocId)
    if (oc) {
      setOcDetail(oc)
      setOcDialogOpen(true)
    } else {
      toast.info("OC no encontrada")
    }
  }

  const handleRegistrarPago = (fcId: string) => {
    setPayFCId(fcId)
    setPayDialogOpen(true)
  }

  const confirmPago = () => {
    const updatedFacturas = facturas.map((f) =>
      f.id === payFCId ? { ...f, state: "Pagada" as const } : f
    )
    useOrtoTrackStore.setState({ facturasCompra: updatedFacturas })
    const fc = updatedFacturas.find((f) => f.id === payFCId)
    if (!fc) return

    // Also create an orden de pago
    store.createOrdenPago({
      proveedorId: fc.proveedorId,
      proveedorName: fc.proveedorName,
      facturaCompraId: fc.id,
      importe: fc.total,
      vencimiento: new Date().toISOString().split("T")[0],
      state: "Pagada",
      medioPago: "Transferencia",
      fechaPago: new Date().toISOString().split("T")[0],
    })

    toast.success("Pago registrado y factura marcada como pagada")
    setPayDialogOpen(false)
    setPayFCId("")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Facturas de Compra</h1>
          <p className="text-sm text-muted-foreground">Facturas recibidas de proveedores</p>
        </div>
        <Button onClick={() => router.push("/compras/facturas-compra/nueva")} className="gap-2">
          <Sparkles className="size-4" />
          Cargar comprobante
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Receipt} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
        <StatsCard title="Pagadas" value={stats.pagadas} icon={CheckCircle2} />
        <StatsCard title="Monto total" value={formatCurrency(stats.monto)} icon={DollarSign} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Número, proveedor..." className="w-full sm:w-72" />
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
            <span className="text-sm text-muted-foreground">{filtered.length} factura{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Número</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Proveedor</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">OC</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fc) => {
                  const isExpanded = expandedRows.has(fc.id)
                  return (
                    <React.Fragment key={fc.id}>
                      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(fc.id)}>
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-medium">{fc.number}</td>
                        <td className="px-3 py-2.5">{fc.proveedorName}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(fc.total)}</td>
                        <td className="px-3 py-2.5"><StateBadge status={fc.state} /></td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(fc.date)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{fc.ordenCompraId || "—"}</td>
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
                                <DropdownMenuItem onClick={() => { setDetailFC(fc); setDetailDialogOpen(true) }}>
                                  <Eye className="size-4" /> Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleVerOC(fc.ordenCompraId)}>
                                  <FileText className="size-4" /> Ver OC
                                </DropdownMenuItem>
                                {fc.state === "Pendiente" && (
                                  <DropdownMenuItem onClick={() => handleRegistrarPago(fc.id)}>
                                    <CreditCard className="size-4" /> Registrar pago
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
                              <span className="text-xs font-medium text-muted-foreground">Items de la factura</span>
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
                                  {fc.items.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                      <td className="py-1.5">{item.name}</td>
                                      <td className="py-1.5 font-mono">{item.code}</td>
                                      <td className="py-1.5 text-right">{item.quantity}</td>
                                      <td className="py-1.5 text-right">{formatCurrency(item.unitPrice)}</td>
                                      <td className="py-1.5 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="font-medium">
                                    <td colSpan={4} className="py-1.5 text-right">Total:</td>
                                    <td className="py-1.5 text-right">{formatCurrency(fc.total)}</td>
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
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron facturas de compra
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
            <DialogTitle>Detalle de Factura</DialogTitle>
            <DialogDescription>{detailFC?.number}</DialogDescription>
          </DialogHeader>
          {detailFC && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Número:</span><p className="font-mono font-medium">{detailFC.number}</p></div>
                <div><span className="text-muted-foreground">Proveedor:</span><p className="font-medium">{detailFC.proveedorName}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={detailFC.state} /></p></div>
                <div><span className="text-muted-foreground">Fecha:</span><p>{formatDate(detailFC.date)}</p></div>
                <div><span className="text-muted-foreground">OC vinculada:</span><p className="font-mono">{detailFC.ordenCompraId || "—"}</p></div>
                <div><span className="text-muted-foreground">Total:</span><p className="font-bold text-lg">{formatCurrency(detailFC.total)}</p></div>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Items ({detailFC.items.length})</span>
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
                      {detailFC.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
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
                      <th className="px-3 py-2 text-right font-medium">Precio</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocDetail.items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
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

      {/* ── Register Payment Dialog ── */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>Confirmar pago de la factura</DialogDescription>
          </DialogHeader>
          {payFCId && (() => {
            const fc = facturas.find((f) => f.id === payFCId)
            return fc ? (
              <div className="py-4 space-y-2 text-sm">
                <div className="border rounded-lg p-3 space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Factura:</span><span className="font-mono font-medium">{fc.number}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Proveedor:</span><span>{fc.proveedorName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Monto:</span><span className="font-bold text-lg">{formatCurrency(fc.total)}</span></div>
                </div>
                <p className="text-xs text-muted-foreground">Se creará una orden de pago y se marcará la factura como pagada.</p>
              </div>
            ) : null
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmPago} className="bg-emerald-600 hover:bg-emerald-700">
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  ExpiryBadge, SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { toast } from "sonner"
import {
  Package, AlertTriangle, XCircle, Search,
  Eye, MoreHorizontal, ArrowRightLeft, History,
  Warehouse, Boxes, ShieldCheck,
} from "lucide-react"
import type { StockItem } from "@/types"

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas las categorías" },
  { value: "Implantes", label: "Implantes" },
  { value: "Instrumental", label: "Instrumental" },
  { value: "Descartable", label: "Descartable" },
  { value: "Insumos", label: "Insumos" },
]

const SECTION_OPTIONS = [
  { value: "", label: "Todas las secciones" },
  { value: "Traumatología", label: "Traumatología" },
  { value: "Artroscopía", label: "Artroscopía" },
  { value: "Columna", label: "Columna" },
  { value: "General", label: "General" },
]

const DEPOSIT_OPTIONS = [
  { value: "", label: "Todos los depósitos" },
  { value: "Depósito Central", label: "Depósito Central" },
  { value: "Depósito Quirúrgico", label: "Depósito Quirúrgico" },
  { value: "Depósito Logística", label: "Depósito Logística" },
]

export default function StockPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [sectionFilter, setSectionFilter] = useState("")
  const [depositFilter, setDepositFilter] = useState("")

  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [movementsDialogOpen, setMovementsDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustReason, setAdjustReason] = useState("")

  const stock = store.stock

  const filtered = useMemo(() => {
    let data = stock.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          s.lot.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) data = data.filter((s) => s.category === categoryFilter)
    if (sectionFilter) data = data.filter((s) => s.section === sectionFilter)
    if (depositFilter) data = data.filter((s) => s.deposit === depositFilter)
    return data.sort((a, b) => a.name.localeCompare(b.name))
  }, [stock, search, categoryFilter, sectionFilter, depositFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const bajoMinimo = filtered.filter((s) => s.quantity > 0 && s.quantity <= s.minStock).length
    const sinStock = filtered.filter((s) => s.quantity === 0).length
    return { total, bajoMinimo, sinStock }
  }, [filtered])

  const handleAdjust = () => {
    if (!selectedItem) return
    toast.success(`Stock ajustado: ${selectedItem.name} → ${adjustQty}`)
    setAdjustDialogOpen(false)
    setAdjustQty(0)
    setAdjustReason("")
    setSelectedItem(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Stock</h1>
          <p className="text-sm text-muted-foreground">Inventario de artículos y materiales</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard title="Total artículos" value={stats.total} icon={Package} />
        <StatsCard title="Bajo mínimo" value={stats.bajoMinimo} icon={AlertTriangle} />
        <StatsCard title="Sin stock" value={stats.sinStock} icon={XCircle} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Nombre, código, marca, lote..." className="w-full sm:w-72" />
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
            <FilterSelect value={sectionFilter} onChange={setSectionFilter} options={SECTION_OPTIONS} />
            <FilterSelect value={depositFilter} onChange={setDepositFilter} options={DEPOSIT_OPTIONS} />
            {(categoryFilter || sectionFilter || depositFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setCategoryFilter(""); setSectionFilter(""); setDepositFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} artículo{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Código</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nombre</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Categoría</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Marca</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Lote</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Vencimiento</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Cantidad</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Mín</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Depósito</th>
                  <th className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">Esterilizado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Precio</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs">{item.code}</td>
                    <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{item.name}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{item.brand}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.lot}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{formatDate(item.expiry)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={item.quantity === 0 ? "font-bold text-destructive" : item.quantity <= item.minStock ? "font-bold text-amber-600" : "font-medium"}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{item.minStock}</td>
                    <td className="px-3 py-2.5 text-xs">{item.deposit}</td>
                    <td className="px-3 py-2.5 text-center">
                      {item.sterilized ? (
                        <Badge variant="success" className="text-[10px]">Sí</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">No</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(item.unitPrice)}</td>
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
                            <DropdownMenuItem onClick={() => { setSelectedItem(item); setDetailDialogOpen(true) }}>
                              <Eye className="size-4" /> Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedItem(item); setAdjustQty(item.quantity); setAdjustDialogOpen(true) }}>
                              <ArrowRightLeft className="size-4" /> Ajustar stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedItem(item); setMovementsDialogOpen(true) }}>
                              <History className="size-4" /> Ver movimientos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron artículos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Artículo</DialogTitle>
            <DialogDescription>{selectedItem?.code} — {selectedItem?.name}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Código:</span><p className="font-mono">{selectedItem.code}</p></div>
                <div><span className="text-muted-foreground">Categoría:</span><p><Badge variant="outline" className="text-[10px]">{selectedItem.category}</Badge></p></div>
                <div><span className="text-muted-foreground">Sección:</span><p>{selectedItem.section}</p></div>
                <div><span className="text-muted-foreground">Rubro:</span><p>{selectedItem.rubro}</p></div>
                <div><span className="text-muted-foreground">Marca:</span><p>{selectedItem.brand}</p></div>
                <div><span className="text-muted-foreground">Proveedor:</span><p>{selectedItem.supplier}</p></div>
                <div><span className="text-muted-foreground">Lote:</span><p className="font-mono">{selectedItem.lot}</p></div>
                <div><span className="text-muted-foreground">Vencimiento:</span><p>{formatDate(selectedItem.expiry)}</p></div>
                <div><span className="text-muted-foreground">Cantidad:</span><p className="font-bold">{selectedItem.quantity}</p></div>
                <div><span className="text-muted-foreground">Stock mínimo:</span><p>{selectedItem.minStock}</p></div>
                <div><span className="text-muted-foreground">Depósito:</span><p>{selectedItem.deposit}</p></div>
                <div><span className="text-muted-foreground">Ubicación:</span><p>{selectedItem.location}</p></div>
                <div><span className="text-muted-foreground">Esterilizado:</span><p>{selectedItem.sterilized ? "Sí" : "No"}</p></div>
                <div><span className="text-muted-foreground">Precio:</span><p className="font-bold">{formatCurrency(selectedItem.unitPrice)}</p></div>
              </div>
              {selectedItem.description && (
                <div><span className="text-muted-foreground">Descripción:</span><p className="mt-1">{selectedItem.description}</p></div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
            <DialogDescription>{selectedItem?.code} — {selectedItem?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Stock actual</Label>
              <p className="text-lg font-bold">{selectedItem?.quantity}</p>
            </div>
            <div className="space-y-2">
              <Label>Nueva cantidad *</Label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <Label>Motivo del ajuste</Label>
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Conteo físico, daño, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdjust}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movements Dialog */}
      <Dialog open={movementsDialogOpen} onOpenChange={setMovementsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Movimientos de Stock</DialogTitle>
            <DialogDescription>{selectedItem?.code} — {selectedItem?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {(() => {
              const movements = store.stockMovements.filter((m) => m.stockItemId === selectedItem?.id)
              if (movements.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos registrados</p>
              }
              return (
                <div className="space-y-3">
                  {movements.sort((a, b) => b.date.localeCompare(a.date)).map((m) => (
                    <div key={m.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{m.type}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(m.date)} — {m.userName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={m.quantity > 0 ? "text-emerald-600 font-bold" : "text-destructive font-bold"}>
                          {m.quantity > 0 ? "+" : ""}{m.quantity}
                        </span>
                        <StateBadge status={m.type} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

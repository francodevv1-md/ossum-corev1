"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
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
import { toast } from "sonner"
import {
  CalendarClock, XCircle, AlertTriangle, CheckCircle2,
  Eye, MoreHorizontal,
} from "lucide-react"
import type { ExpiryItem } from "@/types"

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Vencido", label: "Vencido" },
  { value: "Próximo a vencer", label: "Próximo a vencer" },
  { value: "Correcto", label: "Correcto" },
]

const SECTION_OPTIONS = [
  { value: "", label: "Todas las secciones" },
  { value: "Traumatología", label: "Traumatología" },
  { value: "Artroscopía", label: "Artroscopía" },
  { value: "Columna", label: "Columna" },
  { value: "General", label: "General" },
]

const RUBRO_OPTIONS = [
  { value: "", label: "Todos los rubros" },
  { value: "Implantes", label: "Implantes" },
  { value: "Instrumental", label: "Instrumental" },
  { value: "Descartable", label: "Descartable" },
  { value: "Insumos", label: "Insumos" },
]

export default function VencimientosPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sectionFilter, setSectionFilter] = useState("")
  const [rubroFilter, setRubroFilter] = useState("")

  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ExpiryItem | null>(null)

  const expirations = store.expirations

  const filtered = useMemo(() => {
    let data = expirations.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (e) =>
          e.articleName.toLowerCase().includes(q) ||
          e.articleCode.toLowerCase().includes(q) ||
          e.lot.toLowerCase().includes(q) ||
          e.brand.toLowerCase().includes(q)
      )
    }
    if (statusFilter) data = data.filter((e) => e.status === statusFilter)
    if (sectionFilter) data = data.filter((e) => e.section === sectionFilter)
    if (rubroFilter) data = data.filter((e) => e.rubro === rubroFilter)
    // Sort: Vencido first, then Próximo, then Correcto
    const statusOrder: Record<string, number> = { "Vencido": 0, "Próximo a vencer": 1, "Correcto": 2 }
    return data.sort((a, b) => {
      const diff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
      if (diff !== 0) return diff
      return a.expiry.localeCompare(b.expiry)
    })
  }, [expirations, search, statusFilter, sectionFilter, rubroFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const vencidos = filtered.filter((e) => e.status === "Vencido").length
    const proximos = filtered.filter((e) => e.status === "Próximo a vencer").length
    const correctos = filtered.filter((e) => e.status === "Correcto").length
    return { total, vencidos, proximos, correctos }
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Vencimientos</h1>
          <p className="text-sm text-muted-foreground">Control de vencimientos de stock</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={CalendarClock} />
        <StatsCard title="Vencidos" value={stats.vencidos} icon={XCircle} />
        <StatsCard title="Próximos" value={stats.proximos} icon={AlertTriangle} />
        <StatsCard title="Correctos" value={stats.correctos} icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Artículo, código, lote, marca..." className="w-full sm:w-72" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
            <FilterSelect value={sectionFilter} onChange={setSectionFilter} options={SECTION_OPTIONS} />
            <FilterSelect value={rubroFilter} onChange={setRubroFilter} options={RUBRO_OPTIONS} />
            {(statusFilter || sectionFilter || rubroFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStatusFilter(""); setSectionFilter(""); setRubroFilter("") }}>
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
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Código</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Lote</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Sección</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Rubro</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Marca</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Vencimiento</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Cantidad</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Depósito</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium max-w-[180px] truncate">{item.articleName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.articleCode}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.lot}</td>
                    <td className="px-3 py-2.5 text-xs">{item.section}</td>
                    <td className="px-3 py-2.5 text-xs">{item.rubro}</td>
                    <td className="px-3 py-2.5 text-xs">{item.brand}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{formatDate(item.expiry)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-xs">{item.deposit}</td>
                    <td className="px-3 py-2.5"><ExpiryBadge status={item.status} /></td>
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron artículos con vencimiento
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
            <DialogTitle>Detalle de Vencimiento</DialogTitle>
            <DialogDescription>{selectedItem?.articleCode} — {selectedItem?.articleName}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Código:</span><p className="font-mono">{selectedItem.articleCode}</p></div>
                <div><span className="text-muted-foreground">Lote:</span><p className="font-mono">{selectedItem.lot}</p></div>
                <div><span className="text-muted-foreground">Sección:</span><p>{selectedItem.section}</p></div>
                <div><span className="text-muted-foreground">Rubro:</span><p>{selectedItem.rubro}</p></div>
                <div><span className="text-muted-foreground">Departamento:</span><p>{selectedItem.department}</p></div>
                <div><span className="text-muted-foreground">Marca:</span><p>{selectedItem.brand}</p></div>
                <div><span className="text-muted-foreground">Proveedor:</span><p>{selectedItem.supplier}</p></div>
                <div><span className="text-muted-foreground">Depósito:</span><p>{selectedItem.deposit}</p></div>
                <div><span className="text-muted-foreground">Cantidad:</span><p className="font-bold">{selectedItem.quantity}</p></div>
                <div><span className="text-muted-foreground">Vencimiento:</span><p className="font-bold">{formatDate(selectedItem.expiry)}</p></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Estado:</span>
                  <div className="mt-1"><ExpiryBadge status={selectedItem.status} /></div>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Comprobante de ingreso:</span>
                  <p className="font-mono text-xs">{selectedItem.ingresoComprobante}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

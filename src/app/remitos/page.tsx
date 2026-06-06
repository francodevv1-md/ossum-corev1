"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
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
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  FileText, Truck, RotateCcw, ShieldCheck,
  Eye, MoreHorizontal, FolderOpen, ArrowLeftRight,
} from "lucide-react"
import type { Remito } from "@/types"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Enviado", label: "Enviado" },
  { value: "Retirado", label: "Retirado" },
  { value: "Devuelto", label: "Devuelto" },
  { value: "Controlado", label: "Controlado" },
  { value: "Sin preparar", label: "Sin preparar" },
  { value: "Preparado", label: "Preparado" },
  { value: "Congelado", label: "Congelado" },
]

export default function RemitosPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")

  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [devolverDialogOpen, setDevolverDialogOpen] = useState(false)
  const [selectedRemito, setSelectedRemito] = useState<Remito | null>(null)
  const [returnItems, setReturnItems] = useState<Record<string, number>>({})

  const remitos = store.remitos

  const filtered = useMemo(() => {
    let data = remitos.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q) ||
          r.surgeryId.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((r) => r.state === stateFilter)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [remitos, search, stateFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const enviados = filtered.filter((r) => r.state === "Enviado" || r.state === "Retirado").length
    const devueltos = filtered.filter((r) => r.state === "Devuelto").length
    const controlados = filtered.filter((r) => r.state === "Controlado").length
    return { total, enviados, devueltos, controlados }
  }, [filtered])

  const openDevolver = (r: Remito) => {
    setSelectedRemito(r)
    const init: Record<string, number> = {}
    r.items.forEach((item) => { init[item.stockItemId] = 0 })
    setReturnItems(init)
    setDevolverDialogOpen(true)
  }

  const handleDevolver = () => {
    if (!selectedRemito) return
    store.devolverRemito(
      selectedRemito.id,
      Object.entries(returnItems)
        .filter(([, qty]) => qty > 0)
        .map(([stockItemId, returnedQuantity]) => ({ stockItemId, returnedQuantity }))
    )
    toast.success(`Remito ${selectedRemito.id} devuelto`)
    setDevolverDialogOpen(false)
    setSelectedRemito(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Remitos</h1>
          <p className="text-sm text-muted-foreground">Notas de remisión y envíos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={FileText} />
        <StatsCard title="Enviados" value={stats.enviados} icon={Truck} />
        <StatsCard title="Devueltos" value={stats.devueltos} icon={RotateCcw} />
        <StatsCard title="Controlados" value={stats.controlados} icon={ShieldCheck} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="ID, destino, cirugía..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            {(stateFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} remito{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Destino</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Items</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const surgery = store.getSurgeryById(r.surgeryId)
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs font-medium">{r.id}</td>
                      <td className="px-3 py-2.5">
                        {surgery ? (
                          <span className="text-xs text-primary cursor-pointer hover:underline" onClick={() => openExpediente(surgery.id)}>
                            {surgery.id} — {surgery.patient}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{r.surgeryId}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.destination || "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">{formatDate(r.date)}</td>
                      <td className="px-3 py-2.5"><StateBadge status={r.state} /></td>
                      <td className="px-3 py-2.5 text-right text-xs">{r.items.length}</td>
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
                              <DropdownMenuItem onClick={() => { setSelectedRemito(r); setDetailDialogOpen(true) }}>
                                <Eye className="size-4" /> Ver detalle
                              </DropdownMenuItem>
                              {(r.state === "Enviado" || r.state === "Retirado") && (
                                <DropdownMenuItem onClick={() => openDevolver(r)}>
                                  <ArrowLeftRight className="size-4" /> Devolver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openExpediente(r.surgeryId)}>
                                <FolderOpen className="size-4" /> Ver cirugía
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron remitos
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalle de Remito</DialogTitle>
            <DialogDescription>{selectedRemito?.id} — Destino: {selectedRemito?.destination || "N/A"}</DialogDescription>
          </DialogHeader>
          {selectedRemito && (
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-muted-foreground">Cirugía:</span><p className="font-medium">{selectedRemito.surgeryId}</p></div>
                <div><span className="text-muted-foreground">Caja:</span><p className="font-medium">{selectedRemito.boxId}</p></div>
                <div><span className="text-muted-foreground">Fecha:</span><p>{formatDate(selectedRemito.date)}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={selectedRemito.state} /></p></div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Enviado</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Devuelto</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Consumido</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRemito.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-right">{item.sentQuantity}</td>
                      <td className="px-3 py-2 text-right">{item.returnedQuantity}</td>
                      <td className="px-3 py-2 text-right">{item.consumedQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Devolver Dialog */}
      <Dialog open={devolverDialogOpen} onOpenChange={setDevolverDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Devolver Remito</DialogTitle>
            <DialogDescription>{selectedRemito?.id} — Ingrese cantidades devueltas</DialogDescription>
          </DialogHeader>
          {selectedRemito && (
            <div className="py-4 max-h-[60vh] overflow-y-auto space-y-3">
              {selectedRemito.items.map((item) => (
                <div key={item.stockItemId} className="flex items-center gap-3 border rounded-lg p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Enviado: {item.sentQuantity} | Consumido: {item.consumedQuantity}</p>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Devolver</Label>
                    <Input
                      type="number"
                      min={0}
                      max={item.sentQuantity - item.consumedQuantity}
                      value={returnItems[item.stockItemId] || 0}
                      onChange={(e) => setReturnItems((prev) => ({ ...prev, [item.stockItemId]: Number(e.target.value) }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevolverDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleDevolver}>Confirmar Devolución</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

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
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  Box, PackageCheck, Truck, RotateCcw,
  Eye, MoreHorizontal, FolderOpen, ListChecks,
} from "lucide-react"
import type { Box as BoxType } from "@/types"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Sin preparar", label: "Sin preparar" },
  { value: "Preparado", label: "Preparado" },
  { value: "Enviado", label: "Enviado" },
  { value: "Retirado", label: "Retirado" },
  { value: "Devuelto", label: "Devuelto" },
  { value: "Controlado", label: "Controlado" },
  { value: "Congelado", label: "Congelado" },
  { value: "Congelado con faltantes", label: "Congelado con faltantes" },
]

const TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "Instrumental", label: "Instrumental" },
  { value: "Implantes", label: "Implantes" },
  { value: "Descartable", label: "Descartable" },
  { value: "Mixta", label: "Mixta" },
]

export default function CajasPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")

  const [contentDialogOpen, setContentDialogOpen] = useState(false)
  const [selectedBox, setSelectedBox] = useState<BoxType | null>(null)

  const boxes = store.boxes

  const filtered = useMemo(() => {
    let data = boxes.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q) ||
          b.type.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((b) => b.state === stateFilter)
    if (typeFilter) data = data.filter((b) => b.type === typeFilter)
    return data
  }, [boxes, search, stateFilter, typeFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const preparadas = filtered.filter((b) => b.state === "Preparado" || b.state === "Congelado" || b.state === "Congelado con faltantes").length
    const enviadas = filtered.filter((b) => b.state === "Enviado" || b.state === "Retirado").length
    const devueltas = filtered.filter((b) => b.state === "Devuelto" || b.state === "Controlado").length
    return { total, preparadas, enviadas, devueltas }
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Cajas</h1>
          <p className="text-sm text-muted-foreground">Gestión de cajas quirúrgicas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Box} />
        <StatsCard title="Preparadas" value={stats.preparadas} icon={PackageCheck} />
        <StatsCard title="Enviadas" value={stats.enviadas} icon={Truck} />
        <StatsCard title="Devueltas" value={stats.devueltas} icon={RotateCcw} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="ID, nombre, tipo..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            {(stateFilter || typeFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setTypeFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} caja{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nombre</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Contenidos</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Preparada</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Enviada</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((box) => {
                  const surgery = box.surgeryId ? store.getSurgeryById(box.surgeryId) : undefined
                  return (
                    <tr key={box.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs font-medium">{box.id}</td>
                      <td className="px-3 py-2.5 font-medium">{box.name}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{box.type}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {surgery ? (
                          <span className="text-xs text-primary cursor-pointer hover:underline" onClick={() => openExpediente(surgery.id)}>
                            {surgery.id} — {surgery.patient}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StateBadge status={box.state} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">{box.contents.length} items</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">{box.preparedAt ? formatDate(box.preparedAt) : "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">{box.sentAt ? formatDate(box.sentAt) : "—"}</td>
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
                              <DropdownMenuItem onClick={() => { setSelectedBox(box); setContentDialogOpen(true) }}>
                                <ListChecks className="size-4" /> Ver contenido
                              </DropdownMenuItem>
                              {box.surgeryId && (
                                <DropdownMenuItem onClick={() => openExpediente(box.surgeryId!)}>
                                  <FolderOpen className="size-4" /> Ver cirugía
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron cajas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Content Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Contenido de Caja</DialogTitle>
            <DialogDescription>{selectedBox?.id} — {selectedBox?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {selectedBox && selectedBox.contents.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Consumido</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Devuelto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBox.contents.map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 text-right font-medium">{c.quantity}</td>
                      <td className="px-3 py-2 text-right text-xs">{c.consumed}</td>
                      <td className="px-3 py-2 text-right text-xs">{c.returned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Caja vacía</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

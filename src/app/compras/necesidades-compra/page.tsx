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
import { Checkbox } from "@/components/ui/checkbox"
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
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  ShoppingCart, Clock, AlertTriangle, Plus, Eye,
  MoreHorizontal, FolderOpen, ArrowRightLeft, RefreshCw,
  Package, Zap,
} from "lucide-react"
import type { NecesidadCompraPriority, NecesidadCompraOrigin, NecesidadCompraState } from "@/types"

// ── Priority badge helper ──
function PriorityBadge({ priority }: { priority: NecesidadCompraPriority }) {
  const config: Record<NecesidadCompraPriority, { className: string; variant: "destructive" | "warning" | "secondary" | "success" }> = {
    Urgente: { className: "bg-red-600 text-white border-transparent", variant: "destructive" },
    Alta: { className: "bg-orange-500 text-white border-transparent", variant: "warning" },
    Media: { className: "bg-yellow-500 text-white border-transparent", variant: "warning" },
    Baja: { className: "bg-emerald-600 text-white border-transparent", variant: "success" },
  }
  const c = config[priority]
  return <Badge className={c.className}>{priority}</Badge>
}

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "En OC", label: "En OC" },
  { value: "Solicitada", label: "Solicitada" },
  { value: "Enviada", label: "Enviada" },
  { value: "Recibida", label: "Recibida" },
  { value: "Cancelada", label: "Cancelada" },
]

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas las prioridades" },
  { value: "Urgente", label: "Urgente" },
  { value: "Alta", label: "Alta" },
  { value: "Media", label: "Media" },
  { value: "Baja", label: "Baja" },
]

const ORIGIN_OPTIONS = [
  { value: "", label: "Todos los orígenes" },
  { value: "Consumo", label: "Consumo" },
  { value: "Stock crítico", label: "Stock crítico" },
  { value: "Faltante preparación", label: "Faltante preparación" },
  { value: "Artículo Z", label: "Artículo Z" },
  { value: "Diferencia presupuesto", label: "Diferencia presupuesto" },
  { value: "Vencimiento próximo", label: "Vencimiento próximo" },
]

export default function NecesidadesCompraPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [originFilter, setOriginFilter] = useState("")
  const [provFilter, setProvFilter] = useState("")

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [stateChangeDialogOpen, setStateChangeDialogOpen] = useState(false)

  // Form: Create
  const [formArticleName, setFormArticleName] = useState("")
  const [formArticleCode, setFormArticleCode] = useState("")
  const [formIsArticuloZ, setFormIsArticuloZ] = useState(false)
  const [formDescripcionLibre, setFormDescripcionLibre] = useState("")
  const [formCantidad, setFormCantidad] = useState(1)
  const [formPriority, setFormPriority] = useState<NecesidadCompraPriority>("Media")
  const [formOrigin, setFormOrigin] = useState<NecesidadCompraOrigin>("Consumo")
  const [formProveedorId, setFormProveedorId] = useState("")
  const [formSurgeryId, setFormSurgeryId] = useState("")
  const [formObservacion, setFormObservacion] = useState("")

  // Form: Convert to OC
  const [selectedNecesidades, setSelectedNecesidades] = useState<string[]>([])
  const [convertProveedorId, setConvertProveedorId] = useState("")

  // Form: Change state
  const [stateChangeId, setStateChangeId] = useState("")
  const [newState, setNewState] = useState<NecesidadCompraState>("Pendiente")

  // Detail
  const [detailItem, setDetailItem] = useState<typeof store.necesidadesCompra[0] | null>(null)

  const necesidades = store.necesidadesCompra
  const proveedores = store.proveedores.filter((p) => p.active)

  const provFilterOptions = useMemo(() => [
    { value: "", label: "Todos los proveedores" },
    ...proveedores.map((p) => ({ value: p.id, label: p.name })),
  ], [proveedores])

  const filtered = useMemo(() => {
    let data = necesidades.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (n) =>
          n.articleName.toLowerCase().includes(q) ||
          n.articleCode.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          (n.surgeryId && n.surgeryId.toLowerCase().includes(q))
      )
    }
    if (stateFilter) data = data.filter((n) => n.state === stateFilter)
    if (priorityFilter) data = data.filter((n) => n.priority === priorityFilter)
    if (originFilter) data = data.filter((n) => n.origin === originFilter)
    if (provFilter) data = data.filter((n) => n.proveedorId === provFilter)
    return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [necesidades, search, stateFilter, priorityFilter, originFilter, provFilter])

  const stats = useMemo(() => {
    const total = necesidades.length
    const pendientes = necesidades.filter((n) => n.state === "Pendiente").length
    const enOC = necesidades.filter((n) => n.state === "En OC").length
    const urgentes = necesidades.filter((n) => n.priority === "Urgente" && n.state !== "Recibida" && n.state !== "Cancelada").length
    return { total, pendientes, enOC, urgentes }
  }, [necesidades])

  // Available necesidades for conversion (Pendiente or Solicitada)
  const convertibleNecesidades = necesidades.filter(
    (n) => n.state === "Pendiente" || n.state === "Solicitada"
  )

  const handleCreate = () => {
    if (!formArticleName || formCantidad <= 0) {
      toast.error("Complete los campos obligatorios")
      return
    }
    store.createNecesidadCompra({
      articleName: formArticleName,
      articleCode: formArticleCode || (formIsArticuloZ ? `ART-Z-${Date.now().toString(36).toUpperCase()}` : ""),
      isArticuloZ: formIsArticuloZ,
      descripcionLibre: formIsArticuloZ ? formDescripcionLibre : undefined,
      proveedorSugerido: proveedores.find((p) => p.id === formProveedorId)?.name,
      proveedorId: formProveedorId || undefined,
      cantidad: formCantidad,
      priority: formPriority,
      origin: formOrigin,
      surgeryId: formSurgeryId || undefined,
      observacion: formObservacion || undefined,
      state: "Pendiente",
    })
    toast.success("Necesidad de compra creada exitosamente")
    setCreateDialogOpen(false)
    resetCreateForm()
  }

  const resetCreateForm = () => {
    setFormArticleName("")
    setFormArticleCode("")
    setFormIsArticuloZ(false)
    setFormDescripcionLibre("")
    setFormCantidad(1)
    setFormPriority("Media")
    setFormOrigin("Consumo")
    setFormProveedorId("")
    setFormSurgeryId("")
    setFormObservacion("")
  }

  const handleConvertToOC = () => {
    if (selectedNecesidades.length === 0 || !convertProveedorId) {
      toast.error("Seleccione al menos una necesidad y un proveedor")
      return
    }
    try {
      const oc = store.convertNecesidadToOC(selectedNecesidades, convertProveedorId)
      toast.success(`Orden de compra ${oc.id} creada con ${selectedNecesidades.length} necesidad(es)`)
      setConvertDialogOpen(false)
      setSelectedNecesidades([])
      setConvertProveedorId("")
    } catch {
      toast.error("Error al convertir necesidades a OC")
    }
  }

  const handleStateChange = () => {
    if (!stateChangeId) return
    store.updateNecesidadCompra(stateChangeId, { state: newState })
    toast.success(`Estado actualizado a ${newState}`)
    setStateChangeDialogOpen(false)
    setStateChangeId("")
  }

  const toggleNecesidadSelection = (id: string) => {
    setSelectedNecesidades((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Necesidades de Compra</h1>
          <p className="text-sm text-muted-foreground">Gestión de requerimientos de compra</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {selectedNecesidades.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setConvertDialogOpen(true)}
            >
              <ArrowRightLeft className="size-4" />
              Convertir a OC ({selectedNecesidades.length})
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" /> Nueva Necesidad
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={ShoppingCart} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
        <StatsCard title="En OC" value={stats.enOC} icon={Package} />
        <StatsCard
          title="Urgentes"
          value={stats.urgentes}
          icon={Zap}
          className={stats.urgentes > 0 ? "border-red-200" : ""}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Artículo, código, cirugía..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_OPTIONS} />
            <FilterSelect value={originFilter} onChange={setOriginFilter} options={ORIGIN_OPTIONS} />
            <FilterSelect value={provFilter} onChange={setProvFilter} options={provFilterOptions} />
            {(stateFilter || priorityFilter || originFilter || provFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setPriorityFilter(""); setOriginFilter(""); setProvFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} necesidad{filtered.length !== 1 ? "es" : ""}</span>
            {selectedNecesidades.length > 0 && (
              <span className="text-xs text-primary font-medium">{selectedNecesidades.length} seleccionada{selectedNecesidades.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left w-8">
                    <span className="sr-only">Seleccionar</span>
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Código</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Cant.</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Prioridad</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Origen</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Proveedor sugerido</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">OC vinculada</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => {
                  const isConvertible = n.state === "Pendiente" || n.state === "Solicitada"
                  return (
                    <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        {isConvertible && (
                          <Checkbox
                            checked={selectedNecesidades.includes(n.id)}
                            onCheckedChange={() => toggleNecesidadSelection(n.id)}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-primary">{n.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {n.isArticuloZ && <Badge variant="outline" className="text-[9px] px-1 py-0">Z</Badge>}
                          <span className="truncate max-w-[200px]">{n.articleName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{n.articleCode}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{n.cantidad}</td>
                      <td className="px-3 py-2.5"><PriorityBadge priority={n.priority} /></td>
                      <td className="px-3 py-2.5 text-xs">{n.origin}</td>
                      <td className="px-3 py-2.5 text-xs truncate max-w-[150px]">{n.proveedorSugerido || "—"}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {n.surgeryId ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary"
                            onClick={() => openExpediente(n.surgeryId!)}
                          >
                            {n.surgeryId}
                          </Button>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5"><StateBadge status={n.state} /></td>
                      <td className="px-3 py-2.5 font-mono text-xs">{n.ordenCompraId || "—"}</td>
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
                              <DropdownMenuItem onClick={() => { setDetailItem(n); setDetailDialogOpen(true) }}>
                                <Eye className="size-4" /> Ver detalle
                              </DropdownMenuItem>
                              {isConvertible && (
                                <DropdownMenuItem onClick={() => { setSelectedNecesidades([n.id]); setConvertDialogOpen(true) }}>
                                  <ArrowRightLeft className="size-4" /> Convertir a OC
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => { setStateChangeId(n.id); setNewState(n.state); setStateChangeDialogOpen(true) }}>
                                <RefreshCw className="size-4" /> Cambiar estado
                              </DropdownMenuItem>
                              {n.surgeryId && (
                                <DropdownMenuItem onClick={() => openExpediente(n.surgeryId!)}>
                                  <FolderOpen className="size-4" /> Abrir cirugía
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
                    <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron necesidades de compra
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create Necesidad Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Necesidad de Compra</DialogTitle>
            <DialogDescription>Crear un requerimiento de compra</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <Checkbox
                id="articuloZ"
                checked={formIsArticuloZ}
                onCheckedChange={(v) => setFormIsArticuloZ(v === true)}
              />
              <Label htmlFor="articuloZ" className="text-sm font-medium">Artículo Z (no catalogado)</Label>
            </div>
            {formIsArticuloZ ? (
              <div className="space-y-2">
                <Label>Descripción libre *</Label>
                <Textarea
                  value={formDescripcionLibre}
                  onChange={(e) => setFormDescripcionLibre(e.target.value)}
                  placeholder="Descripción del artículo Z..."
                  rows={2}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Artículo *</Label>
                  <Input value={formArticleName} onChange={(e) => setFormArticleName(e.target.value)} placeholder="Nombre del artículo" />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={formArticleCode} onChange={(e) => setFormArticleCode(e.target.value)} placeholder="Código del artículo" />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad *</Label>
                <Input type="number" min={1} value={formCantidad || ""} onChange={(e) => setFormCantidad(Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as NecesidadCompraPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Urgente", "Alta", "Media", "Baja"] as NecesidadCompraPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origen</Label>
                <Select value={formOrigin} onValueChange={(v) => setFormOrigin(v as NecesidadCompraOrigin)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Consumo", "Stock crítico", "Faltante preparación", "Artículo Z", "Diferencia presupuesto", "Vencimiento próximo"] as NecesidadCompraOrigin[]).map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proveedor sugerido</Label>
                <Select value={formProveedorId} onValueChange={setFormProveedorId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cirugía vinculada</Label>
              <Input value={formSurgeryId} onChange={(e) => setFormSurgeryId(e.target.value)} placeholder="CX-XXXX (opcional)" />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea value={formObservacion} onChange={(e) => setFormObservacion(e.target.value)} placeholder="Detalles adicionales..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!formArticleName && !formIsArticuloZ} className="bg-emerald-600 hover:bg-emerald-700">
              Crear Necesidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert to OC Dialog ── */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convertir a Orden de Compra</DialogTitle>
            <DialogDescription>
              {selectedNecesidades.length} necesidad{selectedNecesidades.length !== 1 ? "es" : ""} seleccionada{selectedNecesidades.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Select value={convertProveedorId} onValueChange={setConvertProveedorId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              <span className="text-xs font-medium text-muted-foreground">Necesidades a convertir:</span>
              {selectedNecesidades.map((id) => {
                const n = necesidades.find((x) => x.id === id)
                return n ? (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{n.articleName}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">x{n.cantidad}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConvertDialogOpen(false); setSelectedNecesidades([]) }}>Cancelar</Button>
            <Button onClick={handleConvertToOC} disabled={!convertProveedorId} className="bg-emerald-600 hover:bg-emerald-700">
              Crear OC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Necesidad</DialogTitle>
            <DialogDescription>{detailItem?.id}</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Artículo:</span><p className="font-medium">{detailItem.articleName}</p></div>
                <div><span className="text-muted-foreground">Código:</span><p className="font-mono">{detailItem.articleCode}</p></div>
                <div><span className="text-muted-foreground">Cantidad:</span><p className="font-medium">{detailItem.cantidad}</p></div>
                <div><span className="text-muted-foreground">Prioridad:</span><p><PriorityBadge priority={detailItem.priority} /></p></div>
                <div><span className="text-muted-foreground">Origen:</span><p>{detailItem.origin}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={detailItem.state} /></p></div>
                <div><span className="text-muted-foreground">Proveedor sugerido:</span><p>{detailItem.proveedorSugerido || "—"}</p></div>
                <div><span className="text-muted-foreground">Cirugía:</span><p>{detailItem.surgeryId || "—"}</p></div>
                <div><span className="text-muted-foreground">OC vinculada:</span><p className="font-mono">{detailItem.ordenCompraId || "—"}</p></div>
                <div><span className="text-muted-foreground">Fecha creación:</span><p>{formatDate(detailItem.createdAt)}</p></div>
              </div>
              {detailItem.isArticuloZ && detailItem.descripcionLibre && (
                <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Artículo Z</span>
                  <p className="mt-1 text-sm">{detailItem.descripcionLibre}</p>
                </div>
              )}
              {detailItem.observacion && (
                <div className="border rounded-lg p-3">
                  <span className="text-xs font-medium text-muted-foreground">Observación</span>
                  <p className="mt-1 text-sm">{detailItem.observacion}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change State Dialog ── */}
      <Dialog open={stateChangeDialogOpen} onOpenChange={setStateChangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>Seleccione el nuevo estado para la necesidad de compra</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newState} onValueChange={(v) => setNewState(v as NecesidadCompraState)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Pendiente", "Solicitada", "En OC", "Enviada", "Recibida", "Cancelada"] as NecesidadCompraState[]).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStateChangeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleStateChange}>Cambiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

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
import { Slider } from "@/components/ui/slider"
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
  Users, UserCheck, Star, Plus, Eye,
  MoreHorizontal, Pencil, BarChart3, FileText,
  StarOff,
} from "lucide-react"

// ── Star Rating Component ──
function StarRating({ rating, max = 5, size = 14 }: { rating: number; max?: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(rating)
        const half = !filled && i < rating
        return (
          <Star
            key={i}
            size={size}
            className={
              filled
                ? "fill-amber-400 text-amber-400"
                : half
                  ? "fill-amber-200 text-amber-400"
                  : "text-gray-300"
            }
          />
        )
      })}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  )
}

// ── Interactive Rating Slider ──
function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-bold text-primary">{value.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          min={1}
          max={5}
          step={0.5}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
        />
        <div className="flex gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              className={s <= Math.floor(value) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas las categorías" },
  { value: "Implantes", label: "Implantes" },
  { value: "Instrumental", label: "Instrumental" },
  { value: "Descartable", label: "Descartable" },
  { value: "Insumos", label: "Insumos" },
  { value: "Servicios", label: "Servicios" },
]

const ACTIVE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
]

export default function ProveedoresPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState("")

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [evalDialogOpen, setEvalDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [ocDialogOpen, setOcDialogOpen] = useState(false)

  // Create/Edit form
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formCuit, setFormCuit] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formCategory, setFormCategory] = useState("Implantes")
  const [formActive, setFormActive] = useState(true)

  // Evaluation form
  const [evalProveedorId, setEvalProveedorId] = useState("")
  const [evalCalidad, setEvalCalidad] = useState(3)
  const [evalPuntualidad, setEvalPuntualidad] = useState(3)
  const [evalPrecio, setEvalPrecio] = useState(3)
  const [evalServicio, setEvalServicio] = useState(3)
  const [evalObservaciones, setEvalObservaciones] = useState("")

  // Detail
  const [detailProveedor, setDetailProveedor] = useState<typeof store.proveedores[0] | null>(null)
  const [ocList, setOcList] = useState<typeof store.ordenesCompra>([])

  const proveedores = store.proveedores
  const evaluaciones = store.evaluacionesProveedor

  const filtered = useMemo(() => {
    let data = proveedores.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.cuit.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) data = data.filter((p) => p.category === categoryFilter)
    if (activeFilter) data = data.filter((p) => String(p.active) === activeFilter)
    return data.sort((a, b) => a.name.localeCompare(b.name))
  }, [proveedores, search, categoryFilter, activeFilter])

  const stats = useMemo(() => {
    const total = proveedores.length
    const activos = proveedores.filter((p) => p.active).length
    const avgRating = proveedores.length > 0
      ? proveedores.reduce((sum, p) => sum + p.rating, 0) / proveedores.length
      : 0
    return { total, activos, avgRating }
  }, [proveedores])

  const evalPromedio = useMemo(() =>
    ((evalCalidad + evalPuntualidad + evalPrecio + evalServicio) / 4).toFixed(2)
  , [evalCalidad, evalPuntualidad, evalPrecio, evalServicio])

  const resetForm = () => {
    setEditId(null)
    setFormName("")
    setFormCuit("")
    setFormEmail("")
    setFormPhone("")
    setFormAddress("")
    setFormCategory("Implantes")
    setFormActive(true)
  }

  const handleCreate = () => {
    if (!formName || !formCuit) {
      toast.error("Complete los campos obligatorios")
      return
    }
    store.createProveedor({
      name: formName,
      cuit: formCuit,
      email: formEmail,
      phone: formPhone,
      address: formAddress,
      category: formCategory,
      rating: 0,
      active: formActive,
    })
    toast.success("Proveedor creado exitosamente")
    setCreateDialogOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!editId || !formName) return
    useOrtoTrackStore.setState({
      proveedores: proveedores.map((p) =>
        p.id === editId
          ? {
              ...p,
              name: formName,
              cuit: formCuit,
              email: formEmail,
              phone: formPhone,
              address: formAddress,
              category: formCategory,
              active: formActive,
            }
          : p
      ),
    })
    toast.success("Proveedor actualizado")
    setEditDialogOpen(false)
    resetForm()
  }

  const openEditDialog = (p: typeof store.proveedores[0]) => {
    setEditId(p.id)
    setFormName(p.name)
    setFormCuit(p.cuit)
    setFormEmail(p.email)
    setFormPhone(p.phone)
    setFormAddress(p.address)
    setFormCategory(p.category)
    setFormActive(p.active)
    setEditDialogOpen(true)
  }

  const handleEval = () => {
    if (!evalProveedorId) return
    const prov = proveedores.find((p) => p.id === evalProveedorId)
    if (!prov) return
    const promedio = Number(evalPromedio)
    store.createEvaluacionProveedor({
      proveedorId: evalProveedorId,
      proveedorName: prov.name,
      fecha: new Date().toISOString().split("T")[0],
      calidad: evalCalidad,
      puntualidad: evalPuntualidad,
      precio: evalPrecio,
      servicio: evalServicio,
      promedio,
      observaciones: evalObservaciones || undefined,
    })
    // Update proveedor rating
    const allEvals = [...evaluaciones, { promedio }]
    const avgRating = allEvals.reduce((sum, e) => sum + e.promedio, 0) / allEvals.length
    const newRating = Math.round(avgRating * 10) / 10
    useOrtoTrackStore.setState({
      proveedores: proveedores.map((p) =>
        p.id === evalProveedorId ? { ...p, rating: newRating } : p
      ),
    })

    toast.success(`Evaluación registrada — Promedio: ${promedio}`)
    setEvalDialogOpen(false)
    setEvalCalidad(3)
    setEvalPuntualidad(3)
    setEvalPrecio(3)
    setEvalServicio(3)
    setEvalObservaciones("")
  }

  const openEvalDialog = (id: string) => {
    setEvalProveedorId(id)
    setEvalDialogOpen(true)
  }

  const openOcDialog = (provId: string) => {
    setOcList(store.ordenesCompra.filter((oc) => oc.proveedorId === provId))
    setOcDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Gestión y evaluación de proveedores</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
          <Plus className="size-4" /> Nuevo Proveedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard title="Total" value={stats.total} icon={Users} />
        <StatsCard title="Activos" value={stats.activos} icon={UserCheck} />
        <StatsCard title="Rating promedio" value={stats.avgRating.toFixed(1)} icon={Star} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Nombre, CUIT, email..." className="w-full sm:w-72" />
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
            <FilterSelect value={activeFilter} onChange={setActiveFilter} options={ACTIVE_OPTIONS} />
            {(categoryFilter || activeFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setCategoryFilter(""); setActiveFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} proveedor{filtered.length !== 1 ? "es" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nombre</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">CUIT</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Categoría</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Rating</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Contacto</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{p.cuit}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.rating > 0 ? <StarRating rating={p.rating} /> : <span className="text-xs text-muted-foreground">Sin eval.</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{p.email}</td>
                    <td className="px-3 py-2.5">
                      {p.active ? (
                        <Badge variant="success" className="text-[10px]">Activo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                      )}
                    </td>
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
                            <DropdownMenuItem onClick={() => { setDetailProveedor(p); setDetailDialogOpen(true) }}>
                              <Eye className="size-4" /> Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(p)}>
                              <Pencil className="size-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEvalDialog(p.id)}>
                              <BarChart3 className="size-4" /> Evaluar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openOcDialog(p.id)}>
                              <FileText className="size-4" /> Ver OC
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron proveedores
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create/Edit Proveedor Dialog ── */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(v) => { if (!v) { setCreateDialogOpen(false); setEditDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
            <DialogDescription>{editId ? "Modificar datos del proveedor" : "Registrar un nuevo proveedor"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Razón social" />
              </div>
              <div className="space-y-2">
                <Label>CUIT *</Label>
                <Input value={formCuit} onChange={(e) => setFormCuit(e.target.value)} placeholder="XX-XXXXXXXX-X" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@proveedor.com" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="11-XXXX-XXXX" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Dirección completa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Implantes", "Instrumental", "Descartable", "Insumos", "Servicios"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={String(formActive)} onValueChange={(v) => setFormActive(v === "true")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setEditDialogOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={editId ? handleEdit : handleCreate} disabled={!formName || !formCuit} className="bg-emerald-600 hover:bg-emerald-700">
              {editId ? "Guardar Cambios" : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Evaluación Dialog ── */}
      <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Evaluación de Proveedor</DialogTitle>
            <DialogDescription>
              {proveedores.find((p) => p.id === evalProveedorId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <RatingInput label="Calidad del producto" value={evalCalidad} onChange={setEvalCalidad} />
            <RatingInput label="Puntualidad en entregas" value={evalPuntualidad} onChange={setEvalPuntualidad} />
            <RatingInput label="Competitividad de precios" value={evalPrecio} onChange={setEvalPrecio} />
            <RatingInput label="Servicio y soporte" value={evalServicio} onChange={setEvalServicio} />

            <div className="border rounded-lg p-4 bg-muted/30 text-center">
              <span className="text-sm text-muted-foreground">Promedio</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <StarRating rating={Number(evalPromedio)} size={20} />
                <span className="text-xl font-bold text-primary">{evalPromedio}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={evalObservaciones}
                onChange={(e) => setEvalObservaciones(e.target.value)}
                placeholder="Comentarios sobre la evaluación..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEval} className="bg-emerald-600 hover:bg-emerald-700">
              Registrar Evaluación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Proveedor</DialogTitle>
            <DialogDescription>{detailProveedor?.name}</DialogDescription>
          </DialogHeader>
          {detailProveedor && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">CUIT:</span><p className="font-mono">{detailProveedor.cuit}</p></div>
                <div><span className="text-muted-foreground">Categoría:</span><p><Badge variant="outline" className="text-[10px]">{detailProveedor.category}</Badge></p></div>
                <div><span className="text-muted-foreground">Email:</span><p>{detailProveedor.email}</p></div>
                <div><span className="text-muted-foreground">Teléfono:</span><p>{detailProveedor.phone}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Dirección:</span><p>{detailProveedor.address}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p>{detailProveedor.active ? <Badge variant="success" className="text-[10px]">Activo</Badge> : <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}</p></div>
                <div><span className="text-muted-foreground">Rating:</span><p>{detailProveedor.rating > 0 ? <StarRating rating={detailProveedor.rating} /> : "Sin evaluaciones"}</p></div>
              </div>

              {/* Historial de evaluaciones */}
              {evaluaciones.filter((e) => e.proveedorId === detailProveedor.id).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Historial de evaluaciones</span>
                  {evaluaciones
                    .filter((e) => e.proveedorId === detailProveedor.id)
                    .sort((a, b) => b.fecha.localeCompare(a.fecha))
                    .map((ev) => (
                      <div key={ev.id} className="border rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{formatDate(ev.fecha)}</span>
                          <StarRating rating={ev.promedio} size={12} />
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <span>Calidad: {ev.calidad}</span>
                          <span>Puntualidad: {ev.puntualidad}</span>
                          <span>Precio: {ev.precio}</span>
                          <span>Servicio: {ev.servicio}</span>
                        </div>
                        {ev.observaciones && <p className="text-xs mt-1">{ev.observaciones}</p>}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── OC Dialog ── */}
      <Dialog open={ocDialogOpen} onOpenChange={setOcDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Órdenes de Compra</DialogTitle>
            <DialogDescription>OC asociadas al proveedor</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {ocList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin órdenes de compra</p>
            ) : (
              <div className="space-y-3">
                {ocList.map((oc) => (
                  <div key={oc.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{oc.id}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(oc.createdAt)} • {oc.items.length} items</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{formatCurrency(oc.total)}</span>
                      <StateBadge status={oc.state} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOcDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}

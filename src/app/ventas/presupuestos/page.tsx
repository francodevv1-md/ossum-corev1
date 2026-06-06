"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { getBadgeVariant, CLIENT_OPTIONS, INSTITUTION_OPTIONS, comprobanteTypeLabels } from "@/lib/statusHelpers"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  ConfirmDialog, SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  FileText, Send, CheckCircle2, XCircle, Lock, Unlock,
  ShoppingCart, Eye, MoreHorizontal, Plus, DollarSign,
  ClipboardList, Clock, TrendingUp, FolderOpen, Trash2,
} from "lucide-react"
import type { Presupuesto, PresupuestoItem, PresupuestoState } from "@/types"

// ── Filter options ──
const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Borrador", label: "Borrador" },
  { value: "Enviado", label: "Enviado" },
  { value: "Aprobado", label: "Aprobado" },
  { value: "Rechazado", label: "Rechazado" },
]

const LISTA_PRECIOS_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "LP-OSDE-2026-04", label: "LP-OSDE-2026-04" },
  { value: "LP-SM-2026-04", label: "LP-SM-2026-04" },
  { value: "LP-GA-2026-04", label: "LP-GA-2026-04" },
  { value: "LP-PAMI-2026-04", label: "LP-PAMI-2026-04" },
  { value: "LP-OSDE-2026-05", label: "LP-OSDE-2026-05" },
]

export default function PresupuestosPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")
  const [institutionFilter, setInstitutionFilter] = useState("")
  const [listaFilter, setListaFilter] = useState("")

  // ── Dialogs ──
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [createMode, setCreateMode] = useState<"surgery" | "manual">("surgery")
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)

  // ── Create form ──
  const [formSurgeryId, setFormSurgeryId] = useState("")
  const [formClient, setFormClient] = useState("")
  const [formInstitution, setFormInstitution] = useState("")
  const [formPatient, setFormPatient] = useState("")
  const [formVigencia, setFormVigencia] = useState("30 días")
  const [formListaPrecios, setFormListaPrecios] = useState("")
  const [formObservaciones, setFormObservaciones] = useState("")
  const [formItems, setFormItems] = useState<PresupuestoItem[]>([])
  const [formNewItem, setFormNewItem] = useState({ name: "", code: "", quantity: 1, unitPrice: 0, isArticuloZ: false, descripcionLibre: "" })

  // ── Computed ──
  const presupuestos = store.presupuestos

  const filtered = useMemo(() => {
    let data = presupuestos.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.patient?.toLowerCase().includes(q) ?? false) ||
          (p.institution?.toLowerCase().includes(q) ?? false) ||
          p.client.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((p) => p.state === stateFilter)
    if (clientFilter) data = data.filter((p) => p.client === clientFilter)
    if (institutionFilter) data = data.filter((p) => p.institution === institutionFilter)
    if (listaFilter) data = data.filter((p) => p.listaPrecios === listaFilter)
    return data
  }, [presupuestos, search, stateFilter, clientFilter, institutionFilter, listaFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const aprobados = filtered.filter((p) => p.state === "Aprobado").length
    const pendientes = filtered.filter((p) => p.state === "Borrador" || p.state === "Enviado").length
    const monto = filtered.reduce((sum, p) => sum + p.total, 0)
    return { total, aprobados, pendientes, monto }
  }, [filtered])

  // ── Available surgeries for presupuesto ──
  const availableSurgeries = store.surgeries.filter(
    (s) => !s.presupuestoId && s.state !== "Cancelada" && s.state !== "Suspendida"
  )

  // ── Handlers ──
  const handleCreateFromSurgery = () => {
    const surgery = store.getSurgeryById(formSurgeryId)
    if (!surgery) return
    setFormPatient(surgery.patient)
    setFormInstitution(surgery.institution)
    setFormClient(surgery.client)
    // Pre-fill items from box/consumo if available
    const consumo = store.getConsumoBySurgeryId(surgery.id)
    if (consumo) {
      const items: PresupuestoItem[] = consumo.items.map((ci) => ({
        stockItemId: ci.stockItemId,
        name: ci.name,
        code: ci.code,
        quantity: ci.consumed,
        unitPrice: 0,
        subtotal: 0,
      }))
      setFormItems(items)
    } else {
      setFormItems([])
    }
  }

  const handleAddItem = () => {
    if (!formNewItem.name) return
    const subtotal = formNewItem.quantity * formNewItem.unitPrice
    const item: PresupuestoItem = {
      stockItemId: formNewItem.isArticuloZ ? `Z-${Date.now()}` : `STK-${Date.now()}`,
      name: formNewItem.isArticuloZ ? "Artículo Z" : formNewItem.name,
      code: formNewItem.code || "Z-LIBRE",
      quantity: formNewItem.quantity,
      unitPrice: formNewItem.unitPrice,
      subtotal,
      isArticuloZ: formNewItem.isArticuloZ,
      descripcionLibre: formNewItem.isArticuloZ ? formNewItem.descripcionLibre : undefined,
    }
    setFormItems([...formItems, item])
    setFormNewItem({ name: "", code: "", quantity: 1, unitPrice: 0, isArticuloZ: false, descripcionLibre: "" })
  }

  const handleRemoveItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx))
  }

  const formTotal = formItems.reduce((sum, i) => sum + i.subtotal, 0)

  const handleCreatePresupuesto = () => {
    if (!formPatient || !formClient) {
      toast.error("Complete los campos obligatorios")
      return
    }
    const surgeryId = createMode === "surgery" ? formSurgeryId : `MANUAL-${Date.now()}`
    store.createBudgetForSurgery(surgeryId, {
      patient: formPatient,
      institution: formInstitution || undefined,
      client: formClient,
      vendedor: "Sistema",
      items: formItems,
      subtotal: formTotal,
      total: formTotal,
      state: "Borrador",
      vigencia: formVigencia,
      listaPrecios: formListaPrecios || "LP-DEFAULT",
      observaciones: formObservaciones || undefined,
      bloqueado: false,
      fechaEmision: new Date().toISOString().split("T")[0],
      version: 1,
      versionStatus: "vigente",
    })
    toast.success("Presupuesto creado exitosamente")
    setCreateDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormSurgeryId("")
    setFormClient("")
    setFormInstitution("")
    setFormPatient("")
    setFormVigencia("30 días")
    setFormListaPrecios("")
    setFormObservaciones("")
    setFormItems([])
    setFormNewItem({ name: "", code: "", quantity: 1, unitPrice: 0, isArticuloZ: false, descripcionLibre: "" })
  }

  const handleEnviar = (p: Presupuesto) => {
    store.enviarPresupuesto(p.id)
    toast.success(`Presupuesto ${p.id} enviado`)
  }

  const handleAprobar = (p: Presupuesto) => {
    store.authorizeBudget(p.id)
    toast.success(`Presupuesto ${p.id} aprobado`)
  }

  const handleRechazar = () => {
    if (!selectedPresupuesto) return
    store.rechazarPresupuesto(selectedPresupuesto.id)
    toast.success(`Presupuesto ${selectedPresupuesto.id} rechazado`)
    setRejectDialogOpen(false)
    setSelectedPresupuesto(null)
  }

  const handleBloquear = () => {
    if (!selectedPresupuesto) return
    store.bloquearPresupuesto(selectedPresupuesto.id)
    toast.success(`Presupuesto ${selectedPresupuesto.id} bloqueado`)
    setBlockDialogOpen(false)
    setSelectedPresupuesto(null)
  }

  const handleDesbloquear = (p: Presupuesto) => {
    store.bloquearPresupuesto(p.id) // toggle via store
    toast.success(`Presupuesto ${p.id} desbloqueado`)
  }

  const handleCrearPedido = (p: Presupuesto) => {
    if (p.state !== "Aprobado") {
      toast.error("Solo presupuestos aprobados pueden generar pedidos")
      return
    }
    try {
      store.generateOrderFromBudget(p.id)
      toast.success("Pedido generado exitosamente")
    } catch {
      toast.error("Error al generar pedido")
    }
  }

  const handleAbrirExpediente = (surgeryId: string) => {
    openExpediente(surgeryId)
  }

  // ── Get comprobantes vinculados ──
  const getLinkedComprobantes = (surgeryId: string) => {
    return store.comprobantes.filter((c) => c.surgeryId === surgeryId)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">Gestión de presupuestos de ventas</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setCreateMode("surgery"); resetForm(); setCreateDialogOpen(true) }}>
          <Plus className="size-4" /> Nuevo Presupuesto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={ClipboardList} />
        <StatsCard title="Aprobados" value={stats.aprobados} icon={CheckCircle2} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
        <StatsCard title="Monto total" value={formatCurrency(stats.monto)} icon={DollarSign} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="ID, paciente, institución, cliente..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={clientFilter} onChange={setClientFilter} options={CLIENT_OPTIONS} />
            <FilterSelect value={institutionFilter} onChange={setInstitutionFilter} options={INSTITUTION_OPTIONS} />
            <FilterSelect value={listaFilter} onChange={setListaFilter} options={LISTA_PRECIOS_OPTIONS} />
            {(stateFilter || clientFilter || institutionFilter || listaFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setClientFilter(""); setInstitutionFilter(""); setListaFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} presupuesto{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Paciente</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Institución</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cliente</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Vigencia</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Lista precios</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isBlocked = p.bloqueado
                  return (
                    <tr
                      key={p.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isBlocked ? "opacity-60 bg-muted/20" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-primary">{p.id}</span>
                        {isBlocked && (
                          <Lock className="inline size-3 ml-1 text-amber-500" />
                        )}
                      </td>
                      <td className="px-3 py-2.5">{p.patient}</td>
                      <td className="px-3 py-2.5">{p.institution}</td>
                      <td className="px-3 py-2.5">{p.client}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(p.total)}</td>
                      <td className="px-3 py-2.5">
                        <StateBadge status={p.state} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                      <td className="px-3 py-2.5">{p.vigencia || "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{p.listaPrecios || "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedPresupuesto(p); setDetailDialogOpen(true) }}>
                                <Eye className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalle</TooltipContent>
                          </Tooltip>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedPresupuesto(p); setDetailDialogOpen(true) }}>
                                <Eye className="size-4" /> Ver detalle
                              </DropdownMenuItem>
                              {p.state === "Borrador" && !isBlocked && (
                                <DropdownMenuItem onClick={() => handleEnviar(p)}>
                                  <Send className="size-4" /> Enviar
                                </DropdownMenuItem>
                              )}
                              {p.state === "Enviado" && !isBlocked && (
                                <DropdownMenuItem onClick={() => handleAprobar(p)}>
                                  <CheckCircle2 className="size-4" /> Aprobar
                                </DropdownMenuItem>
                              )}
                              {p.state === "Enviado" && !isBlocked && (
                                <DropdownMenuItem variant="destructive" onClick={() => { setSelectedPresupuesto(p); setRejectDialogOpen(true) }}>
                                  <XCircle className="size-4" /> Rechazar
                                </DropdownMenuItem>
                              )}
                              {!isBlocked && (
                                <DropdownMenuItem onClick={() => { setSelectedPresupuesto(p); setBlockDialogOpen(true) }}>
                                  <Lock className="size-4" /> Bloquear
                                </DropdownMenuItem>
                              )}
                              {isBlocked && (
                                <DropdownMenuItem onClick={() => handleDesbloquear(p)}>
                                  <Unlock className="size-4" /> Desbloquear
                                </DropdownMenuItem>
                              )}
                              {p.state === "Aprobado" && !isBlocked && (
                                <DropdownMenuItem onClick={() => handleCrearPedido(p)}>
                                  <ShoppingCart className="size-4" /> Crear pedido
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAbrirExpediente(p.surgeryId || "")}>
                                <FolderOpen className="size-4" /> Abrir expediente
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
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron presupuestos
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
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Presupuesto {selectedPresupuesto?.id}</DialogTitle>
            <DialogDescription>
              {selectedPresupuesto?.patient} — {selectedPresupuesto?.institution}
            </DialogDescription>
          </DialogHeader>
          {selectedPresupuesto && (
            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-muted-foreground">Cliente</span>
                  <p className="text-sm font-medium">{selectedPresupuesto.client}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <div className="mt-0.5"><StateBadge status={selectedPresupuesto.state} /></div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total</span>
                  <p className="text-sm font-bold">{formatCurrency(selectedPresupuesto.total)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Fecha creación</span>
                  <p className="text-sm">{formatDate(selectedPresupuesto.createdAt)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Vigencia</span>
                  <p className="text-sm">{selectedPresupuesto.vigencia || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Lista de precios</span>
                  <p className="text-sm">{selectedPresupuesto.listaPrecios || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Vendedor</span>
                  <p className="text-sm">{selectedPresupuesto.vendedor || "—"}</p>
                </div>
                {selectedPresupuesto.approvedAt && (
                  <div>
                    <span className="text-xs text-muted-foreground">Fecha aprobación</span>
                    <p className="text-sm">{formatDate(selectedPresupuesto.approvedAt)}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Bloqueado</span>
                  <p className="text-sm">{selectedPresupuesto.bloqueado ? "Sí" : "No"}</p>
                </div>
              </div>

              <Separator />

              {/* Items table */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Items del presupuesto</h4>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">P. Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPresupuesto.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                          <td className="px-3 py-2">
                            {item.isArticuloZ ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="warning" className="text-[10px]">Z</Badge>
                                <span>{item.descripcionLibre || "Artículo Z"}</span>
                              </div>
                            ) : (
                              item.name
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="px-3 py-2 text-right font-semibold">Total</td>
                        <td className="px-3 py-2 text-right font-bold">{formatCurrency(selectedPresupuesto.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Observaciones */}
              {selectedPresupuesto.observaciones && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Observaciones</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    {selectedPresupuesto.observaciones}
                  </p>
                </div>
              )}

              {/* Comprobantes vinculados */}
              {(() => {
                const linked = getLinkedComprobantes(selectedPresupuesto.surgeryId || "")
                if (linked.length === 0) return null
                return (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Comprobantes vinculados</h4>
                    <div className="space-y-1">
                      {linked.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant={getBadgeVariant(c.type)} className="text-[10px]">{c.type}</Badge>
                            <span className="font-mono">{c.number}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>{formatCurrency(c.amount)}</span>
                            <StateBadge status={c.state} className="text-[10px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Presupuesto Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
            <DialogDescription>Crear presupuesto desde cirugía o manual</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2">
              <Button
                variant={createMode === "surgery" ? "default" : "outline"}
                size="sm"
                onClick={() => setCreateMode("surgery")}
              >
                Desde Cirugía
              </Button>
              <Button
                variant={createMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setCreateMode("manual")}
              >
                Manual
              </Button>
            </div>

            {createMode === "surgery" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Cirugía *</Label>
                  <Select value={formSurgeryId} onValueChange={(v) => { setFormSurgeryId(v); handleCreateFromSurgery() }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cirugía" /></SelectTrigger>
                    <SelectContent>
                      {availableSurgeries.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.id} — {s.patient} ({s.institution})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Input value={formPatient} onChange={(e) => setFormPatient(e.target.value)} placeholder="Nombre del paciente" />
                </div>
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={formClient} onValueChange={setFormClient}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_OPTIONS.filter((o) => o.value).map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Institución</Label>
                  <Select value={formInstitution} onValueChange={setFormInstitution}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar institución" /></SelectTrigger>
                    <SelectContent>
                      {INSTITUTION_OPTIONS.filter((o) => o.value).map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lista de precios</Label>
                  <Input value={formListaPrecios} onChange={(e) => setFormListaPrecios(e.target.value)} placeholder="LP-XXXX" />
                </div>
              </div>
            )}

            {/* Common fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vigencia</Label>
                <Select value={formVigencia} onValueChange={setFormVigencia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15 días">15 días</SelectItem>
                    <SelectItem value="30 días">30 días</SelectItem>
                    <SelectItem value="60 días">60 días</SelectItem>
                    <SelectItem value="90 días">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Items</h4>

              {/* Add item row */}
              <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-md border bg-muted/30">
                <label className="flex items-center gap-1.5 shrink-0">
                  <Checkbox
                    checked={formNewItem.isArticuloZ}
                    onCheckedChange={(checked) => setFormNewItem({ ...formNewItem, isArticuloZ: !!checked })}
                  />
                  <span className="text-xs">Art. Z</span>
                </label>
                {formNewItem.isArticuloZ ? (
                  <Input
                    className="flex-1 min-w-[150px] h-8 text-xs"
                    placeholder="Descripción libre"
                    value={formNewItem.descripcionLibre}
                    onChange={(e) => setFormNewItem({ ...formNewItem, descripcionLibre: e.target.value })}
                  />
                ) : (
                  <Input
                    className="flex-1 min-w-[150px] h-8 text-xs"
                    placeholder="Nombre artículo"
                    value={formNewItem.name}
                    onChange={(e) => setFormNewItem({ ...formNewItem, name: e.target.value })}
                  />
                )}
                <Input
                  className="w-20 h-8 text-xs"
                  placeholder="Código"
                  value={formNewItem.code}
                  onChange={(e) => setFormNewItem({ ...formNewItem, code: e.target.value })}
                />
                <Input
                  type="number"
                  className="w-16 h-8 text-xs"
                  placeholder="Cant."
                  value={formNewItem.quantity}
                  onChange={(e) => setFormNewItem({ ...formNewItem, quantity: Number(e.target.value) || 1 })}
                />
                <Input
                  type="number"
                  className="w-28 h-8 text-xs"
                  placeholder="P. Unitario"
                  value={formNewItem.unitPrice || ""}
                  onChange={(e) => setFormNewItem({ ...formNewItem, unitPrice: Number(e.target.value) || 0 })}
                />
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleAddItem} disabled={!formNewItem.name && !formNewItem.isArticuloZ}>
                  <Plus className="size-3" /> Agregar
                </Button>
              </div>

              {/* Items list */}
              {formItems.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-2 py-1.5 text-left">Código</th>
                        <th className="px-2 py-1.5 text-left">Nombre</th>
                        <th className="px-2 py-1.5 text-right">Cant.</th>
                        <th className="px-2 py-1.5 text-right">P. Unit.</th>
                        <th className="px-2 py-1.5 text-right">Subtotal</th>
                        <th className="px-2 py-1.5 text-right w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-2 py-1.5 font-mono">{item.code}</td>
                          <td className="px-2 py-1.5">
                            {item.isArticuloZ ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="warning" className="text-[9px] px-1">Z</Badge>
                                {item.descripcionLibre || "Artículo Z"}
                              </div>
                            ) : item.name}
                          </td>
                          <td className="px-2 py-1.5 text-right">{item.quantity}</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                          <td className="px-2 py-1.5 text-right">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveItem(idx)}>
                              <Trash2 className="size-3 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="px-2 py-1.5 text-right font-semibold">Total</td>
                        <td className="px-2 py-1.5 text-right font-bold">{formatCurrency(formTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={formObservaciones} onChange={(e) => setFormObservaciones(e.target.value)} placeholder="Notas adicionales..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePresupuesto} disabled={!formPatient || !formClient}>
              Crear Presupuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Rechazar Presupuesto"
        description={`¿Rechazar presupuesto ${selectedPresupuesto?.id}? Esta acción no se puede deshacer.`}
        confirmLabel="Rechazar"
        onConfirm={handleRechazar}
        destructive
      />

      {/* ── Block Dialog ── */}
      <ConfirmDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        title="Bloquear Presupuesto"
        description={`¿Bloquear presupuesto ${selectedPresupuesto?.id}? No se podrán realizar acciones hasta desbloquear.`}
        confirmLabel="Bloquear"
        onConfirm={handleBloquear}
      />

      {/* ── Expediente Drawer ── */}
      <SurgeryDrawer />
    </div>
  )
}

"use client"

import React, { useState, useMemo, useCallback } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { CLIENT_OPTIONS, INSTITUTION_OPTIONS } from "@/lib/statusHelpers"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  ConfirmDialog,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  FileText, Send, CheckCircle2, XCircle, Lock,
  Eye, MoreHorizontal, Plus, DollarSign,
  ClipboardList, Clock, FolderOpen, Trash2, RefreshCw, AlertTriangle,
  FileCheck, Pencil,
} from "lucide-react"
import { PresupuestoFormDialog } from "@/components/presupuestos/PresupuestoFormDialog"
import type { PresupuestoApiRow, PresupuestoState } from "@/lib/api/presupuestos"

// ── Filter options ──
const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Borrador", label: "Borrador" },
  { value: "Emitido", label: "Emitido" },
  { value: "Aprobado", label: "Aprobado" },
  { value: "Rechazado", label: "Rechazado" },
  { value: "Vencido", label: "Vencido" },
  { value: "Reemplazado", label: "Reemplazado" },
  { value: "Anulado", label: "Anulado" },
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
  const { activeCompany } = useAuth()
  const { openExpediente } = useExpedienteDrawer()

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("")
  const [clientFilter, setClientFilter] = useState("")
  const [institutionFilter, setInstitutionFilter] = useState("")
  const [listaFilter, setListaFilter] = useState("")

  // ── Hook ──
  const {
    presupuestos,
    loading,
    error,
    mutatingId,
    refresh,
    emit,
    transition,
    deleteDraft,
    revise,
  } = usePresupuestos()

  // ── Dialogs ──
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editPresupuestoId, setEditPresupuestoId] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<PresupuestoApiRow | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [annulDialogOpen, setAnnulDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let data = presupuestos.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter((p) => {
        const idMatch = p.id.toLowerCase().includes(q)
        const numMatch = p.visibleNumber ? String(p.visibleNumber).includes(q) : false
        const patientMatch = (p.patient?.toLowerCase().includes(q) ?? false)
        const instMatch = (p.institution?.toLowerCase().includes(q) ?? false)
        const clientMatch = (p.client?.toLowerCase().includes(q) ?? false)
        const titleMatch = (p.title?.toLowerCase().includes(q) ?? false)
        return idMatch || numMatch || patientMatch || instMatch || clientMatch || titleMatch
      })
    }
    if (stateFilter) data = data.filter((p) => p.state === stateFilter)
    if (clientFilter) data = data.filter((p) => p.client === clientFilter)
    if (institutionFilter) data = data.filter((p) => p.institution === institutionFilter)
    if (listaFilter) data = data.filter((p) => p.priceListCode === listaFilter)
    return data
  }, [presupuestos, search, stateFilter, clientFilter, institutionFilter, listaFilter])

  // ── Stats ──
  const stats = useMemo(() => {
    const total = filtered.length
    const aprobados = filtered.filter((p) => p.state === "Aprobado").length
    const pendientes = filtered.filter((p) => p.state === "Borrador" || p.state === "Emitido").length
    const monto = filtered.reduce((sum, p) => sum + (Number(p.total) || 0), 0)
    return { total, aprobados, pendientes, monto }
  }, [filtered])

  // ── Action handlers ──
  const handleEmit = useCallback(async (p: PresupuestoApiRow) => {
    try {
      await emit(p.id, p.revision)
      toast.success(`Presupuesto ${p.id} emitido con éxito`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Error al emitir presupuesto")
    }
  }, [emit])

  const handleApprove = useCallback(async (p: PresupuestoApiRow) => {
    try {
      await transition(p.id, "approve", p.revision)
      toast.success(`Presupuesto ${p.id} aprobado con éxito`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Error al aprobar presupuesto")
    }
  }, [transition])

  const handleConfirmReject = useCallback(async () => {
    if (!selectedPresupuesto) return
    try {
      await transition(selectedPresupuesto.id, "reject", selectedPresupuesto.revision)
      toast.success(`Presupuesto ${selectedPresupuesto.id} rechazado`)
      setRejectDialogOpen(false)
      setSelectedPresupuesto(null)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Error al rechazar presupuesto")
    }
  }, [selectedPresupuesto, transition])

  const handleConfirmAnnul = useCallback(async () => {
    if (!selectedPresupuesto) return
    try {
      await transition(selectedPresupuesto.id, "annul", selectedPresupuesto.revision)
      toast.success(`Presupuesto ${selectedPresupuesto.id} anulado`)
      setAnnulDialogOpen(false)
      setSelectedPresupuesto(null)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Error al anular presupuesto")
    }
  }, [selectedPresupuesto, transition])

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedPresupuesto) return
    try {
      await deleteDraft(selectedPresupuesto.id, selectedPresupuesto.revision)
      toast.success(`Borrador ${selectedPresupuesto.id} eliminado`)
      setDeleteDialogOpen(false)
      setSelectedPresupuesto(null)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Error al eliminar borrador")
    }
  }, [deleteDraft, selectedPresupuesto])

  const handleRevise = useCallback(async (p: PresupuestoApiRow) => {
    try {
      const newVersion = await revise(p.id, p.revision)
      toast.success(`Nueva versión v${newVersion.versionNumber} creada en Borrador`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Error al crear nueva versión")
    }
  }, [revise])

  const handleAbrirExpediente = (surgeryId: string) => {
    if (!surgeryId) {
      toast.info("Este presupuesto no está vinculado a una cirugía")
      return
    }
    openExpediente(surgeryId)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Gestión comercial y versionado de presupuestos de ventas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => refresh()}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="size-4" /> Nuevo Presupuesto
          </Button>
        </div>
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
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="N°, ID, paciente, institución, cliente..."
              className="w-full sm:w-72"
            />
            <FilterSelect
              value={stateFilter}
              onChange={setStateFilter}
              options={STATE_OPTIONS}
            />
            <FilterSelect
              value={clientFilter}
              onChange={setClientFilter}
              options={CLIENT_OPTIONS}
            />
            <FilterSelect
              value={institutionFilter}
              onChange={setInstitutionFilter}
              options={INSTITUTION_OPTIONS}
            />
            <FilterSelect
              value={listaFilter}
              onChange={setListaFilter}
              options={LISTA_PRECIOS_OPTIONS}
            />
            {(stateFilter || clientFilter || institutionFilter || listaFilter || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-9"
                onClick={() => {
                  setSearch("")
                  setStateFilter("")
                  setClientFilter("")
                  setInstitutionFilter("")
                  setListaFilter("")
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error alert */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">
              {filtered.length} presupuesto{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">N° / ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Versión</th>
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
                  const isMutating = mutatingId === p.id
                  return (
                    <tr
                      key={p.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                        p.slot === "HISTORY" ? "opacity-60 bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary font-mono text-xs">
                            {p.visibleNumber ? `PR-${String(p.visibleNumber).padStart(5, "0")}` : p.id.slice(0, 8)}
                          </span>
                          {p.slot === "DRAFT" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">Borrador</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px] font-mono">v{p.versionNumber}</Badge>
                      </td>
                      <td className="px-3 py-2.5">{p.patient || "—"}</td>
                      <td className="px-3 py-2.5">{p.institution || "—"}</td>
                      <td className="px-3 py-2.5">{p.client || "—"}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(Number(p.total) || 0)}</td>
                      <td className="px-3 py-2.5">
                        <StateBadge status={p.state} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                      <td className="px-3 py-2.5">{p.validUntil ? formatDate(p.validUntil) : "—"}</td>
                      <td className="px-3 py-2.5 text-xs font-mono">{p.priceListCode || "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setSelectedPresupuesto(p)
                                    setDetailDialogOpen(true)
                                  }}
                                >
                                  <Eye className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalle</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isMutating}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPresupuesto(p)
                                  setDetailDialogOpen(true)
                                }}
                              >
                                <Eye className="size-4 mr-2" /> Ver detalle
                              </DropdownMenuItem>

                              {p.state === "Borrador" && p.actions.includes("edit") && (
                                <DropdownMenuItem onClick={() => setEditPresupuestoId(p.id)}>
                                  <Pencil className="size-4 mr-2" /> Editar borrador
                                </DropdownMenuItem>
                              )}

                              {p.actions.includes("emit") && (
                                <DropdownMenuItem onClick={() => handleEmit(p)}>
                                  <Send className="size-4 mr-2" /> Emitir presupuesto
                                </DropdownMenuItem>
                              )}

                              {p.actions.includes("approve") && (
                                <DropdownMenuItem onClick={() => handleApprove(p)}>
                                  <CheckCircle2 className="size-4 mr-2 text-emerald-600" /> Aprobar
                                </DropdownMenuItem>
                              )}

                              {p.actions.includes("reject") && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedPresupuesto(p)
                                    setRejectDialogOpen(true)
                                  }}
                                >
                                  <XCircle className="size-4 mr-2" /> Rechazar
                                </DropdownMenuItem>
                              )}

                              {p.actions.includes("revise") && (
                                <DropdownMenuItem onClick={() => handleRevise(p)}>
                                  <FileCheck className="size-4 mr-2" /> Crear nueva versión
                                </DropdownMenuItem>
                              )}

                              {p.actions.includes("annul") && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedPresupuesto(p)
                                    setAnnulDialogOpen(true)
                                  }}
                                >
                                  <AlertTriangle className="size-4 mr-2" /> Anular
                                </DropdownMenuItem>
                              )}

                              {p.actions.includes("delete") && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedPresupuesto(p)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="size-4 mr-2" /> Eliminar borrador
                                </DropdownMenuItem>
                              )}

                              {p.surgeryId && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleAbrirExpediente(p.surgeryId!)}>
                                    <FolderOpen className="size-4 mr-2" /> Abrir expediente
                                  </DropdownMenuItem>
                                </>
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
                    <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                      {loading ? "Cargando presupuestos..." : "No se encontraron presupuestos"}
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
            <DialogTitle>
              Presupuesto {selectedPresupuesto?.visibleNumber ? `PR-${String(selectedPresupuesto.visibleNumber).padStart(5, "0")}` : selectedPresupuesto?.id} (v{selectedPresupuesto?.versionNumber})
            </DialogTitle>
            <DialogDescription>
              {selectedPresupuesto?.patient || "Sin paciente asignado"} — {selectedPresupuesto?.institution || "Sin institución"}
            </DialogDescription>
          </DialogHeader>
          {selectedPresupuesto && (
            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-muted-foreground">Cliente</span>
                  <p className="text-sm font-medium">{selectedPresupuesto.client || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <div className="mt-0.5"><StateBadge status={selectedPresupuesto.state} /></div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total</span>
                  <p className="text-sm font-bold">{formatCurrency(Number(selectedPresupuesto.total) || 0)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Fecha creación</span>
                  <p className="text-sm">{formatDate(selectedPresupuesto.createdAt)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Vigencia</span>
                  <p className="text-sm">{selectedPresupuesto.validUntil ? formatDate(selectedPresupuesto.validUntil) : "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Lista de precios</span>
                  <p className="text-sm font-mono text-xs">{selectedPresupuesto.priceListCode || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Condición de pago</span>
                  <p className="text-sm">{selectedPresupuesto.paymentTerms || "—"}</p>
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
              </div>

              <Separator />

              {/* Items table */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Artículos del presupuesto</h4>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Descripción</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">P. Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Desc.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">IVA</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPresupuesto.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{item.sku || "—"}</td>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unitPrice) || 0)}</td>
                          <td className="px-3 py-2 text-right">{Number(item.discount) > 0 ? formatCurrency(Number(item.discount)) : "—"}</td>
                          <td className="px-3 py-2 text-right text-xs">{item.vatRate || item.taxRate || "0"}%</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(item.total) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="px-3 py-2 text-right font-semibold">Total</td>
                        <td className="px-3 py-2 text-right font-bold">{formatCurrency(Number(selectedPresupuesto.total) || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Legend & Notes */}
              {selectedPresupuesto.legend && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Leyenda</h4>
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-md p-2.5 italic">
                    {selectedPresupuesto.legend}
                  </p>
                </div>
              )}

              {selectedPresupuesto.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Observaciones</h4>
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                    {selectedPresupuesto.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Dialog ── */}
      <PresupuestoFormDialog
        mode="dialog"
        context="independent"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={() => {
          refresh()
          setCreateDialogOpen(false)
        }}
      />

      {/* ── Reject Dialog ── */}
      <PresupuestoFormDialog
        mode="dialog"
        context="independent"
        presupuestoId={editPresupuestoId ?? undefined}
        open={editPresupuestoId !== null}
        onOpenChange={(open) => { if (!open) setEditPresupuestoId(null) }}
        onSubmit={() => { void refresh(); setEditPresupuestoId(null) }}
      />

      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Rechazar Presupuesto"
        description={`¿Rechazar el presupuesto ${selectedPresupuesto?.id}? Esta acción registrará el rechazo en el historial.`}
        confirmLabel="Rechazar"
        destructive
        onConfirm={handleConfirmReject}
      />

      {/* ── Annul Dialog ── */}
      <ConfirmDialog
        open={annulDialogOpen}
        onOpenChange={setAnnulDialogOpen}
        title="Anular Presupuesto"
        description={`¿Anular el presupuesto ${selectedPresupuesto?.id}? No podrá emitirse ni vincularse a facturación.`}
        confirmLabel="Anular"
        destructive
        onConfirm={handleConfirmAnnul}
      />

      {/* ── Delete Draft Dialog ── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Borrador"
        description={`¿Eliminar definitivamente el borrador ${selectedPresupuesto?.id}?`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

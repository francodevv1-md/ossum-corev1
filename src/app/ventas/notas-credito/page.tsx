"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { CLIENT_OPTIONS } from "@/lib/statusHelpers"
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
  FileText, Eye, MoreHorizontal, Plus, DollarSign,
  Clock, CheckCircle2, FolderOpen, MinusCircle,
} from "lucide-react"
import type { NotaCredito } from "@/types"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Borrador", label: "Borrador" },
  { value: "Emitida", label: "Emitida" },
  { value: "Aplicada", label: "Aplicada" },
  { value: "Anulada", label: "Anulada" },
]

const MOTIVO_OPTIONS = [
  "Devolución de material",
  "Diferencia de precio",
  "Material no utilizado",
  "Error en facturación",
  "Anulación parcial",
  "Otro",
]

export default function NotasCreditoPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Create form
  const [formFacturaId, setFormFacturaId] = useState("")
  const [formSurgeryId, setFormSurgeryId] = useState("")
  const [formClient, setFormClient] = useState("")
  const [formMotivo, setFormMotivo] = useState("")
  const [formImporte, setFormImporte] = useState(0)
  const [formObservaciones, setFormObservaciones] = useState("")

  const notasCredito = store.notasCredito

  const filtered = useMemo(() => {
    let data = notasCredito.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (nc) =>
          nc.id.toLowerCase().includes(q) ||
          nc.client.toLowerCase().includes(q) ||
          nc.motivo.toLowerCase().includes(q) ||
          nc.facturaId.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((nc) => nc.state === stateFilter)
    if (clientFilter) data = data.filter((nc) => nc.client === clientFilter)
    return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [notasCredito, search, stateFilter, clientFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const emitidas = filtered.filter((nc) => nc.state === "Emitida").length
    const aplicadas = filtered.filter((nc) => nc.state === "Aplicada").length
    const monto = filtered.reduce((sum, nc) => sum + nc.importe, 0)
    return { total, emitidas, aplicadas, monto }
  }, [filtered])

  // Available FV comprobantes for selection
  const facturas = store.comprobantes.filter((c) => c.type === "FV")

  const handleCreate = () => {
    if (!formFacturaId || !formClient || !formMotivo || formImporte <= 0) {
      toast.error("Complete los campos obligatorios")
      return
    }
    store.createNotaCredito({
      facturaId: formFacturaId,
      surgeryId: formSurgeryId,
      client: formClient,
      motivo: formMotivo,
      importe: formImporte,
      state: "Borrador",
      observaciones: formObservaciones || undefined,
    })
    toast.success("Nota de crédito creada exitosamente")
    setCreateDialogOpen(false)
    setFormFacturaId("")
    setFormSurgeryId("")
    setFormClient("")
    setFormMotivo("")
    setFormImporte(0)
    setFormObservaciones("")
  }

  const handleFacturaSelect = (facturaNumber: string) => {
    setFormFacturaId(facturaNumber)
    const factura = facturas.find((f) => f.number === facturaNumber)
    if (factura) {
      setFormClient(factura.client)
      setFormSurgeryId(factura.surgeryId)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Notas de Crédito</h1>
          <p className="text-sm text-muted-foreground">Gestión de notas de crédito emitidas</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" /> Nueva NC
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total NC" value={stats.total} icon={MinusCircle} />
        <StatsCard title="Emitidas" value={stats.emitidas} icon={Clock} />
        <StatsCard title="Aplicadas" value={stats.aplicadas} icon={CheckCircle2} />
        <StatsCard title="Monto total" value={formatCurrency(stats.monto)} icon={DollarSign} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="ID, cliente, factura, motivo..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={clientFilter} onChange={setClientFilter} options={CLIENT_OPTIONS} />
            {(stateFilter || clientFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setClientFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} nota{filtered.length !== 1 ? "s" : ""} de crédito</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Factura</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cliente</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Motivo</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Importe</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((nc) => (
                  <tr key={nc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-primary">{nc.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{nc.facturaId}</td>
                    <td className="px-3 py-2.5 text-xs">{nc.surgeryId || "—"}</td>
                    <td className="px-3 py-2.5">{nc.client}</td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate">{nc.motivo}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-red-600">-{formatCurrency(nc.importe)}</td>
                    <td className="px-3 py-2.5"><StateBadge status={nc.state} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(nc.createdAt)}</td>
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
                            {nc.surgeryId && (
                              <DropdownMenuItem onClick={() => openExpediente(nc.surgeryId)}>
                                <FolderOpen className="size-4" /> Ver cirugía
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron notas de crédito
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create NC Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Nota de Crédito</DialogTitle>
            <DialogDescription>Crear nota de crédito para una factura</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Factura *</Label>
              <Select value={formFacturaId} onValueChange={handleFacturaSelect}>
                <SelectTrigger><SelectValue placeholder="Seleccionar factura" /></SelectTrigger>
                <SelectContent>
                  {facturas.map((f) => (
                    <SelectItem key={f.id} value={f.number}>{f.number} — {f.client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input value={formClient} onChange={(e) => setFormClient(e.target.value)} placeholder="Cliente" />
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={formMotivo} onValueChange={setFormMotivo}>
                <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                <SelectContent>
                  {MOTIVO_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Importe *</Label>
              <Input type="number" value={formImporte || ""} onChange={(e) => setFormImporte(Number(e.target.value) || 0)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea value={formObservaciones} onChange={(e) => setFormObservaciones(e.target.value)} placeholder="Detalles adicionales..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!formFacturaId || !formClient || !formMotivo || formImporte <= 0}>
              Crear Nota de Crédito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expediente Drawer */}
      <SurgeryDrawer />
    </div>
  )
}

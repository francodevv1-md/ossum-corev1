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
import { LegacyStandaloneNotice } from "@/components/legacy/LegacyStandaloneNotice"
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
import { ConfirmDialog } from "@/components/shared"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import { CONSUMO_ORIGIN_LABELS, CONSUMO_ORIGIN_COLORS } from "@/lib/consumos.constants"
import type { ConsumoOrigin } from "@/lib/consumos.constants"
import {
  Activity, Clock, CheckCircle2, Receipt,
  Eye, MoreHorizontal, FolderOpen,
  ChevronDown, ChevronRight, ShieldCheck,
} from "lucide-react"
import type { Consumo } from "@/types"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Validado", label: "Validado" },
  { value: "Facturado", label: "Facturado" },
]

const ORIGEN_OPTIONS = [
  { value: "", label: "Todos los orígenes" },
  { value: "remito", label: "Desde Remito" },
  { value: "manual", label: "Carga Manual" },
]

export default function ConsumoPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [origenFilter, setOrigenFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedConsumo, setSelectedConsumo] = useState<Consumo | null>(null)

  const consumos = store.consumos

  const filtered = useMemo(() => {
    let data = consumos.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.surgeryId.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((c) => c.state === stateFilter)
    if (origenFilter) data = data.filter((c) => c.origen === origenFilter)
    return data.sort((a, b) => {
      const sa = store.getSurgeryById(a.surgeryId)
      const sb = store.getSurgeryById(b.surgeryId)
      return (sb?.date || "").localeCompare(sa?.date || "")
    })
  }, [consumos, search, stateFilter, origenFilter, store])

  const stats = useMemo(() => {
    const total = filtered.length
    const pendientes = filtered.filter((c) => c.state === "Pendiente").length
    const validados = filtered.filter((c) => c.state === "Validado").length
    const facturados = filtered.filter((c) => c.state === "Facturado").length
    return { total, pendientes, validados, facturados }
  }, [filtered])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleValidate = () => {
    if (!selectedConsumo) return
    store.validateConsumption(selectedConsumo.id)
    toast.success(`Consumo ${selectedConsumo.id} validado`)
    setValidateDialogOpen(false)
    setSelectedConsumo(null)
  }

  return (
    <div className="space-y-4">
      <LegacyStandaloneNotice
        description="La operación real de consumo vive en Ficha CX. Esta pantalla standalone queda como vista legacy de consulta transitoria."
        tabHint="Seleccioná una cirugía en Cirugías y abrí la pestaña Consumo de la Ficha CX."
      />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Consumo</h1>
          <p className="text-sm text-muted-foreground">Registro de consumo de materiales en cirugías</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Activity} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
        <StatsCard title="Validados" value={stats.validados} icon={CheckCircle2} />
        <StatsCard title="Facturados" value={stats.facturados} icon={Receipt} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="ID consumo, cirugía..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={origenFilter} onChange={setOrigenFilter} options={ORIGEN_OPTIONS} />
            {(stateFilter || search || origenFilter) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setOrigenFilter("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table with expandable rows */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">{filtered.length} consumo{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Caja</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Origen</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Items</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Validado por</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const surgery = store.getSurgeryById(c.surgeryId)
                  const isExpanded = expandedRows.has(c.id)
                  return (
                    <React.Fragment key={c.id}>
                      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-2.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(c.id)}>
                            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          </Button>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-medium">{c.id}</td>
                        <td className="px-3 py-2.5">
                          {surgery ? (
                            <span className="text-xs text-primary cursor-pointer hover:underline" onClick={() => openExpediente(surgery.id)}>
                              {surgery.id} — {surgery.patient}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{c.surgeryId}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{c.boxId}</td>
                        <td className="px-3 py-2.5">
                          {c.origen && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${CONSUMO_ORIGIN_COLORS[c.origen as ConsumoOrigin] || ""}`}>
                              {CONSUMO_ORIGIN_LABELS[c.origen as ConsumoOrigin] || c.origen}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5"><StateBadge status={c.state} /></td>
                        <td className="px-3 py-2.5 text-right text-xs">{c.items.length}</td>
                        <td className="px-3 py-2.5 text-xs">
                          {c.validatedBy || "—"}
                          {c.validatedAt && <span className="text-muted-foreground ml-1">({formatDate(c.validatedAt)})</span>}
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
                                <DropdownMenuItem onClick={() => { setSelectedConsumo(c); setDetailDialogOpen(true) }}>
                                  <Eye className="size-4" /> Ver detalle
                                </DropdownMenuItem>
                                {c.state === "Pendiente" && (
                                  <DropdownMenuItem onClick={() => { setSelectedConsumo(c); setValidateDialogOpen(true) }}>
                                    <ShieldCheck className="size-4" /> Validar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openExpediente(c.surgeryId)}>
                                  <FolderOpen className="size-4" /> Ver cirugía
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={9} className="px-6 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Código</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Nombre</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Lote</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Marca</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Dpto.</th>
                                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Consumido</th>
                                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Devuelto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.items.map((item, i) => (
                                  <tr key={i} className="border-b last:border-0">
                                    <td className="px-2 py-1.5 font-mono">{item.code}</td>
                                    <td className="px-2 py-1.5">{item.name}</td>
                                    <td className="px-2 py-1.5 font-mono">{item.lot || <span className="italic text-amber-600">Sin lote</span>}</td>
                                    <td className="px-2 py-1.5">{item.brand}</td>
                                    <td className="px-2 py-1.5">{item.department}</td>
                                    <td className="px-2 py-1.5 text-right font-bold text-emerald-600">{item.consumed}</td>
                                    <td className="px-2 py-1.5 text-right font-bold text-sky-600">{item.returned}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron consumos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Validate Dialog */}
      <ConfirmDialog
        open={validateDialogOpen}
        onOpenChange={setValidateDialogOpen}
        title="Validar Consumo"
        description={`¿Confirma la validación del consumo ${selectedConsumo?.id}? Esta acción registrará el consumo de forma definitiva.`}
        confirmLabel="Validar"
        onConfirm={handleValidate}
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalle de Consumo</DialogTitle>
            <DialogDescription>{selectedConsumo?.id}</DialogDescription>
          </DialogHeader>
          {selectedConsumo && (
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-muted-foreground">Cirugía:</span><p className="font-medium">{selectedConsumo.surgeryId}</p></div>
                <div><span className="text-muted-foreground">Caja:</span><p className="font-medium">{selectedConsumo.boxId}</p></div>
                <div><span className="text-muted-foreground">Origen:</span><p>{selectedConsumo.origen ? <Badge className={`text-[10px] ${CONSUMO_ORIGIN_COLORS[selectedConsumo.origen as ConsumoOrigin] || ""}`}>{CONSUMO_ORIGIN_LABELS[selectedConsumo.origen as ConsumoOrigin]}</Badge> : "—"}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p><StateBadge status={selectedConsumo.state} /></p></div>
                {selectedConsumo.justificacion && (
                  <div className="col-span-2"><span className="text-muted-foreground">Justificación:</span><p className="text-xs">{selectedConsumo.justificacion}</p></div>
                )}
                <div><span className="text-muted-foreground">Validado por:</span><p>{selectedConsumo.validatedBy || "—"}</p></div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dpto.</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rubro</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Consumido</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Devuelto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedConsumo.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-xs">{item.department}</td>
                      <td className="px-3 py-2 text-xs">{item.rubro}</td>
                      <td className="px-3 py-2 text-right font-bold">{item.consumed}</td>
                      <td className="px-3 py-2 text-right">{item.returned}</td>
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

      <SurgeryDrawer />
    </div>
  )
}

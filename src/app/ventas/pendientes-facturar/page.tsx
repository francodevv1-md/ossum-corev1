"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { getBadgeVariant, CLIENT_OPTIONS, INSTITUTION_OPTIONS } from "@/lib/statusHelpers"
import { canAutorizarFV } from "@/lib/businessRules"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  Receipt, Clock, CheckCircle2, AlertTriangle, Eye,
  FileText, FolderOpen, ShieldCheck, CircleDot,
  BookOpen, Activity, Truck, DollarSign,
  XCircle,
} from "lucide-react"
import type { Surgery, DocumentStatus } from "@/types"

// ── Readiness level ──
type Readiness = "ready" | "almost" | "blocked"

interface PendienteItem {
  surgery: Surgery
  readiness: Readiness
  docStatus: DocumentStatus
  consumoState?: string
  hasPresupuesto: boolean
  hasRemito: boolean
  estimatedAmount: number
  blockers: string[]
}

const FILTER_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "ready", label: "Listas para facturar" },
  { value: "almost", label: "Con observaciones" },
  { value: "blocked", label: "Bloqueadas" },
]

export default function PendientesFacturarPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [readinessFilter, setReadinessFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")
  const [institutionFilter, setInstitutionFilter] = useState("")
  const [facturarDialogOpen, setFacturarDialogOpen] = useState(false)
  const [facturaNumber, setFacturaNumber] = useState("")
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null)

  // ── Compute pendientes ──
  const pendientes = useMemo(() => {
    const result: PendienteItem[] = []

    // Surgeries that are Realizada and not yet facturado
    const candidates = store.surgeries.filter(
      (s) => s.state === "Realizada" && !s.facturado
    )

    for (const surgery of candidates) {
      const docChecklist = store.getDocumentChecklistBySurgeryId(surgery.id)
      const docStatus = docChecklist?.status || "Incompleta"
      const consumo = store.getConsumoBySurgeryId(surgery.id)
      const consumoState = consumo?.state
      const presupuesto = store.presupuestos.find((p) => p.surgeryId === surgery.id)
      const hasPresupuesto = !!presupuesto
      const remitos = store.getRemitosBySurgeryId(surgery.id)
      const hasRemito = remitos.length > 0
      const estimatedAmount = presupuesto?.total || 0

      const blockers: string[] = []
      if (!surgery.autorizado) blockers.push("Cirugía no autorizada")
      if (docStatus === "Incompleta") blockers.push("Documentación incompleta")
      if (!consumoState || consumoState === "Pendiente") blockers.push("Consumo no validado")
      if (!hasPresupuesto) blockers.push("Sin presupuesto")
      if (docStatus === "Pendiente" || docStatus === "Completa") blockers.push("Documentación en proceso")

      let readiness: Readiness = "ready"
      if (blockers.length > 0) {
        // Check if "almost ready" — only minor issues
        const majorBlockers = blockers.filter(
          (b) => b !== "Sin presupuesto" && b !== "Documentación en proceso"
        )
        readiness = majorBlockers.length === 0 && blockers.length <= 2 ? "almost" : "blocked"
      }

      result.push({
        surgery,
        readiness,
        docStatus,
        consumoState,
        hasPresupuesto,
        hasRemito,
        estimatedAmount,
        blockers,
      })
    }

    return result
  }, [store])

  const filtered = useMemo(() => {
    let data = pendientes.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (p) =>
          p.surgery.patient.toLowerCase().includes(q) ||
          p.surgery.surgeon.toLowerCase().includes(q) ||
          p.surgery.institution.toLowerCase().includes(q) ||
          p.surgery.id.toLowerCase().includes(q)
      )
    }
    if (readinessFilter) data = data.filter((p) => p.readiness === readinessFilter)
    if (clientFilter) data = data.filter((p) => p.surgery.client === clientFilter)
    if (institutionFilter) data = data.filter((p) => p.surgery.institution === institutionFilter)
    return data
  }, [pendientes, search, readinessFilter, clientFilter, institutionFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const ready = filtered.filter((p) => p.readiness === "ready").length
    const almost = filtered.filter((p) => p.readiness === "almost").length
    const blocked = filtered.filter((p) => p.readiness === "blocked").length
    const montoEstimado = filtered.reduce((sum, p) => sum + p.estimatedAmount, 0)
    return { total, ready, almost, blocked, montoEstimado }
  }, [filtered])

  // ── Facturar handler ──
  const handleFacturar = () => {
    if (!selectedSurgery || !facturaNumber.trim()) return
    const result = canAutorizarFV(selectedSurgery, store.getDocStatus(selectedSurgery.id))
    if (!result.allowed) {
      toast.error(result.reason || "No se puede facturar esta cirugía")
      return
    }
    store.authorizeInvoice(selectedSurgery.id, facturaNumber.trim())
    toast.success(`Factura ${facturaNumber} emitida exitosamente`)
    setFacturarDialogOpen(false)
    setFacturaNumber("")
    setSelectedSurgery(null)
  }

  // ── Readiness badge colors ──
  const getReadinessStyle = (r: Readiness) => {
    switch (r) {
      case "ready": return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
      case "almost": return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
      case "blocked": return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
    }
  }

  const getReadinessBadge = (r: Readiness) => {
    switch (r) {
      case "ready": return <Badge variant="success" className="text-[10px] gap-1"><CheckCircle2 className="size-3" /> Lista</Badge>
      case "almost": return <Badge variant="warning" className="text-[10px] gap-1"><AlertTriangle className="size-3" /> Casi</Badge>
      case "blocked": return <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="size-3" /> Bloqueada</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Pendientes Facturar</h1>
          <p className="text-sm text-muted-foreground">Cirugías realizadas listas para facturación</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total pendientes" value={stats.total} icon={Clock} />
        <StatsCard title="Listas para facturar" value={stats.ready} icon={CheckCircle2} className={stats.ready > 0 ? "border-emerald-200" : ""} />
        <StatsCard title="Con observaciones" value={stats.almost} icon={AlertTriangle} className={stats.almost > 0 ? "border-amber-200" : ""} />
        <StatsCard title="Monto estimado" value={formatCurrency(stats.montoEstimado)} icon={DollarSign} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Paciente, médico, institución, ID..." className="w-full sm:w-72" />
            <FilterSelect value={readinessFilter} onChange={setReadinessFilter} options={FILTER_OPTIONS} />
            <FilterSelect value={clientFilter} onChange={setClientFilter} options={CLIENT_OPTIONS} />
            <FilterSelect value={institutionFilter} onChange={setInstitutionFilter} options={INSTITUTION_OPTIONS} />
            {(readinessFilter || clientFilter || institutionFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setReadinessFilter(""); setClientFilter(""); setInstitutionFilter("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-emerald-500" />
          <span className="text-muted-foreground">Lista para facturar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-amber-500" />
          <span className="text-muted-foreground">Casi lista / con observaciones</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-sm bg-red-500" />
          <span className="text-muted-foreground">Bloqueada</span>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">{filtered.length} cirugía{filtered.length !== 1 ? "s" : ""} pendiente{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Paciente</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Médico</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Institución</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cliente/OS</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Documentación</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Consumo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Presupuesto</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Remito</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Importe est.</th>
                  <th className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const { surgery, readiness, docStatus, consumoState, hasPresupuesto, hasRemito, estimatedAmount, blockers } = p
                  return (
                    <tr
                      key={surgery.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${getReadinessStyle(readiness)}`}
                      onClick={() => openExpediente(surgery.id)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-primary">{surgery.id}</span>
                          {getReadinessBadge(readiness)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{surgery.patient}</td>
                      <td className="px-3 py-2.5 text-xs">{surgery.surgeon}</td>
                      <td className="px-3 py-2.5 text-xs">{surgery.institution}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs">
                          <div>{surgery.client}</div>
                          {surgery.obraSocial && <div className="text-muted-foreground">{surgery.obraSocial}</div>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(surgery.date)}</td>
                      <td className="px-3 py-2.5"><StateBadge status={surgery.state} /></td>
                      <td className="px-3 py-2.5">
                        {docStatus === "Apta para facturar" ? (
                          <Badge variant="success" className="text-[10px] gap-1"><CheckCircle2 className="size-3" /> Apta</Badge>
                        ) : docStatus === "Completa" ? (
                          <Badge variant="info" className="text-[10px]">Completa</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">{docStatus}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {consumoState === "Validado" ? (
                          <Badge variant="success" className="text-[10px] gap-1"><CheckCircle2 className="size-3" /> Validado</Badge>
                        ) : consumoState === "Pendiente" ? (
                          <Badge variant="warning" className="text-[10px]">Pendiente</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Sin consumo</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {hasPresupuesto ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="size-4 text-red-400" />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {hasRemito ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="size-4 text-red-400" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {estimatedAmount > 0 ? formatCurrency(estimatedAmount) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {readiness === "ready" || readiness === "almost" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedSurgery(surgery)
                                  setFacturarDialogOpen(true)
                                }}
                              >
                                <Receipt className="size-3" />
                                <span className="text-xs">Facturar</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Emitir factura</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-red-400" disabled>
                                <XCircle className="size-3" />
                                <span className="text-xs">Bloqueada</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-0.5">
                                {blockers.map((b, i) => (
                                  <div key={i}>• {b}</div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                      No hay cirugías pendientes de facturar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Facturar Dialog ── */}
      <Dialog open={facturarDialogOpen} onOpenChange={setFacturarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Facturar Cirugía</DialogTitle>
            <DialogDescription>
              Emitir factura para cirugía {selectedSurgery?.id} — {selectedSurgery?.patient}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="space-y-2">
              <Label>Número de factura *</Label>
              <Input
                value={facturaNumber}
                onChange={(e) => setFacturaNumber(e.target.value)}
                placeholder="FV-2026-XXXX"
              />
            </div>
            {selectedSurgery && (
              <div className="rounded-md border p-3 text-xs space-y-1 bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{selectedSurgery.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Institución</span>
                  <span>{selectedSurgery.institution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Importe est.</span>
                  <span className="font-medium">{formatCurrency(store.presupuestos.find((p) => p.surgeryId === selectedSurgery.id)?.total || 0)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacturarDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleFacturar} disabled={!facturaNumber.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              Emitir Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expediente Drawer */}
      <SurgeryDrawer />
    </div>
  )
}

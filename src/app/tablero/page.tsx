"use client"

import React, { useState, useMemo, useCallback } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { StateBadge, StatsCard, SearchInput, FilterSelect, SectionHeader } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { SURGERY_STATE_OPTIONS, CLASSIFICATION_OPTIONS, getBadgeVariant } from "@/lib/statusHelpers"
import { runAutomations } from "@/lib/automations"
import { toast } from "sonner"
import { Scissors, ShieldCheck, Package, Truck, Receipt, Plus, Zap, Download, Search, CheckCircle2, XCircle, FileText, Activity, ArrowRight, RotateCcw, Kanban, Eye } from "lucide-react"
import type { SurgeryState, SurgeryClassification, Surgery } from "@/types"

// ── Kanban column definitions ──
interface KanbanColumn {
  id: string
  label: string
  color: string
  description: string
  matches: (surgery: Surgery) => boolean
}

const isPreparationOperational = (surgery: Surgery) =>
  surgery.state === "Pendiente" &&
  ["En preparación", "Enviado", "Entregado"].includes(surgery.preparationState)

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "ingreso",
    label: "Ingreso",
    color: "border-slate-400",
    description: "Sin autorizar · Pendiente",
    matches: (surgery) => ["Sin autorizar", "Pendiente"].includes(surgery.state),
  },
  {
    id: "autorizada",
    label: "Autorizada",
    color: "border-blue-500",
    description: "Autorizada",
    matches: (surgery) => surgery.state === "Autorizada",
  },
  {
    id: "preparacion",
    label: "Preparación operativa",
    color: "border-teal-500",
    description: "Pendiente · preparación activa",
    matches: isPreparationOperational,
  },
  {
    id: "realizada",
    label: "Realizada",
    color: "border-purple-500",
    description: "Realizada",
    matches: (surgery) => surgery.state === "Realizada",
  },
  {
    id: "finalizada",
    label: "Finalizada",
    color: "border-emerald-500",
    description: "Finalizada · Sin consumo",
    matches: (surgery) => ["Finalizada", "Sin consumo"].includes(surgery.state),
  },
  {
    id: "suspendida",
    label: "Suspendida/Cancelada",
    color: "border-red-500",
    description: "Suspendida · Cancelada",
    matches: (surgery) => ["Suspendida", "Cancelada"].includes(surgery.state),
  },
]

const COLUMN_BG: Record<string, string> = {
  ingreso: "bg-slate-50 dark:bg-slate-900/30",
  autorizada: "bg-blue-50 dark:bg-blue-900/20",
  preparacion: "bg-teal-50 dark:bg-teal-900/20",
  realizada: "bg-purple-50 dark:bg-purple-900/20",
  finalizada: "bg-emerald-50 dark:bg-emerald-900/20",
  suspendida: "bg-red-50 dark:bg-red-900/20",
}

const COLUMN_HEADER_BG: Record<string, string> = {
  ingreso: "bg-slate-200 dark:bg-slate-800",
  autorizada: "bg-blue-200 dark:bg-blue-800",
  preparacion: "bg-teal-200 dark:bg-teal-800",
  realizada: "bg-purple-200 dark:bg-purple-800",
  finalizada: "bg-emerald-200 dark:bg-emerald-800",
  suspendida: "bg-red-200 dark:bg-red-800",
}

export default function TableroPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [classFilter, setClassFilter] = useState("")
  const [surgeonFilter, setSurgeonFilter] = useState("")

  // ── Unique surgeons for filter ──
  const surgeonOptions = useMemo(() => {
    const surgeons = Array.from(new Set(store.surgeries.map((s) => s.surgeon))).sort()
    return [{ value: "", label: "Todos los médicos" }, ...surgeons.map((s) => ({ value: s, label: s }))]
  }, [store.surgeries])

  // ── Filtered surgeries ──
  const filtered = useMemo(() => {
    let data = store.surgeries.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (s) =>
          s.patient.toLowerCase().includes(q) ||
          s.surgeon.toLowerCase().includes(q) ||
          s.institution.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((s) => s.state === stateFilter)
    if (classFilter) data = data.filter((s) => s.classification === classFilter)
    if (surgeonFilter) data = data.filter((s) => s.surgeon === surgeonFilter)
    return data
  }, [store.surgeries, search, stateFilter, classFilter, surgeonFilter])

  // ── Group by column ──
  const columnData = useMemo(() => {
    const map: Record<string, Surgery[]> = {}
    for (const col of KANBAN_COLUMNS) {
        map[col.id] = filtered.filter(col.matches)
    }
    return map
  }, [filtered])

  // ── KPIs ──
  const kpis = useMemo(() => {
    const all = store.surgeries
    const activeStates: SurgeryState[] = [
      "Sin autorizar", "Pendiente", "Autorizada",
       "En tránsito", "Realizada", "Sin consumo",
    ]
    const activas = all.filter((s) => activeStates.includes(s.state)).length
    const pendAuth = all.filter((s) => s.state === "Sin autorizar" || s.state === "Pendiente").length
    const prepTrans = all.filter(isPreparationOperational).length
    const factMes = store.comprobantes
      .filter((c) => c.type === "FV" && c.date.startsWith(new Date().toISOString().slice(0, 7)))
      .reduce((acc, c) => acc + c.amount, 0)
    return { activas, pendAuth, prepTrans, factMes }
  }, [store.surgeries, store.comprobantes])

  // ── Pipeline metrics ──
  const pipelineMetrics = useMemo(() => {
    return KANBAN_COLUMNS.map((col) => ({
      label: col.label,
      count: columnData[col.id].length,
      color: col.color.replace("border-", ""),
    }))
  }, [columnData])

  // ── Advance state action ──
  const handleAdvance = useCallback(
    (surgery: Surgery) => {
      const success = runAutomations(store.changeSurgeryStatus, surgery.id, surgery.state)
      if (success) {
        toast.success(`Estado de ${surgery.id} avanzado`)
      } else {
        toast.info("No se puede avanzar desde este estado")
      }
    },
    [store]
  )

  // ── Recover action ──
  const handleRecover = useCallback(
    (surgery: Surgery) => {
      store.recoverSurgery(surgery.id)
      toast.success(`Cirugía ${surgery.id} recuperada`)
    },
    [store]
  )

  // ── Indicator icons for a surgery ──
  const SurgeryIndicators = ({ surgery }: { surgery: Surgery }) => {
    const hasPresupuesto = !!surgery.presupuestoId
    const hasRemito = !!surgery.remitoId
    const hasConsumo = store.getConsumoBySurgeryId(surgery.id) !== undefined
    const facturado = surgery.facturado

    return (
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Receipt className={cn("size-3", hasPresupuesto ? "text-blue-500" : "text-muted-foreground/40")} />
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {hasPresupuesto ? "Presupuesto OK" : "Sin presupuesto"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Package className={cn("size-3", hasRemito ? "text-teal-500" : "text-muted-foreground/40")} />
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {hasRemito ? "Remito OK" : "Sin remito"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Activity className={cn("size-3", hasConsumo ? "text-purple-500" : "text-muted-foreground/40")} />
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {hasConsumo ? "Consumo cargado" : "Sin consumo"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <FileText className={cn("size-3", facturado ? "text-emerald-500" : "text-muted-foreground/40")} />
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {facturado ? "Facturada" : "Sin facturar"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ── */}
      <SectionHeader
        title="Tablero Operativo"
        description="Vista Kanban del flujo de cirugías"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Kanban className="size-3 mr-1" />
              {filtered.length} cirugías
            </Badge>
          </div>
        }
      />

      {/* ── KPI Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Cirugías Activas"
          value={kpis.activas}
          icon={Scissors}
          subtitle="En proceso operativo"
        />
        <StatsCard
          title="Pendientes Autorizar"
          value={kpis.pendAuth}
          icon={ShieldCheck}
          subtitle="Requieren autorización"
        />
        <StatsCard
          title="En Preparación/Tránsito"
          value={kpis.prepTrans}
          icon={Truck}
          subtitle="Operativas activas"
        />
        <StatsCard
          title="Facturación del Mes"
          value={formatCurrency(kpis.factMes)}
          icon={Receipt}
          subtitle="Facturas emitidas"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Paciente, médico, institución, ID..."
          className="w-64"
        />
        <FilterSelect
          value={stateFilter}
          onChange={setStateFilter}
          options={SURGERY_STATE_OPTIONS}
          className="w-44"
        />
        <FilterSelect
          value={classFilter}
          onChange={setClassFilter}
          options={CLASSIFICATION_OPTIONS}
          className="w-52"
        />
        <FilterSelect
          value={surgeonFilter}
          onChange={setSurgeonFilter}
          options={surgeonOptions}
          className="w-52"
        />
        {(search || stateFilter || classFilter || surgeonFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setSearch("")
              setStateFilter("")
              setClassFilter("")
              setSurgeonFilter("")
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Kanban Board ── */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px]">
          {KANBAN_COLUMNS.map((col) => {
            const surgeries = columnData[col.id]
            return (
              <div
                key={col.id}
                className={cn(
                  "flex-1 min-w-[220px] rounded-lg border-t-4",
                  col.color,
                  COLUMN_BG[col.id] || "bg-background"
                )}
              >
                {/* Column header */}
                <div className={cn("px-3 py-2 rounded-t-lg", COLUMN_HEADER_BG[col.id] || "bg-muted")}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold">{col.label}</h3>
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                      {surgeries.length}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                     {col.description}
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 max-h-[calc(100vh-26rem)] overflow-y-auto">
                  {surgeries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Kanban className="size-6 text-muted-foreground/30 mb-1" />
                      <p className="text-[10px] text-muted-foreground">Sin cirugías</p>
                    </div>
                  ) : (
                    surgeries.map((surgery) => (
                      <Card
                        key={surgery.id}
                        className={cn(
                          "cursor-pointer hover:shadow-md transition-shadow border-l-4",
                          col.color,
                          "border-t-0 border-r-0 border-b-0"
                        )}
                        onClick={() => openExpediente(surgery.id)}
                      >
                        <CardContent className="p-3 space-y-2">
                          {/* Patient + ID */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{surgery.patient}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                Dr. {surgery.surgeon}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[9px] shrink-0 px-1 py-0">
                              {surgery.id}
                            </Badge>
                          </div>

                          {/* Institution + Date */}
                          <div className="text-[10px] text-muted-foreground space-y-0.5">
                            <div className="truncate">{surgery.institution}</div>
                            <div>{formatDate(surgery.date)} {surgery.time || ""}</div>
                          </div>

                          {/* Classification badge */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <StateBadge status={surgery.state} className="text-[9px] px-1" />
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {surgery.classification}
                            </Badge>
                          </div>

                          {/* Indicators */}
                          <div className="flex items-center justify-between">
                            <SurgeryIndicators surgery={surgery} />
                          </div>

                          {/* Action button */}
                          <div className="flex items-center gap-1 pt-1">
                             {(col.id === "ingreso" || col.id === "autorizada" || col.id === "realizada") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-1 px-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAdvance(surgery)
                                }}
                              >
                                <ArrowRight className="size-3" />
                                Avanzar
                              </Button>
                            )}
                            {(col.id === "suspendida") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-1 px-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRecover(surgery)
                                }}
                              >
                                <RotateCcw className="size-3" />
                                Recuperar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] gap-1 px-2 ml-auto"
                              onClick={(e) => {
                                e.stopPropagation()
                                openExpediente(surgery.id)
                              }}
                            >
                              <Eye className="size-3" />
                              Ver
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Pipeline Metrics ── */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pipeline de Cirugías
          </h4>
          <div className="flex items-end gap-1 h-16">
            {pipelineMetrics.map((m) => {
              const maxCount = Math.max(...pipelineMetrics.map((p) => p.count), 1)
              const height = Math.max(8, Math.round((m.count / maxCount) * 100))
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold">{m.count}</span>
                  <div
                    className={cn(
                      "w-full rounded-t",
                      m.color === "slate-400" && "bg-slate-400",
                      m.color === "blue-500" && "bg-blue-500",
                      m.color === "teal-500" && "bg-teal-500",
                      m.color === "purple-500" && "bg-purple-500",
                      m.color === "emerald-500" && "bg-emerald-500",
                      m.color === "red-500" && "bg-red-500"
                    )}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[8px] text-muted-foreground text-center leading-tight truncate w-full">
                    {m.label}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

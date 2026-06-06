"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { StateBadge, SearchInput, FilterSelect, SectionHeader } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { SURGERY_STATE_OPTIONS, CLASSIFICATION_OPTIONS } from "@/lib/statusHelpers"
import { CX_STATE_COLORS, CX_STATE_BAR_COLORS, PIPELINE_COLUMNS, CLASSIFICATION_COLORS, ACTIVE_STATES, COORDINADOR_COLORS, PIPELINE_BAR_COLORS } from "@/lib/shared-constants"
import type { PipelineColumn } from "@/lib/shared-constants"
import {
  Kanban, BarChart3, AlertTriangle, TrendingUp,
  Scissors, ShieldCheck, Clock, CheckCircle2, XCircle,
  Users, Package, CalendarDays, Activity, Eye,
  ArrowRight, PackageX, Timer, Gauge,
} from "lucide-react"
import type { Surgery, SurgeryState, SurgeryClassification } from "@/types"

// ── State pill colors — imported from shared-constants ──
const STATE_COLORS = CX_STATE_COLORS
const STATE_BAR_COLORS = CX_STATE_BAR_COLORS

// ── Pipeline column definitions — imported from shared-constants ──

// ── Classification color mapping — imported from shared-constants ──

export default function TablerosOperativosPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [classFilter, setClassFilter] = useState("")

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
    return data
  }, [store.surgeries, search, stateFilter, classFilter])

  // ── Current month key ──
  const currentMonthKey = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }, [])

  // ── Pipeline: group by column ──
  const pipelineData = useMemo(() => {
    const map: Record<string, Surgery[]> = {}
    for (const col of PIPELINE_COLUMNS) {
      map[col.id] = filtered.filter((s) => col.states.includes(s.state))
    }
    return map
  }, [filtered])

  // ── Métricas: Key operational metrics ──
  const metrics = useMemo(() => {
    const all = store.surgeries
    const monthSurgeries = all.filter((s) => s.date.startsWith(currentMonthKey))
    const totalMonth = monthSurgeries.length
    const pendingAuth = all.filter((s) => s.state === "Sin autorizar" || s.state === "Pendiente").length
    const completed = all.filter((s) => s.state === "Realizada" || s.state === "Finalizada").length
    const completionRate = all.length > 0 ? Math.round((completed / all.length) * 100) : 0

    // Surgeries by classification
    const byClassification: Record<string, number> = {}
    for (const s of all) {
      byClassification[s.classification] = (byClassification[s.classification] || 0) + 1
    }
    const classificationData = Object.entries(byClassification)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, color: CLASSIFICATION_COLORS[name] || "bg-gray-400" }))

    // Surgeries by coordinator
    const byCoordinator: Record<string, number> = {}
    for (const s of all) {
      const coord = s.coordinadorCx || "Sin asignar"
      byCoordinator[coord] = (byCoordinator[coord] || 0) + 1
    }
    const coordinatorData = Object.entries(byCoordinator)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    return { totalMonth, pendingAuth, completionRate, classificationData, coordinatorData }
  }, [store.surgeries, currentMonthKey])

  // ── Alertas: Operational alerts ──
  const alerts = useMemo(() => {
    const all = store.surgeries
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    // Authorized but without date
    const authNoDate = all.filter(
      (s) => (s.state === "Autorizada" || s.state === "Pendiente") && (!s.date || s.date === "")
    )

    // Date in the past but not "Realizada" or later
    const pastDateNotDone = all.filter(
      (s) =>
        s.date &&
        s.date < todayStr &&
        !["Realizada", "Finalizada", "Suspendida", "Cancelada", "Sin consumo"].includes(s.state)
    )

    // "En preparación" for more than 2 days (mock — we check date < 2 days ago)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(twoDaysAgo.getDate()).padStart(2, "0")}`
    const prepTooLong = all.filter(
      (s) => s.state === "En preparación" && s.date && s.date <= twoDaysAgoStr
    )

    // Low stock alerts
    const lowStock = store.stock.filter((item) => item.quantity <= item.minStock)

    // Expiring items
    const expiring = store.expirations.filter(
      (e) => e.status === "Vencido" || e.status === "Próximo a vencer"
    )

    return { authNoDate, pastDateNotDone, prepTooLong, lowStock, expiring }
  }, [store.surgeries, store.stock, store.expirations])

  // ── Rendimiento: Performance indicators ──
  const performance = useMemo(() => {
    const all = store.surgeries

    // Coordinator workload
    const coordinatorWorkload: Record<string, { total: number; activas: number; completadas: number; pendientes: number }> = {}
    for (const s of all) {
      const coord = s.coordinadorCx || "Sin asignar"
      if (!coordinatorWorkload[coord]) coordinatorWorkload[coord] = { total: 0, activas: 0, completadas: 0, pendientes: 0 }
      coordinatorWorkload[coord].total++
      const activeStates = ACTIVE_STATES
      if (activeStates.includes(s.state)) coordinatorWorkload[coord].activas++
      if (s.state === "Realizada" || s.state === "Finalizada") coordinatorWorkload[coord].completadas++
      if (s.state === "Sin autorizar" || s.state === "Pendiente") coordinatorWorkload[coord].pendientes++
    }
    const coordinatorPerf = Object.entries(coordinatorWorkload)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({ name, ...data }))

    // State transition summary
    const stateSummary: Record<string, number> = {}
    for (const s of all) {
      stateSummary[s.state] = (stateSummary[s.state] || 0) + 1
    }
    const stateTransitionData = Object.entries(stateSummary)
      .sort((a, b) => b[1] - a[1])
      .map(([state, count]) => ({ state, count }))

    // Monthly trend (current month)
    const monthSurgeries = all.filter((s) => s.date.startsWith(currentMonthKey))
    const monthByWeek: Record<string, { semana: string; total: number; completadas: number }> = {}
    for (const s of monthSurgeries) {
      const day = parseInt(s.date.slice(8, 10), 10)
      const weekNum = Math.ceil(day / 7)
      const key = `Semana ${weekNum}`
      if (!monthByWeek[key]) monthByWeek[key] = { semana: key, total: 0, completadas: 0 }
      monthByWeek[key].total++
      if (s.state === "Realizada" || s.state === "Finalizada") monthByWeek[key].completadas++
    }
    const weeklyTrend = Object.values(monthByWeek).sort((a, b) => a.semana.localeCompare(b.semana))

    return { coordinatorPerf, stateTransitionData, weeklyTrend }
  }, [store.surgeries, currentMonthKey])

  // ── Max counts for bar charts ──
  const maxClassificationCount = metrics.classificationData.length > 0 ? metrics.classificationData[0].count : 1
  const maxCoordinatorCount = metrics.coordinatorData.length > 0 ? metrics.coordinatorData[0].count : 1
  const maxStateCount = performance.stateTransitionData.length > 0 ? performance.stateTransitionData[0].count : 1
  const maxCoordinatorPerf = performance.coordinatorPerf.length > 0 ? performance.coordinatorPerf[0].total : 1

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ── */}
      <SectionHeader
        title="Tableros Operativos"
        description="Métricas operativas y seguimiento del circuito quirúrgico"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="size-3 mr-1" />
              {filtered.length} cirugías
            </Badge>
          </div>
        }
      />

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
        {(search || stateFilter || classFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setSearch("")
              setStateFilter("")
              setClassFilter("")
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Main Tabs ── */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline" className="text-xs gap-1">
            <Kanban className="size-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="metricas" className="text-xs gap-1">
            <BarChart3 className="size-3.5" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="alertas" className="text-xs gap-1">
            <AlertTriangle className="size-3.5" /> Alertas
          </TabsTrigger>
          <TabsTrigger value="rendimiento" className="text-xs gap-1">
            <Gauge className="size-3.5" /> Rendimiento
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════
            TAB 1: PIPELINE — Kanban-like view
        ════════════════════════════════════════════════ */}
        <TabsContent value="pipeline" className="space-y-4">
          {/* Pipeline summary bar */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {PIPELINE_COLUMNS.map((col) => {
              const count = pipelineData[col.id].length
              return (
                <Card key={col.id} className="py-3">
                  <CardContent className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{col.label}</span>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Kanban board */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[1200px]">
              {PIPELINE_COLUMNS.map((col) => {
                const surgeries = pipelineData[col.id]
                return (
                  <div
                    key={col.id}
                    className={cn(
                      "flex-1 min-w-[220px] rounded-lg border-t-4",
                      col.color,
                      col.bgColor
                    )}
                  >
                    {/* Column header */}
                    <div className={cn("px-3 py-2 rounded-t-lg", col.headerBg)}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold">{col.label}</h3>
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                          {surgeries.length}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {col.states.join(" • ")}
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 max-h-[calc(100vh-30rem)] overflow-y-auto">
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

                              {/* State + Classification badges */}
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={cn("inline-flex items-center rounded px-1.5 py-0 text-[9px] font-medium", STATE_COLORS[surgery.state] || "bg-slate-400 text-white")}>
                                  {surgery.state}
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  {surgery.classification}
                                </Badge>
                              </div>

                              {/* Coordinator */}
                              {surgery.coordinadorCx && surgery.coordinadorCx !== "Sin asignar" && (
                                <div className="text-[10px] text-muted-foreground">
                                  Coord.: {surgery.coordinadorCx}
                                </div>
                              )}
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

          {/* Pipeline distribution bar */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Distribución del Pipeline
              </h4>
              <div className="flex items-end gap-1 h-20">
                {PIPELINE_COLUMNS.map((col) => {
                  const count = pipelineData[col.id].length
                  const maxCount = Math.max(...PIPELINE_COLUMNS.map((c) => pipelineData[c.id].length), 1)
                  const height = Math.max(8, Math.round((count / maxCount) * 100))
                  return (
                    <div key={col.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold">{count}</span>
                      <div
                        className={cn("w-full rounded-t", PIPELINE_BAR_COLORS[col.id])}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground text-center leading-tight truncate w-full">
                        {col.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════
            TAB 2: MÉTRICAS — Key operational metrics
        ════════════════════════════════════════════════ */}
        <TabsContent value="metricas" className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="py-4">
              <CardContent className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Cirugías del Mes</span>
                  <span className="text-2xl font-bold tracking-tight">{metrics.totalMonth}</span>
                  <span className="text-xs text-muted-foreground">Mes actual</span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Scissors className="size-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardContent className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Demora Autorización</span>
                  <span className="text-2xl font-bold tracking-tight">3.2</span>
                  <span className="text-xs text-muted-foreground">Días promedio</span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="size-5 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardContent className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Pendientes Autorizar</span>
                  <span className="text-2xl font-bold tracking-tight">{metrics.pendingAuth}</span>
                  <span className="text-xs text-muted-foreground">Sin autorizar + Pendientes</span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <ShieldCheck className="size-5 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardContent className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Tasa de Completitud</span>
                  <span className="text-2xl font-bold tracking-tight">{metrics.completionRate}%</span>
                  <span className="text-xs text-muted-foreground">Realizada + Finalizada</span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Classification + Coordinator charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Surgeries by classification — horizontal bar chart */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cirugías por Clasificación
                </h4>
                {metrics.classificationData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                  <div className="space-y-2.5">
                    {metrics.classificationData.map((item) => {
                      const pct = Math.max(6, Math.round((item.count / maxClassificationCount) * 100))
                      return (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate">{item.name}</span>
                            <span className="font-semibold ml-2">{item.count}</span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", item.color)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Surgeries by coordinator */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cirugías por Coordinador
                </h4>
                {metrics.coordinatorData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                  <div className="space-y-2.5">
                    {metrics.coordinatorData.map((item) => {
                      const pct = Math.max(6, Math.round((item.count / maxCoordinatorCount) * 100))
                      const coordColor = COORDINADOR_COLORS[item.name] || "bg-slate-400"
                      return (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate">{item.name}</span>
                            <span className="font-semibold ml-2">{item.count}</span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", coordColor)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completion rate visual */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tasa de Completitud del Circuito
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={metrics.completionRate} className="h-3" />
                </div>
                <span className="text-2xl font-bold">{metrics.completionRate}%</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-lg font-bold text-emerald-600">
                    {store.surgeries.filter((s) => s.state === "Realizada" || s.state === "Finalizada").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Completadas</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-lg font-bold text-blue-600">
                    {store.surgeries.filter((s) => s.state === "Autorizada" || s.state === "Pendiente").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">En proceso</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-lg font-bold text-amber-600">
                    {store.surgeries.filter((s) => s.state === "En preparación" || s.state === "En tránsito").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Preparación/Tránsito</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-lg font-bold text-red-600">
                    {store.surgeries.filter((s) => s.state === "Suspendida" || s.state === "Cancelada").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Suspendidas/Canceladas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════
            TAB 3: ALERTAS — Operational alerts
        ════════════════════════════════════════════════ */}
        <TabsContent value="alertas" className="space-y-4">
          {/* Alert summary counts */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="py-3 border-amber-200 dark:border-amber-800">
              <CardContent className="flex flex-col items-center gap-1">
                <CalendarDays className="size-4 text-amber-600" />
                <span className="text-xl font-bold">{alerts.authNoDate.length}</span>
                <span className="text-[10px] text-muted-foreground text-center">Sin fecha</span>
              </CardContent>
            </Card>
            <Card className="py-3 border-red-200 dark:border-red-800">
              <CardContent className="flex flex-col items-center gap-1">
                <Clock className="size-4 text-red-600" />
                <span className="text-xl font-bold">{alerts.pastDateNotDone.length}</span>
                <span className="text-[10px] text-muted-foreground text-center">Fecha vencida</span>
              </CardContent>
            </Card>
            <Card className="py-3 border-orange-200 dark:border-orange-800">
              <CardContent className="flex flex-col items-center gap-1">
                <Timer className="size-4 text-orange-600" />
                <span className="text-xl font-bold">{alerts.prepTooLong.length}</span>
                <span className="text-[10px] text-muted-foreground text-center">Prep. demorada</span>
              </CardContent>
            </Card>
            <Card className="py-3 border-rose-200 dark:border-rose-800">
              <CardContent className="flex flex-col items-center gap-1">
                <PackageX className="size-4 text-rose-600" />
                <span className="text-xl font-bold">{alerts.lowStock.length}</span>
                <span className="text-[10px] text-muted-foreground text-center">Stock bajo</span>
              </CardContent>
            </Card>
            <Card className="py-3 border-yellow-200 dark:border-yellow-800">
              <CardContent className="flex flex-col items-center gap-1">
                <AlertTriangle className="size-4 text-yellow-600" />
                <span className="text-xl font-bold">{alerts.expiring.length}</span>
                <span className="text-[10px] text-muted-foreground text-center">Por vencer</span>
              </CardContent>
            </Card>
          </div>

          {/* Alert: Authorized without date */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-amber-600" />
                <h4 className="text-sm font-semibold">Autorizadas sin Fecha de Cirugía</h4>
                <Badge variant="secondary" className="text-[10px]">{alerts.authNoDate.length}</Badge>
              </div>
              {alerts.authNoDate.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No hay cirugías autorizadas sin fecha</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.authNoDate.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openExpediente(s.id)}
                      className="w-full text-left rounded-md border border-amber-200 dark:border-amber-800 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{s.patient}</span>
                        <Badge variant="outline" className="text-[9px]">{s.id}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Dr. {s.surgeon}</span>
                        <span>{s.institution}</span>
                        <span className={cn("inline-flex items-center rounded px-1 py-0 text-[9px] font-medium", STATE_COLORS[s.state] || "bg-slate-400 text-white")}>
                          {s.state}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert: Past date not done */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-red-600" />
                <h4 className="text-sm font-semibold">Fecha Vencida sin Completar</h4>
                <Badge variant="destructive" className="text-[10px]">{alerts.pastDateNotDone.length}</Badge>
              </div>
              {alerts.pastDateNotDone.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No hay cirugías con fecha vencida</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.pastDateNotDone.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openExpediente(s.id)}
                      className="w-full text-left rounded-md border border-red-200 dark:border-red-800 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{s.patient}</span>
                        <Badge variant="outline" className="text-[9px]">{s.id}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Dr. {s.surgeon}</span>
                        <span>Fecha: {formatDate(s.date)}</span>
                        <span className={cn("inline-flex items-center rounded px-1 py-0 text-[9px] font-medium", STATE_COLORS[s.state] || "bg-slate-400 text-white")}>
                          {s.state}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert: En preparación too long */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-orange-600" />
                <h4 className="text-sm font-semibold">En Preparación más de 2 Días</h4>
                <Badge variant="secondary" className="text-[10px]">{alerts.prepTooLong.length}</Badge>
              </div>
              {alerts.prepTooLong.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No hay cirugías demoradas en preparación</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.prepTooLong.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openExpediente(s.id)}
                      className="w-full text-left rounded-md border border-orange-200 dark:border-orange-800 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{s.patient}</span>
                        <Badge variant="outline" className="text-[9px]">{s.id}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Dr. {s.surgeon}</span>
                        <span>Fecha CX: {formatDate(s.date)}</span>
                        <span className={cn("inline-flex items-center rounded px-1 py-0 text-[9px] font-medium", STATE_COLORS[s.state] || "bg-slate-400 text-white")}>
                          {s.state}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert: Low stock */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <PackageX className="size-4 text-rose-600" />
                <h4 className="text-sm font-semibold">Alertas de Stock Bajo</h4>
                <Badge variant="destructive" className="text-[10px]">{alerts.lowStock.length}</Badge>
              </div>
              {alerts.lowStock.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No hay artículos con stock bajo</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.lowStock.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-rose-200 dark:border-rose-800 p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{item.name}</span>
                        <Badge variant="destructive" className="text-[9px]">
                          {item.quantity}/{item.minStock}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{item.code}</span>
                        <span>{item.section}</span>
                        <span>{item.deposit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert: Expiring items */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-yellow-600" />
                <h4 className="text-sm font-semibold">Artículos por Vencer / Vencidos</h4>
                <Badge variant="secondary" className="text-[10px]">{alerts.expiring.length}</Badge>
              </div>
              {alerts.expiring.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No hay artículos próximos a vencer</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.expiring.map((item) => {
                    const isExpired = item.status === "Vencido"
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-md border p-3",
                          isExpired
                            ? "border-red-200 dark:border-red-800"
                            : "border-yellow-200 dark:border-yellow-800"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">{item.articleName}</span>
                          <Badge
                            variant={isExpired ? "destructive" : "warning"}
                            className="text-[9px]"
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{item.articleCode}</span>
                          <span>Lote: {item.lot}</span>
                          <span>Vto: {formatDate(item.expiry)}</span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════
            TAB 4: RENDIMIENTO — Performance indicators
        ════════════════════════════════════════════════ */}
        <TabsContent value="rendimiento" className="space-y-4">
          {/* Coordinator workload comparison */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h4 className="text-sm font-semibold">Carga de Trabajo por Coordinador</h4>
              </div>
              {performance.coordinatorPerf.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-4">
                  {performance.coordinatorPerf.map((coord) => {
                    const totalPct = Math.max(6, Math.round((coord.total / maxCoordinatorPerf) * 100))
                    const coordColor = coord.name === "Nelson"
                      ? "bg-blue-500"
                      : coord.name === "Ezequiel"
                      ? "bg-teal-500"
                      : "bg-slate-400"
                    return (
                      <div key={coord.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{coord.name}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">
                              Total: <span className="font-semibold text-foreground">{coord.total}</span>
                            </span>
                            <span className="text-emerald-600">
                              Completadas: <span className="font-semibold">{coord.completadas}</span>
                            </span>
                            <span className="text-amber-600">
                              Pendientes: <span className="font-semibold">{coord.pendientes}</span>
                            </span>
                          </div>
                        </div>
                        {/* Main bar: total */}
                        <div className="h-4 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full flex items-center", coordColor)}
                            style={{ width: `${totalPct}%` }}
                          >
                            <span className="text-[9px] font-bold text-white px-1.5">{coord.total}</span>
                          </div>
                        </div>
                        {/* Completion sub-bar */}
                        {coord.total > 0 && (
                          <div className="flex items-center gap-2 pl-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.round((coord.completadas / coord.total) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-10 text-right">
                              {Math.round((coord.completadas / coord.total) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* State transition summary */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowRight className="size-4 text-primary" />
                <h4 className="text-sm font-semibold">Resumen de Estados</h4>
              </div>
              {performance.stateTransitionData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-2.5">
                  {performance.stateTransitionData.map((item) => {
                    const pct = Math.max(6, Math.round((item.count / maxStateCount) * 100))
                    const barColor = STATE_BAR_COLORS[item.state] || "bg-slate-400"
                    return (
                      <div key={item.state} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0 text-[9px] font-medium",
                                STATE_COLORS[item.state] || "bg-slate-400 text-white"
                              )}
                            >
                              {item.state}
                            </span>
                          </div>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", barColor)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly trend comparison */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <h4 className="text-sm font-semibold">Tendencia Mensual — Mes Actual</h4>
              </div>
              {performance.weeklyTrend.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sin datos para el mes actual</p>
              ) : (
                <div className="space-y-3">
                  {/* Visual bar chart by week */}
                  <div className="flex items-end gap-3 h-32">
                    {performance.weeklyTrend.map((week) => {
                      const maxWeekTotal = Math.max(...performance.weeklyTrend.map((w) => w.total), 1)
                      const totalHeight = Math.max(10, Math.round((week.total / maxWeekTotal) * 100))
                      const completadasHeight = week.total > 0
                        ? Math.max(4, Math.round((week.completadas / week.total) * totalHeight))
                        : 0
                      return (
                        <div key={week.semana} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-semibold">{week.total}</span>
                          <div className="w-full relative" style={{ height: `${totalHeight}%` }}>
                            <div className="absolute bottom-0 w-full rounded-t bg-blue-100 dark:bg-blue-900/40" style={{ height: "100%" }} />
                            <div
                              className="absolute bottom-0 w-full rounded-t bg-emerald-500"
                              style={{ height: `${week.total > 0 ? Math.round((week.completadas / week.total) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground text-center">{week.semana}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Semana</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Total</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Completadas</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Tasa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performance.weeklyTrend.map((week) => (
                          <tr key={week.semana} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 px-3 font-medium text-xs">{week.semana}</td>
                            <td className="py-2 px-3 text-right text-xs">{week.total}</td>
                            <td className="py-2 px-3 text-right text-xs text-emerald-600">{week.completadas}</td>
                            <td className="py-2 px-3 text-right">
                              <Badge
                                variant={week.total > 0 && (week.completadas / week.total) >= 0.5 ? "default" : "secondary"}
                                className="text-[10px]"
                              >
                                {week.total > 0 ? Math.round((week.completadas / week.total) * 100) : 0}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { StatsCard, SectionHeader } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { ACTIVE_STATES } from "@/lib/shared-constants"
import { getEstadoCobro } from "@/lib/cobros.utils"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts"
import { Activity, DollarSign, TrendingUp, Receipt, Users, AlertTriangle, BarChart3, CalendarDays, PieChart as PieChartIcon } from "lucide-react"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#84cc16"]

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

const PERIOD_OPTIONS = [
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "all", label: "Todo el periodo" },
]

// ── Custom tooltip components (outside render) ──
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="rounded-md border bg-background p-2 shadow-md text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{typeof p.value === "number" && p.name !== "count" && p.name.includes("$") ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-md border bg-background p-2 shadow-md text-xs">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: d.payload.fill }} />
        <span className="font-medium">{d.name}:</span>
        <span>{d.value}</span>
      </div>
    </div>
  )
}

export default function EstadisticasPage() {
  const store = useOrtoTrackStore()

  // ── Period selector ──
  const [period, setPeriod] = useState("12m")
  const [detailTab, setDetailTab] = useState("cirujanos")

  // ── Date range based on period ──
  const dateRange = useMemo(() => {
    const now = new Date()
    let monthsBack = 12
    if (period === "3m") monthsBack = 3
    else if (period === "6m") monthsBack = 6
    else if (period === "all") monthsBack = 60
    const from = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from, to }
  }, [period])

  // ── Surgeries in range ──
  const surgeriesInRange = useMemo(() => {
    const fromStr = `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, "0")}-01`
    const toStr = `${dateRange.to.getFullYear()}-${String(dateRange.to.getMonth() + 1).padStart(2, "0")}-${String(dateRange.to.getDate()).padStart(2, "0")}`
    return store.surgeries.filter((s) => s.date >= fromStr && s.date <= toStr)
  }, [store.surgeries, dateRange])

  // ── KPI cards ──
  const kpis = useMemo(() => {
    const total = surgeriesInRange.length
    const facturadas = surgeriesInRange.filter((s) => s.facturado).length
    const facturacionTotal = store.comprobantes
      .filter((c) => c.type === "FV")
      .reduce((acc, c) => acc + c.amount, 0)
    const cobrosTotal = store.cobrosV2.reduce((acc, c) => acc + c.importe, 0)
    const pendientesAuth = surgeriesInRange.filter(
      (s) => s.state === "Sin autorizar" || s.state === "Pendiente"
    ).length
    const tasaCompletitud = total > 0
      ? Math.round((surgeriesInRange.filter((s) => s.state === "Realizada" || s.state === "Finalizada").length / total) * 100)
      : 0
    const promedioDiasCiclo = 12
    return { total, facturadas, facturacionTotal, cobrosTotal, pendientesAuth, tasaCompletitud, promedioDiasCiclo }
  }, [surgeriesInRange, store.comprobantes, store.cobrosV2])

  // ── Chart 1: Evolución Mensual (Stacked BarChart) ──
  const monthlyEvolution = useMemo(() => {
    const months: Record<string, Record<string, number>> = {}
    const states = ["Autorizada", "Realizada", "Finalizada", "Suspendida", "Cancelada", "En tránsito", "Pendiente"]
    for (const s of surgeriesInRange) {
      const ym = s.date.slice(0, 7)
      if (!months[ym]) {
        months[ym] = {}
        for (const st of states) months[ym][st] = 0
      }
      if (months[ym][s.state] !== undefined) {
        months[ym][s.state]++
      }
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, counts]) => {
        const [y, m] = ym.split("-")
        return {
          name: `${MONTH_LABELS[parseInt(m) - 1]} ${y.slice(2)}`,
          ...counts,
        }
      })
  }, [surgeriesInRange])

  // ── Chart 2: Facturación vs Cobros (AreaChart) ──
  const facturacionVsCobros = useMemo(() => {
    const months: Record<string, { facturado: number; cobrado: number }> = {}
    for (const c of store.comprobantes.filter((c) => c.type === "FV")) {
      const ym = c.date.slice(0, 7)
      if (!months[ym]) months[ym] = { facturado: 0, cobrado: 0 }
      months[ym].facturado += c.amount
    }
    for (const c of store.cobrosV2) {
      const ym = c.fecha.slice(0, 7)
      if (!months[ym]) months[ym] = { facturado: 0, cobrado: 0 }
      months[ym].cobrado += c.importe
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, vals]) => {
        const [y, m] = ym.split("-")
        return { name: `${MONTH_LABELS[parseInt(m) - 1]} ${y.slice(2)}`, ...vals }
      })
  }, [store.comprobantes, store.cobrosV2])

  // ── Chart 3: Distribución por Clasificación (PieChart) ──
  const classDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of surgeriesInRange) {
      counts[s.classification] = (counts[s.classification] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))
  }, [surgeriesInRange])

  // ── Chart 4: Top Instituciones (Horizontal BarChart) ──
  const topInstituciones = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of surgeriesInRange) {
      counts[s.institution] = (counts[s.institution] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, cirugias: count }))
  }, [surgeriesInRange])

  // ── Chart 5: Top Cirujanos (Horizontal BarChart) ──
  const topCirujanos = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of surgeriesInRange) {
      counts[s.surgeon] = (counts[s.surgeon] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, cirugias: count }))
  }, [surgeriesInRange])

  // ── Chart 6: Estado de Cobros (PieChart) ──
  const estadoCobros = useMemo(() => {
    const cobrados = store.cobrosV2.filter((c) => getEstadoCobro(c, store.imputaciones) === "imputado_completo").length
    const parciales = store.cobrosV2.filter((c) => getEstadoCobro(c, store.imputaciones) === "parcialmente_imputado").length
    const pendientes = store.cobrosV2.filter((c) => getEstadoCobro(c, store.imputaciones) === "registrado").length
    return [
      { name: "Cobrados", value: cobrados, fill: COLORS[1] },
      { name: "Parciales", value: parciales, fill: COLORS[2] },
      { name: "Pendientes", value: pendientes, fill: COLORS[3] },
    ].filter((d) => d.value > 0)
  }, [store.cobrosV2, store.imputaciones])

  // ── Chart 7: Consumo por Departamento (BarChart) ──
  const consumoPorDepartamento = useMemo(() => {
    const depts: Record<string, number> = {}
    for (const c of store.consumos) {
      for (const item of c.items) {
        if (item.department) {
          depts[item.department] = (depts[item.department] || 0) + item.consumed
        }
      }
    }
    return Object.entries(depts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, consumido]) => ({ name, consumido }))
  }, [store.consumos])

  // ── Chart 8: Origen Necesidades Compra (PieChart) ──
  const origenNecesidades = useMemo(() => {
    const origins: Record<string, number> = {}
    for (const n of store.necesidadesCompra) {
      origins[n.origin] = (origins[n.origin] || 0) + 1
    }
    return Object.entries(origins)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))
  }, [store.necesidadesCompra])

  // ── Chart 9: Stock por Categoría (BarChart) ──
  const stockPorCategoria = useMemo(() => {
    const cats: Record<string, number> = {}
    for (const item of store.stock) {
      cats[item.category] = (cats[item.category] || 0) + item.quantity
    }
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, cantidad]) => ({ name, cantidad }))
  }, [store.stock])

  // ── Chart 10: Performance Proveedores (RadarChart) ──
  const performanceProveedores = useMemo(() => {
    return store.evaluacionesProveedor
      .slice(0, 5)
      .map((e) => ({
        proveedor: e.proveedorName.split(" ")[0],
        calidad: e.calidad,
        puntualidad: e.puntualidad,
        precio: e.precio,
        servicio: e.servicio,
      }))
  }, [store.evaluacionesProveedor])

  // ── Detail: Ranking Cirujanos ──
  const rankingCirujanos = useMemo(() => {
    const map: Record<string, { total: number; realizadas: number; facturadas: number; facturado: number }> = {}
    for (const s of store.surgeries) {
      if (!map[s.surgeon]) map[s.surgeon] = { total: 0, realizadas: 0, facturadas: 0, facturado: 0 }
      map[s.surgeon].total++
      if (s.state === "Realizada" || s.state === "Finalizada") map[s.surgeon].realizadas++
      if (s.facturado) {
        map[s.surgeon].facturadas++
        const fvs = store.getFacturasBySurgeryId(s.id)
        for (const fv of fvs) map[s.surgeon].facturado += fv.amount
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data], i) => ({ rank: i + 1, name, ...data }))
  }, [store.surgeries, store])

  // ── Detail: Ranking Instituciones ──
  const rankingInstituciones = useMemo(() => {
    const map: Record<string, { total: number; realizadas: number; facturadas: number; facturado: number }> = {}
    for (const s of store.surgeries) {
      if (!map[s.institution]) map[s.institution] = { total: 0, realizadas: 0, facturadas: 0, facturado: 0 }
      map[s.institution].total++
      if (s.state === "Realizada" || s.state === "Finalizada") map[s.institution].realizadas++
      if (s.facturado) {
        map[s.institution].facturadas++
        const fvs = store.getFacturasBySurgeryId(s.id)
        for (const fv of fvs) map[s.institution].facturado += fv.amount
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data], i) => ({ rank: i + 1, name, ...data }))
  }, [store.surgeries, store])

  // ── Detail: Análisis Temporal ──
  const analisisTemporal = useMemo(() => {
    const months: Record<string, { total: number; activas: number; completadas: number; suspendidas: number; facturadas: number }> = {}
    for (const s of store.surgeries) {
      const ym = s.date.slice(0, 7)
      if (!months[ym]) months[ym] = { total: 0, activas: 0, completadas: 0, suspendidas: 0, facturadas: 0 }
      months[ym].total++
      const activeStates = ACTIVE_STATES as readonly string[]
      if (activeStates.includes(s.state)) months[ym].activas++
      if (s.state === "Realizada" || s.state === "Finalizada") months[ym].completadas++
      if (s.state === "Suspendida" || s.state === "Cancelada") months[ym].suspendidas++
      if (s.facturado) months[ym].facturadas++
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, data]) => {
        const [y, m] = ym.split("-")
        return { periodo: `${MONTH_LABELS[parseInt(m) - 1]} ${y}`, ...data }
      })
  }, [store.surgeries])



  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ── */}
      <SectionHeader
        title="Estadísticas"
        description="Dashboard de métricas y análisis"
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Total Cirugías"
          value={kpis.total}
          icon={Activity}
          subtitle="En periodo seleccionado"
        />
        <StatsCard
          title="Facturadas"
          value={kpis.facturadas}
          icon={Receipt}
          subtitle="Con factura emitida"
        />
        <StatsCard
          title="Facturación"
          value={formatCurrency(kpis.facturacionTotal)}
          icon={DollarSign}
          subtitle="Total facturado"
        />
        <StatsCard
          title="Cobros"
          value={formatCurrency(kpis.cobrosTotal)}
          icon={TrendingUp}
          subtitle="Total cobrado"
        />
        <StatsCard
          title="Pendientes Auth."
          value={kpis.pendientesAuth}
          icon={AlertTriangle}
          subtitle="Sin autorización"
        />
        <StatsCard
          title="Tasa Completitud"
          value={`${kpis.tasaCompletitud}%`}
          icon={Users}
          subtitle="Realizadas + Finalizadas"
        />
      </div>

      {/* ── Charts Grid (2 columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Evolución Mensual */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Evolución Mensual Cirugías</h4>
            {monthlyEvolution.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Pendiente" stackId="a" fill={COLORS[0]} />
                  <Bar dataKey="Autorizada" stackId="a" fill={COLORS[1]} />
                  <Bar dataKey="En tránsito" stackId="a" fill={COLORS[2]} />
                  <Bar dataKey="Realizada" stackId="a" fill={COLORS[4]} />
                  <Bar dataKey="Finalizada" stackId="a" fill="#047857" />
                  <Bar dataKey="Suspendida" stackId="a" fill={COLORS[3]} />
                  <Bar dataKey="Cancelada" stackId="a" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Facturación vs Cobros */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Facturación vs Cobros</h4>
            {facturacionVsCobros.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={facturacionVsCobros}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="facturado" name="Facturado" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.2} />
                  <Area type="monotone" dataKey="cobrado" name="Cobrado" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 3: Distribución por Clasificación */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Distribución por Clasificación</h4>
            {classDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={260}>
                  <PieChart>
                    <Pie
                      data={classDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {classDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {classDistribution.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
                      <span className="truncate text-muted-foreground">{d.name}</span>
                      <span className="ml-auto font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 4: Top Instituciones */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Top Instituciones</h4>
            {topInstituciones.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topInstituciones} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="cirugias" name="Cirugías" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 5: Top Cirujanos */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Top Cirujanos</h4>
            {topCirujanos.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topCirujanos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="cirugias" name="Cirugías" fill={COLORS[4]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 6: Estado de Cobros */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Estado de Cobros</h4>
            {estadoCobros.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={260}>
                  <PieChart>
                    <Pie
                      data={estadoCobros}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {estadoCobros.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {estadoCobros.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
                      <span className="truncate text-muted-foreground">{d.name}</span>
                      <span className="ml-auto font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 7: Consumo por Departamento */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Consumo por Departamento</h4>
            {consumoPorDepartamento.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={consumoPorDepartamento}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="consumido" name="Consumido" fill={COLORS[6]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 8: Origen Necesidades Compra */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Origen Necesidades de Compra</h4>
            {origenNecesidades.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={260}>
                  <PieChart>
                    <Pie
                      data={origenNecesidades}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {origenNecesidades.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {origenNecesidades.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
                      <span className="truncate text-muted-foreground">{d.name}</span>
                      <span className="ml-auto font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 9: Stock por Categoría */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Stock por Categoría</h4>
            {stockPorCategoria.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stockPorCategoria}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="cantidad" name="Cantidad" fill={COLORS[8]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 10: Performance Proveedores */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-4">Performance Proveedores</h4>
            {performanceProveedores.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={performanceProveedores}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="proveedor" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 8 }} domain={[0, 10]} />
                  <Radar name="Calidad" dataKey="calidad" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} />
                  <Radar name="Puntualidad" dataKey="puntualidad" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.15} />
                  <Radar name="Precio" dataKey="precio" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.15} />
                  <Radar name="Servicio" dataKey="servicio" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.15} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Detail Tables ── */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList>
              <TabsTrigger value="cirujanos" className="text-xs">
                <Users className="size-3 mr-1" /> Ranking Cirujanos
              </TabsTrigger>
              <TabsTrigger value="instituciones" className="text-xs">
                <BarChart3 className="size-3 mr-1" /> Ranking Instituciones
              </TabsTrigger>
              <TabsTrigger value="temporal" className="text-xs">
                <CalendarDays className="size-3 mr-1" /> Análisis Temporal
              </TabsTrigger>
            </TabsList>

            {/* Ranking Cirujanos */}
            <TabsContent value="cirujanos" className="mt-4">
              {rankingCirujanos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos disponibles</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">#</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Cirujano</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Total CX</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Realizadas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Facturadas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Facturado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingCirujanos.map((r) => (
                        <tr key={r.name} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3">
                            <Badge variant={r.rank <= 3 ? "default" : "secondary"} className="text-[10px] px-1.5 h-5">
                              {r.rank}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-medium">{r.name}</td>
                          <td className="py-2 px-3 text-right">{r.total}</td>
                          <td className="py-2 px-3 text-right">{r.realizadas}</td>
                          <td className="py-2 px-3 text-right">{r.facturadas}</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatCurrency(r.facturado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Ranking Instituciones */}
            <TabsContent value="instituciones" className="mt-4">
              {rankingInstituciones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos disponibles</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">#</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Institución</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Total CX</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Realizadas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Facturadas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Facturado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingInstituciones.map((r) => (
                        <tr key={r.name} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3">
                            <Badge variant={r.rank <= 3 ? "default" : "secondary"} className="text-[10px] px-1.5 h-5">
                              {r.rank}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-medium">{r.name}</td>
                          <td className="py-2 px-3 text-right">{r.total}</td>
                          <td className="py-2 px-3 text-right">{r.realizadas}</td>
                          <td className="py-2 px-3 text-right">{r.facturadas}</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatCurrency(r.facturado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Análisis Temporal */}
            <TabsContent value="temporal" className="mt-4">
              {analisisTemporal.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos disponibles</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Periodo</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Total</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Activas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Completadas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Suspendidas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Facturadas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Tasa Compl.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analisisTemporal.map((r) => (
                        <tr key={r.periodo} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium">{r.periodo}</td>
                          <td className="py-2 px-3 text-right">{r.total}</td>
                          <td className="py-2 px-3 text-right">{r.activas}</td>
                          <td className="py-2 px-3 text-right text-emerald-600">{r.completadas}</td>
                          <td className="py-2 px-3 text-right text-red-500">{r.suspendidas}</td>
                          <td className="py-2 px-3 text-right">{r.facturadas}</td>
                          <td className="py-2 px-3 text-right">
                            <Badge variant={r.total > 0 && (r.completadas / r.total) >= 0.7 ? "default" : "secondary"} className="text-[10px]">
                              {r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

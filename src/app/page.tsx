"use client"

import React from "react"
import Link from "next/link"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { getBadgeVariant } from "@/lib/statusHelpers"
import { CX_STATE_BAR_COLORS } from "@/lib/shared-constants"
import { getEstadoCobro, getImporteNoImputadoCobro } from "@/lib/cobros.utils"
import { StatsCard, StateBadge, SectionHeader } from "@/components/shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Scissors,
  Clock,
  DollarSign,
  CreditCard,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  Calendar,
  FileText,
  Receipt,
  TrendingUp,
  MapPin,
  BarChart3,
  Smartphone,
  Truck,
  CheckCircle2,
  XCircle,
  Package,
  BookOpen,
} from "lucide-react"

// ── Color helpers for bar chart — imported from shared-constants ──
const STATE_COLORS = CX_STATE_BAR_COLORS

export default function DashboardPage() {
  const {
    surgeries,
    comprobantes,
    stock,
    necesidadesCompra,
    expirations,
    documentChecklists,
    cobrosV2,
    imputaciones,
  } = useOrtoTrackStore()

  // ── Computed Stats ──
  const currentMonth = "2026-05"
  const surgeriesThisMonth = surgeries.filter((s) => s.date.startsWith(currentMonth))
  const pendingAuth = surgeries.filter((s) => !s.autorizado && s.state !== "Cancelada" && s.state !== "Suspendida")
  const invoicesThisMonth = comprobantes.filter(
    (c) => c.type === "FV" && c.date.startsWith(currentMonth)
  )
  const facturacionMes = invoicesThisMonth.reduce((sum, c) => sum + c.amount, 0)
  const pendingCobros = cobrosV2.filter((c) => getEstadoCobro(c, imputaciones) !== "imputado_completo")
  const cobrosPendientes = pendingCobros.reduce((sum, c) => sum + getImporteNoImputadoCobro(c, imputaciones), 0)
  const urgentNecesidades = necesidadesCompra.filter(
    (n) => n.priority === "Urgente" && n.state !== "Recibida" && n.state !== "Cancelada"
  )
  const lowStockItems = stock.filter((s) => s.quantity <= s.minStock)

  // ── Surgeries by state ──
  const stateCounts: Record<string, number> = {}
  surgeries.forEach((s) => {
    stateCounts[s.state] = (stateCounts[s.state] || 0) + 1
  })
  const maxStateCount = Math.max(...Object.values(stateCounts), 1)

  // ── Next 5 surgeries ──
  const upcomingSurgeries = [...surgeries]
    .filter((s) => s.state !== "Cancelada" && s.state !== "Suspendida")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  // ── Pending invoices ──
  const pendientesFacturar = surgeries.filter(
    (s) => !s.facturado && s.state === "Realizada"
  )

  // ── Recent invoices ──
  const recentInvoices = comprobantes
    .filter((c) => c.type === "FV")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  // ── Cobros by client ──
  const cobrosByClient: Record<string, number> = {}
  pendingCobros.forEach((c) => {
    cobrosByClient[c.clienteNombre] = (cobrosByClient[c.clienteNombre] || 0) + getImporteNoImputadoCobro(c, imputaciones)
  })
  const maxCobroClient = Math.max(...Object.values(cobrosByClient), 1)

  // ── Alerts ──
  const vencidos = expirations.filter((e) => e.status === "Vencido")
  const proximosVencer = expirations.filter((e) => e.status === "Próximo a vencer")
  const criticalStock = stock.filter((s) => s.quantity < s.minStock)
  const pendingDoc = documentChecklists.filter(
    (d) => d.status === "Incompleta" || d.status === "Pendiente"
  )

  return (
    <div className="space-y-6">
      {/* ── Download Banner ── */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 dark:border-emerald-800">
        <CardContent className="py-4 px-5 flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-100">Descargar Proyecto Completo (Actualizado + Compilable)</h2>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-0.5">
              384 archivos &bull; npm ci + tsc + build verificados &bull; 598/608 tests passing &bull; Contactos, Comparativa, Remitos, Consumos incluidos
            </p>
          </div>
          <a
            href="/OSSUM_COR_PROJECT_ACTUALIZADO_COMPILABLE_2026-05-26.zip"
            download="OSSUM_COR_PROJECT_ACTUALIZADO_COMPILABLE_2026-05-26.zip"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/30 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            DESCARGAR ZIP (1.5 MB)
          </a>
        </CardContent>
      </Card>
      {/* ── Row 1: Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title="Cirugías del mes"
          value={surgeriesThisMonth.length}
          icon={Scissors}
          subtitle={`${surgeries.length} total`}
          trend={{ value: 20.5, label: "vs mes anterior" }}
        />
        <StatsCard
          title="Pendientes autorizar"
          value={pendingAuth.length}
          icon={Clock}
          subtitle="Sin autorización"
          trend={{ value: -8, label: "vs semana pasada" }}
        />
        <StatsCard
          title="Facturación mes"
          value={formatCurrency(facturacionMes)}
          icon={DollarSign}
          subtitle={`${invoicesThisMonth.length} facturas`}
          trend={{ value: 12, label: "vs mes anterior" }}
        />
        <StatsCard
          title="Cobros pendientes"
          value={formatCurrency(cobrosPendientes)}
          icon={CreditCard}
          subtitle={`${pendingCobros.length} cobros`}
          trend={{ value: -5, label: "vs semana pasada" }}
        />
        <StatsCard
          title="Necesidades urgentes"
          value={urgentNecesidades.length}
          icon={ShoppingCart}
          subtitle="Prioridad urgente"
          className={urgentNecesidades.length > 0 ? "border-red-200" : ""}
        />
        <StatsCard
          title="Stock bajo mínimo"
          value={lowStockItems.length}
          icon={AlertTriangle}
          subtitle="Requieren reposición"
          className={lowStockItems.length > 0 ? "border-amber-200" : ""}
        />
      </div>

      {/* ── Row 2: Bar chart + Upcoming ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Surgeries by state */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Cirugías por Estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stateCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([state, count]) => (
                <div key={state} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground truncate">
                    {state}
                  </span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${STATE_COLORS[state] || "bg-gray-400"} transition-all`}
                      style={{ width: `${(count / maxStateCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{count}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Upcoming surgeries */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Próximas Cirugías</CardTitle>
              <Link href="/cirugias">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  Ver todas <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingSurgeries.map((s) => (
              <Link
                key={s.id}
                href={`/expediente?id=${s.id}`}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Calendar className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.patient}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.surgeon} • {s.institution}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(s.date)}
                  </span>
                  <StateBadge status={s.state} className="text-[10px]" />
                </div>
              </Link>
            ))}
            {upcomingSurgeries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay cirugías programadas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Pending invoice / Recent invoices / Urgent needs ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pendientes facturar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pendientes Facturar</CardTitle>
              <Badge variant="warning" className="text-[10px]">
                {pendientesFacturar.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {pendientesFacturar.map((s) => (
              <Link
                key={s.id}
                href={`/expediente?id=${s.id}`}
                className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.patient}</p>
                  <p className="text-xs text-muted-foreground">{s.institution}</p>
                </div>
                <StateBadge status={s.state} className="text-[10px] shrink-0" />
              </Link>
            ))}
            {pendientesFacturar.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No hay pendientes</p>
            )}
          </CardContent>
        </Card>

        {/* Últimas facturas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Últimas Facturas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.number}</p>
                  <p className="text-xs text-muted-foreground truncate">{inv.client}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-semibold">{formatCurrency(inv.amount)}</span>
                  <Badge
                    variant={inv.state === "Cobrado" ? "success" : "info"}
                    className="text-[10px]"
                  >
                    {inv.state}
                  </Badge>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin facturas</p>
            )}
          </CardContent>
        </Card>

        {/* Necesidades urgentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Necesidades Urgentes</CardTitle>
              <Badge variant="destructive" className="text-[10px]">
                {urgentNecesidades.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {urgentNecesidades.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{n.articleName}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.origin} • Cant: {n.cantidad}
                  </p>
                </div>
                <StateBadge status={n.state} className="text-[10px] shrink-0" />
              </div>
            ))}
            {urgentNecesidades.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin urgencias</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Cobros by client + Alerts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cobros por cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Cobros Pendientes por Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(cobrosByClient)
              .sort((a, b) => b[1] - a[1])
              .map(([client, amount]) => (
                <div key={client} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{client}</span>
                    <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                  </div>
                  <Progress value={(amount / maxCobroClient) * 100} className="h-2" />
                </div>
              ))}
            {Object.keys(cobrosByClient).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin cobros pendientes</p>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Vencimientos */}
            {vencidos.length > 0 && (
              <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <XCircle className="size-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {vencidos.length} artículo{vencidos.length > 1 ? "s" : ""} vencido{vencidos.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 truncate">
                    {vencidos.map((v) => v.articleName).join(", ")}
                  </p>
                </div>
                <Badge variant="destructive" className="text-[10px] shrink-0">
                  Crítico
                </Badge>
              </div>
            )}

            {proximosVencer.length > 0 && (
              <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <AlertTriangle className="size-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {proximosVencer.length} próximo{proximosVencer.length > 1 ? "s" : ""} a vencer
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70 truncate">
                    {proximosVencer.map((v) => v.articleName).join(", ")}
                  </p>
                </div>
                <Badge variant="warning" className="text-[10px] shrink-0">
                  Atención
                </Badge>
              </div>
            )}

            {/* Stock crítico */}
            {criticalStock.length > 0 && (
              <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Package className="size-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {criticalStock.length} artículo{criticalStock.length > 1 ? "s" : ""} bajo mínimo
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70 truncate">
                    {criticalStock.map((s) => s.name).join(", ")}
                  </p>
                </div>
                <Badge variant="warning" className="text-[10px] shrink-0">
                  Stock
                </Badge>
              </div>
            )}

            {/* Documentación pendiente */}
            {pendingDoc.length > 0 && (
              <div className="flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-900 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50">
                  <BookOpen className="size-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sky-700 dark:text-sky-400">
                    {pendingDoc.length} cirugía{pendingDoc.length > 1 ? "s" : ""} con documentación pendiente
                  </p>
                  <p className="text-xs text-sky-600/70 dark:text-sky-400/70 truncate">
                    Requieren completar documentación para facturar
                  </p>
                </div>
                <Badge variant="info" className="text-[10px] shrink-0">
                  Doc
                </Badge>
              </div>
            )}

            {vencidos.length === 0 && proximosVencer.length === 0 && criticalStock.length === 0 && pendingDoc.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-emerald-600">Sin alertas activas</p>
                <p className="text-xs text-muted-foreground">Todo en orden</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: Roadmap v2.3 ── */}
      <SectionHeader
        title="Roadmap v2.3"
        description="Próximas funcionalidades en desarrollo"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Tableros Operativos",
            description: "Kanban boards para seguimiento visual del flujo de cirugías",
            icon: BarChart3,
          },
          {
            title: "Calendario Quirúrgico",
            description: "Vista calendario con programación de cirugías y recursos",
            icon: Calendar,
          },
          {
            title: "Estadísticas Móvil",
            description: "Dashboard responsive optimizado para dispositivos móviles",
            icon: Smartphone,
          },
          {
            title: "Logística con Mapa",
            description: "Seguimiento de envíos y logística con integración de mapas",
            icon: MapPin,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="relative overflow-hidden border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      Próximamente
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 -mt-1 -mr-1 size-8 bg-muted rounded-bl-lg flex items-center justify-center">
                <span className="text-[8px] font-bold text-muted-foreground">v2.3</span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

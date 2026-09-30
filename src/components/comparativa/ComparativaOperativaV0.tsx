"use client"

import React, { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FileText,
  Info,
  Layers,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  RotateCcw,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { useComparativa } from "@/hooks/useComparativa"
import type {
  EstadoLineaComparativa,
  MetodoMatch,
  SurgeryComparativaResponse,
} from "@/lib/api/comparativa"

type ComparativaOperativaProps = {
  surgeryId?: string | null
  // Optional pre-loaded data (if provided by parent)
  comparativa?: SurgeryComparativaResponse | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
}

const ESTADO_BADGES: Record<EstadoLineaComparativa, { label: string; className: string }> = {
  coincidente: {
    label: "Coincidente",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  consumido_de_mas: {
    label: "Consumo de más",
    className: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
  },
  consumido_de_menos: {
    label: "Consumo parcial",
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  },
  no_presupuestado: {
    label: "No presupuestado",
    className: "border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-200",
  },
  pendiente_remitir: {
    label: "Pendiente remitir",
    className: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  },
  remitido_de_mas: {
    label: "Remitido de más",
    className: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200",
  },
  devuelto: {
    label: "Con devoluciones",
    className: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200",
  },
  pendiente_facturar: {
    label: "Pendiente facturar",
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  },
  revision_manual: {
    label: "Revisión manual",
    className: "border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/15 dark:text-rose-200 font-bold",
  },
}

const MATCH_BADGES: Record<MetodoMatch, { label: string; className: string }> = {
  catalogItemId: {
    label: "Item ID",
    className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  codigo: {
    label: "SKU exacto",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
  descripcion: {
    label: "Descripción similar",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  sin_match: {
    label: "Sin match",
    className: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 font-bold",
  },
}

function MetricSummaryCard({
  title,
  value,
  subtext,
  icon: Icon,
  tone = "default",
}: {
  title: string
  value: string
  subtext: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "success" | "warning" | "danger" | "purple"
}) {
  const toneClasses = {
    default: "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
    success: "border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    warning: "border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    danger: "border-red-200 bg-red-50/60 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
    purple: "border-purple-200 bg-purple-50/60 text-purple-900 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-100",
  }[tone]

  return (
    <div className={cn("rounded-lg border px-3.5 py-2.5 shadow-2xs", toneClasses)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-base font-bold tracking-tight truncate">{value}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{subtext}</p>
        </div>
        <div className="rounded-md border bg-white/80 p-1.5 dark:border-current/20 dark:bg-slate-900/80 shrink-0">
          <Icon className="size-3.5 text-current" />
        </div>
      </div>
    </div>
  )
}

export function ComparativaOperativaV0(props: ComparativaOperativaProps) {
  const hookResult = useComparativa(props.surgeryId)

  const comparativa = props.comparativa !== undefined ? props.comparativa : hookResult.comparativa
  const loading = props.loading !== undefined ? props.loading : hookResult.loading
  const error = props.error !== undefined ? props.error : hookResult.error
  const handleRefresh = props.onRefresh ?? hookResult.refresh

  const [search, setSearch] = useState("")
  const [filterState, setFilterState] = useState<string>("all")

  const summary = comparativa?.summary
  const sources = comparativa?.sources
  const allLines = useMemo(() => comparativa?.lineas ?? [], [comparativa?.lineas])

  const filteredLines = useMemo(() => {
    let data = allLines
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      data = data.filter(
        (l) =>
          l.descripcion.toLowerCase().includes(q) ||
          l.codigo.toLowerCase().includes(q) ||
          (l.sku ?? "").toLowerCase().includes(q) ||
          l.explicacion.toLowerCase().includes(q)
      )
    }

    if (filterState === "diferencias") {
      data = data.filter((l) => l.estadoLinea !== "coincidente")
    } else if (filterState === "revision") {
      data = data.filter((l) => l.necesitaRevision || l.estadoLinea === "revision_manual")
    } else if (filterState === "coincidente") {
      data = data.filter((l) => l.estadoLinea === "coincidente")
    } else if (filterState === "pendiente_facturar") {
      data = data.filter((l) => l.pendienteFacturar > 0)
    } else if (filterState === "devuelto") {
      data = data.filter((l) => l.devuelto > 0)
    }

    return data
  }, [allLines, search, filterState])

  const isPartial = Boolean(sources?.fuentesFaltantes && sources.fuentesFaltantes.length > 0)

  return (
    <Card className="overflow-hidden border-slate-200 py-0 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader className="border-b bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                <Layers className="size-3.5" />
                Comparativa Operativa y Económica
              </CardTitle>
              {isPartial ? (
                <Badge variant="outline" className="border-amber-400 bg-amber-50 text-[10px] text-amber-800 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                  Proyección Parcial
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-[10px] text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Proyección Canónica Integral
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Proyección derivada en servidor: Presupuesto ↔ Remitos ↔ Consumos ↔ Devoluciones ↔ Facturas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => void handleRefresh()}
              disabled={loading}
            >
              <RefreshCw className={cn("size-3", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Missing sources notice */}
        {isPartial && sources?.fuentesFaltantes ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 text-[11px] text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
            <Info className="size-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
            <span>
              Fuentes no disponibles para esta cirugía: <strong>{sources.fuentesFaltantes.join(", ")}</strong>. Las cantidades correspondientes se calculan con base en las fuentes disponibles sin inventar datos.
            </span>
          </div>
        ) : null}
      </CardHeader>

      {loading && !comparativa ? (
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Calculando comparativa backend...</span>
        </CardContent>
      ) : null}

      {!loading && error ? (
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <AlertTriangle className="size-6 text-destructive" />
          <p className="text-xs font-semibold text-destructive">No se pudo cargar la comparativa</p>
          <p className="text-[11px] text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => void handleRefresh()}>
            Reintentar
          </Button>
        </CardContent>
      ) : null}

      {!loading && !error && allLines.length === 0 ? (
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
          <Package className="size-8 text-muted-foreground/40" />
          <p className="text-xs font-medium">Sin movimientos de materiales registrados</p>
          <p className="text-[11px]">No hay líneas de presupuesto, remitos ni consumos cargados para esta cirugía.</p>
        </CardContent>
      ) : null}

      {comparativa && allLines.length > 0 ? (
        <CardContent className="space-y-4 p-4">
          {/* Summary Metric Cards */}
          {summary ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
              <MetricSummaryCard
                title="Presupuestado"
                value={formatCurrency(summary.totalPresupuestado)}
                subtext={`${summary.totalUnidadesPresupuestadas} u. presupuestadas`}
                icon={FileText}
                tone="default"
              />
              <MetricSummaryCard
                title="Remitido"
                value={formatCurrency(summary.totalRemitido)}
                subtext={`${summary.totalUnidadesRemitidas} u. enviadas`}
                icon={Package}
                tone="default"
              />
              <MetricSummaryCard
                title="Consumido"
                value={formatCurrency(summary.totalConsumido)}
                subtext={`${summary.totalUnidadesConsumidas} u. registradas`}
                icon={CheckCircle2}
                tone={summary.totalConsumido > 0 ? "success" : "default"}
              />
              <MetricSummaryCard
                title="Devuelto"
                value={formatCurrency(summary.totalDevuelto)}
                subtext={`${summary.totalUnidadesDevueltas} u. devueltas`}
                icon={RotateCcw}
                tone={summary.totalUnidadesDevueltas > 0 ? "warning" : "default"}
              />
              <MetricSummaryCard
                title="Facturado"
                value={formatCurrency(summary.totalFacturado)}
                subtext={`${summary.totalUnidadesFacturadas} u. · pend. ${summary.totalUnidadesPendienteFacturar} u.`}
                icon={Receipt}
                tone={summary.totalPendienteFacturar > 0 ? "warning" : "success"}
              />
              <MetricSummaryCard
                title="Delta Económico"
                value={formatCurrency(summary.deltaEconomico)}
                subtext={summary.deltaEconomicoEstimado ? "Estimado (precios base)" : "Conciliado con facturación"}
                icon={DollarSign}
                tone={summary.deltaEconomico > 0 ? "danger" : summary.deltaEconomico < 0 ? "warning" : "success"}
              />
            </div>
          ) : null}

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={filterState === "all" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setFilterState("all")}
              >
                Todas ({allLines.length})
              </Button>
              <Button
                variant={filterState === "diferencias" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[11px] text-amber-700 dark:text-amber-300"
                onClick={() => setFilterState("diferencias")}
              >
                Con diferencias ({summary?.lineasConDiferencia ?? 0})
              </Button>
              <Button
                variant={filterState === "revision" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[11px] text-rose-700 dark:text-rose-300"
                onClick={() => setFilterState("revision")}
              >
                Revisión manual ({summary?.lineasRevisionManual ?? 0})
              </Button>
              <Button
                variant={filterState === "coincidente" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[11px] text-emerald-700 dark:text-emerald-300"
                onClick={() => setFilterState("coincidente")}
              >
                Coincidentes ({summary?.lineasCoincidentes ?? 0})
              </Button>
              {summary && summary.totalUnidadesPendienteFacturar > 0 ? (
                <Button
                  variant={filterState === "pendiente_facturar" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] text-amber-700 dark:text-amber-300"
                  onClick={() => setFilterState("pendiente_facturar")}
                >
                  Pendiente facturar ({summary.totalUnidadesPendienteFacturar} u.)
                </Button>
              ) : null}
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por artículo, código..."
              className="h-7 w-full sm:w-56 rounded-md border bg-background px-2 text-xs"
            />
          </div>

          {/* Comparative Table */}
          <div className="overflow-x-auto rounded-md border bg-white dark:border-slate-800 dark:bg-slate-900/90">
            <Table className="min-w-[1000px] text-xs">
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 dark:bg-slate-950/60 dark:hover:bg-slate-950/60">
                  <TableHead className="h-8 text-[11px]">Artículo / Código</TableHead>
                  <TableHead className="h-8 text-[11px] text-center">Match</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Presup.</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Remitido</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Consumido</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Devuelto</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Pend. Físico</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Facturado</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Pend. Fact.</TableHead>
                  <TableHead className="h-8 text-right text-[11px]">Delta $</TableHead>
                  <TableHead className="h-8 text-[11px]">Estado / Diagnóstico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLines.map((line) => {
                  const estadoBadge = ESTADO_BADGES[line.estadoLinea] ?? ESTADO_BADGES.coincidente
                  const matchBadge = MATCH_BADGES[line.metodoMatch] ?? MATCH_BADGES.sin_match

                  return (
                    <TableRow key={line.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      {/* Description & Code */}
                      <TableCell className="max-w-[240px] py-2">
                        <span className="block font-medium text-slate-900 dark:text-slate-100 truncate" title={line.descripcion}>
                          {line.descripcion}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                          <span>{line.codigo}</span>
                          {line.unit ? <span>· {line.unit}</span> : null}
                        </div>
                      </TableCell>

                      {/* Match Method */}
                      <TableCell className="py-2 text-center">
                        <span className={cn("inline-flex rounded border px-1.5 py-0.2 text-[9px] font-medium", matchBadge.className)}>
                          {matchBadge.label}
                        </span>
                      </TableCell>

                      {/* Presupuestado */}
                      <TableCell className="py-2 text-right tabular-nums">
                        <span className="font-semibold">{line.presupuestado}</span>
                        {line.precioUnitario > 0 ? (
                          <span className="block text-[10px] text-muted-foreground">{formatCurrency(line.importePresupuestado)}</span>
                        ) : null}
                      </TableCell>

                      {/* Remitido */}
                      <TableCell className="py-2 text-right tabular-nums">
                        <span>{line.remitido}</span>
                      </TableCell>

                      {/* Consumido */}
                      <TableCell className="py-2 text-right tabular-nums">
                        <span className={cn(line.consumido > 0 && "font-bold text-slate-900 dark:text-slate-100")}>{line.consumido}</span>
                        {line.precioUnitario > 0 && line.consumido > 0 ? (
                          <span className="block text-[10px] text-muted-foreground">{formatCurrency(line.importeConsumido)}</span>
                        ) : null}
                      </TableCell>

                      {/* Devuelto */}
                      <TableCell className="py-2 text-right tabular-nums">
                        <span className={cn(line.devuelto > 0 ? "font-bold text-orange-700 dark:text-orange-400" : "text-muted-foreground")}>
                          {line.devuelto}
                        </span>
                      </TableCell>

                      {/* Pendiente Físico */}
                      <TableCell className="py-2 text-right tabular-nums">
                        <span className={cn(line.pendienteFisico > 0 ? "font-medium text-amber-700" : "text-muted-foreground")}>
                          {line.pendienteFisico}
                        </span>
                      </TableCell>

                      {/* Facturado */}
                      <TableCell className="py-2 text-right tabular-nums">
                        <span>{line.facturado}</span>
                        {line.importeFacturado > 0 ? (
                          <span className="block text-[10px] text-muted-foreground">{formatCurrency(line.importeFacturado)}</span>
                        ) : null}
                      </TableCell>

                      {/* Pendiente Facturar */}
                      <TableCell className="py-2 text-right tabular-nums">
                        <span className={cn(line.pendienteFacturar > 0 ? "font-bold text-amber-700" : "text-muted-foreground")}>
                          {line.pendienteFacturar}
                        </span>
                      </TableCell>

                      {/* Delta Económico */}
                      <TableCell className="py-2 text-right tabular-nums text-xs">
                        {line.deltaEconomico === 0 ? (
                          <span className="text-muted-foreground">$0</span>
                        ) : (
                          <span
                            className={cn(
                              "font-semibold",
                              line.deltaEconomico > 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {line.deltaEconomico > 0 ? `+${formatCurrency(line.deltaEconomico)}` : formatCurrency(line.deltaEconomico)}
                          </span>
                        )}
                      </TableCell>

                      {/* State & Explanation */}
                      <TableCell className="py-2 min-w-[200px]">
                        <div className="space-y-0.5">
                          <span className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold", estadoBadge.className)}>
                            {estadoBadge.label}
                          </span>
                          <p className="text-[10px] text-muted-foreground leading-snug">{line.explicacion}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

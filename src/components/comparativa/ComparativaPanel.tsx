"use client"

import React, { useState, useMemo } from "react"
import type { ResumenComparativaMateriales, EstadoLineaComparativa } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatNumberAR } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  ESTADO_LINEA_COMPARATIVA_LABELS,
  ESTADO_LINEA_COMPARATIVA_COLORS,
  METODO_MATCH_LABELS,
  COMPARATIVA_EMPTY_MESSAGES,
} from "@/lib/comparativa.constants"
import {
  BarChart3, ChevronDown, ChevronUp, Filter, AlertTriangle,
  CheckCircle2,
} from "lucide-react"

interface ComparativaPanelProps {
  resumen: ResumenComparativaMateriales
}

// Filter options
const ESTADO_FILTROS: { value: EstadoLineaComparativa | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "coincidente", label: "Coincidentes" },
  { value: "pendiente_remitir", label: "Pendiente remitir" },
  { value: "remitido_de_mas", label: "Remitido de más" },
  { value: "consumido_de_mas", label: "Consumido de más" },
  { value: "consumido_de_menos", label: "Consumido de menos" },
  { value: "devuelto", label: "Devuelto" },
  { value: "no_presupuestado", label: "No presupuestado" },
  { value: "revision_manual", label: "Revisión manual" },
]

function EstadoBadge({ estado }: { estado: EstadoLineaComparativa }) {
  const colors = ESTADO_LINEA_COMPARATIVA_COLORS[estado]
  return (
    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", colors.badge)}>
      {ESTADO_LINEA_COMPARATIVA_LABELS[estado]}
    </Badge>
  )
}

function DiferenciaCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn("font-medium", value > 0 ? "text-red-600" : "text-emerald-600")}>
      {value > 0 ? "+" : ""}{value}
    </span>
  )
}

function DeltaCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn("font-medium text-[10px]", value > 0 ? "text-red-600" : "text-emerald-600")}>
      {value > 0 ? "+" : ""}{formatCurrency(value)}
    </span>
  )
}

export function ComparativaPanel({ resumen }: ComparativaPanelProps) {
  const [filtroEstado, setFiltroEstado] = useState<EstadoLineaComparativa | "todos">("todos")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const filteredLineas = useMemo(() => {
    if (filtroEstado === "todos") return resumen.lineas
    return resumen.lineas.filter((l) => l.estadoLinea === filtroEstado)
  }, [resumen.lineas, filtroEstado])

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Empty state messages
  if (!resumen.tienePresupuesto && !resumen.tieneRemitos && !resumen.tieneConsumo) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <BarChart3 className="size-3.5" />
            Comparativa de Materiales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{COMPARATIVA_EMPTY_MESSAGES.sinDatos}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <BarChart3 className="size-3.5" />
          Comparativa Presupuestado vs Remitido vs Consumido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border bg-muted/30 p-2 text-center">
            <p className="text-xs font-bold">{formatCurrency(resumen.totalPresupuestado)}</p>
            <p className="text-[9px] text-muted-foreground">Presupuestado</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2 text-center">
            <p className="text-xs font-bold">{formatCurrency(resumen.totalConsumidoValorizado)}</p>
            <p className="text-[9px] text-muted-foreground">Consumido valorizado</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2 text-center">
            <p className={cn("text-xs font-bold", resumen.deltaEconomico > 0 ? "text-red-600" : resumen.deltaEconomico < 0 ? "text-emerald-600" : "")}>
              {resumen.deltaEconomico > 0 ? "+" : ""}{formatCurrency(resumen.deltaEconomico)}
            </p>
            <p className="text-[9px] text-muted-foreground">Delta estimado</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2 text-center">
            <p className={cn("text-xs font-bold", resumen.lineasConDiferencia > 0 ? "text-amber-600" : "text-emerald-600")}>
              {resumen.lineasConDiferencia}/{resumen.totalLineas}
            </p>
            <p className="text-[9px] text-muted-foreground">Ítems con diferencia</p>
          </div>
        </div>

        {/* Additional alerts */}
        {resumen.lineasRevisionManual > 0 && (
          <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
            <AlertTriangle className="size-3" />
            {resumen.lineasRevisionManual} ítem(s) requieren revisión manual
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="size-3 text-muted-foreground" />
          {ESTADO_FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltroEstado(f.value)}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded border transition-colors",
                filtroEstado === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-[10px] h-7">Código</TableHead>
                <TableHead className="text-[10px]">Artículo</TableHead>
                <TableHead className="text-[10px] text-center">Presup.</TableHead>
                <TableHead className="text-[10px] text-center">Remitido</TableHead>
                <TableHead className="text-[10px] text-center">Consumido</TableHead>
                <TableHead className="text-[10px] text-center">Devuelto</TableHead>
                <TableHead className="text-[10px] text-center">Dif. PR/NR</TableHead>
                <TableHead className="text-[10px] text-center">Dif. NR/CON</TableHead>
                <TableHead className="text-[10px] text-center">Dif. PR/CON</TableHead>
                <TableHead className="text-[10px] text-right">Delta $</TableHead>
                <TableHead className="text-[10px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLineas.map((linea) => {
                const colors = ESTADO_LINEA_COMPARATIVA_COLORS[linea.estadoLinea]
                const isExpanded = expandedRows.has(linea.key)

                return (
                  <React.Fragment key={linea.key}>
                    <TableRow
                      className={cn(
                        "cursor-pointer hover:bg-muted/30",
                        colors.bg,
                        colors.border && `border-l-2 ${colors.border}`,
                      )}
                      onClick={() => linea.detalleRemitos && linea.detalleRemitos.length > 0 && toggleRow(linea.key)}
                    >
                      <TableCell className="text-[10px] font-mono py-1.5">{linea.codigo}</TableCell>
                      <TableCell className="text-[10px] font-medium py-1.5 max-w-[160px] truncate" title={linea.descripcion}>
                        <div>
                          {linea.descripcion}
                          {linea.necesitaRevision && (
                            <Badge variant="outline" className="ml-1 text-[8px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
                              {METODO_MATCH_LABELS[linea.metodoMatch]}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-center py-1.5">{linea.presupuestado || "—"}</TableCell>
                      <TableCell className="text-[10px] text-center py-1.5">{linea.remitido || "—"}</TableCell>
                      <TableCell className="text-[10px] text-center py-1.5">{linea.consumido || "—"}</TableCell>
                      <TableCell className="text-[10px] text-center py-1.5">{linea.devuelto || "—"}</TableCell>
                      <TableCell className="text-[10px] text-center py-1.5"><DiferenciaCell value={linea.difPrVsNr} /></TableCell>
                      <TableCell className="text-[10px] text-center py-1.5"><DiferenciaCell value={linea.difNrVsConsumo} /></TableCell>
                      <TableCell className="text-[10px] text-center py-1.5"><DiferenciaCell value={linea.difPrVsConsumo} /></TableCell>
                      <TableCell className="text-[10px] text-right py-1.5"><DeltaCell value={linea.deltaEconomico} /></TableCell>
                      <TableCell className="py-1.5"><EstadoBadge estado={linea.estadoLinea} /></TableCell>
                    </TableRow>

                    {/* Expanded: remito detail + observaciones */}
                    {isExpanded && linea.detalleRemitos && linea.detalleRemitos.length > 0 && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={11} className="py-2 px-6">
                          <div className="space-y-1">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Detalle por remito</p>
                            {linea.detalleRemitos.map((d) => (
                              <div key={d.remitoId} className="flex items-center gap-3 text-[10px]">
                                <span className="font-mono text-muted-foreground">{d.remitoId}</span>
                                <span>Cantidad: <strong>{d.cantidad}</strong></span>
                                <Badge variant="outline" className="text-[8px] px-1 py-0">{d.estado}</Badge>
                              </div>
                            ))}
                            {linea.observaciones && linea.observaciones.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {linea.observaciones.map((obs, i) => (
                                  <p key={i} className="text-[10px] text-amber-700">• {obs}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}

              {filteredLineas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-4 text-xs text-muted-foreground">
                    No hay ítems para el filtro seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Totals row ── */}
        <div className="grid grid-cols-4 gap-2 text-[10px]">
          <div className="rounded border bg-muted/30 p-1.5 text-center">
            <span className="text-muted-foreground">Total presup.:</span>{" "}
            <strong>{formatCurrency(resumen.totalPresupuestado)}</strong>
          </div>
          <div className="rounded border bg-muted/30 p-1.5 text-center">
            <span className="text-muted-foreground">Total remitido:</span>{" "}
            <strong>{formatCurrency(resumen.totalRemitido)}</strong>
          </div>
          <div className="rounded border bg-muted/30 p-1.5 text-center">
            <span className="text-muted-foreground">Total consumido:</span>{" "}
            <strong>{formatCurrency(resumen.totalConsumidoValorizado)}</strong>
          </div>
          <div className="rounded border bg-muted/30 p-1.5 text-center">
            <span className="text-muted-foreground">Delta total:</span>{" "}
            <strong className={resumen.deltaEconomico > 0 ? "text-red-600" : resumen.deltaEconomico < 0 ? "text-emerald-600" : ""}>
              {resumen.deltaEconomico > 0 ? "+" : ""}{formatCurrency(resumen.deltaEconomico)}
            </strong>
          </div>
        </div>

        {/* ── Consumption state notice ── */}
        {resumen.consumoEstado === "Pendiente" && (
          <p className="text-[10px] text-amber-700 flex items-center gap-1">
            <AlertTriangle className="size-3" />
            Consumo pendiente de validación — los datos son preliminares.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

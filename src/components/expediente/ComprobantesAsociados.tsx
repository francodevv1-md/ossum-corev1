"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Link2, MoreHorizontal, Eye, Printer, Download, Edit,
  XCircle, FileText, Receipt, CreditCard, Search, Filter,
  ChevronDown, ChevronRight,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { Surgery, Comprobante, Presupuesto, FacturaVentaData } from "@/types"
import type { ResumenCobranzaSurgery, FacturaCobranzaDetalle } from "@/lib/cobros.utils"

interface ComprobantesAsociadosProps {
  surgery: Surgery
  comprobantes: Comprobante[]
  resumenCobranza: ResumenCobranzaSurgery
  presupuestos: Presupuesto[]
}

type CompFilterType = "all" | "PR" | "PE" | "NR" | "FV" | "CO" | "NC" | "ND"

const COMP_TYPE_BADGES: Record<string, string> = {
  PR: "bg-blue-100 text-blue-800 border-blue-300",
  PE: "bg-indigo-100 text-indigo-800 border-indigo-300",
  NR: "bg-sky-100 text-sky-800 border-sky-300",
  FV: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CO: "bg-green-100 text-green-800 border-green-300",
  NC: "bg-amber-100 text-amber-800 border-amber-300",
  ND: "bg-orange-100 text-orange-800 border-orange-300",
}

/** Badge de estado de cobranza para una FV */
const ESTADO_COBRANZA_COLORS: Record<string, string> = {
  sin_cobrar: "bg-amber-100 text-amber-800 border-amber-300",
  cobro_parcial: "bg-blue-100 text-blue-800 border-blue-300",
  cobrada: "bg-emerald-100 text-emerald-800 border-emerald-300",
  vencida: "bg-red-100 text-red-800 border-red-300",
}

const ESTADO_COBRANZA_LABELS: Record<string, string> = {
  sin_cobrar: "Sin cobrar",
  cobro_parcial: "Cobro parcial",
  cobrada: "Cobrada",
  vencida: "Vencida",
}

export function ComprobantesAsociados({
  surgery, comprobantes, resumenCobranza, presupuestos,
}: ComprobantesAsociadosProps) {
  const [filterType, setFilterType] = useState<CompFilterType>("all")
  const [filterState, setFilterState] = useState<string>("all")
  const [searchText, setSearchText] = useState("")
  const [expandedFVs, setExpandedFVs] = useState<Set<string>>(new Set())

  // Build factura detail map from resumenCobranza
  const facturaDetailMap = useMemo(() => {
    const map = new Map<string, FacturaCobranzaDetalle>()
    for (const fv of resumenCobranza.facturas) {
      map.set(fv.facturaNumber, fv)
    }
    return map
  }, [resumenCobranza])

  // Build unified rows: comprobantes + presupuestos
  // Cobros are now shown as sub-rows under each FV, not as separate top-level rows
  const allRows = useMemo(() => {
    const rows: Array<{
      id: string; type: string; number: string; date: string;
      client: string; concept: string; amount: number; toCollect: number;
      state: string; source: "comp" | "pr"; facturaDetail?: FacturaCobranzaDetalle
    }> = []

    // Presupuestos as PR
    presupuestos.forEach(pr => {
      rows.push({
        id: pr.id, type: "PR", number: pr.id, date: pr.createdAt,
        client: pr.client, concept: `Presupuesto - ${pr.patient || pr.concepto || pr.client}`,
        amount: pr.total, toCollect: pr.total, state: pr.state, source: "pr",
      })
    })

    // Comprobantes — for FVs, attach cobranza detail
    comprobantes.forEach(c => {
      const detail = c.type === "FV" ? facturaDetailMap.get(c.number) : undefined
      rows.push({
        id: c.id, type: c.type, number: c.number, date: c.date,
        client: c.client, concept: c.concept,
        amount: c.amount,
        toCollect: detail ? detail.saldoPendiente : c.toCollect,
        state: detail ? ESTADO_COBRANZA_LABELS[detail.estadoCobranza] || detail.estadoCobranza : c.state,
        source: "comp",
        facturaDetail: detail,
      })
    })

    return rows
  }, [comprobantes, presupuestos, facturaDetailMap])

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = allRows
    if (filterType !== "all") result = result.filter(r => r.type === filterType)
    if (filterState !== "all") result = result.filter(r => r.state === filterState)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(r =>
        r.number.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.concept.toLowerCase().includes(q)
      )
    }
    // Sort by date desc
    return result.sort((a, b) => b.date.localeCompare(a.date))
  }, [allRows, filterType, filterState, searchText])

  const uniqueStates = useMemo(() => {
    const states = new Set(allRows.map(r => r.state))
    return Array.from(states).sort()
  }, [allRows])

  // Summary totals — use resumenCobranza for financial consistency
  const totalAmount = filteredRows.reduce((s, r) => s + r.amount, 0)
  const totalToCollect = resumenCobranza.saldoPendiente

  const toggleFVExpanded = (fvNumber: string) => {
    setExpandedFVs(prev => {
      const next = new Set(prev)
      if (next.has(fvNumber)) next.delete(fvNumber)
      else next.add(fvNumber)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Comprobantes Asociados</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{filteredRows.length} comprobantes</Badge>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Buscar comprobante..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm" className="h-7 text-[10px] px-2.5"
            onClick={() => setFilterType("all")}
          >
            Todos
          </Button>
          {(["PR", "PE", "NR", "FV", "CO", "NC", "ND"] as const).map(t => {
            // CO filter now refers to FV rows that have cobros
            const count = t === "CO"
              ? allRows.filter(r => r.facturaDetail && r.facturaDetail.cobros.length > 0).length
              : allRows.filter(r => r.type === t).length
            if (count === 0) return null
            return (
              <Button
                key={t}
                variant={filterType === t ? "default" : "outline"}
                size="sm" className="h-7 text-[10px] px-2.5 gap-1"
                onClick={() => setFilterType(t)}
              >
                {t} <span className="text-[9px] opacity-60">({count})</span>
              </Button>
            )
          })}
        </div>
        {uniqueStates.length > 1 && (
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="h-7 rounded-md border border-input bg-transparent px-2 text-[10px] shadow-xs"
          >
            <option value="all">Todos los estados</option>
            {uniqueStates.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        )}
      </div>

      {/* ── Summary row ── */}
      <div className="flex items-center gap-6 rounded-md border bg-muted/30 px-4 py-2">
        <div className="text-xs"><span className="text-muted-foreground">Total: </span><span className="font-semibold">{formatCurrency(totalAmount)}</span></div>
        <div className="text-xs"><span className="text-muted-foreground">A cobrar: </span><span className="font-semibold text-amber-700">{formatCurrency(totalToCollect)}</span></div>
        {resumenCobranza.totalCobrado > 0 && (
          <div className="text-xs"><span className="text-muted-foreground">Cobrado: </span><span className="font-semibold text-emerald-700">{formatCurrency(resumenCobranza.totalCobrado)}</span></div>
        )}
      </div>

      {/* ── Grid ── */}
      {filteredRows.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[10px] h-8 w-8"></TableHead>
                <TableHead className="text-[10px] h-8 w-16">Tipo</TableHead>
                <TableHead className="text-[10px] h-8">Nº Comprobante</TableHead>
                <TableHead className="text-[10px] h-8">Fecha</TableHead>
                <TableHead className="text-[10px] h-8">Cliente</TableHead>
                <TableHead className="text-[10px] h-8">Concepto</TableHead>
                <TableHead className="text-[10px] h-8 text-right">Importe</TableHead>
                <TableHead className="text-[10px] h-8 text-right">Saldo</TableHead>
                <TableHead className="text-[10px] h-8">Estado</TableHead>
                <TableHead className="text-[10px] h-8 w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map(row => {
                const comp = row.source === "comp" ? comprobantes.find(c => c.id === row.id) : undefined
                const facturaData = comp?.facturaData
                const hasCobros = row.facturaDetail && row.facturaDetail.cobros.length > 0
                const isExpanded = expandedFVs.has(row.number)

                return (
                  <React.Fragment key={row.id}>
                    <TableRow className="group">
                      {/* Expand toggle for FV with cobros */}
                      <TableCell className="py-2 w-8">
                        {hasCobros ? (
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => toggleFVExpanded(row.number)}>
                            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border", COMP_TYPE_BADGES[row.type] || "bg-gray-100 text-gray-800 border-gray-300")}>
                          {row.type}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium font-mono">{row.number}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">{formatDate(row.date)}</TableCell>
                      <TableCell className="py-2 text-xs">{row.client}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">{row.concept}</TableCell>
                      <TableCell className="py-2 text-xs font-medium text-right">{formatCurrency(row.amount)}</TableCell>
                      <TableCell className={cn("py-2 text-xs font-medium text-right", row.toCollect > 0 ? "text-amber-700" : "text-muted-foreground")}>
                        {row.toCollect > 0 ? formatCurrency(row.toCollect) : "—"}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        {row.facturaDetail ? (
                          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border", ESTADO_COBRANZA_COLORS[row.facturaDetail.estadoCobranza] || "")}>
                            {ESTADO_COBRANZA_LABELS[row.facturaDetail.estadoCobranza] || row.facturaDetail.estadoCobranza}
                          </span>
                        ) : (
                          row.state
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem><Eye className="size-4 mr-2" /> Abrir</DropdownMenuItem>
                            <DropdownMenuItem><Printer className="size-4 mr-2" /> Imprimir</DropdownMenuItem>
                            <DropdownMenuItem><Download className="size-4 mr-2" /> Descargar PDF</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="size-4 mr-2" /> Modificar</DropdownMenuItem>
                            {row.type === "FV" && row.toCollect > 0 && (
                              <DropdownMenuItem><CreditCard className="size-4 mr-2" /> Cobrar</DropdownMenuItem>
                            )}
                            <DropdownMenuItem><FileText className="size-4 mr-2" /> Ver historial</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><XCircle className="size-4 mr-2" /> Anular</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {/* Extended FV data row (facturaData from CHATZAI-010) */}
                    {facturaData && row.type === "FV" && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={10} className="py-1.5 px-4">
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                            <span>Base: <strong className="text-foreground">{facturaData.baseFacturacion}</strong></span>
                            <span>PR: {facturaData.presupuestoBaseId || "—"}</span>
                            <span>Presup.: {formatCurrency(facturaData.totalPresupuestado)}</span>
                            <span>Consumo val.: {formatCurrency(facturaData.totalConsumidoValorizado)}</span>
                            <span>Delta: {facturaData.deltaDetectado >= 0 ? "+" : ""}{formatCurrency(facturaData.deltaDetectado)}</span>
                            <span>Diff acept.: {formatCurrency(facturaData.diferenciasAceptadas)}</span>
                            {facturaData.presupuestoVersion && (
                              <span>Versión: {facturaData.presupuestoVersion}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {/* Expanded cobros imputados sub-rows */}
                    {isExpanded && row.facturaDetail && (
                      <TableRow className="bg-emerald-50/30">
                        <TableCell colSpan={10} className="py-2 px-8">
                          <div className="space-y-1">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cobros aplicados a {row.number}</p>
                            <div className="grid grid-cols-[auto_auto_1fr_auto] gap-x-4 gap-y-1 items-center text-[10px]">
                              {row.facturaDetail.cobros.map(co => (
                                <React.Fragment key={co.cobroId}>
                                  <span className="text-muted-foreground">{formatDate(co.fecha)}</span>
                                  <span className="font-medium">{co.medioCobro}</span>
                                  <span className="text-muted-foreground">{co.referencia ? `Ref. ${co.referencia}` : ""}{co.observaciones ? ` — ${co.observaciones}` : ""}</span>
                                  <span className="font-medium text-emerald-700 text-right">{formatCurrency(co.importeImputado)}</span>
                                </React.Fragment>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-emerald-200/50">
                              <span className="text-muted-foreground">Total cobrado</span>
                              <span className="font-semibold text-emerald-700">{formatCurrency(row.facturaDetail.totalCobrado)}</span>
                            </div>
                            {row.facturaDetail.saldoPendiente > 0 && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">Saldo pendiente</span>
                                <span className="font-semibold text-amber-700">{formatCurrency(row.facturaDetail.saldoPendiente)}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Link2 className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Sin comprobantes asociados</p>
          <p className="text-xs text-muted-foreground">Los comprobantes aparecerán aquí a medida que se generen</p>
        </div>
      )}
    </div>
  )
}

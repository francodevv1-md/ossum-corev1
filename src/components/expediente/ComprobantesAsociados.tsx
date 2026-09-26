"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Link2, MoreHorizontal, Eye, Printer, Download, Edit,
  XCircle, FileText, CreditCard, Search,
  ChevronDown, ChevronRight,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { FiscalEvidenceDialog } from "@/components/facturacion/FiscalEvidenceDialog"
import { useInvoices } from "@/hooks/useInvoices"
import type { Surgery, Comprobante, Presupuesto } from "@/types"
import type { ResumenCobranzaSurgery, FacturaCobranzaDetalle } from "@/lib/cobros.utils"

interface ComprobantesAsociadosProps {
  surgery: Surgery
  comprobantes: Comprobante[]
  resumenCobranza: ResumenCobranzaSurgery
  presupuestos: Presupuesto[]
}

type CompFilterType = "all" | "PR" | "PE" | "NR" | "FV" | "CO" | "NC" | "ND"

const COMP_TYPE_BADGES: Record<string, string> = {
  PR: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  PE: "border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200",
  NR: "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200",
  FV: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  CO: "border-green-300 bg-green-100 text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200",
  NC: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  ND: "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200",
}

/** Badge de estado de cobranza para una FV */
const ESTADO_COBRANZA_COLORS: Record<string, string> = {
  sin_cobrar: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  cobro_parcial: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  cobrada: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  vencida: "border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
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
  const [fiscalEvidenceSelection, setFiscalEvidenceSelection] = useState<{ companyId: string; invoiceId: string; label: string } | null>(null)
  const surgeryId = surgery.backendId ?? surgery.id
  const invoicesApi = useInvoices({ surgeryId })

  useEffect(() => {
    setFiscalEvidenceSelection(null)
  }, [invoicesApi.companyId])

  const authoritativeInvoices = useMemo(() => {
    if (invoicesApi.loading || !invoicesApi.companyId) return []
    return invoicesApi.invoices.filter((invoice) => invoice.companyId === invoicesApi.companyId && invoice.surgeryId === surgeryId)
  }, [invoicesApi.companyId, invoicesApi.invoices, invoicesApi.loading, surgeryId])
  const activeFiscalEvidenceSelection = fiscalEvidenceSelection?.companyId === invoicesApi.companyId ? fiscalEvidenceSelection : null

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

  const typeCounts = useMemo(() => {
    return {
      PR: allRows.filter(r => r.type === "PR").length,
      PE: allRows.filter(r => r.type === "PE").length,
      NR: allRows.filter(r => r.type === "NR").length,
      FV: allRows.filter(r => r.type === "FV").length,
      CO: allRows.filter(r => r.facturaDetail && r.facturaDetail.cobros.length > 0).length,
      NC: allRows.filter(r => r.type === "NC").length,
      ND: allRows.filter(r => r.type === "ND").length,
    }
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
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Comprobantes Asociados</h2>
          <p className="text-[11px] text-muted-foreground">Vista compacta de presupuestos, comprobantes y cobranzas vinculadas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px] font-medium">
            {filteredRows.length} visibles
          </Badge>
        </div>
      </div>

      {authoritativeInvoices.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60" aria-label="Evidencia fiscal">
          {authoritativeInvoices.map((invoice) => {
            const label = `Factura ${invoice.visibleNumber ?? invoice.id}`
            return <Button key={invoice.id} variant="outline" size="sm" className="h-7 gap-1.5 rounded-md px-2 text-[10px]" onClick={() => {
              const companyId = invoicesApi.companyId
              if (companyId) setFiscalEvidenceSelection({ companyId, invoiceId: invoice.id, label })
            }}>
              <FileText className="size-3.5" /> Evidencia fiscal · {label}
            </Button>
          })}
        </div>
      ) : null}

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Buscar comprobante..."
            className="h-7 border-slate-200 bg-white pl-8 text-[11px] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm" className="h-6 rounded-md px-2 text-[10px]"
            onClick={() => setFilterType("all")}
          >
            Todos
          </Button>
          {(["PR", "PE", "NR", "FV", "CO", "NC", "ND"] as const).map(t => {
            const count = typeCounts[t]
            if (count === 0) return null
            return (
              <Button
                key={t}
                variant={filterType === t ? "default" : "outline"}
                size="sm" className="h-6 gap-1 rounded-md px-2 text-[10px]"
                onClick={() => setFilterType(t)}
              >
                {t}
                <span className="text-[9px] opacity-60">{count}</span>
              </Button>
            )
          })}
        </div>
        {uniqueStates.length > 1 && (
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="h-6 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-muted-foreground shadow-xs dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Todos los estados</option>
            {uniqueStates.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        )}
      </div>

      {/* ── Summary row ── */}
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-3">
        <div className="rounded-md bg-white/80 px-3 py-2 dark:bg-slate-900/80">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total visible</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-md bg-white/80 px-3 py-2 dark:bg-slate-900/80">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Saldo pendiente</p>
          <p className="mt-1 text-sm font-semibold text-amber-700">{formatCurrency(totalToCollect)}</p>
        </div>
        {resumenCobranza.totalCobrado > 0 && (
          <div className="rounded-md bg-white/80 px-3 py-2 dark:bg-slate-900/80">
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cobrado</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">{formatCurrency(resumenCobranza.totalCobrado)}</p>
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      {filteredRows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 dark:bg-slate-950/80 dark:hover:bg-slate-950/80">
                <TableHead className="h-8 w-8 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"></TableHead>
                <TableHead className="h-8 w-16 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tipo</TableHead>
                <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Comprobante</TableHead>
                <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Fecha</TableHead>
                <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Cliente</TableHead>
                <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Concepto</TableHead>
                <TableHead className="h-8 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Importe</TableHead>
                <TableHead className="h-8 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Saldo</TableHead>
                <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Estado</TableHead>
                <TableHead className="h-8 w-12 text-[10px]"></TableHead>
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
                    <TableRow className="group border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                      {/* Expand toggle for FV with cobros */}
                      <TableCell className="w-8 py-2.5 align-top">
                        {hasCobros ? (
                          <Button variant="ghost" size="sm" className="h-5 w-5 rounded-sm p-0 text-slate-500" onClick={() => toggleFVExpanded(row.number)}>
                            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-2.5 align-top">
                        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none", COMP_TYPE_BADGES[row.type] || "bg-gray-100 text-gray-800 border-gray-300")}>
                          {row.type}
                        </span>
                      </TableCell>
                       <TableCell className="py-2.5 text-xs font-medium font-mono align-top text-slate-900 dark:text-slate-100">{row.number}</TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground align-top">{formatDate(row.date)}</TableCell>
                       <TableCell className="py-2.5 text-xs align-top text-slate-900 dark:text-slate-100">{row.client}</TableCell>
                      <TableCell className="max-w-[220px] py-2.5 text-xs align-top text-muted-foreground truncate">{row.concept}</TableCell>
                       <TableCell className="py-2.5 text-right text-xs font-medium align-top text-slate-900 dark:text-slate-100">{formatCurrency(row.amount)}</TableCell>
                      <TableCell className={cn("py-2.5 text-right text-xs font-medium align-top", row.toCollect > 0 ? "text-amber-700" : "text-muted-foreground")}>
                        {row.toCollect > 0 ? formatCurrency(row.toCollect) : "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs align-top">
                        {row.facturaDetail ? (
                          <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none", ESTADO_COBRANZA_COLORS[row.facturaDetail.estadoCobranza] || "")}>
                            {ESTADO_COBRANZA_LABELS[row.facturaDetail.estadoCobranza] || row.facturaDetail.estadoCobranza}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{row.state}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 align-top">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 rounded-sm p-0 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
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
                       <TableRow className="bg-slate-50/60 dark:bg-slate-950/60">
                        <TableCell colSpan={10} className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
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
                       <TableRow className="bg-emerald-50/20 dark:bg-emerald-500/5">
                        <TableCell colSpan={10} className="px-8 py-2.5">
                          <div className="space-y-1">
                            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Cobros aplicados a {row.number}</p>
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
                            <div className="flex items-center justify-between border-t border-emerald-200/50 pt-1 text-[10px]">
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center dark:border-slate-800 dark:bg-slate-950/50">
            <Link2 className="mb-2 size-8 text-muted-foreground/35" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sin comprobantes asociados</p>
            <p className="text-[11px] text-muted-foreground">Se mostrarán acá cuando el expediente genere movimiento comercial.</p>
          </div>
      )}
      {activeFiscalEvidenceSelection ? <FiscalEvidenceDialog
        companyId={activeFiscalEvidenceSelection.companyId}
        invoiceId={activeFiscalEvidenceSelection.invoiceId}
        invoiceLabel={activeFiscalEvidenceSelection.label}
        open
        onOpenChange={(open) => { if (!open) setFiscalEvidenceSelection(null) }}
      /> : null}
    </div>
  )
}

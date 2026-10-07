"use client"

import { useId, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { FileText, Search, RefreshCw, ArrowUpRight, MoreHorizontal, Download, Printer, Pencil, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/components/auth/AuthProvider"
import { useSurgeryComprobantes } from "@/hooks/useSurgeryComprobantes"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { Surgery, Comprobante, Presupuesto } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"
import { COMPROBANTE_LABELS, comprobanteRecords, documentMoney, type ComprobanteType } from "./comprobantes-model"
import { ComprobanteDetail } from "./ComprobanteDetail"

interface ComprobantesAsociadosProps {
  surgery: Surgery
  // Compatibility only: parents still pass local projections. Never use them as authority.
  comprobantes: Comprobante[]
  resumenCobranza: ResumenCobranzaSurgery
  presupuestos: Presupuesto[]
}

const TYPE_COLORS = {
  PR: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  FV: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  NR: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  CO: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
}

export function ComprobantesAsociados({ surgery }: ComprobantesAsociadosProps) {
  const { activeCompany } = useAuth()
  const data = useSurgeryComprobantes(activeCompany?.id, surgery.backendId)
  // Reset filters and selected record on company/surgery changes. Do not animate old-scope exits.
  return <ComprobantesRegister key={JSON.stringify([activeCompany?.id, surgery.backendId])} data={data} />
}

function ComprobantesRegister({ data }: { data: ReturnType<typeof useSurgeryComprobantes> }) {
  const reducedMotion = useReducedMotion()
  const indicatorId = useId()
  const [search, setSearch] = useState("")
  const [type, setType] = useState<ComprobanteType | "all">("all")
  const [state, setState] = useState("all")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const records = comprobanteRecords(data.budgets, data.invoices, data.remittances, data.payments)
  const states = [...new Set(records.map(row => row.state))].sort()
  const query = search.trim().toLocaleLowerCase("es-AR")
  const filtered = records.filter(row => (type === "all" || row.type === type) && (state === "all" || row.state === state) &&
    (!query || `${row.id} ${row.number ?? ""} ${row.concept} ${row.type} ${row.state}`.toLocaleLowerCase("es-AR").includes(query)))
  const selected = data.status === "ready" ? records.find(row => row.key === selectedKey) : undefined
  const ready = data.status === "ready"
  const statusText = data.status === "missing-company" ? "Seleccioná una empresa para ver sus comprobantes."
    : data.status === "missing-identity" ? "Esta cirugía no tiene identidad backend. No se muestran datos locales."
    : "Cargando comprobantes vinculados…"

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-medium text-slate-900 dark:text-slate-100">El recorrido documental de esta cirugía</p>
          <p className="mt-1 text-xs text-muted-foreground">Consultá cada comprobante, desde el presupuesto hasta el cobro.</p></div>
        <Button variant="outline" size="sm" onClick={() => { setSelectedKey(null); data.reload() }} disabled={data.status !== "ready" && data.status !== "error"} className="h-9 gap-2">
          <RefreshCw className="size-3.5" aria-hidden />Recargar
        </Button>
      </div>

      {!ready && data.status !== "error" && <div role="status" className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{statusText}</div>}
      {data.status === "error" && <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /><div><p className="font-medium">No pudimos cargar los comprobantes.</p><p className="mt-1">{data.error}</p><p className="mt-1 text-xs">Usá Recargar para volver a intentarlo. No se muestran datos locales.</p></div>
      </div>}

      {ready && <>
        <div className="flex flex-wrap gap-1 border-b pb-3" aria-label="Tipos de comprobante">
          {(["all", ...Object.keys(COMPROBANTE_LABELS)] as (ComprobanteType | "all")[]).map(value => {
            const count = value === "all" ? records.length : records.filter(row => row.type === value).length
            return <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)}
              className={cn("relative min-h-10 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", type === value ? "text-white dark:text-slate-900" : "text-muted-foreground hover:bg-muted") }>
              {type === value && <motion.span aria-hidden layoutId={reducedMotion ? undefined : indicatorId} className="absolute inset-0 rounded-lg bg-slate-900 dark:bg-slate-100" transition={{ duration: reducedMotion ? 0 : 0.2 }} />}
              <span className="relative">{value === "all" ? "Todos" : COMPROBANTE_LABELS[value]} <span className="ml-2 tabular-nums opacity-60">{count}</span></span>
            </button>
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-60"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
            <Input aria-label="Buscar comprobante" placeholder="Buscar por número, referencia o concepto" value={search} onChange={event => setSearch(event.target.value)} className="h-10 pl-9 text-sm" /></div>
          <select aria-label="Estado del comprobante" value={state} onChange={event => setState(event.target.value)} className="h-10 max-w-full rounded-md border bg-background px-3 text-xs">
            <option value="all">Todos los estados</option>{states.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
          <span className="px-1 text-xs tabular-nums text-muted-foreground">{filtered.length} visibles</span>
        </div>

        {filtered.length ? <div className="overflow-hidden rounded-lg border">
          <Table><TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-16 text-xs">Tipo</TableHead><TableHead className="text-xs">Comprobante</TableHead>
            <TableHead className="hidden text-xs md:table-cell">Fecha</TableHead><TableHead className="hidden text-xs lg:table-cell">Concepto</TableHead>
            <TableHead className="text-right text-xs">Importe</TableHead><TableHead className="hidden text-right text-xs md:table-cell">Saldo</TableHead>
            <TableHead className="hidden text-xs sm:table-cell">Estado</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((row, index) => <motion.tr key={row.key} initial={reducedMotion || index > 7 ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, delay: reducedMotion ? 0 : Math.min(index, 7) * 0.025 }}
              className="group border-b transition-colors last:border-b-0 hover:bg-muted/40">
              <TableCell><span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", TYPE_COLORS[row.type])}>{row.type}</span></TableCell>
              <TableCell className="min-w-32 py-3">
                <button type="button" onClick={() => setSelectedKey(row.key)} aria-label={`Abrir ${row.type} ${row.number ?? row.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-primary focus-visible:outline-2 dark:text-slate-100">
                  {row.number ?? "Sin numeración"}<ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
                </button><p className="mt-1 max-w-48 truncate font-mono text-[10px] text-muted-foreground" title={row.id}>{row.id}</p>
                <p className="mt-1 text-xs text-muted-foreground md:hidden">{formatDate(row.date)}</p><p className="mt-1 text-xs text-muted-foreground sm:hidden">{row.state.replaceAll("_", " ")}</p>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">{formatDate(row.date)}</TableCell>
              <TableCell className="hidden max-w-56 truncate text-xs text-muted-foreground lg:table-cell" title={row.concept}>{row.concept}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-xs tabular-nums">{row.type === "NR" ? "No aplica" : documentMoney(row.amount, row.currency)}</TableCell>
              <TableCell className="hidden whitespace-nowrap text-right text-xs tabular-nums md:table-cell">{row.type === "FV" ? documentMoney(row.balance, row.currency) : "No aplica"}</TableCell>
              <TableCell className="hidden text-xs sm:table-cell"><span className="whitespace-nowrap rounded-md border px-2 py-1">{row.state.replaceAll("_", " ")}</span></TableCell>
              <TableCell className="px-1"><DropdownMenu><DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Acciones ${row.type} ${row.number ?? row.id}`} className="size-9"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => setSelectedKey(row.key)}><ArrowUpRight className="size-4" />Abrir comprobante</DropdownMenuItem>
                <DropdownMenuItem disabled><Download className="size-4" />Descargar PDF · No disponible</DropdownMenuItem>
                <DropdownMenuItem disabled><Printer className="size-4" />Imprimir · No disponible</DropdownMenuItem>
                <DropdownMenuItem disabled><Pencil className="size-4" />Modificar · No disponible</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu></TableCell>
            </motion.tr>)}
          </TableBody></Table>
        </div> : <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
          <FileText className="size-8 text-muted-foreground/50" aria-hidden /><p className="text-sm font-medium">{records.length ? "Ningún comprobante coincide con los filtros." : "Sin comprobantes vinculados a esta cirugía."}</p>
          {records.length > 0 && <Button variant="outline" size="sm" onClick={() => { setSearch(""); setType("all"); setState("all") }}>Limpiar filtros</Button>}
        </div>}
      </>}
      <p className="text-[11px] leading-relaxed text-muted-foreground">Datos del sistema · Solo lectura. Pedidos (PE), notas de crédito (NC) y débito (ND): no disponibles en esta vista.</p>
      {selected && <ComprobanteDetail key={selected.key} record={selected} onClose={() => setSelectedKey(null)} />}
    </div>
  )
}

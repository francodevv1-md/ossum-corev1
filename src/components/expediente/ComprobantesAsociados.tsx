"use client"

import { useEffect, useId, useRef, useState } from "react"
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
import { fetchRemito } from "@/lib/api/remitos"
import { buildOperationalRemitoPrintHtml } from "@/lib/remito-print-template"
import { useRemitoPdfDownload } from "@/hooks/useRemitoPdfDownload"

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
  return <ComprobantesRegister key={JSON.stringify([activeCompany?.id, surgery.backendId])} data={data} companyId={activeCompany?.id} surgeryId={surgery.backendId} />
}

function ComprobantesRegister({ data, companyId, surgeryId }: { data: ReturnType<typeof useSurgeryComprobantes>; companyId?: string; surgeryId?: string }) {
  const reducedMotion = useReducedMotion()
  const indicatorId = useId()
  const [pointerMotion, setPointerMotion] = useState(false)
  const [search, setSearch] = useState("")
  const [type, setType] = useState<ComprobanteType | "all">("all")
  const [state, setState] = useState("all")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const pdf = useRemitoPdfDownload(companyId, surgeryId, data.status)
  const pendingPrint = useRef<Window | null>(null)
  useEffect(() => {
    setPrinting(false)
    setPrintError(null)
    return () => {
      pendingPrint.current?.close()
      pendingPrint.current = null
    }
  }, [data.status])
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

  async function printRemito(id: string) {
    if (!ready || !companyId || !surgeryId || pendingPrint.current) return
    setPrintError(null)
    pdf.clearError()
    // Open during the user gesture, before awaiting HTTP, to avoid popup blockers.
    const popup = window.open("", "_blank", "width=900,height=700")
    if (!popup) {
      setPrintError("El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes y volvé a intentar.")
      return
    }
    pendingPrint.current = popup
    setPrinting(true)
    try {
      popup.opener = null
      popup.document.body.textContent = "Preparando remito para imprimir…"
      const remito = await fetchRemito(companyId, id)
      if (pendingPrint.current !== popup || popup.closed) return
      if (remito.id !== id || remito.companyId !== companyId || remito.surgeryId !== surgeryId) throw new Error("Remito fuera de alcance")
      const recipient = remito.destinatarioSnapshot
      const html = buildOperationalRemitoPrintHtml({
        title: `Remito ${remito.visibleNumber ?? "Sin numeración"}`,
        documentNumber: String(remito.visibleNumber ?? "Sin numeración"),
        state: remito.state, origin: remito.origin,
        issuedAt: remito.issuedAt ? formatDate(remito.issuedAt) : "—", createdAt: formatDate(remito.createdAt),
        destinationName: recipient?.nombre, cuitDni: recipient?.cuitDni,
        address: remito.shippingAddressSnapshot?.domicilio ?? recipient?.domicilio,
        locality: remito.shippingAddressSnapshot?.localidad ?? recipient?.localidad,
        province: remito.shippingAddressSnapshot?.provincia ?? recipient?.provincia,
        surgeryLabel: remito.surgeryId, boxId: remito.boxId, presupuestoId: remito.presupuestoId,
        internalId: remito.id,
        observations: typeof remito.metadata?.observaciones === "string" ? remito.metadata.observaciones : null,
        metaFields: [
          { label: "Entregado", value: remito.deliveredAt ? formatDate(remito.deliveredAt) : "—" },
          { label: "Devuelto", value: remito.returnedAt ? formatDate(remito.returnedAt) : "—" },
          { label: "Sucursal", value: remito.branchId },
          { label: "Motivo salida", value: remito.salidaReason },
          { label: "Transporte", value: remito.transportSnapshot?.nombre },
          { label: "Bultos", value: remito.packageCount },
          { label: "Valor declarado", value: remito.declaredValue },
        ],
        includeReturned: true,
        items: remito.items.map(item => ({ code: item.sku, description: item.description, quantity: item.quantity, unit: item.unit, returnedQuantity: item.returnedQuantity })),
      })
      popup.document.open()
      popup.document.write(html)
      popup.document.close()
      popup.focus()
      popup.print()
    } catch {
      popup.close()
      if (pendingPrint.current === popup) setPrintError("No pudimos preparar la impresión de este remito. Volvé a intentar.")
    } finally {
      if (pendingPrint.current === popup) {
        pendingPrint.current = null
        setPrinting(false)
      }
    }
  }

  return (
    <div className="min-w-0 space-y-5 text-[var(--op-text-primary)]">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pt-2">
        <div className="min-w-0 max-w-xl"><p className="text-base font-semibold leading-6 text-[var(--op-text-primary)]">El recorrido documental de esta cirugía</p>
          <p className="mt-1 text-sm leading-5 text-[var(--op-text-secondary)]">Consultá cada comprobante, desde el presupuesto hasta el cobro.</p></div>
        <Button variant="outline" size="sm" onClick={() => { setSelectedKey(null); data.reload() }} disabled={data.status !== "ready" && data.status !== "error"} className="h-10 shrink-0 gap-2 rounded-md border-[var(--op-border-default)] bg-background px-3 text-xs font-medium text-[var(--op-text-secondary)] shadow-none">
          <RefreshCw className="size-4" aria-hidden />Recargar
        </Button>
      </div>

      {printing && ready && <p role="status" className="text-sm text-[var(--op-text-secondary)]">Preparando remito para imprimir…</p>}
      {pdf.downloading && ready && <p role="status" className="text-sm text-[var(--op-text-secondary)]">Preparando PDF del remito…</p>}
      {(printError || pdf.error) && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{printError || pdf.error}</p>}

      {!ready && data.status !== "error" && <div role="status" className="border-y border-[var(--op-border-default)] bg-[var(--op-secondary)] px-4 py-8 text-sm leading-6 text-[var(--op-text-secondary)]">{statusText}</div>}
      {data.status === "error" && <div role="alert" className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /><div><p className="font-medium">No pudimos cargar los comprobantes.</p><p className="mt-1">{data.error}</p><p className="mt-1 text-xs">Usá Recargar para volver a intentarlo. No se muestran datos locales.</p></div>
      </div>}

      {ready && <>
        <div className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-[var(--op-border-default)]" aria-label="Tipos de comprobante"
          onPointerDownCapture={() => setPointerMotion(true)} onKeyDownCapture={() => setPointerMotion(false)}>
          {(["all", ...Object.keys(COMPROBANTE_LABELS)] as (ComprobanteType | "all")[]).map(value => {
            const count = value === "all" ? records.length : records.filter(row => row.type === value).length
            return <button key={value} type="button" aria-label={`${value === "all" ? "Todos" : COMPROBANTE_LABELS[value]} ${count}`} aria-pressed={type === value} onClick={() => setType(value)}
              className={cn("relative inline-flex min-h-11 items-center gap-2 px-1 pb-1 text-sm font-medium transition-[color,transform] duration-150 ease-out motion-safe:[&:not(:focus-visible):active]:scale-[0.98] motion-reduce:transition-none focus-visible:transition-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-primary)]", type === value ? "text-[var(--op-primary)] dark:text-[var(--op-primary-highlight)]" : "text-[var(--op-text-secondary)] hover:text-[var(--op-text-primary)]") }>
              {type === value && <motion.span aria-hidden layoutId={reducedMotion || !pointerMotion ? undefined : indicatorId} className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--op-primary)]" transition={reducedMotion || !pointerMotion ? { duration: 0 } : { type: "spring", duration: 0.22, bounce: 0 }} />}
              <span className="relative">{value === "all" ? "Todos" : COMPROBANTE_LABELS[value]}</span>
              <span className={cn("relative inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 text-xs tabular-nums", type === value ? "bg-[var(--op-info-bg)] text-[var(--op-primary)] dark:text-[var(--op-primary-highlight)]" : "bg-[var(--op-secondary)] text-[var(--op-text-secondary)]")}>{count}</span>
            </button>
          })}
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="min-w-0 flex-1 basis-64 space-y-1.5"><span className="block text-xs font-medium text-[var(--op-text-secondary)]">Buscar comprobante</span>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--op-text-muted)]" aria-hidden />
            <Input aria-label="Buscar comprobante" placeholder="Buscar por número, referencia o concepto" value={search} onChange={event => setSearch(event.target.value)} className="h-10 rounded-md border-[var(--op-border-default)] bg-background pl-9 text-sm shadow-none placeholder:text-[var(--op-text-muted)]" /></div></label>
          <label className="min-w-0 flex-1 basis-40 space-y-1.5 sm:flex-none"><span className="block text-xs font-medium text-[var(--op-text-secondary)]">Estado</span>
          <select aria-label="Estado del comprobante" value={state} onChange={event => setState(event.target.value)} className="h-10 w-full max-w-full rounded-md border border-[var(--op-border-default)] bg-background px-3 text-sm text-[var(--op-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-primary)] sm:w-48">
            <option value="all">Todos los estados</option>{states.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select></label>
          <span className="flex h-10 shrink-0 items-center text-xs tabular-nums text-[var(--op-text-secondary)]">{filtered.length} visibles</span>
        </div>
        </div>

        {filtered.length ? <div className="overflow-hidden rounded-md border border-[var(--op-border-default)]">
          <Table><TableHeader><TableRow className="border-[var(--op-border-default)] bg-[var(--op-secondary)] hover:bg-[var(--op-secondary)] [&>th]:h-11 [&>th]:px-3 [&>th]:text-xs [&>th]:font-medium [&>th]:text-[var(--op-text-secondary)]">
            <TableHead className="w-16">Tipo</TableHead><TableHead>Comprobante</TableHead>
            <TableHead className="hidden md:table-cell">Fecha</TableHead><TableHead className="hidden lg:table-cell">Concepto</TableHead>
            <TableHead className="text-right">Importe</TableHead><TableHead className="hidden text-right md:table-cell">Saldo</TableHead>
            <TableHead className="hidden sm:table-cell">Estado</TableHead><TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((row) => <tr key={row.key}
              className="group border-b border-[var(--op-border-subtle)] transition-colors duration-100 motion-reduce:transition-none focus-within:transition-none last:border-b-0 hover:bg-[var(--op-secondary)] focus-within:bg-[var(--op-secondary)] [&>td]:px-3 [&>td]:py-3">
              <TableCell><span className={cn("inline-flex min-w-9 justify-center rounded px-2 py-1 text-xs font-semibold", TYPE_COLORS[row.type])}>{row.type}</span></TableCell>
              <TableCell className="min-w-40">
                <button type="button" onClick={() => setSelectedKey(row.key)} aria-label={`Abrir ${row.type} ${row.number ?? row.id}`} className="inline-flex min-h-8 items-center gap-2 rounded-sm text-sm font-semibold text-[var(--op-text-primary)] hover:text-[var(--op-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-primary)] dark:hover:text-[var(--op-primary-highlight)]">
                  {row.number ?? "Sin numeración"}<ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
                </button><p className="max-w-40 truncate text-xs leading-5 text-[var(--op-text-muted)]" title={row.id}>{row.id}</p>
                <p className="mt-1 text-xs text-[var(--op-text-secondary)] md:hidden">{formatDate(row.date)}</p><p className="mt-1 text-xs text-[var(--op-text-secondary)] sm:hidden">{row.state.replaceAll("_", " ")}</p>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-xs text-[var(--op-text-secondary)] md:table-cell">{formatDate(row.date)}</TableCell>
              <TableCell className="hidden max-w-56 truncate text-sm text-[var(--op-text-secondary)] lg:table-cell" title={row.concept}>{row.concept}</TableCell>
              <TableCell className={cn("whitespace-nowrap text-right text-sm tabular-nums", row.type === "NR" ? "text-xs text-[var(--op-text-muted)]" : "font-semibold text-[var(--op-text-primary)]")}>{row.type === "NR" ? "No aplica" : documentMoney(row.amount, row.currency)}</TableCell>
              <TableCell className={cn("hidden whitespace-nowrap text-right text-sm tabular-nums md:table-cell", row.type === "FV" ? "font-medium text-[var(--op-text-primary)]" : "text-xs text-[var(--op-text-muted)]")}>{row.type === "FV" ? documentMoney(row.balance, row.currency) : "No aplica"}</TableCell>
              <TableCell className="hidden text-xs sm:table-cell"><span className="inline-flex whitespace-nowrap rounded border border-[var(--op-border-default)] bg-background px-2 py-1 font-medium text-[var(--op-text-secondary)]">{row.state.replaceAll("_", " ")}</span></TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Acciones ${row.type} ${row.number ?? row.id}`} className="size-10 rounded-md text-[var(--op-text-secondary)] transition-[color,background-color,transform] duration-150 ease-out motion-safe:[&:not(:focus-visible):active]:scale-[0.97] motion-reduce:transition-none focus-visible:transition-none hover:bg-[var(--op-hover)]"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => setSelectedKey(row.key)}><ArrowUpRight className="size-4" />Abrir comprobante</DropdownMenuItem>
                <DropdownMenuItem disabled={row.type !== "NR" || printing || pdf.downloading} onSelect={() => { setPrintError(null); void pdf.download(row.id) }}><Download className="size-4" />{row.type === "NR" ? "Descargar PDF" : "Descargar PDF · No disponible"}</DropdownMenuItem>
                <DropdownMenuItem disabled={row.type !== "NR" || printing} onSelect={() => { void printRemito(row.id) }}><Printer className="size-4" />{row.type === "NR" ? "Imprimir" : "Imprimir · No disponible"}</DropdownMenuItem>
                <DropdownMenuItem disabled><Pencil className="size-4" />Modificar · No disponible</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu></TableCell>
            </tr>)}
          </TableBody></Table>
        </div> : <div className="flex flex-col items-center gap-3 border-y border-[var(--op-border-default)] bg-[var(--op-secondary)] px-6 py-12 text-center">
          <FileText className="size-7 text-[var(--op-text-muted)]" aria-hidden /><p className="max-w-sm text-sm font-medium leading-6 text-[var(--op-text-secondary)]">{records.length ? "Ningún comprobante coincide con los filtros." : "Sin comprobantes vinculados a esta cirugía."}</p>
          {records.length > 0 && <Button variant="outline" size="sm" onClick={() => { setSearch(""); setType("all"); setState("all") }}>Limpiar filtros</Button>}
        </div>}
      </>}
      <p className="border-t border-[var(--op-border-subtle)] pt-3 text-xs leading-5 text-[var(--op-text-secondary)]">Datos del sistema · Solo lectura. Pedidos (PE), notas de crédito (NC) y débito (ND): no disponibles en esta vista.</p>
      {selected && <ComprobanteDetail key={selected.key} record={selected} onClose={() => setSelectedKey(null)} />}
    </div>
  )
}

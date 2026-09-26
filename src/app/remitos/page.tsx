"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Columns3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Hash,
  History,
  Link2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Paperclip,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useRemitos } from "@/hooks/useRemitos"
import {
  getRemitoDestinatarioName,
  getRemitoVisibleNumber,
  REMITO_STATES,
  type RemitoApiItem,
  type RemitoApiRow,
  type RemitoState,
} from "@/lib/api/remitos"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { buildOperationalRemitoPrintHtml } from "@/lib/remito-print-template"
import { fetchRemitoPrintCodes, type RemitoPrintCodesDto } from "@/lib/api/remito-print-codes"
import { RemitoStateSurface } from "@/components/remitos/RemitoStateSurface"
import { SendRemitoEmailDialog } from "@/components/remitos/SendRemitoEmailDialog"

const OSSUM_SCOPE_STYLE = {
  "--ossum-navy": "#071935",
  "--ossum-action": "#1D2FC0",
  "--ossum-danger": "#D02F28",
  "--ossum-surface": "#FBFBFB",
  "--ossum-surface-2": "#F3F3F3",
  "--ossum-line": "#e6e8eb",
  "--ossum-line-strong": "#d0d4da",
} as React.CSSProperties

// ─── Helpers ───────────────────────────────────────────────

const STATE_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "__pending", label: "Pendientes" },
  { value: "__returned", label: "Con devolución" },
  ...REMITO_STATES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
]

const ORIGIN_FILTER_OPTIONS = [
  { value: "", label: "Todos los orígenes" },
  { value: "cirugia", label: "Cirugía" },
  { value: "venta", label: "Venta" },
  { value: "manual", label: "Manual" },
  { value: "traslado", label: "Traslado" },
]

const DATE_FILTER_OPTIONS = [
  { value: "", label: "Todas las fechas" },
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
]

const DAY_MS = 86_400_000

function getDateThreshold(dateFilter: string, referenceDate: Date) {
  if (dateFilter === "today") {
    return new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    ).getTime()
  }
  if (dateFilter === "7d") return referenceDate.getTime() - 7 * DAY_MS
  if (dateFilter === "30d") return referenceDate.getTime() - 30 * DAY_MS
  return null
}

const NEXT_STATE_OPTIONS: Partial<Record<RemitoState, RemitoState[]>> = {
  Emitido: ["En_transito", "Entregado", "Anulado"],
  En_transito: ["Entregado", "Parcialmente_devuelto", "Anulado"],
  Entregado: ["Parcialmente_devuelto", "Devuelto", "Anulado"],
  Parcialmente_devuelto: ["Devuelto", "Anulado"],
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(d)
}

function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(d)
}

function fmtQty(value: string | number | null | undefined) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return String(value ?? "—")
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(n)
}

// ─── Sort headers ──────────────────────────────────────────

type SortKey = "documento" | "destinatario" | "estado" | "fecha" | "items"
type SortDir = "asc" | "desc"

type RemitoColumnKey = "documento" | "destinatario" | "cirugia" | "origen" | "tipo" | "estado" | "fecha" | "items" | "sucursal" | "deposito" | "usuario" | "contacto" | "transporte" | "entrega" | "observacion" | "empresa"
type RemitoViewKey = "operativa" | "logistica" | "auditoria" | "personalizada"

type RemitoColumn = { key: RemitoColumnKey; label: string; width: number; align?: "right"; pinned?: boolean }

const REMITO_COLUMNS: RemitoColumn[] = [
  { key: "documento", label: "Documento", width: 128, pinned: true },
  { key: "destinatario", label: "Destinatario", width: 230, pinned: true },
  { key: "cirugia", label: "Cirugía / expediente", width: 170 },
  { key: "origen", label: "Origen", width: 105 },
  { key: "tipo", label: "Tipo", width: 90 },
  { key: "estado", label: "Estado", width: 155 },
  { key: "fecha", label: "Fecha", width: 105 },
  { key: "items", label: "Ítems", width: 70, align: "right" },
  { key: "sucursal", label: "Sucursal", width: 150 },
  { key: "deposito", label: "Depósito", width: 150 },
  { key: "usuario", label: "Usuario", width: 130 },
  { key: "contacto", label: "Contacto", width: 125 },
  { key: "transporte", label: "Transporte", width: 150 },
  { key: "entrega", label: "Fecha/hora entrega", width: 150 },
  { key: "observacion", label: "Observación", width: 240 },
  { key: "empresa", label: "Empresa", width: 130 },
]

const REMITO_COLUMN_BY_KEY = Object.fromEntries(REMITO_COLUMNS.map((column) => [column.key, column])) as Record<RemitoColumnKey, RemitoColumn>
const REMITO_VIEWS: Array<{ key: RemitoViewKey; label: string; columns: RemitoColumnKey[] }> = [
  { key: "operativa", label: "Operativa", columns: ["documento", "destinatario", "cirugia", "origen", "tipo", "estado", "fecha", "items"] },
  { key: "logistica", label: "Logística", columns: ["documento", "destinatario", "estado", "sucursal", "deposito", "transporte", "entrega", "items"] },
  { key: "auditoria", label: "Auditoría", columns: ["documento", "destinatario", "estado", "usuario", "fecha", "entrega", "empresa"] },
  { key: "personalizada", label: "Personalizada", columns: [] },
]
const REMITO_COLUMNS_STORAGE_KEY = "ossum.remitos.columns.v1"

function loadRemitoTablePreference() {
  const fallback = { view: "operativa" as RemitoViewKey, columns: REMITO_VIEWS[0].columns }
  if (typeof window === "undefined") return fallback
  try {
    const saved = window.localStorage.getItem(REMITO_COLUMNS_STORAGE_KEY)
    if (!saved) return fallback
    const parsed = JSON.parse(saved) as { view?: RemitoViewKey; columns?: RemitoColumnKey[] }
    return {
      view: parsed.view && REMITO_VIEWS.some((view) => view.key === parsed.view) ? parsed.view : fallback.view,
      columns: Array.isArray(parsed.columns) ? parsed.columns.filter((key): key is RemitoColumnKey => key in REMITO_COLUMN_BY_KEY) : fallback.columns,
    }
  } catch { return fallback }
}

function SortHeader({ label, sortKey, current, dir, onChange, align = "left" }: {
  label: string; sortKey: SortKey; current: SortKey | null; dir: SortDir
  onChange: (key: SortKey) => void; align?: "left" | "right"
}) {
  const active = current === sortKey
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      type="button"
      onClick={() => onChange(sortKey)}
      className={`inline-flex items-center gap-1 text-xs font-medium text-white transition-colors hover:text-white ${align === "right" ? "flex-row-reverse" : ""} ${active ? "opacity-100" : "opacity-80"}`}
    >
      {label}
      <Icon className={`size-3 ${active ? "opacity-100" : "opacity-40 group-hover:opacity-70"}`} aria-hidden="true" />
    </button>
  )
}

// ─── State visuals ─────────────────────────────────────────

type StateTone = "neutral" | "info" | "success" | "warning" | "danger" | "ghost"

const STATE_TONE: Record<string, StateTone> = {
  Borrador: "neutral",
  Emitido: "info",
  En_transito: "warning",
  Entregado: "success",
  Parcialmente_devuelto: "warning",
  Devuelto: "ghost",
  Anulado: "danger",
}

function StateDot({ tone }: { tone: StateTone }) {
  const colors: Record<StateTone, string> = {
    neutral: "bg-gray-400",
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    ghost: "bg-gray-300",
  }
  return <span className={`inline-block size-2 rounded-full ${colors[tone]}`} />
}

// ─── Labels ────────────────────────────────────────────────

function originLabel(origin: string) {
  const m: Record<string, string> = { box: "Caja", presupuesto: "Presupuesto", manual: "Manual", mixto: "Mixto" }
  return m[origin] ?? origin
}

function reasonLabel(reason: string) {
  const m: Record<string, string> = { cirugia: "Cirugía", venta: "Venta", prestamo: "Préstamo", traslado: "Traslado", ajuste: "Ajuste", otro: "Otro" }
  return m[reason] ?? reason
}

function operationalOriginLabel(remito: Pick<RemitoApiRow, "surgeryId" | "salidaReason" | "origin">) {
  if (remito.surgeryId) return "Cirugía"
  if (remito.salidaReason === "venta") return "Venta"
  if (remito.salidaReason === "traslado") return "Traslado"
  if (remito.origin === "manual") return "Manual"
  return originLabel(remito.origin)
}

function entryExitLabel(r: Pick<RemitoApiRow, "origin" | "state">) {
  if (r.state === "Devuelto" || r.state === "Parcialmente_devuelto") return "Entrada"
  if (r.state === "Anulado" || r.state === "Borrador") return "—"
  return "Salida"
}

function getContactCode(remito: Pick<RemitoApiRow, "destinatarioSnapshot">) {
  const c = remito.destinatarioSnapshot?.codigoContacto
  return typeof c === "string" && c.trim() ? c.trim() : null
}

function canDevolver(remito: RemitoApiRow) { return remito.state === "Entregado" || remito.state === "Parcialmente_devuelto" }
function canEditar(remito: RemitoApiRow) { return remito.state === "Borrador" || remito.state === "Entregado" }
function canEmitir(remito: RemitoApiRow) { return remito.state === "Borrador" }
function canEntregar(remito: RemitoApiRow) { return remito.state === "Emitido" || remito.state === "En_transito" }

function FilterSelect({ ariaLabel, value, onChange, options }: { ariaLabel: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} className="h-8 rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}
// ─── Print ─────────────────────────────────────────────────

type PrintFormat = "a4" | "thermal80"

function buildPrintHtml(remito: RemitoApiRow, printCodes?: RemitoPrintCodesDto, format: PrintFormat = "a4") {
  const dest = remito.destinatarioSnapshot
  const obs = typeof remito.metadata?.observaciones === "string" ? remito.metadata.observaciones : null
  return buildOperationalRemitoPrintHtml({
    title: `Remito ${getRemitoVisibleNumber(remito)}`,
    format,
    documentNumber: getRemitoVisibleNumber(remito),
    state: remito.state,
    origin: originLabel(remito.origin),
    issuedAt: fmtDateTime(remito.issuedAt),
    createdAt: fmtDateTime(remito.createdAt),
    destinationName: dest?.nombre ?? "Sin destinatario",
    cuitDni: dest?.cuitDni,
    address: remito.shippingAddressSnapshot?.domicilio ?? dest?.domicilio,
    locality: remito.shippingAddressSnapshot?.localidad ?? dest?.localidad,
    province: remito.shippingAddressSnapshot?.provincia ?? dest?.provincia,
    surgeryLabel: remito.surgeryLabel,
    patient: remito.surgeryPatientName,
    doctor: remito.surgeryDoctorName,
    institution: remito.surgeryInstitutionName,
    client: remito.surgeryClientName,
    surgeryDate: fmtDateTime(remito.surgeryDate),
    createdBy: remito.createdByName,
    observations: obs,
    printCodes,
    metaFields: [
      { label: "Entregado", value: fmtDateTime(remito.deliveredAt) },
      { label: "Devuelto", value: fmtDateTime(remito.returnedAt) },
      { label: "Sucursal", value: remito.issuedBranchLabel ?? "—" },
      { label: "Depósito", value: remito.branchLabel ?? "—" },
      { label: "Contacto", value: getContactCode(remito) ?? "—" },
      { label: "Generado por", value: remito.createdByName ?? "—" },
      { label: "Motivo salida", value: reasonLabel(remito.salidaReason) },
      { label: "Transporte", value: remito.transportSnapshot?.nombre ?? "—" },
      { label: "Bultos", value: remito.packageCount == null ? "—" : String(remito.packageCount) },
      { label: "Valor declarado", value: remito.declaredValue == null ? "—" : String(remito.declaredValue) },
    ],
    includeReturned: true,
    items: remito.items.map((item) => ({
      code: item.sku,
      description: item.description,
      quantity: fmtQty(item.quantity),
      unit: item.unit,
      returnedQuantity: fmtQty(item.returnedQuantity),
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber,
      expirationDate: fmtDate(item.expirationDate),
      boxId: item.boxId,
    })),
    detailItems: (remito.detailItems ?? remito.items).map((item) => ({
      code: item.sku,
      description: item.description,
      quantity: fmtQty(item.quantity),
      unit: item.unit,
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber,
      expirationDate: fmtDate(item.expirationDate),
      identifiedCode: "identifiedCode" in item ? item.identifiedCode : null,
      groupLabel: "groupLabel" in item ? item.groupLabel : null,
    })),
  })
}

async function printRemito(remito: RemitoApiRow, format: PrintFormat) {
  if (remito.state === "Borrador") {
    toast.error("Los códigos de impresión no están disponibles")
    return
  }
  const w = window.open("", "_blank", format === "thermal80" ? "width=420,height=700" : "width=900,height=700")
  if (!w) { toast.error("El navegador bloqueó la ventana de impresión"); return }
  let printCodes: RemitoPrintCodesDto | undefined
  if (remito.remitoShortCode) {
    try {
      printCodes = await fetchRemitoPrintCodes(remito.companyId, remito.remitoShortCode)
    } catch {
      w.close()
      toast.error("No se pudieron cargar el QR y el código de barras. Volvé a intentar.")
      return
    }
  } else {
    w.close()
    toast.error("Este remito todavía no tiene códigos de impresión disponibles.")
    return
  }
  w.document.open()
  w.document.write(buildPrintHtml(remito, printCodes, format))
  w.document.close()
  w.focus()
}

function PrintMenu({ remito, onPrint }: { remito: RemitoApiRow; onPrint: (remito: RemitoApiRow, format: PrintFormat) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs"><Printer className="size-3" /> Imprimir <ChevronDown className="size-3" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={() => onPrint(remito, "a4")} className="items-start py-2.5"><Printer className="mt-0.5 size-4" /><span><strong className="block text-xs">Remito A4 / PDF</strong><span className="text-[11px] text-muted-foreground">Documento completo para archivo o firma</span></span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onPrint(remito, "thermal80")} className="items-start py-2.5"><ReceiptText className="mt-0.5 size-4" /><span><strong className="block text-xs">Ticket térmico 80 mm</strong><span className="text-[11px] text-muted-foreground">Optimizado para impresora POS</span></span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Devolución Dialog ─────────────────────────────────────

function DevolucionDialog({
  remito, open, onOpenChange, onConfirm, loading,
}: {
  remito: RemitoApiRow | null; open: boolean; onOpenChange: (v: boolean) => void
  onConfirm: (items: { itemId: string; returnedQuantity: number }[]) => Promise<void>; loading: boolean
}) {
  const [vals, setVals] = useState<Record<string, number>>({})
  const submit = async () => {
    const items = Object.entries(vals).filter(([, q]) => q > 0).map(([itemId, returnedQuantity]) => ({ itemId, returnedQuantity }))
    if (!items.length) { toast.error("Ingresá al menos una cantidad a devolver"); return }
    await onConfirm(items); setVals({})
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar devolución</DialogTitle>
          <DialogDescription>{remito ? getRemitoVisibleNumber(remito) : ""}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] space-y-3 overflow-y-auto py-2">
          {remito?.items.map((item) => {
            const avail = Math.max(0, Number(item.quantity) - Number(item.returnedQuantity ?? 0))
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sku ?? "Sin SKU"} · Enviado {fmtQty(item.quantity)} · Ya devuelto {fmtQty(item.returnedQuantity)}
                  </p>
                </div>
                <div className="w-28">
                  <Label htmlFor={`dev-${item.id}`} className="text-xs">Devolver</Label>
                  <Input id={`dev-${item.id}`} type="number" min={0} max={avail} step="0.0001"
                    value={vals[item.id] ?? 0}
                    onChange={(e) => setVals((cur) => ({ ...cur, [item.id]: Number(e.target.value) }))}
                    className="h-8 text-sm" />
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Registrando…" : "Confirmar devolución"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Inspector primitives ──────────────────────────────────

type InspectorTab = "summary" | "material" | "logistics" | "codes" | "attachments" | "trace"
type InspectorSize = "collapsed" | "normal" | "expanded"

function InspectorField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">{label}</dt>
      <dd className={`mt-0.5 truncate text-xs text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  )
}

function InspectorGroup({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 border-r border-[var(--ossum-line)] pr-5 last:border-r-0 ${className}`}>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-2">{children}</dl>
    </section>
  )
}

function MaterialTable({ items }: { items: RemitoApiItem[] }) {
  const grouped = useMemo(() => {
    const boxes = new Map<string, RemitoApiItem[]>()
    const loose: RemitoApiItem[] = []
    for (const item of items) {
      if (!item.boxId) loose.push(item)
      else boxes.set(item.boxId, [...(boxes.get(item.boxId) ?? []), item])
    }
    return { boxes: [...boxes.entries()], loose }
  }, [items])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const rows = (source: RemitoApiItem[]) => source.map((item) => (
    <tr key={item.id} className="border-b border-[var(--ossum-line)] last:border-0">
      <td className="px-2 py-1 font-mono text-gray-500">{item.sku ?? "—"}</td>
      <td className="px-2 py-1 font-medium text-gray-800">{item.description}</td>
      <td className="px-2 py-1 text-right tabular-nums">{fmtQty(item.quantity)}</td>
      <td className="px-2 py-1 text-gray-500">{item.unit ?? "—"}</td>
      <td className="px-2 py-1 font-mono text-gray-500">{item.lotNumber ?? "—"}</td>
      <td className="px-2 py-1 font-mono text-gray-500">{item.serialNumber ?? "—"}</td>
      <td className="px-2 py-1 text-gray-500">{fmtDate(item.expirationDate)}</td>
    </tr>
  ))
  return (
    <div className="h-full overflow-auto border border-[var(--ossum-line)]">
      <table className="w-full min-w-[780px] text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--ossum-navy)] text-white">
          <tr>{["SKU", "Descripción", "Cant.", "Unidad", "Lote", "Serie", "Vencimiento"].map((label) => <th key={label} className={`px-2 py-1.5 text-left font-medium ${label === "Cant." ? "text-right" : ""}`}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {grouped.boxes.map(([boxId, boxItems]) => (
            <React.Fragment key={boxId}>
              <tr className="border-b border-[var(--ossum-line-strong)] bg-[var(--ossum-surface-2)]">
                <td colSpan={7} className="px-2 py-1">
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ossum-navy)]" onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(boxId)) next.delete(boxId); else next.add(boxId); return next })}>
                    {collapsed.has(boxId) ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
                    Caja {boxId} · {boxItems.length} componente{boxItems.length !== 1 ? "s" : ""}
                  </button>
                </td>
              </tr>
              {!collapsed.has(boxId) && rows(boxItems)}
            </React.Fragment>
          ))}
          {rows(grouped.loose)}
        </tbody>
      </table>
    </div>
  )
}

function RemitoCodes({ remito }: { remito: RemitoApiRow }) {
  const [codes, setCodes] = useState<RemitoPrintCodesDto | null>(null)
  const [loading, setLoading] = useState(remito.state !== "Borrador" && Boolean(remito.remitoShortCode))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (remito.state === "Borrador" || !remito.remitoShortCode) return
    let active = true
    fetchRemitoPrintCodes(remito.companyId, remito.remitoShortCode)
      .then((result) => { if (active) setCodes(result) })
      .catch(() => { if (active) setError("Los códigos no están disponibles para este remito.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [remito.companyId, remito.remitoShortCode, remito.state])

  if (remito.state === "Borrador") return <div className="flex h-full flex-col items-center justify-center gap-2 text-center"><QrCode className="size-5 text-gray-400" /><p className="text-sm font-medium">Códigos disponibles al emitir</p><p className="max-w-md text-xs text-gray-500">Emití el remito para habilitar acceso interno, verificación pública e identificación Code 128.</p></div>
  if (loading) return <RemitoStateSurface kind="loading" />
  if (error || !codes) return <div className="flex h-full items-center justify-center text-xs text-gray-500">{error ?? "Este remito no posee códigos de identificación."}</div>

  return (
    <div className="grid h-full gap-5 lg:grid-cols-[1fr_1fr_1.45fr]" aria-label="Códigos del remito">
      <section className="flex min-h-48 flex-col items-center justify-center border-r border-[var(--ossum-line)] px-4 text-center">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Uso interno OSSUM</h3>
        {/* Data URLs are generated at request time and must not pass through image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={codes.internalQrDataUrl} alt="QR para abrir la operación logística" className="mt-2 size-36 border border-gray-200 bg-white p-1.5 [image-rendering:pixelated]" />
        <p className="mt-2 text-xs font-medium text-gray-700">Abrir operación logística</p><p className="text-[11px] text-gray-400">Requiere acceso</p>
      </section>
      <section className="flex min-h-48 flex-col items-center justify-center border-r border-[var(--ossum-line)] px-4 text-center">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Verificar documento</h3>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={codes.publicQrDataUrl} alt="QR para verificar públicamente el documento" className="mt-2 size-36 border border-gray-200 bg-white p-1.5 [image-rendering:pixelated]" />
        <p className="mt-2 text-xs font-medium text-gray-700">Comprobar autenticidad</p><p className="text-[11px] text-gray-400">Acceso público</p>
      </section>
      <section className="flex min-h-48 flex-col items-center justify-center px-4 text-center">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Identificación del remito</h3>
        <div className="mt-4 w-full max-w-xl [&_svg]:h-24 [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: codes.code128Svg }} />
        <p className="mt-2 font-mono text-sm font-semibold tracking-[0.08em] text-gray-800">{codes.remitoShortCode}</p>
        <p className="mt-1 text-[11px] text-gray-400">Escanear con lector Code 128</p>
      </section>
    </div>
  )
}

function RemitoAttachments() {
  return (
    <div className="h-full overflow-auto border border-[var(--ossum-line)] bg-white">
      <table className="w-full min-w-[680px] text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--ossum-navy)] text-white">
          <tr>{["Documento", "Tipo", "Fecha", "Estado", "Acciones"].map((label) => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}</tr>
        </thead>
        <tbody>
          <tr className="border-b border-[var(--ossum-line)]">
            <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
              <Paperclip className="mx-auto mb-2 size-4 text-gray-400" />
              Todavía no hay adjuntos vinculados a este remito.
              <span className="mt-1 block text-[11px] text-gray-400">Remito firmado, fotos, constancia de entrega y guía de transporte aparecerán acá.</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Summary strip ─────────────────────────────────────────

type SummaryChipKey = "total" | "pend" | "transito" | "entregados" | "conDev"

type SummaryStripProps = {
  total: number; pend: number; transito: number; entregados: number; conDev: number; loading: boolean
  activeState: string
  onSelectState: (state: string) => void
}

const SUMMARY_TOOLTIP: Record<SummaryChipKey, string> = {
  total: "Todos los remitos",
  pend: "Borradores pendientes de emisión o emisión no entregada",
  transito: "Remitos en camino al destinatario",
  entregados: "Remitos entregados",
  conDev: "Remitos con devolución parcial o completa",
}

function SummaryStrip({ total, pend, transito, entregados, conDev, loading, activeState, onSelectState }: SummaryStripProps) {
  const chips: Array<{ key: SummaryChipKey; label: string; value: number; icon: typeof Hash; state?: string; warn?: boolean; success?: boolean }> = [
    { key: "total", label: "Total", value: total, icon: Hash, state: "__all__" },
    { key: "pend", label: "Pendientes", value: pend, icon: Clock, state: "__pending", warn: pend > 0 },
    { key: "transito", label: "En tránsito", value: transito, icon: Truck, state: "En_transito" },
    { key: "entregados", label: "Entregados", value: entregados, icon: CheckCircle2, state: "Entregado", success: entregados > 0 },
    { key: "conDev", label: "Con devolución", value: conDev, icon: ArrowLeftRight, state: "__returned", warn: conDev > 0 },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-white px-6 py-2.5">
      {chips.map(({ key, label, value, icon: Icon, state, warn, success }) => {
        const active = state === "__all__" ? !activeState : Boolean(state) && activeState === state
        const selectable = Boolean(state)
        return (
          <button
            key={key}
            type="button"
            disabled={!selectable || loading}
            onClick={() => selectable && onSelectState(state === "__all__" || active ? "" : (state as string))}
            aria-pressed={active}
            title={SUMMARY_TOOLTIP[key]}
            className={[
              "group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
              "disabled:cursor-default disabled:bg-transparent disabled:border-transparent",
              selectable && !active ? "cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50" : "",
              selectable && active ? "border-gray-900 bg-gray-900 text-white" : "",
              !selectable ? "border-transparent bg-transparent" : "",
            ].join(" ")}
          >
            <Icon className={[
              "size-3",
              warn && !active ? "text-amber-500" : "",
              success && !active ? "text-emerald-500" : "",
              !warn && !success && !active ? "text-gray-400" : "",
              active ? "text-white" : "",
            ].join(" ")} />
            <span className={active ? "text-white/80" : "text-gray-500"}>{label}</span>
            <span className={["tabular-nums font-semibold", active ? "text-white" : "text-gray-800"].join(" ")}>{loading ? "—" : value}</span>
          </button>
        )
      })}
    </div>
  )
}

function RemitoColumnsMenu({ visibleKeys, onToggle }: { visibleKeys: Set<RemitoColumnKey>; onToggle: (key: RemitoColumnKey) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 text-xs"><Columns3 className="size-3.5" />Columnas</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-64 overflow-auto">
        <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {REMITO_COLUMNS.map((column) => <DropdownMenuCheckboxItem key={column.key} checked={visibleKeys.has(column.key)} onCheckedChange={() => onToggle(column.key)} onSelect={(event) => event.preventDefault()}>{column.label}{column.pinned && <span className="ml-auto text-[10px] text-gray-400">Fija</span>}</DropdownMenuCheckboxItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function remitoObservation(remito: RemitoApiRow) {
  return typeof remito.metadata?.observaciones === "string" ? remito.metadata.observaciones : "—"
}

function RemitoCell({ column, remito }: { column: RemitoColumnKey; remito: RemitoApiRow }) {
  const tone = STATE_TONE[remito.state] ?? "neutral"
  switch (column) {
    case "documento": return <span className="font-mono text-xs font-semibold text-gray-900">{getRemitoVisibleNumber(remito)}</span>
    case "destinatario": return <><p className="truncate text-sm font-medium text-gray-800">{getRemitoDestinatarioName(remito)}</p>{getContactCode(remito) && <p className="font-mono text-xs text-gray-400">{getContactCode(remito)}</p>}</>
    case "cirugia": return remito.surgeryId ? <span className="font-mono text-xs text-gray-600" title={remito.surgeryId}>{remito.surgeryLabel ?? remito.surgeryId}</span> : <span className="text-gray-300">—</span>
    case "origen": return <span className="text-gray-600">{operationalOriginLabel(remito)}</span>
    case "tipo": return <span className={remito.state === "Devuelto" || remito.state === "Parcialmente_devuelto" ? "text-amber-600" : "text-gray-600"}>{entryExitLabel(remito)}</span>
    case "estado": return <span className="inline-flex items-center gap-1.5"><StateDot tone={tone} /><span className="text-gray-700">{remito.state.replace(/_/g, " ")}</span></span>
    case "fecha": return <span className="text-gray-500" title={fmtDateTime(remito.issuedAt ?? remito.createdAt)}>{fmtDate(remito.issuedAt ?? remito.createdAt)}</span>
    case "items": return <span className="tabular-nums text-gray-500">{remito.items.length}</span>
    case "sucursal": return <span className="text-gray-600">{remito.issuedBranchLabel ?? "—"}</span>
    case "deposito": return <span className="text-gray-600">{remito.branchLabel ?? remito.branchId ?? "—"}</span>
    case "usuario": return <span className="font-mono text-gray-500" title={remito.createdById ?? undefined}>{remito.createdById ? `${remito.createdById.slice(0, 8)}…` : "—"}</span>
    case "contacto": return <span className="font-mono text-gray-500">{getContactCode(remito) ?? "—"}</span>
    case "transporte": return <span className="text-gray-600">{remito.transportSnapshot?.nombre ?? "—"}</span>
    case "entrega": return <span className="text-gray-500">{fmtDateTime(remito.deliveredAt)}</span>
    case "observacion": return <span className="block max-w-60 truncate text-gray-500" title={remitoObservation(remito)}>{remitoObservation(remito)}</span>
    case "empresa": return <span className="font-mono text-gray-500" title={remito.companyId}>{remito.companyId.slice(0, 8)}…</span>
  }
}

// ─── Bottom inspector ──────────────────────────────────────

function RemitoInspector({ remito, size, tab, nextStates, mutatingId, router, onSizeChange, onTabChange, onClose, onEmit, onTransition, onPrint, onEmail, onEdit, onSetDevolucionOpen }: {
  remito: RemitoApiRow; size: InspectorSize; tab: InspectorTab; nextStates: RemitoState[]; mutatingId: string | null
  router: ReturnType<typeof useRouter>; onSizeChange: (size: InspectorSize) => void; onTabChange: (tab: InspectorTab) => void
  onClose: () => void; onEmit: (r: RemitoApiRow) => void; onTransition: (r: RemitoApiRow, s: RemitoState) => void
  onPrint: (r: RemitoApiRow, format: PrintFormat) => void; onEmail: (r: RemitoApiRow) => void; onEdit: (r: RemitoApiRow) => void; onSetDevolucionOpen: (v: boolean) => void
}) {
  const [codesVisited, setCodesVisited] = useState(false)
  const tone = STATE_TONE[remito.state] ?? "neutral"
  const primaryAction = canEntregar(remito)
    ? { label: "Registrar entrega", run: () => onTransition(remito, "Entregado") }
    : canEmitir(remito) ? { label: "Emitir", run: () => onEmit(remito) } : null
  const destination = getRemitoDestinatarioName(remito)
  const locality = [remito.shippingAddressSnapshot?.localidad, remito.shippingAddressSnapshot?.provincia].filter(Boolean).join(", ") || "—"
  const height = size === "expanded" ? "h-[65vh]" : size === "collapsed" ? "h-[3.25rem]" : "h-[36vh] min-h-[15rem]"
  const tabs: Array<{ id: InspectorTab; label: string }> = [{ id: "summary", label: "Resumen" }, { id: "material", label: "Material" }, { id: "logistics", label: "Logística" }, { id: "codes", label: "QR y códigos" }, { id: "attachments", label: "Adjuntos" }, { id: "trace", label: "Trazabilidad" }]
  const fullViewPath = `/remitos/${remito.id}`
  return (
    <section className={`${height} flex shrink-0 flex-col border-t border-[var(--ossum-line-strong)] bg-white transition-[height] duration-200`} aria-label={`Detalle del remito ${getRemitoVisibleNumber(remito)}`}>
      <div className="flex min-h-[3.25rem] items-center justify-between gap-4 border-b border-[var(--ossum-line)] px-5 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-sm font-bold text-[var(--ossum-navy)]">{getRemitoVisibleNumber(remito)}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700"><StateDot tone={tone} />{remito.state.replace(/_/g, " ")}</span>
          <span className="hidden truncate text-xs text-gray-500 md:inline">{destination} · {remito.surgeryLabel ?? reasonLabel(remito.salidaReason)} · {remito.items.length} ítems · Emitido {fmtDate(remito.issuedAt)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {size !== "collapsed" && <>
            {remito.surgeryId && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.push(`/expediente?cirugia=${remito.surgeryId}`)}>Ver expediente</Button>}
            {canEditar(remito) && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEdit(remito)}>Editar</Button>}
            <PrintMenu remito={remito} onPrint={onPrint} />
            {remito.state !== "Borrador" && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEmail(remito)}>Enviar por correo</Button>}
            {canDevolver(remito) && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onSetDevolucionOpen(true)}><ArrowLeftRight className="size-3" /> Registrar devolución</Button>}
            {primaryAction && <Button size="sm" className="h-7 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={primaryAction.run} disabled={mutatingId === remito.id}>{primaryAction.label}</Button>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7" title="Más acciones" aria-label="Más acciones del remito"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {canEditar(remito) && <DropdownMenuItem onSelect={() => onEdit(remito)}>Editar remito</DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => toast.info(remito.surgeryId ? "Cambio de asociación preparado para próxima integración" : "Asociación con cirugía preparada para próxima integración")}><Link2 className="size-4" />{remito.surgeryId ? "Cambiar asociación" : "Asociar cirugía / expediente"}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onTabChange("trace")}><History className="size-4" />Ver historial</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push(fullViewPath)}><Maximize2 className="size-4" />Abrir vista completa</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => window.open(fullViewPath, "_blank", "noopener,noreferrer")}><ExternalLink className="size-4" />Abrir en nueva pestaña</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => toast.info("Duplicación preparada para próxima integración")}>Duplicar remito</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => toast.info("Anulación disponible mediante transición autorizada")}>Anular</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>}
          <Button variant="ghost" size="icon" className="size-7" aria-label={size === "collapsed" ? "Expandir detalle" : "Contraer detalle"} onClick={() => onSizeChange(size === "collapsed" ? "normal" : "collapsed")}>{size === "collapsed" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button>
          {size !== "collapsed" && <Button variant="ghost" size="icon" className="size-7" aria-label={size === "expanded" ? "Restaurar detalle" : "Expandir detalle"} onClick={() => onSizeChange(size === "expanded" ? "normal" : "expanded")}>{size === "expanded" ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Button>}
          <Button variant="ghost" size="icon" className="size-7" aria-label="Cerrar detalle" onClick={onClose}><X className="size-4" /></Button>
        </div>
      </div>
      {size !== "collapsed" && <>
        <nav className="flex h-9 items-end gap-5 border-b border-[var(--ossum-line)] px-5" aria-label="Secciones del detalle">
           {tabs.map((item) => <button key={item.id} type="button" onClick={() => { if (item.id === "codes") setCodesVisited(true); onTabChange(item.id) }} className={`h-9 border-b-2 px-1 text-xs font-medium ${tab === item.id ? "border-[var(--ossum-action)] text-[var(--ossum-action)]" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{item.label}</button>)}
        </nav>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          {tab === "summary" && <div className={`grid gap-5 ${remito.surgeryId ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
             <InspectorGroup title="Documento"><InspectorField label="Remito" value={getRemitoVisibleNumber(remito)} mono /><InspectorField label="Tipo" value={entryExitLabel(remito)} /><InspectorField label="Origen" value={originLabel(remito.origin)} /><InspectorField label="Motivo" value={reasonLabel(remito.salidaReason)} /><InspectorField label="Sucursal" value={remito.issuedBranchLabel ?? remito.branchLabel ?? "—"} /><InspectorField label="Creado" value={fmtDateTime(remito.createdAt)} /><InspectorField label="Generado por" value={remito.createdByName ?? "—"} /></InspectorGroup>
            <InspectorGroup title="Destino"><InspectorField label="Destinatario" value={destination} /><InspectorField label="Contacto" value={getContactCode(remito) ?? "—"} mono /><InspectorField label="Dirección" value={remito.shippingAddressSnapshot?.domicilio ?? "—"} /><InspectorField label="Localidad" value={locality} /><InspectorField label="CUIT / DNI" value={remito.destinatarioSnapshot?.cuitDni ?? "—"} mono /><InspectorField label="Presupuesto" value={remito.presupuestoId ?? "—"} mono /></InspectorGroup>
             {remito.surgeryId && <InspectorGroup title="Cirugía"><InspectorField label="CX / expediente" value={remito.surgeryLabel ?? remito.surgeryId} mono /><InspectorField label="Descripción" value={remito.surgeryDescription ?? "—"} /><InspectorField label="Paciente" value={remito.surgeryPatientName ?? "—"} /><InspectorField label="Médico" value={remito.surgeryDoctorName ?? "—"} /><InspectorField label="Institución" value={remito.surgeryInstitutionName ?? "—"} /><InspectorField label="Fecha cirugía" value={fmtDateTime(remito.surgeryDate)} /></InspectorGroup>}
            <InspectorGroup title="Logística"><InspectorField label="Depósito" value={remito.branchLabel ?? remito.branchId ?? "—"} /><InspectorField label="Transporte" value={remito.transportSnapshot?.nombre ?? "—"} /><InspectorField label="Salida" value={fmtDateTime(remito.issuedAt)} /><InspectorField label="Entrega" value={fmtDateTime(remito.deliveredAt)} /><InspectorField label="Devolución" value={fmtDateTime(remito.returnedAt)} /><InspectorField label="Bultos" value={remito.packageCount == null ? "—" : String(remito.packageCount)} /></InspectorGroup>
          </div>}
          {tab === "material" && <MaterialTable items={remito.items} />}
          {tab === "logistics" && <div className="grid gap-6 lg:grid-cols-3"><InspectorGroup title="Movimiento"><InspectorField label="Depósito" value={remito.branchLabel ?? remito.branchId ?? "—"} /><InspectorField label="Sucursal emisora" value={remito.issuedBranchLabel ?? "—"} /><InspectorField label="Origen" value={originLabel(remito.origin)} /><InspectorField label="Motivo" value={reasonLabel(remito.salidaReason)} /></InspectorGroup><InspectorGroup title="Transporte"><InspectorField label="Transporte" value={remito.transportSnapshot?.nombre ?? "—"} /><InspectorField label="Bultos" value={remito.packageCount == null ? "—" : String(remito.packageCount)} /><InspectorField label="Valor declarado" value={remito.declaredValue == null ? "—" : `$${fmtQty(remito.declaredValue)}`} /></InspectorGroup><InspectorGroup title="Fechas"><InspectorField label="Creado" value={fmtDateTime(remito.createdAt)} /><InspectorField label="Emitido" value={fmtDateTime(remito.issuedAt)} /><InspectorField label="Entregado" value={fmtDateTime(remito.deliveredAt)} /><InspectorField label="Devuelto" value={fmtDateTime(remito.returnedAt)} /></InspectorGroup></div>}
          {codesVisited && <div className={tab === "codes" ? "h-full" : "hidden"}><RemitoCodes key={`${remito.id}:${remito.state}:${remito.remitoShortCode ?? "legacy"}`} remito={remito} /></div>}
          {tab === "attachments" && <RemitoAttachments />}
          {tab === "trace" && <div className="grid gap-6 lg:grid-cols-2"><InspectorGroup title="Auditoría"><InspectorField label="ID remito" value={remito.id} mono /><InspectorField label="Creado por" value={remito.createdById ?? "—"} mono /><InspectorField label="Actualizado por" value={remito.updatedById ?? "—"} mono /><InspectorField label="Última actualización" value={fmtDateTime(remito.updatedAt)} /></InspectorGroup><InspectorGroup title="Transiciones disponibles"><div className="col-span-2 flex flex-wrap gap-2">{nextStates.length ? nextStates.map((state) => <Button key={state} variant="outline" size="sm" className="h-7 text-xs" onClick={() => onTransition(remito, state)}>{state.replace(/_/g, " ")}</Button>) : <span className="text-xs text-gray-500">Sin transiciones disponibles.</span>}</div></InspectorGroup></div>}
        </div>
      </>}
    </section>
  )
}

// ─── Main Page ─────────────────────────────────────────────

export default function RemitosPage() {
  const router = useRouter()
  const [filterReferenceDate] = useState(() => new Date())
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [originFilter, setOriginFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [destinationFilter, setDestinationFilter] = useState("")
  const [surgeryFilter, setSurgeryFilter] = useState("")
  const [branchFilter, setBranchFilter] = useState("")
  const [warehouseFilter, setWarehouseFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [contactFilter, setContactFilter] = useState("")
  const [transportFilter, setTransportFilter] = useState("")
  const [movementFilter, setMovementFilter] = useState("")
  const [directionFilter, setDirectionFilter] = useState("")
  const [returnedFilter, setReturnedFilter] = useState("")
  const [documentFromFilter, setDocumentFromFilter] = useState("")
  const [documentToFilter, setDocumentToFilter] = useState("")
  const [observationFilter, setObservationFilter] = useState("")
  const [itemFilter, setItemFilter] = useState("")
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [viewKey, setViewKey] = useState<RemitoViewKey>(() => loadRemitoTablePreference().view)
  const [customColumns, setCustomColumns] = useState<RemitoColumnKey[]>(() => loadRemitoTablePreference().columns)
  const [devolucionOpen, setDevolucionOpen] = useState(false)
  const [emailRemito, setEmailRemito] = useState<RemitoApiRow | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("fecha")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("summary")
  const [inspectorSize, setInspectorSize] = useState<InspectorSize>("normal")
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    window.localStorage.setItem(REMITO_COLUMNS_STORAGE_KEY, JSON.stringify({ view: viewKey, columns: customColumns }))
  }, [customColumns, viewKey])

  const visibleColumns = useMemo(() => {
    const view = REMITO_VIEWS.find((candidate) => candidate.key === viewKey) ?? REMITO_VIEWS[0]
    const keys = viewKey === "personalizada" ? customColumns : view.columns
    return keys.map((key) => REMITO_COLUMN_BY_KEY[key]).filter(Boolean)
  }, [customColumns, viewKey])
  const visibleColumnKeys = useMemo(() => new Set(visibleColumns.map((column) => column.key)), [visibleColumns])
  const minTableWidth = visibleColumns.reduce((total, column) => total + column.width, 0)

  const serverStateFilter = stateFilter.startsWith("__") ? undefined : stateFilter || undefined
  const filters = useMemo(() => ({ state: serverStateFilter, take: 100 }), [serverStateFilter])
  const { remitos, selectedRemito, setSelectedRemito, loading, ready, error, mutatingId, blocked, refresh, selectRemito, emit, transition, devolucion } = useRemitos(filters)

  // Keyboard shortcut: '/' focuses the search input.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      event.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const onSortChange = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir(key === "fecha" ? "desc" : "asc")
  }

  const visibleNumberNumeric = (r: RemitoApiRow) => (typeof r.visibleNumber === "number" ? r.visibleNumber : 0)
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const destinationQuery = destinationFilter.trim().toLowerCase()
    const surgeryQuery = surgeryFilter.trim().toLowerCase()
    const dateThreshold = getDateThreshold(dateFilter, filterReferenceDate)
    return remitos.filter((r) => {
      if (stateFilter === "__pending" && !["Borrador", "Emitido"].includes(r.state)) return false
      if (stateFilter === "__returned" && !["Parcialmente_devuelto", "Devuelto"].includes(r.state)) return false
      const originMatches = !originFilter
        || (originFilter === "manual" && r.origin === "manual")
        || (originFilter === "cirugia" && Boolean(r.surgeryId))
        || originFilter === r.salidaReason
      if (!originMatches) return false
      const dateValue = new Date(r.issuedAt ?? r.createdAt).getTime()
      if (dateThreshold && (!Number.isFinite(dateValue) || dateValue < dateThreshold)) return false
      if (destinationQuery && !getRemitoDestinatarioName(r).toLowerCase().includes(destinationQuery)) return false
      if (surgeryQuery && ![r.surgeryLabel, r.surgeryId, r.surgeryDescription].filter(Boolean).join(" ").toLowerCase().includes(surgeryQuery)) return false
      if (branchFilter && !(r.issuedBranchLabel ?? r.issuedBranchId ?? "").toLowerCase().includes(branchFilter.toLowerCase())) return false
      if (warehouseFilter && !(r.branchLabel ?? r.branchId ?? "").toLowerCase().includes(warehouseFilter.toLowerCase())) return false
      if (userFilter && ![r.createdById, r.updatedById].filter(Boolean).join(" ").toLowerCase().includes(userFilter.toLowerCase())) return false
      if (contactFilter && ![getContactCode(r), r.destinatarioContactId, getRemitoDestinatarioName(r)].filter(Boolean).join(" ").toLowerCase().includes(contactFilter.toLowerCase())) return false
      if (transportFilter && !(r.transportSnapshot?.nombre ?? "").toLowerCase().includes(transportFilter.toLowerCase())) return false
      if (movementFilter && r.salidaReason !== movementFilter) return false
      if (directionFilter && entryExitLabel(r).toLowerCase() !== directionFilter) return false
      if (returnedFilter === "yes" && !["Parcialmente_devuelto", "Devuelto"].includes(r.state)) return false
      if (returnedFilter === "no" && ["Parcialmente_devuelto", "Devuelto"].includes(r.state)) return false
      if (documentFromFilter && visibleNumberNumeric(r) < Number(documentFromFilter)) return false
      if (documentToFilter && visibleNumberNumeric(r) > Number(documentToFilter)) return false
      if (observationFilter && !remitoObservation(r).toLowerCase().includes(observationFilter.toLowerCase())) return false
      if (itemFilter && !r.items.flatMap((item) => [item.sku, item.description, item.lotNumber, item.serialNumber]).filter(Boolean).join(" ").toLowerCase().includes(itemFilter.toLowerCase())) return false
      if (!q) return true
      const haystack = [
        r.id, getRemitoVisibleNumber(r), r.state, r.origin, r.surgeryId, r.surgeryLabel, r.surgeryDescription, r.boxId, r.branchId, r.branchLabel, r.salidaReason,
        r.shippingAddressSnapshot?.domicilio, r.transportSnapshot?.nombre, r.presupuestoId, getContactCode(r),
        getRemitoDestinatarioName(r),
        typeof r.metadata?.observaciones === "string" ? r.metadata.observaciones : "",
        ...r.items.flatMap((i) => [i.sku, i.description, i.itemId, i.boxId]),
      ].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(q)
    })
  }, [branchFilter, contactFilter, dateFilter, destinationFilter, directionFilter, documentFromFilter, documentToFilter, filterReferenceDate, itemFilter, movementFilter, observationFilter, originFilter, remitos, returnedFilter, search, stateFilter, surgeryFilter, transportFilter, userFilter, warehouseFilter])

  const filtered = useMemo(() => {
    const sorted = [...baseFiltered]
    const dir = sortDir === "asc" ? 1 : -1
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "documento": cmp = visibleNumberNumeric(a) - visibleNumberNumeric(b); if (!cmp) cmp = a.id.localeCompare(b.id); break
        case "destinatario": cmp = getRemitoDestinatarioName(a).localeCompare(getRemitoDestinatarioName(b), "es", { sensitivity: "base" }); break
        case "estado": cmp = a.state.localeCompare(b.state, "es"); break
        case "fecha": {
          const av = new Date(a.issuedAt ?? a.createdAt).getTime()
          const bv = new Date(b.issuedAt ?? b.createdAt).getTime()
          cmp = (Number.isFinite(av) ? av : 0) - (Number.isFinite(bv) ? bv : 0)
          break
        }
        case "items": cmp = a.items.length - b.items.length; break
      }
      return cmp * dir
    })
    return sorted
  }, [baseFiltered, sortKey, sortDir])

  const summary = useMemo(() => {
    const base = filtered
    const counts: Record<string, number> = {}
    for (const r of base) counts[r.state] = (counts[r.state] ?? 0) + 1
    return {
      total: base.length,
      pend: (counts["Borrador"] ?? 0) + (counts["Emitido"] ?? 0),
      transito: counts["En_transito"] ?? 0,
      entregados: counts["Entregado"] ?? 0,
      conDev: (counts["Parcialmente_devuelto"] ?? 0) + (counts["Devuelto"] ?? 0),
    }
  }, [filtered])

  const handleEmit = async (r: RemitoApiRow) => { await emit(r.id); toast.success(`Remito ${getRemitoVisibleNumber(r)} emitido`) }
  const handleTransition = async (r: RemitoApiRow, state: RemitoState) => { await transition(r.id, state); toast.success(`Remito actualizado a ${state.replace(/_/g, " ")}`) }
  const handleDevolucion = async (items: { itemId: string; returnedQuantity: number }[]) => {
    if (!selectedRemito) return; await devolucion(selectedRemito.id, items); toast.success("Devolución registrada"); setDevolucionOpen(false)
  }
  const clearFilters = () => { setSearch(""); setStateFilter(""); setOriginFilter(""); setDateFilter(""); setDestinationFilter(""); setSurgeryFilter(""); setBranchFilter(""); setWarehouseFilter(""); setUserFilter(""); setContactFilter(""); setTransportFilter(""); setMovementFilter(""); setDirectionFilter(""); setReturnedFilter(""); setDocumentFromFilter(""); setDocumentToFilter(""); setObservationFilter(""); setItemFilter("") }
  const hasFilters = Boolean(search || stateFilter || originFilter || dateFilter || destinationFilter || surgeryFilter || branchFilter || warehouseFilter || userFilter || contactFilter || transportFilter || movementFilter || directionFilter || returnedFilter || documentFromFilter || documentToFilter || observationFilter || itemFilter)
  const toggleColumn = (key: RemitoColumnKey) => {
    const current = visibleColumns.map((column) => column.key)
    const next = current.includes(key) ? current.filter((candidate) => candidate !== key) : [...current, key]
    if (!next.length) return
    setCustomColumns(next)
    setViewKey("personalizada")
  }
  const isInitialLoading = loading && !ready
  const nextStates = selectedRemito ? NEXT_STATE_OPTIONS[selectedRemito.state as RemitoState] ?? [] : []

return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]" style={OSSUM_SCOPE_STYLE}>
      {/* ── HEADER ── */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--ossum-line)] bg-white px-5 py-2.5">
        <div>
          <h1 className="text-base font-semibold text-[var(--ossum-navy)]">Remitos</h1>
          {ready && <p className="text-[11px] text-gray-400">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}{hasFilters ? " · filtrado" : ""}</p>}
        </div>
        <Button size="sm" className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={() => router.push("/remitos/nuevo")} disabled={blocked}><Plus className="size-3.5" /> Nuevo remito</Button>
      </header>

      <div className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-5 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar remito…"
              aria-label="Buscar remito"
              title="Pulsá / para enfocar"
              className="h-8 pl-8 text-xs"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); searchRef.current?.focus() }}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <FilterSelect ariaLabel="Filtrar por estado" value={stateFilter} onChange={setStateFilter} options={STATE_FILTER_OPTIONS} />
          <FilterSelect ariaLabel="Filtrar por origen" value={originFilter} onChange={setOriginFilter} options={ORIGIN_FILTER_OPTIONS} />
          <FilterSelect ariaLabel="Filtrar por fecha" value={dateFilter} onChange={setDateFilter} options={DATE_FILTER_OPTIONS} />
          <Input value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)} placeholder="Cliente / destinatario" aria-label="Filtrar por cliente o destinatario" className="h-8 w-48 text-xs" />
          <Input value={surgeryFilter} onChange={(e) => setSurgeryFilter(e.target.value)} placeholder="Cirugía / expediente" aria-label="Filtrar por cirugía o expediente" className="h-8 w-48 text-xs" />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setMoreFiltersOpen((v) => !v)}>Más filtros <ChevronDown className={`size-3 transition-transform ${moreFiltersOpen ? "rotate-180" : ""}`} /></Button>
          {hasFilters && <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600">Limpiar filtros</button>}
          <Button variant="ghost" size="icon" className="size-8" onClick={() => void refresh()} disabled={loading} aria-label="Actualizar remitos" title="Actualizar"><RefreshCw className={["size-3.5", loading ? "animate-spin motion-reduce:animate-none" : ""].join(" ")} /></Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">Vista:</span>
            <select value={viewKey} onChange={(event) => setViewKey(event.target.value as RemitoViewKey)} aria-label="Seleccionar vista" className="h-8 rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]">
              {REMITO_VIEWS.map((view) => <option key={view.key} value={view.key}>{view.label}</option>)}
            </select>
            <RemitoColumnsMenu visibleKeys={visibleColumnKeys} onToggle={toggleColumn} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="size-8" aria-label="Exportar remitos"><Download className="size-3.5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => toast.info("Exportación Excel preparada para próxima integración")}><FileSpreadsheet className="size-4" />Exportar listado filtrado</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => selectedRemito ? void printRemito(selectedRemito, "a4") : toast.info("Seleccioná un remito para imprimir")}><Printer className="size-4" />Imprimir / PDF</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.info(selectedRemito ? "Exportación de detalle preparada" : "Seleccioná un remito")}>Exportar detalle del remito</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {moreFiltersOpen && <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--ossum-line)] pt-2 sm:grid-cols-3 xl:grid-cols-6">
          <Input value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} placeholder="Sucursal" aria-label="Filtrar por sucursal" className="h-8 text-xs" />
          <Input value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)} placeholder="Depósito" aria-label="Filtrar por depósito" className="h-8 text-xs" />
          <Input value={userFilter} onChange={(event) => setUserFilter(event.target.value)} placeholder="Usuario que creó" aria-label="Filtrar por usuario" className="h-8 text-xs" />
          <Input value={contactFilter} onChange={(event) => setContactFilter(event.target.value)} placeholder="Contacto" aria-label="Filtrar por contacto" className="h-8 text-xs" />
          <Input value={transportFilter} onChange={(event) => setTransportFilter(event.target.value)} placeholder="Transporte" aria-label="Filtrar por transporte" className="h-8 text-xs" />
          <FilterSelect ariaLabel="Filtrar por tipo de movimiento" value={movementFilter} onChange={setMovementFilter} options={[{ value: "", label: "Tipo de movimiento" }, ...["cirugia", "venta", "prestamo", "traslado", "ajuste", "otro"].map((value) => ({ value, label: reasonLabel(value) }))]} />
          <FilterSelect ariaLabel="Filtrar por entrada o salida" value={directionFilter} onChange={setDirectionFilter} options={[{ value: "", label: "Entrada / salida" }, { value: "entrada", label: "Entrada" }, { value: "salida", label: "Salida" }]} />
          <FilterSelect ariaLabel="Filtrar por devolución" value={returnedFilter} onChange={setReturnedFilter} options={[{ value: "", label: "Con devolución" }, { value: "yes", label: "Con devolución" }, { value: "no", label: "Sin devolución" }]} />
          <Input type="number" min="0" value={documentFromFilter} onChange={(event) => setDocumentFromFilter(event.target.value)} placeholder="Nº documento desde" aria-label="Número de documento desde" className="h-8 text-xs" />
          <Input type="number" min="0" value={documentToFilter} onChange={(event) => setDocumentToFilter(event.target.value)} placeholder="Nº documento hasta" aria-label="Número de documento hasta" className="h-8 text-xs" />
          <Input value={observationFilter} onChange={(event) => setObservationFilter(event.target.value)} placeholder="Observación" aria-label="Filtrar por observación" className="h-8 text-xs" />
          <Input value={itemFilter} onChange={(event) => setItemFilter(event.target.value)} placeholder="Artículo / SKU / lote / serie" aria-label="Filtrar por artículo SKU lote o serie" className="h-8 text-xs" />
        </div>}
      </div>

      {/* ── SUMMARY STRIP ── */}
      <SummaryStrip
        {...summary}
        loading={isInitialLoading}
        activeState={stateFilter}
        onSelectState={(state) => setStateFilter(state)}
      />

      {/* ── CONTENT ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* ── TABLE ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {error && ready && (
            <div className="mx-6 mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
              {error}
              <button onClick={() => void refresh()} className="ml-3 underline hover:no-underline">Reintentar</button>
            </div>
          )}

{isInitialLoading ? (
            <div className="flex-1 p-6"><RemitoStateSurface kind="loading" /></div>
          ) : blocked ? (
            <div className="flex-1 p-6"><RemitoStateSurface kind="blocked" /></div>
          ) : filtered.length === 0 && hasFilters ? (
            <div className="flex-1 p-6">
              <RemitoStateSurface kind="no-match" onClear={clearFilters} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 p-6">
              <RemitoStateSurface
                kind="empty"
                disabled={blocked}
                action={{ label: "Cargar el primer remito", onClick: () => router.push("/remitos/nuevo") }}
              />
            </div>
          ) : (
            <div className="mx-5 my-3 flex-1 overflow-hidden border border-[var(--ossum-line)] bg-white">
              <div className="h-full overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-xs group" style={{ minWidth: Math.max(minTableWidth, 760) }}>
                  <thead className="sticky top-0 z-10 bg-[var(--ossum-navy)] text-white">
                    <tr>
                      {visibleColumns.map((column) => {
                        const sort = ({ documento: "documento", destinatario: "destinatario", estado: "estado", fecha: "fecha", items: "items" } as Partial<Record<RemitoColumnKey, SortKey>>)[column.key]
                        return <th key={column.key} style={{ width: column.width, minWidth: column.width }} aria-sort={sort ? (sortKey === sort ? (sortDir === "asc" ? "ascending" : "descending") : "none") : undefined} className={`sticky top-0 z-10 whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 font-medium ${column.align === "right" ? "text-right" : "text-left"}`}>{sort ? <SortHeader label={column.label} sortKey={sort} current={sortKey} dir={sortDir} onChange={onSortChange} align={column.align} /> : column.label}</th>
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((remito) => {
                      const selected = selectedRemito?.id === remito.id
                      return (
<tr
                          key={remito.id}
                          onClick={() => void selectRemito(remito)}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void selectRemito(remito) } }}
                          className={`cursor-pointer border-b border-[var(--ossum-line)] outline-none transition-colors hover:bg-[var(--ossum-surface-2)] ${selected ? "bg-[#eef0ff] shadow-[inset_3px_0_0_var(--ossum-action)]" : ""}`}
                          aria-selected={selected}
                          aria-label={`Remito ${getRemitoVisibleNumber(remito)} ${remito.state.replace(/_/g, " ")}`}
                        >
                          {visibleColumns.map((column) => <td key={column.key} style={{ width: column.width, minWidth: column.width }} className={`border-b border-[var(--ossum-line)] px-3 py-1.5 align-middle ${column.align === "right" ? "text-right" : "text-left"}`}><RemitoCell column={column.key} remito={remito} /></td>)}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {selectedRemito && <RemitoInspector remito={selectedRemito} size={inspectorSize} tab={inspectorTab} nextStates={nextStates} mutatingId={mutatingId} router={router} onSizeChange={setInspectorSize} onTabChange={setInspectorTab} onClose={() => setSelectedRemito(null)} onEmit={handleEmit} onTransition={handleTransition} onPrint={printRemito} onEmail={setEmailRemito} onEdit={(r) => router.push(`/remitos/${r.id}/editar`)} onSetDevolucionOpen={setDevolucionOpen} />}
      </div>

      {/* ── DEVOLUCIÓN DIALOG ── */}
      <DevolucionDialog remito={selectedRemito} open={devolucionOpen} onOpenChange={setDevolucionOpen} onConfirm={handleDevolucion}
        loading={Boolean(selectedRemito && mutatingId === selectedRemito.id)} />
      {emailRemito ? <SendRemitoEmailDialog key={emailRemito.id} remito={emailRemito} open onOpenChange={(open) => { if (!open) setEmailRemito(null) }} /> : null}
    </div>
  )
}

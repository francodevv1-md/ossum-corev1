"use client"

import React, { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeftRight, ChevronDown, ChevronRight, Eye, FileText, Loader2, Printer, ReceiptText, RotateCcw, Send, Truck } from "lucide-react"
import { formatDate } from "@/lib/formatters"
import { buildOperationalRemitoPrintHtml } from "@/lib/remito-print-template"
import { LOGISTICS_STATE_OUTLINED_COLORS } from "@/lib/shared-constants"
import { cn } from "@/lib/utils"
import type { RemitoState } from "@/lib/api/remitos"
import { fetchRemitoPrintCodes, type RemitoPrintCodesDto } from "@/lib/api/remito-print-codes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Surgery, Box } from "@/types"

export type RemitosPanelItem = {
  stockItemId: string
  name: string
  code: string
  sentQuantity: number
  returnedQuantity: number
  consumedQuantity: number
  lotNumber?: string | null
  serialNumber?: string | null
  expirationDate?: string | null
}

export type RemitosPanelDetailItem = {
  code: string
  name: string
  quantity: number
  unit?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  expirationDate?: string | null
  identifiedCode?: string | null
  groupLabel?: string | null
}

export type RemitosPanelRemito = {
  apiId: string
  companyId: string
  remitoShortCode: string | null
  id: string
  surgeryId: string
  boxId?: string | null
  destination: string
  date: string
  state: string
  surgeryLabel?: string | null
  surgeryPatientName?: string | null
  surgeryDoctorName?: string | null
  surgeryInstitutionName?: string | null
  surgeryClientName?: string | null
  surgeryDate?: string | null
  createdByName?: string | null
  items: RemitosPanelItem[]
  detailItems?: RemitosPanelDetailItem[]
}

interface RemitosPanelProps {
  surgery: Surgery
  remitos: RemitosPanelRemito[]
  box?: Box
  mutatingId?: string | null
  onEmit?: (remito: RemitosPanelRemito) => Promise<unknown>
  onTransition?: (remito: RemitosPanelRemito, state: RemitoState) => Promise<unknown>
}

const RETURN_STATES = ["Devuelto", "Controlado", "Parcialmente_devuelto"]
const NEXT_STATE_OPTIONS: Partial<Record<RemitoState, RemitoState[]>> = {
  Emitido: ["En_transito", "Entregado"],
  En_transito: ["Entregado"],
}

function isReturnState(state: string) {
  return RETURN_STATES.includes(state)
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date)
}

function formatTimeOnly(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(date)
}

function entryExitLabel(state: string) {
  if (state === "Devuelto" || state === "Parcialmente_devuelto" || state === "Controlado") return "E"
  if (state === "Borrador" || state === "Anulado") return "—"
  return "S"
}

function getPendingUnits(remito: RemitosPanelRemito) {
  return remito.items.reduce((sum, item) => sum + Math.max(0, item.sentQuantity - item.returnedQuantity - item.consumedQuantity), 0)
}

function LogisticsBadge({ state }: { state: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
        LOGISTICS_STATE_OUTLINED_COLORS[state] ?? "bg-gray-100 text-gray-700 border-gray-300"
      )}
    >
      {state.replaceAll("_", " ")}
    </span>
  )
}

function RemitoItemTable({ items }: { items: RemitosPanelItem[] }) {
  const totals = useMemo(() => ({
    sent: items.reduce((sum, item) => sum + item.sentQuantity, 0),
    returned: items.reduce((sum, item) => sum + item.returnedQuantity, 0),
    consumed: items.reduce((sum, item) => sum + item.consumedQuantity, 0),
  }), [items])

  return (
    <div className="overflow-hidden rounded-sm border border-[#b9c3c9] bg-[#eef5fa]">
      <div className="divide-y divide-[#c5d0d6] sm:hidden">
        {items.map((item) => {
          const remaining = Math.max(0, item.sentQuantity - item.returnedQuantity - item.consumedQuantity)
          return (
            <div key={item.stockItemId} className="space-y-2 bg-white px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{item.code}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded bg-slate-50 px-2 py-1">
                  <p className="text-slate-500">Enviado</p>
                  <p className="font-semibold text-slate-900">{item.sentQuantity}</p>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  <p className="text-slate-500">Abierto</p>
                  <p className="font-semibold text-slate-900">{remaining}</p>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  <p className="text-slate-500">Consumido</p>
                  <p className="font-semibold text-emerald-700">{item.consumedQuantity}</p>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  <p className="text-slate-500">Devuelto</p>
                  <p className="font-semibold text-orange-700">{item.returnedQuantity}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden sm:block">
      <Table className="border-collapse text-[12px]">
        <TableHeader>
          <TableRow className="border-0 bg-[#dfeef8] hover:bg-[#dfeef8]">
            <TableHead className="h-7 border border-[#b9c3c9] px-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#28506f]">Código</TableHead>
            <TableHead className="h-7 border border-[#b9c3c9] px-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#28506f]">Nombre</TableHead>
            <TableHead className="h-7 w-20 border border-[#b9c3c9] px-2 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[#28506f]">Enviado</TableHead>
            <TableHead className="h-7 w-20 border border-[#b9c3c9] px-2 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[#28506f]">Devuelto</TableHead>
            <TableHead className="h-7 w-20 border border-[#b9c3c9] px-2 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[#28506f]">Consumido</TableHead>
            <TableHead className="h-7 w-20 border border-[#b9c3c9] px-2 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[#28506f]">Abierto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const remaining = Math.max(0, item.sentQuantity - item.returnedQuantity - item.consumedQuantity)
            return (
              <TableRow key={item.stockItemId} className="bg-white hover:bg-[#f5fbff]">
                <TableCell className="border border-[#c5d0d6] px-2 py-1.5 font-mono text-[11px] text-[#0057b8]">{item.code}</TableCell>
                <TableCell className="border border-[#c5d0d6] px-2 py-1.5 text-[12px] font-medium">{item.name}</TableCell>
                <TableCell className="border border-[#c5d0d6] px-2 py-1.5 text-right text-[12px] tabular-nums">{item.sentQuantity}</TableCell>
                <TableCell className="border border-[#c5d0d6] px-2 py-1.5 text-right text-[12px] tabular-nums text-orange-700">{item.returnedQuantity}</TableCell>
                <TableCell className="border border-[#c5d0d6] px-2 py-1.5 text-right text-[12px] tabular-nums text-emerald-700">{item.consumedQuantity}</TableCell>
                <TableCell className="border border-[#c5d0d6] px-2 py-1.5 text-right text-[12px] font-semibold tabular-nums">{remaining}</TableCell>
              </TableRow>
            )
          })}
          {items.length > 1 && (
            <TableRow className="bg-[#eaf4ff] hover:bg-[#eaf4ff]">
              <TableCell className="border border-[#b9c3c9] py-1.5" />
              <TableCell className="border border-[#b9c3c9] px-2 py-1.5 text-xs font-semibold">Total</TableCell>
              <TableCell className="border border-[#b9c3c9] px-2 py-1.5 text-right text-xs font-semibold">{totals.sent}</TableCell>
              <TableCell className="border border-[#b9c3c9] px-2 py-1.5 text-right text-xs font-semibold text-orange-700">{totals.returned}</TableCell>
              <TableCell className="border border-[#b9c3c9] px-2 py-1.5 text-right text-xs font-semibold text-emerald-700">{totals.consumed}</TableCell>
              <TableCell className="border border-[#b9c3c9] px-2 py-1.5 text-right text-xs font-semibold">{Math.max(0, totals.sent - totals.returned - totals.consumed)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

type PrintFormat = "a4" | "thermal80"

function buildRemitoPrintHtml(remito: RemitosPanelRemito, surgery: Surgery, printCodes?: RemitoPrintCodesDto, format: PrintFormat = "a4") {
  return buildOperationalRemitoPrintHtml({
    title: `Remito ${remito.id}`,
    format,
    documentNumber: remito.id,
    state: remito.state,
    origin: "Cirugía / Expediente",
    issuedAt: formatDate(remito.date),
    destinationName: remito.destination || surgery.institution,
    surgeryLabel: remito.surgeryLabel ?? surgery.expedienteNumber,
    patient: remito.surgeryPatientName ?? surgery.patient,
    institution: remito.surgeryInstitutionName ?? surgery.institution,
    doctor: remito.surgeryDoctorName ?? surgery.surgeon,
    client: remito.surgeryClientName ?? surgery.client,
    surgeryDate: remito.surgeryDate ?? `${surgery.date}${surgery.time ? ` ${surgery.time}` : ""}`,
    createdBy: remito.createdByName,
    boxId: remito.boxId,
    observations: surgery.notes,
    printCodes,
    includeReturned: true,
    includeConsumedOpen: true,
    items: remito.items.map((item) => {
      const remaining = Math.max(0, item.sentQuantity - item.returnedQuantity - item.consumedQuantity)
      return {
        code: item.code,
        description: item.name,
        quantity: item.sentQuantity,
        unit: "unidad",
        returnedQuantity: item.returnedQuantity,
        consumedQuantity: item.consumedQuantity,
        openQuantity: remaining,
        lotNumber: item.lotNumber,
        serialNumber: item.serialNumber,
        expirationDate: item.expirationDate,
      }
    }),
    detailItems: (remito.detailItems ?? remito.items).map((item) => ({
      code: item.code,
      description: item.name,
      quantity: "quantity" in item ? item.quantity : item.sentQuantity,
      unit: "unit" in item ? item.unit : "unidad",
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber,
      expirationDate: item.expirationDate,
      identifiedCode: "identifiedCode" in item ? item.identifiedCode : null,
      groupLabel: "groupLabel" in item ? item.groupLabel : null,
    })),
  })
}

async function openRemitoPrint(remito: RemitosPanelRemito, surgery: Surgery, format: PrintFormat) {
  if (remito.state === "Borrador") {
    toast.error("Los códigos de impresión no están disponibles")
    return
  }
  const printWindow = window.open("", "_blank", format === "thermal80" ? "noopener,noreferrer,width=420,height=720" : "noopener,noreferrer,width=980,height=720")
  if (!printWindow) {
    toast.error("El navegador bloqueó la ventana de impresión")
    return
  }
  let printCodes: RemitoPrintCodesDto | undefined
  if (remito.remitoShortCode) {
    try {
      printCodes = await fetchRemitoPrintCodes(remito.companyId, remito.remitoShortCode)
    } catch {
      printWindow.close()
      toast.error("No se pudieron cargar el QR y el código de barras. Volvé a intentar.")
      return
    }
  } else {
    printWindow.close()
    toast.error("Este remito todavía no tiene códigos de impresión disponibles.")
    return
  }
  printWindow.document.open()
  printWindow.document.write(buildRemitoPrintHtml(remito, surgery, printCodes, format))
  printWindow.document.close()
  printWindow.focus()
}

function RemitoDetailDialog({ remito, open, onOpenChange }: { remito: RemitosPanelRemito | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-[95vw] border-[#b9c3c9] bg-[#eef5fa] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalle de remito</DialogTitle>
          <DialogDescription>{remito ? `${remito.id} · ${remito.destination || "Sin destino"}` : ""}</DialogDescription>
        </DialogHeader>
        {remito && (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto py-2">
            <div className="grid grid-cols-2 gap-2.5 rounded-sm border border-[#b9c3c9] bg-[#f6fbff] p-2.5 sm:grid-cols-4">
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">NR / Comprobante</p>
                <p className="font-mono text-xs font-semibold text-[#0057b8]">NR · {remito.id}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">Fecha / Hora</p>
                <p className="text-xs font-medium">{formatDateOnly(remito.date)} · {formatTimeOnly(remito.date)}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">Ent/Sal</p>
                <p className="text-xs font-semibold">{entryExitLabel(remito.state)}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">Depósito / Caja</p>
                <p className="font-mono text-xs font-medium">{remito.boxId ?? "—"}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">Contacto / Destino</p>
                <p className="text-xs font-medium">{remito.destination || "—"}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">Estado</p>
                <LogisticsBadge state={remito.state} />
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">Ítems / Abierto</p>
                <p className="text-xs font-medium">{remito.items.length} / {getPendingUnits(remito)}</p>
              </div>
            </div>
            <RemitoItemTable items={remito.items} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemitoCard({
  remito,
  box,
  defaultOpen,
  mutating,
  onView,
  onPrint,
  onEmit,
  onTransition,
}: {
  remito: RemitosPanelRemito
  box?: Box
  defaultOpen: boolean
  mutating: boolean
  onView: (remito: RemitosPanelRemito) => void
  onPrint: (remito: RemitosPanelRemito, format: PrintFormat) => void
  onEmit?: (remito: RemitosPanelRemito) => Promise<unknown>
  onTransition?: (remito: RemitosPanelRemito, state: RemitoState) => Promise<unknown>
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasReturns = isReturnState(remito.state)
  const pendingUnits = getPendingUnits(remito)
  const nextStates = NEXT_STATE_OPTIONS[remito.state as RemitoState] ?? []

  const handleEmit = async () => {
    if (!onEmit) return
    try {
      await onEmit(remito)
      toast.success(`Remito ${remito.id} emitido`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo emitir el remito")
    }
  }

  const handleTransition = async (state: RemitoState) => {
    if (!onTransition) return
    try {
      await onTransition(remito, state)
      toast.success(`Remito ${remito.id} actualizado a ${state.replaceAll("_", " ")}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el remito")
    }
  }

  return (
    <>
      <tr className={cn("bg-white hover:bg-[#e8f5ff]", open && "bg-[#1f8fff] text-white hover:bg-[#1f8fff]")}>
        <td className="border border-[#c5d0d6] p-0 text-center">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={`remito-panel-details-${remito.apiId}`}
            aria-label={`${open ? "Contraer" : "Expandir"} remito ${remito.id}`}
            className={cn("flex min-h-7 w-full items-center justify-center px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#003f86]", open && "focus-visible:outline-white")}
          >
            {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        </td>
        <td className={cn("border border-[#c5d0d6] px-2 py-1 font-mono text-[11px] font-semibold underline-offset-2 hover:underline", open ? "text-white" : "text-[#0057b8]")}>NR · {remito.id}</td>
        <td className="border border-[#c5d0d6] px-2 py-1 text-[11px]">{formatDateOnly(remito.date)}</td>
        <td className="border border-[#c5d0d6] px-2 py-1 text-[11px] tabular-nums">{formatTimeOnly(remito.date)}</td>
        <td className="border border-[#c5d0d6] px-2 py-1 text-center text-[11px] font-semibold">{entryExitLabel(remito.state)}</td>
        <td className="border border-[#c5d0d6] px-2 py-1 text-[10px]">{box?.name ?? remito.boxId ?? "—"}</td>
        <td className="border border-[#c5d0d6] px-2 py-1 text-[11px]">{remito.destination || "—"}</td>
        <td className="border border-[#c5d0d6] px-2 py-1"><LogisticsBadge state={remito.state} /></td>
        <td className="border border-[#c5d0d6] px-2 py-1 text-right text-[11px] tabular-nums">{remito.items.length}</td>
        <td className="border border-[#c5d0d6] px-2 py-1 text-right text-[11px] tabular-nums">{pendingUnits}</td>
        <td className="border border-[#c5d0d6] px-1 py-1" onClick={(event) => event.stopPropagation()}>
          <div className="flex flex-wrap justify-end gap-1">
            <Button variant="outline" size="sm" className="h-11 min-w-11 touch-manipulation rounded-[2px] border-[#8fa8b8] px-2 text-[10px]" onClick={() => onView(remito)} aria-label={`Ver remito ${remito.id}`}><Eye className="size-3" />Ver</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-11 min-w-11 touch-manipulation rounded-[2px] border-[#8fa8b8] px-2 text-[10px]" aria-label={`Imprimir remito ${remito.id}`}><Printer className="size-3" />Imprimir<ChevronDown className="size-3" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56"><DropdownMenuItem onSelect={() => onPrint(remito, "a4")}><Printer />Remito A4 / PDF</DropdownMenuItem><DropdownMenuItem onSelect={() => onPrint(remito, "thermal80")}><ReceiptText />Ticket térmico 80 mm</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
            {remito.state === "Borrador" && onEmit ? (
              <Button size="sm" className="h-11 min-w-11 touch-manipulation rounded-[2px] px-2 text-[10px]" onClick={() => void handleEmit()} disabled={mutating} aria-label={`Emitir remito ${remito.id}`}>{mutating ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}Emitir</Button>
            ) : null}
            {onTransition && nextStates.map((state) => (
              <Button key={state} variant="secondary" size="sm" className="h-11 min-w-11 touch-manipulation rounded-[2px] px-2 text-[10px]" onClick={() => void handleTransition(state)} disabled={mutating} aria-label={`Cambiar remito ${remito.id} a ${state.replaceAll("_", " ")}`}>{mutating ? <Loader2 className="size-3 animate-spin" /> : <Truck className="size-3" />}{state.replaceAll("_", " ")}</Button>
            ))}
          </div>
        </td>
      </tr>
      <tr hidden={!open} className="bg-[#eef5fa]">
          <td className="border border-[#c5d0d6]" />
          <td colSpan={10} className="border border-[#c5d0d6] p-2">
            <div id={`remito-panel-details-${remito.apiId}`} role="region" aria-label={`Detalle del remito ${remito.id}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-[#31556d]">
                <span className="font-bold">NR · {remito.id}</span>
                <span>Ent/Sal: {entryExitLabel(remito.state)}</span>
                <span>Depósito/Caja: {box?.name ?? remito.boxId ?? "—"}</span>
                <span>Contacto/Destino: {remito.destination || "—"}</span>
                {hasReturns && <span className="inline-flex items-center gap-1 font-medium text-orange-700"><RotateCcw className="size-3" />Con devolución</span>}
                {!hasReturns && pendingUnits > 0 && <span className="font-medium text-amber-700">{pendingUnits} abiertos</span>}
              </div>
              <RemitoItemTable items={remito.items} />
            </div>
          </td>
      </tr>
    </>
  )
}

export function RemitosPanel({ surgery, remitos, box, mutatingId, onEmit, onTransition }: RemitosPanelProps) {
  const [selectedRemito, setSelectedRemito] = useState<RemitosPanelRemito | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const totals = useMemo(() => ({
    remitos: remitos.length,
    items: remitos.reduce((sum, remito) => sum + remito.items.length, 0),
    sent: remitos.reduce((sum, remito) => sum + remito.items.reduce((itemSum, item) => itemSum + item.sentQuantity, 0), 0),
    returned: remitos.reduce((sum, remito) => sum + remito.items.reduce((itemSum, item) => itemSum + item.returnedQuantity, 0), 0),
    consumed: remitos.reduce((sum, remito) => sum + remito.items.reduce((itemSum, item) => itemSum + item.consumedQuantity, 0), 0),
  }), [remitos])

  const uniqueStates = Array.from(new Set(remitos.map((remito) => remito.state)))
  const pendingUnits = remitos.reduce(
    (sum, remito) => sum + remito.items.reduce((itemSum, item) => itemSum + Math.max(0, item.sentQuantity - item.returnedQuantity - item.consumedQuantity), 0),
    0
  )

  const handleView = (remito: RemitosPanelRemito) => {
    setSelectedRemito(remito)
    setDetailOpen(true)
  }

  return (
    <div className="border border-[#8fa8b8] bg-[#e6f0f7] text-[12px]">
      <div className="flex flex-col gap-2 border-b border-[#8fa8b8] bg-[#c8dfec] px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#173f5f]">Remitos vinculados</h2>
          <p className="text-[10px] text-[#31556d]">Corte relacional de logística para esta Ficha CX.</p>
        </div>
        <div className="grid grid-cols-5 overflow-hidden border border-[#8fa8b8] bg-[#eef6fb] text-center text-[10px]">
          <div className="border-r border-[#9fb6c5] px-2 py-1"><b>{totals.remitos}</b><span className="ml-1">Rem.</span></div>
          <div className="border-r border-[#9fb6c5] px-2 py-1"><b>{totals.items}</b><span className="ml-1">Ítems</span></div>
          <div className="border-r border-[#9fb6c5] px-2 py-1"><b>{totals.sent}</b><span className="ml-1">Env.</span></div>
          <div className="border-r border-[#9fb6c5] px-2 py-1 text-orange-700"><b>{totals.returned}</b><span className="ml-1">Dev.</span></div>
          <div className="px-2 py-1 text-emerald-700"><b>{totals.consumed}</b><span className="ml-1">Cons.</span></div>
        </div>
      </div>

      {totals.remitos === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white py-8 text-center">
          <Truck className="mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Sin remitos asociados</p>
          <p className="text-xs text-muted-foreground">Los remitos aparecerán acá cuando el material salga documentado.</p>
        </div>
      ) : (
        <div className="space-y-2 p-2">
          <div className="flex flex-wrap items-center gap-3 border border-[#9fb6c5] bg-[#f4f9fc] px-2 py-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">Estado operativo:</span>
            {uniqueStates.map((state) => (
              <div key={state} className="flex items-center gap-1">
                <LogisticsBadge state={state} />
                <span className="text-[10px] text-muted-foreground">({remitos.filter((remito) => remito.state === state).length})</span>
              </div>
            ))}
            {pendingUnits > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700"><ArrowLeftRight className="size-3" />Saldo abierto en remitos</span>}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><FileText className="size-3" />Imprimir usa PDF de navegador</span>
          </div>

          <p className="sm:hidden text-[10px] text-[#31556d]">Deslizá la tabla hacia los lados para ver todas las columnas y acciones.</p>
          <div className="overflow-x-auto border border-[#8fa8b8] bg-white">
            <table className="w-full min-w-[860px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#dfeef8] text-[#28506f]">
                  <th className="w-7 border border-[#b9c3c9] px-1 py-1" />
                  <th className="border border-[#b9c3c9] px-2 py-1 text-left font-bold">NR / Comprobante</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-left font-bold">Fecha</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-left font-bold">Hora</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-center font-bold">Ent/Sal</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-left font-bold">Depósito / Caja</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-left font-bold">Contacto / Destino</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-left font-bold">Estado</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-right font-bold">Ítems</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-right font-bold">Abierto</th>
                  <th className="border border-[#b9c3c9] px-2 py-1 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {remitos.map((remito, index) => (
                  <RemitoCard
                    key={remito.id}
                    remito={remito}
                    box={box && remito.boxId === box.id ? box : undefined}
                    defaultOpen={index === 0}
                    mutating={mutatingId === remito.apiId}
                    onView={handleView}
                    onPrint={(target, format) => void openRemitoPrint(target, surgery, format)}
                    onEmit={onEmit}
                    onTransition={onTransition}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RemitoDetailDialog remito={selectedRemito} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}

"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ArrowLeft, Receipt, Truck, Activity, BookOpen,
  FileText, MoreHorizontal, Edit, StickyNote, ShieldCheck,
  Calendar, AlertOctagon, RotateCcw, Printer, ExternalLink,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { CX_STATE_COLORS, PREP_STATE_COLORS, DOC_STATUS_COLORS, FACTURACION_COLORS } from "@/lib/cirugias.constants"
import { getFacturacionBadgeLabel } from "@/lib/cirugias.utils"
import { cn } from "@/lib/utils"
import { canAutorizarFV, canRemitirNR, canCargarConsumo } from "@/lib/businessRules"
import type { Surgery, SurgeryState, ConsumoState } from "@/types"
import type { PendientePrincipal } from "@/lib/cirugias.types"

interface ExpedienteHeaderProps {
  surgery: Surgery
  docStatus: string
  presupuestoId?: string
  remitoId?: string
  fvNumber?: string
  consumoState?: ConsumoState
  facturacionStatus: string
  cobrosTotal: number
  pendiente: PendientePrincipal
  onBack: () => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetNewState: (state: SurgeryState) => void
  onRecover: (s: Surgery) => void
  onAutorizar: (s: Surgery) => void
  onOpenPresupuestoDialog: (s: Surgery) => void
}

function HeaderBadge({ status, colorMap }: { status: string; colorMap: Record<string, string> }) {
  const colorClass = colorMap[status] || "bg-gray-400 text-white"
  return <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold leading-none", colorClass)}>{status}</span>
}

export function ExpedienteHeader({
  surgery: s, docStatus, presupuestoId, remitoId, fvNumber, consumoState,
  facturacionStatus, cobrosTotal, pendiente,
  onBack, onSetDialogSurgery, onSetFacturarDialogOpen,
  onSetNoteDialogOpen, onSetSuspendDialogOpen, onSetCancelDialogOpen,
  onSetChangeStateDialogOpen, onSetChangeDateDialogOpen, onSetNewState,
  onRecover, onAutorizar, onOpenPresupuestoDialog,
}: ExpedienteHeaderProps) {
  const canAuthFV = canAutorizarFV(s, docStatus, consumoState)

  return (
    <div className="shrink-0 border-b bg-muted/30">
      {/* ── Top bar: back + ID + actions — compact ── */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onBack}>
                <ArrowLeft className="size-3" /> Cirugías
              </Button>
            </TooltipTrigger>
            <TooltipContent>Volver a la grilla de cirugías</TooltipContent>
          </Tooltip>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-blue-700">{s.id}</span>
            {s.expedienteNumber && <span className="text-xs text-muted-foreground">Exp. {s.expedienteNumber}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <ExternalLink className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir en nueva pestaña</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Info strip: patient, surgeon, institution, date, status — single row ── */}
      <div className="px-4 pb-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0">
            <span className="text-sm font-semibold truncate">{s.patient}{s.patientDni ? ` — DNI ${s.patientDni}` : ""}</span>
            <span className="text-xs text-muted-foreground">Dr. {s.surgeon}</span>
            <span className="text-xs text-muted-foreground">{s.institution}</span>
            <span className="text-xs text-muted-foreground">Coord.: {s.coordinadorCx || "Sin asignar"}</span>
            <span className="text-xs text-muted-foreground">{formatDate(s.date)} {s.time || ""}</span>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-1 shrink-0">
            <HeaderBadge status={s.state} colorMap={CX_STATE_COLORS} />
            <HeaderBadge status={s.preparationState} colorMap={PREP_STATE_COLORS} />
            <HeaderBadge status={docStatus} colorMap={DOC_STATUS_COLORS} />
            <HeaderBadge status={s.facturado ? "Facturada" : getFacturacionBadgeLabel(facturacionStatus)} colorMap={FACTURACION_COLORS} />
          </div>
        </div>

        {/* Comprobante refs + Pendiente */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {presupuestoId && <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 text-[10px]"><Receipt className="size-3" />PR {presupuestoId}</span>}
            {remitoId && <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 text-[10px]"><Truck className="size-3" />NR {remitoId}</span>}
            {fvNumber && <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 text-[10px]"><FileText className="size-3" />FV {fvNumber}</span>}
            {cobrosTotal > 0 && <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px]"><Activity className="size-3" />Cobro: {formatCurrency(cobrosTotal)}</span>}
          </div>
          <div className={cn("rounded border px-2 py-1 text-[11px] font-medium max-w-sm", pendiente.color)}>
            {pendiente.text}
          </div>
        </div>
      </div>

      {/* ── Action bar — compact ── */}
      <div className="flex items-center gap-1 px-4 py-1 border-t bg-background/60">
        <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => { /* Ficha tab */ }}>
          <Edit className="size-3" /> Editar ficha
        </Button>
        {presupuestoId ? (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
            <Receipt className="size-3" /> Ver PR
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => onOpenPresupuestoDialog(s)}>
            <Receipt className="size-3" /> Generar PR
          </Button>
        )}
        {canRemitirNR(s).allowed && (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
            <Truck className="size-3" /> Remitir NR
          </Button>
        )}
        {canCargarConsumo(s).allowed && (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
            <Activity className="size-3" /> Cargar consumo
          </Button>
        )}
        {canAuthFV.allowed && (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => { onSetDialogSurgery(s); onSetFacturarDialogOpen(true) }}>
            <ShieldCheck className="size-3" /> Autorizar FV
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
              <MoreHorizontal className="size-3" /> Más
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetNoteDialogOpen(true) }}>
              <StickyNote className="size-4 mr-2" /> Agregar nota
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BookOpen className="size-4 mr-2" /> Ver documentación
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetNewState("En preparación" as SurgeryState); onSetChangeStateDialogOpen(true) }}>
              Cambiar estado
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetChangeDateDialogOpen(true) }}>
              <Calendar className="size-4 mr-2" /> Cambiar fecha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetSuspendDialogOpen(true) }}>
              <AlertOctagon className="size-4 mr-2" /> Suspender
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetCancelDialogOpen(true) }}>
              Cancelar cirugía
            </DropdownMenuItem>
            {(s.state === "Suspendida" || s.state === "Cancelada") && (
              <DropdownMenuItem onClick={() => onRecover(s)}>
                <RotateCcw className="size-4 mr-2" /> Recuperar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Printer className="size-4 mr-2" /> Imprimir / Exportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

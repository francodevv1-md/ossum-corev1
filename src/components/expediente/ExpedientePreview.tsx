"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Minimize2, Maximize2, X, Eye, Receipt, Truck, Activity, MoreHorizontal, StickyNote, BookOpen, Search, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { CX_STATE_COLORS, PREP_STATE_COLORS, DOC_STATUS_COLORS, FACTURACION_COLORS } from "@/lib/cirugias.constants"
import { getFacturacionBadgeLabel, getPendientePrincipal } from "@/lib/cirugias.utils"
import { canAutorizarFV, canRemitirNR, canCargarConsumo } from "@/lib/businessRules"
import type { Surgery, ConsumoState } from "@/types"

interface ExpedientePreviewProps {
  surgery: Surgery; docStatus: string; presupuestoId?: string; remitoId?: string; fvNumber?: string
  consumoState?: ConsumoState; box?: { id: string } | undefined; cobrosTotal?: number; facturacionStatus: string
  onMinimize: () => void; onExpand: () => void; onClose: () => void
  onSetExpTab: (tab: string) => void
  onOpenPresupuestoDialog: (surgery: Surgery) => void
  onSetFacturarDialogOpen: (open: boolean) => void; onSetDialogSurgery: (s: Surgery) => void; onAddNoteToSeguimiento: (s: Surgery) => void
}

function MiniBadge({ label, status, colorMap }: { label: string; status: string; colorMap: Record<string, string> }) {
  const colorClass = colorMap[status] || "bg-gray-400 text-white"
  return <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none", colorClass)}><span className="uppercase opacity-75">{label}</span>{status}</span>
}

export function ExpedientePreview({
  surgery: s, docStatus, presupuestoId, remitoId, fvNumber, consumoState, box, cobrosTotal, facturacionStatus,
  onMinimize, onExpand, onClose, onSetExpTab, onOpenPresupuestoDialog, onSetFacturarDialogOpen, onSetDialogSurgery, onAddNoteToSeguimiento,
}: ExpedientePreviewProps) {
  const pendiente = getPendientePrincipal(s, docStatus, consumoState ? { state: consumoState } : undefined, box)
  const canAuthFV = canAutorizarFV(s, docStatus, consumoState)
  const canRemit = canRemitirNR(s)
  const canLoadConsumo = canCargarConsumo(s)

  return (
    <div className="flex flex-col overflow-hidden">
      {/* ── Header: ID + controls + key info ── */}
      <div className="px-3 py-2 border-b">
        {/* Title row + controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-muted-foreground tracking-[0.12em] uppercase">EXPEDIENTE</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-sm font-semibold text-blue-700">{s.id}</span>
              {s.expedienteNumber && <span className="text-[10px] text-muted-foreground">· Exp. {s.expedienteNumber}</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onMinimize}><Minimize2 className="size-3" /></Button></TooltipTrigger><TooltipContent>Colapsar</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onExpand}><Maximize2 className="size-3" /></Button></TooltipTrigger><TooltipContent>Expandir expediente</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}><X className="size-3" /></Button></TooltipTrigger><TooltipContent>Cerrar</TooltipContent></Tooltip>
          </div>
        </div>
        {/* Key info — compact lines */}
        <div className="mt-1 space-y-0">
          <p className="text-xs font-medium truncate">{s.patient}{s.patientDni ? ` — DNI ${s.patientDni}` : ""}</p>
          <p className="text-[10px] text-muted-foreground truncate">Dr. {s.surgeon} · Coord.: {s.coordinadorCx || "Sin asignar"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{s.institution}{s.provincia ? ` · Prov.: ${s.provincia}` : ""}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-muted-foreground">{formatDate(s.date)} {s.time || ""}</p>
            {s.vendedor && <span className="text-[10px] text-muted-foreground">· Vend.: {s.vendedor}</span>}
          </div>
          {s.urgente && <span className="inline-flex items-center rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">URGENTE</span>}
        </div>
      </div>

      {/* ── Status chips ── */}
      <div className="px-3 py-1.5 border-b">
        <div className="flex flex-wrap gap-1">
          {s.urgente && <MiniBadge label="Alerta" status="Urgente" colorMap={{ "Urgente": "bg-red-600 text-white" }} />}
          <MiniBadge label="Estado CX" status={s.state} colorMap={CX_STATE_COLORS} />
          <MiniBadge label="Preparación" status={s.preparationState} colorMap={PREP_STATE_COLORS} />
          <MiniBadge label="Documentación" status={docStatus} colorMap={DOC_STATUS_COLORS} />
          <MiniBadge label="Facturación" status={s.facturado ? "Facturada" : getFacturacionBadgeLabel(facturacionStatus)} colorMap={FACTURACION_COLORS} />
        </div>
      </div>

      {/* ── Pendiente principal ── */}
      <div className="px-3 py-1.5 border-b">
        <div className={cn("rounded border px-2 py-1 text-[11px] font-medium", pendiente.color)}>{pendiente.text}</div>
      </div>

      {/* ── Quick actions ── */}
      <div className="px-3 py-1.5 border-b">
        <div className="flex flex-wrap gap-1">
          <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px] px-2" onClick={onExpand}>
            <Eye className="size-3" /> Ver expediente
          </Button>
          <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px] px-2"
            onClick={() => { if (presupuestoId) { onExpand(); onSetExpTab("presupuesto") } else { onOpenPresupuestoDialog(s) } }}>
            <Receipt className="size-3" /> {presupuestoId ? "PR" : "Crear PR"}
          </Button>
          {canRemit.allowed && (
            <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px] px-2">
              <Truck className="size-3" /> NR
            </Button>
          )}
          {canLoadConsumo.allowed && (
            <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px] px-2" onClick={() => { onExpand(); onSetExpTab("consumo") }}>
              <Activity className="size-3" /> Consumo
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px] px-2"><MoreHorizontal className="size-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canAuthFV.allowed && <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetFacturarDialogOpen(true) }}><Receipt className="size-4 mr-2" /> Autorizar FV</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onAddNoteToSeguimiento(s)}><StickyNote className="size-4 mr-2" /> Agregar nota al seguimiento</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onExpand(); onSetExpTab("documentacion") }}><BookOpen className="size-4 mr-2" /> Documentación</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onExpand(); onSetExpTab("trazabilidad") }}><Search className="size-4 mr-2" /> Trazabilidad</DropdownMenuItem>
              <DropdownMenuItem><ExternalLink className="size-4 mr-2" /> Abrir en nueva pestaña</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Expand button (compact) ── */}
      <div className="px-3 py-1.5">
        <Button variant="outline" className="w-full gap-1.5 h-7 text-[10px]" onClick={onExpand}>
          <Maximize2 className="size-3" /> Expandir expediente
        </Button>
      </div>
    </div>
  )
}

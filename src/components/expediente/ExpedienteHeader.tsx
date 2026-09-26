"use client"

import React from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Receipt, Truck, Activity, BookOpen, MoreHorizontal, Edit, StickyNote, ShieldCheck, Calendar, AlertOctagon, RotateCcw, Printer, Stethoscope, Building2, UserCircle, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { canAutorizarFV, canRemitirNR, canCargarConsumo } from "@/lib/businessRules"
import { CX_STATE_COLORS, PREP_STATE_COLORS } from "@/lib/cirugias.constants"
import { ExpedienteReferencesStrip } from "./ExpedienteReferencesStrip"
import type { CxOperationsDerivedDisplay } from "@/lib/cx-operations-derived"
import type { Surgery, SurgeryState, ConsumoState } from "@/types"
import type { ExpedienteHeaderModel } from "./expediente-header.model"
import { canMutatePresupuesto } from "@/lib/permissions/financial-document-email"

const CLASSIFICATION_PILL_COLORS: Record<string, string> = {
  "Reemplazo total de rodilla": "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  "Prótesis de cadera": "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  "Osteosíntesis": "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  "Artroscopía": "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-200",
  "Columna": "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200",
  "Tobillo": "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200",
  "Hombro": "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200",
  "Descartable": "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  "Otro": "border-gray-300 bg-gray-50 text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
}

interface ExpedienteHeaderProps {
  surgery: Surgery
  presupuestoId?: string
  consumoState?: ConsumoState
  docStatus: string
  model: ExpedienteHeaderModel
  /** Retained temporarily for existing callers; no CX-derived UI is rendered here. */
  operationsDisplay?: CxOperationsDerivedDisplay
  onEditFicha: () => void
  onViewPR: () => void
  onGeneratePR: () => void
  onViewDocumentacion: () => void
  onViewRemitos: () => void
  onViewConsumo: () => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetNewState: (state: SurgeryState) => void
  onRecover: (s: Surgery) => void
}

export function ExpedienteHeader({ surgery: s, presupuestoId, consumoState, docStatus, model, onSetDialogSurgery, onSetFacturarDialogOpen, onSetNoteDialogOpen, onSetSuspendDialogOpen, onSetCancelDialogOpen, onSetChangeStateDialogOpen, onSetChangeDateDialogOpen, onSetNewState, onRecover, onEditFicha, onViewPR, onGeneratePR, onViewDocumentacion, onViewRemitos, onViewConsumo }: ExpedienteHeaderProps) {
  const { currentAccess } = useAuth()
  const canMutatePR = canMutatePresupuesto(currentAccess?.role)
  const canAuthFV = canAutorizarFV(s, docStatus, consumoState)
  const canRemitNR = canRemitirNR(s)
  const canLoadConsumo = canCargarConsumo(s)
  const hasPR = Boolean(presupuestoId)
  const classificationPillClass = model.identity.classification ? (CLASSIFICATION_PILL_COLORS[model.identity.classification] ?? CLASSIFICATION_PILL_COLORS["Otro"]) : undefined
  const primaryActionLabel = hasPR ? "Ver PR" : "Generar PR"
  const primaryAction = hasPR ? onViewPR : onGeneratePR

  const stateColorClass = CX_STATE_COLORS[s.state] || "bg-slate-400 text-white"
  const preparationColorClass = PREP_STATE_COLORS[s.preparationState] || "bg-slate-400 text-white"
  const stateBgClass = {
    "Sin autorizar": "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
    "Autorizada": "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10",
    "Pendiente": "border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10",
    "Realizada": "border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10",
    "Suspendida": "border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10",
    "Cancelada": "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80",
    "Finalizada": "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10",
  }[s.state] || "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80"

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 px-3 py-2 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
              <span className="inline-flex shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground">{model.identity.idCx}</span>
              <h1 className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-slate-950 dark:text-slate-50 sm:text-[18px]">{model.identity.patient}</h1>
              {model.identity.classification && classificationPillClass ? <span className={cn("hidden rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:inline-flex", classificationPillClass)}>{model.identity.classification}</span> : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 sm:text-[12px]">
              <div className="flex min-w-0 items-center gap-1"><Stethoscope className="size-3 shrink-0 text-slate-400 dark:text-slate-500" /><span className="truncate">{model.identity.surgeon || "—"}</span></div>
              <div className="flex min-w-0 items-center gap-1"><Building2 className="size-3 shrink-0 text-slate-400 dark:text-slate-500" /><span className="truncate">{model.identity.institution || "—"}</span></div>
              <div className="flex min-w-0 items-center gap-1"><UserCircle className="size-3 shrink-0 text-slate-400 dark:text-slate-500" /><span className="truncate">{model.identity.clientFinanciador || "—"}</span></div>
              {model.alerts.urgente ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-300"><AlertOctagon className="size-3" />Urgente</span> : null}
            </div>
          </div>

          <button
            onClick={() => { onSetDialogSurgery(s); onSetNewState(s.state); onSetChangeStateDialogOpen(true) }}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-left transition-colors hover:opacity-80 sm:px-3 sm:py-1.5", stateBgClass)}
          >
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Estado CX</p>
              <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold sm:text-[11px]", stateColorClass)}>{s.state}</span>
            </div>
            <ChevronDown className="size-3 text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        <section className="space-y-2 border-t border-slate-100 pt-2 dark:border-slate-800" aria-label="Lectura operativa de la cirugía">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{model.identity.dateFormatted}</p>
          <ExpedienteReferencesStrip references={model.references} />
          <div className="flex flex-wrap gap-2" aria-label="Estados de cirugía y preparación">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-900">
              <span className="font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Estado CX</span>
              <span className={cn("rounded px-1.5 py-0.5 font-semibold", stateColorClass)}>{s.state}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-900">
              <span className="font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Preparación</span>
              <span className={cn("rounded px-1.5 py-0.5 font-semibold", preparationColorClass)}>{s.preparationState}</span>
            </span>
          </div>
        </section>
      </div>

      {/* ── Action row ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2 sm:flex-wrap sm:overflow-visible sm:px-4">
        <Button variant="outline" size="sm" className="h-7 rounded-md gap-1 border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" onClick={onEditFicha}><Edit className="size-3" /> Editar ficha</Button>
        {(hasPR || canMutatePR) && <Button size="sm" className="h-7 rounded-md gap-1 bg-primary px-2.5 text-[11px] text-primary-foreground hover:bg-primary/90" onClick={primaryAction}><Receipt className="size-3" /> {primaryActionLabel}</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 rounded-md gap-1 border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="size-3" /> Más</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {hasPR && <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={onViewPR}><Receipt className="mr-2 size-4" /> Ver PR</DropdownMenuItem>}
            {canRemitNR.allowed && <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={onViewRemitos}><Truck className="mr-2 size-4" /> Remitir NR</DropdownMenuItem>}
            {canLoadConsumo.allowed && <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={onViewConsumo}><Activity className="mr-2 size-4" /> Cargar consumo</DropdownMenuItem>}
            {canAuthFV.allowed && <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={() => { onSetDialogSurgery(s); onSetFacturarDialogOpen(true) }}><ShieldCheck className="mr-2 size-4" /> Autorizar FV</DropdownMenuItem>}
            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={() => { onSetDialogSurgery(s); onSetNoteDialogOpen(true) }}><StickyNote className="mr-2 size-4" /> Agregar nota</DropdownMenuItem>
            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={onViewDocumentacion}><BookOpen className="mr-2 size-4" /> Ver documentación</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={() => { onSetDialogSurgery(s); onSetNewState(s.state); onSetChangeStateDialogOpen(true) }}>Cambiar estado</DropdownMenuItem>
            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={() => { onSetDialogSurgery(s); onSetChangeDateDialogOpen(true) }}><Calendar className="mr-2 size-4" /> Cambiar fecha</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={() => { onSetDialogSurgery(s); onSetSuspendDialogOpen(true) }}><AlertOctagon className="mr-2 size-4" /> Suspender</DropdownMenuItem>
            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={() => { onSetDialogSurgery(s); onSetCancelDialogOpen(true) }}>Cancelar cirugía</DropdownMenuItem>
            {(s.state === "Suspendida" || s.state === "Cancelada") && <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50" onClick={() => onRecover(s)}><RotateCcw className="mr-2 size-4" /> Recuperar</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"><Printer className="mr-2 size-4" /> Imprimir / Exportar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

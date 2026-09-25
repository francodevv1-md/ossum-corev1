"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Receipt,
  Truck,
  Activity,
  BookOpen,
  MoreHorizontal,
  Edit,
  StickyNote,
  ShieldCheck,
  Calendar,
  AlertOctagon,
  RotateCcw,
  Printer,
  ChevronDown,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { canAutorizarFV, canRemitirNR, canCargarConsumo } from "@/lib/businessRules"
import { CX_STATE_VISUALS, DEFAULT_CX_STATE_VISUAL, PREP_STATE_CELL_COLORS } from "@/lib/cirugias.constants"
import type { CxOperationsDerivedDisplay } from "@/lib/cx-operations-derived"
import type { Surgery, SurgeryState, ConsumoState } from "@/types"
import type { ExpedienteHeaderModel } from "./expediente-header.model"

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

export interface ExpedienteHeaderProps {
  surgery: Surgery
  presupuestoId?: string
  consumoState?: ConsumoState
  docStatus: string
  model: ExpedienteHeaderModel
  /** Retained for compatibility; no CX-derived UI is rendered here. */
  operationsDisplay?: CxOperationsDerivedDisplay
  onBack?: () => void
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

export function ExpedienteHeader({
  surgery: s,
  presupuestoId,
  consumoState,
  docStatus,
  model,
  onBack,
  onSetDialogSurgery,
  onSetFacturarDialogOpen,
  onSetNoteDialogOpen,
  onSetSuspendDialogOpen,
  onSetCancelDialogOpen,
  onSetChangeStateDialogOpen,
  onSetChangeDateDialogOpen,
  onSetNewState,
  onRecover,
  onEditFicha,
  onViewPR,
  onGeneratePR,
  onViewDocumentacion,
  onViewRemitos,
  onViewConsumo,
}: ExpedienteHeaderProps) {
  const canAuthFV = canAutorizarFV(s, docStatus, consumoState)
  const canRemitNR = canRemitirNR(s)
  const canLoadConsumo = canCargarConsumo(s)
  const hasPR = Boolean(presupuestoId)
  const classificationPillClass = model.identity.classification
    ? CLASSIFICATION_PILL_COLORS[model.identity.classification] ?? CLASSIFICATION_PILL_COLORS["Otro"]
    : undefined
  const primaryActionLabel = hasPR ? "Ver PR" : "Generar PR"
  const primaryAction = hasPR ? onViewPR : onGeneratePR

  const cxVisual = CX_STATE_VISUALS[s.state] || DEFAULT_CX_STATE_VISUAL
  const prepClass = PREP_STATE_CELL_COLORS[s.preparationState] || "bg-slate-100 text-slate-700 border border-slate-200"

  const openStateModal = () => {
    onSetDialogSurgery(s)
    onSetNewState(s.state)
    onSetChangeStateDialogOpen(true)
  }

  // Non-empty administrative references to show inline
  const inlineReferences = model.references.filter((r) => r.key === "pr" || r.key === "nr" || r.key === "fv" || r.key === "expediente")

  return (
    <header className="shrink-0 border-b border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5">
        {/* ── NIVEL 1 — Identidad ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1 px-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:px-2"
                onClick={onBack}
                title="Volver al listado de Cirugías"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Cirugías</span>
              </Button>
            )}

            <span className="inline-flex shrink-0 items-center rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white dark:bg-slate-100 dark:text-slate-950 sm:text-[11px]">
              {model.identity.idCx}
            </span>

            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-[17px]">
              {model.identity.patient}
            </h1>

            {model.identity.classification && classificationPillClass ? (
              <span
                className={cn(
                  "hidden shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-flex md:text-[11px]",
                  classificationPillClass
                )}
              >
                {model.identity.classification}
              </span>
            ) : null}
          </div>

          {/* Estado CX — único en todo el header, protagonista canónico */}
          <button
            type="button"
            onClick={openStateModal}
            aria-label="Estado CX"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold shadow-xs transition-opacity hover:opacity-90 active:scale-[0.98] sm:text-xs",
              cxVisual.strongClass
            )}
            title="Estado CX (clic para cambiar)"
          >
            <span className="sr-only">Estado CX</span>
            <span>{s.state}</span>
            <ChevronDown className="size-3 opacity-80" />
          </button>
        </div>

        {/* ── NIVEL 2 — Contexto + Acciones ── */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-0.5">
          {/* Contexto clínico y administrativo */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 sm:text-[12px]">
            {model.identity.surgeon && (
              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                {model.identity.surgeon}
              </span>
            )}
            {model.identity.surgeon && (model.identity.institution || model.identity.clientFinanciador) && (
              <span className="text-slate-300 dark:text-slate-700">·</span>
            )}

            {model.identity.institution && (
              <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                {model.identity.institution}
              </span>
            )}
            {model.identity.institution && model.identity.clientFinanciador && (
              <span className="text-slate-300 dark:text-slate-700">·</span>
            )}

            {model.identity.clientFinanciador && (
              <span className="truncate text-slate-600 dark:text-slate-400">
                {model.identity.clientFinanciador}
              </span>
            )}
            {(model.identity.surgeon || model.identity.institution || model.identity.clientFinanciador) && (
              <span className="text-slate-300 dark:text-slate-700">·</span>
            )}

            {/* Fecha CX */}
            <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">
              {model.identity.dateFormatted}
            </span>

            {/* Preparación (subordinada y suave) */}
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
                prepClass
              )}
              title="Estado de preparación"
            >
              <span className="sr-only">Preparación</span>
              {s.preparationState}
            </span>

            {/* Alerta de urgencia */}
            {model.alerts.urgente ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                <AlertOctagon className="size-3" />
                URGENTE
              </span>
            ) : null}

            {/* Referencias inline compactas */}
            {inlineReferences.length > 0 && (
              <div className="hidden items-center gap-1 xl:inline-flex">
                <span className="text-slate-300 dark:text-slate-700">·</span>
                {inlineReferences.map((ref) => (
                  <span
                    key={ref.key}
                    className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.2 text-[9px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <span className="font-bold uppercase text-slate-400">{ref.label}</span>
                    <span>{ref.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Acciones principales y menú secundario */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-md border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={onEditFicha}
            >
              <Edit className="size-3" />
              Editar ficha
            </Button>

            <Button
              size="sm"
              className="h-7 gap-1 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
              onClick={primaryAction}
            >
              <Receipt className="size-3" />
              {primaryActionLabel}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 rounded-md border-slate-300 bg-white px-2 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  title="Más acciones de la cirugía"
                >
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only sm:not-sr-only sm:inline">Más</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                {hasPR && (
                  <DropdownMenuItem
                    className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                    onClick={onViewPR}
                  >
                    <Receipt className="mr-2 size-4" /> Ver PR
                  </DropdownMenuItem>
                )}
                {canRemitNR.allowed && (
                  <DropdownMenuItem
                    className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                    onClick={onViewRemitos}
                  >
                    <Truck className="mr-2 size-4" /> Remitir NR
                  </DropdownMenuItem>
                )}
                {canLoadConsumo.allowed && (
                  <DropdownMenuItem
                    className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                    onClick={onViewConsumo}
                  >
                    <Activity className="mr-2 size-4" /> Cargar consumo
                  </DropdownMenuItem>
                )}
                {canAuthFV.allowed && (
                  <DropdownMenuItem
                    className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                    onClick={() => {
                      onSetDialogSurgery(s)
                      onSetFacturarDialogOpen(true)
                    }}
                  >
                    <ShieldCheck className="mr-2 size-4" /> Autorizar FV
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                  onClick={() => {
                    onSetDialogSurgery(s)
                    onSetNoteDialogOpen(true)
                  }}
                >
                  <StickyNote className="mr-2 size-4" /> Agregar nota
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                  onClick={onViewDocumentacion}
                >
                  <BookOpen className="mr-2 size-4" /> Ver documentación
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                  onClick={openStateModal}
                >
                  Cambiar estado
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                  onClick={() => {
                    onSetDialogSurgery(s)
                    onSetChangeDateDialogOpen(true)
                  }}
                >
                  <Calendar className="mr-2 size-4" /> Cambiar fecha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                  onClick={() => {
                    onSetDialogSurgery(s)
                    onSetSuspendDialogOpen(true)
                  }}
                >
                  <AlertOctagon className="mr-2 size-4" /> Suspender
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                  onClick={() => {
                    onSetDialogSurgery(s)
                    onSetCancelDialogOpen(true)
                  }}
                >
                  Cancelar cirugía
                </DropdownMenuItem>
                {(s.state === "Suspendida" || s.state === "Cancelada") && (
                  <DropdownMenuItem
                    className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50"
                    onClick={() => onRecover(s)}
                  >
                    <RotateCcw className="mr-2 size-4" /> Recuperar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50">
                  <Printer className="mr-2 size-4" /> Imprimir / Exportar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

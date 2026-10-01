"use client"

import React from "react"
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  FileText,
  MoreVertical,
  Pencil,
  PowerOff,
  XCircle,
} from "lucide-react"
import type { Surgery } from "@/types"
import { CX_STATE_COLORS, PREP_STATE_COLORS } from "@/lib/shared-constants"
import { cn } from "@/lib/utils"
import { useSwipeGesture } from "@/hooks/useSwipeGesture"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MobileCirugiaCardProps {
  surgery: Surgery
  onOpen: (surgery: Surgery) => void
  onChangeState?: (s: Surgery) => void
  onAddNote?: (s: Surgery) => void
  onFacturar?: (s: Surgery) => void
  onSuspender?: (s: Surgery) => void
  onCancelar?: (s: Surgery) => void
  /** Inline style for entrance animation (set by parent for stagger). */
  animationDelayMs?: number
}

function formatIdentifier(surgery: Surgery): string {
  return surgery.visibleNumber || surgery.expedienteNumber || surgery.id.slice(0, 8).toUpperCase()
}

function formatSurgeryDate(date: string, time: string): string {
  if (!date) return "Sin fecha"
  return time ? `${date} · ${time}` : date
}

export function MobileCirugiaCard({
  surgery,
  onOpen,
  onChangeState,
  onAddNote,
  onFacturar,
  onSuspender,
  onCancelar,
  animationDelayMs = 0,
}: MobileCirugiaCardProps) {
  const stateColor = CX_STATE_COLORS[surgery.state] ?? "bg-slate-500 text-white"
  const prepColor = PREP_STATE_COLORS[surgery.preparationState] ?? "bg-slate-400 text-white"

  const swipe = useSwipeGesture({
    onSwipeLeft: () => onFacturar?.(surgery),
    onSwipeRight: () => onChangeState?.(surgery),
  })

  const hasQuickActions = !!(onChangeState || onAddNote || onFacturar || onSuspender || onCancelar)

  return (
    <div
      className="relative animate-mobile-card-in"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      {/* swipe affordances */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-1.5 rounded-l-2xl bg-emerald-500/70 opacity-0 transition-opacity duration-200 group-data-[swiping=right]:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1.5 rounded-r-2xl bg-blue-500/70 opacity-0 transition-opacity duration-200 group-data-[swiping=left]:opacity-100"
      />

      <button
        type="button"
        onClick={() => onOpen(surgery)}
        {...swipe}
        className={cn(
          "group flex w-full min-h-[96px] flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left",
          "shadow-sm shadow-slate-900/[0.04] transition-all duration-150 ease-out",
          "active:scale-[0.98] active:shadow-none hover:border-slate-300 hover:shadow-md",
          "dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-slate-700 dark:active:bg-slate-800",
          "touch-pan-y",
        )}
        aria-label={`Abrir cirugía ${formatIdentifier(surgery)} de ${surgery.patient}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {formatIdentifier(surgery)}
          </span>
          <div className="flex items-center gap-1">
            {surgery.urgente ? (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
                aria-label="Urgente"
                title="Urgente"
              >
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
            {surgery.autorizado ? (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"
                aria-label="Autorizada"
                title="Autorizada"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
            {surgery.facturado ? (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"
                aria-label="Facturada"
                title="Facturada"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
            {hasQuickActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") e.stopPropagation()
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition active:scale-90 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    aria-label={`Acciones rápidas para ${formatIdentifier(surgery)}`}
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onChangeState ? (
                    <DropdownMenuItem onSelect={() => onChangeState(surgery)}>
                      <Pencil className="mr-2 h-4 w-4" aria-hidden />
                      Cambiar estado
                    </DropdownMenuItem>
                  ) : null}
                  {onAddNote ? (
                    <DropdownMenuItem onSelect={() => onAddNote(surgery)}>
                      <FileText className="mr-2 h-4 w-4" aria-hidden />
                      Agregar nota
                    </DropdownMenuItem>
                  ) : null}
                  {onFacturar ? (
                    <DropdownMenuItem onSelect={() => onFacturar(surgery)}>
                      <Banknote className="mr-2 h-4 w-4" aria-hidden />
                      Facturar
                    </DropdownMenuItem>
                  ) : null}
                  {onSuspender || onCancelar ? (
                    <DropdownMenuSeparator />
                  ) : null}
                  {onSuspender ? (
                    <DropdownMenuItem onSelect={() => onSuspender(surgery)}>
                      <PowerOff className="mr-2 h-4 w-4" aria-hidden />
                      Suspender
                    </DropdownMenuItem>
                  ) : null}
                  {onCancelar ? (
                    <DropdownMenuItem
                      onSelect={() => onCancelar(surgery)}
                      className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                    >
                      <XCircle className="mr-2 h-4 w-4" aria-hidden />
                      Cancelar
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
            {surgery.patient || "Sin paciente"}
          </p>
          <p className="truncate text-[13px] leading-tight text-slate-600 dark:text-slate-300">
            {surgery.institution || "Sin institución"}
          </p>
          <p className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
            {surgery.procedure || "Sin procedimiento"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none", stateColor)}>
            {surgery.state}
          </span>
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none", prepColor)}>
            {surgery.preparationState}
          </span>
          <span className="ml-auto text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
            {formatSurgeryDate(surgery.date, surgery.time)}
          </span>
        </div>

        {hasQuickActions ? (
          <p
            aria-hidden
            className="-mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500"
          >
            ← facturar · cambiar estado →
          </p>
        ) : null}
      </button>
    </div>
  )
}
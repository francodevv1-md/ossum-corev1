"use client"

import React from "react"
import { AlertCircle, ArrowRight, MoreVertical } from "lucide-react"
import type { Surgery } from "@/types"
import { CX_STATE_COLORS, PREP_STATE_COLORS } from "@/lib/shared-constants"
import { cn } from "@/lib/utils"

export type MobileCardPrimaryAction = {
  id: "generar-pr" | "remitir" | "consumo" | "facturar"
  label: string
  onSelect: () => void
}

interface MobileCirugiaCardProps {
  surgery: Surgery
  onOpen: (surgery: Surgery) => void
  onOpenActions: (surgery: Surgery) => void
  primaryAction?: MobileCardPrimaryAction | null
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
  onOpenActions,
  primaryAction,
  animationDelayMs = 0,
}: MobileCirugiaCardProps) {
  const stateColor = CX_STATE_COLORS[surgery.state] ?? "bg-slate-500 text-white"
  const prepColor = PREP_STATE_COLORS[surgery.preparationState] ?? "bg-slate-400 text-white"
  const showProcedure = !!surgery.procedure
  const showClassification = !!surgery.classification && surgery.classification !== "Otro"

  return (
    <article
      className="relative animate-mobile-card-in"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <button
        type="button"
        onClick={() => onOpen(surgery)}
        className={cn(
          "group flex w-full flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left",
          "shadow-sm shadow-slate-900/[0.04] transition-all duration-150 ease-out",
          "active:scale-[0.98] active:shadow-none hover:border-slate-300 hover:shadow-md",
          "dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-slate-700 dark:active:bg-slate-800",
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
                className="inline-flex h-6 items-center gap-1 rounded-full bg-red-600 px-2 text-[10px] font-bold uppercase tracking-wide text-white"
                aria-label="Urgente"
              >
                <AlertCircle className="h-3 w-3" aria-hidden />
                Urgente
              </span>
            ) : null}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onOpenActions(surgery)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  e.preventDefault()
                  onOpenActions(surgery)
                }
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition active:scale-90 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label={`Acciones para ${formatIdentifier(surgery)}`}
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
            {surgery.patient || "Sin paciente"}
          </p>
          <p className="truncate text-[13px] leading-tight text-slate-600 dark:text-slate-300">
            {surgery.institution || "Sin institución"}
          </p>
          {showProcedure || showClassification ? (
            <p className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
              {surgery.procedure || surgery.classification}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none",
              stateColor,
            )}
          >
            {surgery.state}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none",
              prepColor,
            )}
          >
            {surgery.preparationState}
          </span>
          <span className="ml-auto text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
            {formatSurgeryDate(surgery.date, surgery.time)}
          </span>
        </div>
      </button>

      {primaryAction ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            primaryAction.onSelect()
          }}
          className={cn(
            "mt-1 inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 text-left text-[12px] font-semibold text-blue-800",
            "transition-[background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] hover:bg-blue-100",
            "dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70",
          )}
          aria-label={`${primaryAction.label} para ${formatIdentifier(surgery)}`}
        >
          <span>{primaryAction.label}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </article>
  )
}
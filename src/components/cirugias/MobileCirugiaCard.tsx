"use client"

import React from "react"
import { AlertCircle, CheckCircle2, FileText } from "lucide-react"
import type { Surgery } from "@/types"
import { CX_STATE_COLORS, PREP_STATE_COLORS } from "@/lib/shared-constants"
import { cn } from "@/lib/utils"

interface MobileCirugiaCardProps {
  surgery: Surgery
  onOpen: (surgery: Surgery) => void
}

function formatIdentifier(surgery: Surgery): string {
  return surgery.visibleNumber || surgery.expedienteNumber || surgery.id.slice(0, 8).toUpperCase()
}

function formatSurgeryDate(date: string, time: string): string {
  if (!date) return "Sin fecha"
  return time ? `${date} · ${time}` : date
}

export function MobileCirugiaCard({ surgery, onOpen }: MobileCirugiaCardProps) {
  const stateColor = CX_STATE_COLORS[surgery.state] ?? "bg-slate-500 text-white"
  const prepColor = PREP_STATE_COLORS[surgery.preparationState] ?? "bg-slate-400 text-white"

  return (
    <button
      type="button"
      onClick={() => onOpen(surgery)}
      className={cn(
        "group flex w-full min-h-[96px] flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left",
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
    </button>
  )
}
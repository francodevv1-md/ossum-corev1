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
  return time ? `${date} ${time}` : date
}

export function MobileCirugiaCard({ surgery, onOpen }: MobileCirugiaCardProps) {
  const stateColor = CX_STATE_COLORS[surgery.state] ?? "bg-slate-500 text-white"
  const prepColor = PREP_STATE_COLORS[surgery.preparationState] ?? "bg-slate-400 text-white"

  return (
    <button
      type="button"
      onClick={() => onOpen(surgery)}
      className={cn(
        "flex w-full min-h-[88px] flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm",
        "transition active:scale-[0.99] active:bg-slate-50",
        "hover:border-slate-300 hover:shadow",
        "dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:active:bg-slate-800",
      )}
      aria-label={`Abrir cirugía ${formatIdentifier(surgery)} de ${surgery.patient}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {formatIdentifier(surgery)}
        </span>
        <div className="flex items-center gap-1">
          {surgery.urgente ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
              aria-label="Urgente"
              title="Urgente"
            >
              <AlertCircle className="h-3 w-3" aria-hidden />
            </span>
          ) : null}
          {surgery.autorizado ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"
              aria-label="Autorizada"
              title="Autorizada"
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden />
            </span>
          ) : null}
          {surgery.facturado ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
              aria-label="Facturada"
              title="Facturada"
            >
              <FileText className="h-3 w-3" aria-hidden />
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {surgery.patient || "Sin paciente"}
        </p>
        <p className="truncate text-xs text-slate-600 dark:text-slate-300">
          {surgery.institution || "Sin institución"}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {surgery.procedure || "Sin procedimiento"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase leading-none", stateColor)}>
          {surgery.state}
        </span>
        <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase leading-none", prepColor)}>
          {surgery.preparationState}
        </span>
        <span className="ml-auto text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {formatSurgeryDate(surgery.date, surgery.time)}
        </span>
      </div>
    </button>
  )
}
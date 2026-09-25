"use client"

import React, { useState, useEffect } from "react"
import type { Surgery } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CalendarClock,
  Bell,
  UserCheck,
  Building2,
  Stethoscope,
  Radio,
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react"
import { getCoordinatorTopic } from "@/lib/services/ntfy.service"
import { cn } from "@/lib/utils"

export type CoordinatorActionType = "request-date" | "notify"

export interface CoordinatorActionConfirmDialogProps {
  isOpen: boolean
  actionType: CoordinatorActionType
  surgery: Surgery | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (customNote?: string) => Promise<void> | void
}

export function CoordinatorActionConfirmDialog({
  isOpen,
  actionType,
  surgery,
  isSubmitting = false,
  onClose,
  onConfirm,
}: CoordinatorActionConfirmDialogProps) {
  const [customNote, setCustomNote] = useState("")

  useEffect(() => {
    if (isOpen) {
      setCustomNote("")
    }
  }, [isOpen])

  if (!surgery) return null

  const isRequestDate = actionType === "request-date"
  const coordinatorName = surgery.coordinadorCx?.trim() || "Equipo de Coordinación General"
  const hasAssignedCoordinator = Boolean(surgery.coordinadorCx?.trim() && !surgery.coordinadorCx.includes("Sin asignar"))
  const topicName = getCoordinatorTopic(surgery.coordinadorCx)
  const cxId = surgery.visibleNumber || surgery.id

  // Previews
  const previewTitle = isRequestDate
    ? `📅 Definir Fecha: CX ${cxId} · ${surgery.patient}`
    : `🔔 Aviso Coordinación: CX ${cxId} · ${surgery.patient}`

  const defaultMessage = isRequestDate
    ? `Se solicita a ${coordinatorName} definir la fecha definitiva de quirófano con Dr. ${surgery.surgeon || "Sin asignar"}.`
    : `Seguimiento de ${surgery.patient} (${surgery.institution}). Estado actual: ${surgery.state || "En gestión"}.`

  const handleConfirm = async () => {
    await onConfirm(customNote.trim() || undefined)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        {/* Header con gradiente temático */}
        <div
          className={cn(
            "p-5 border-b flex items-start gap-3.5",
            isRequestDate
              ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/70 dark:border-amber-900/40"
              : "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-blue-200/70 dark:border-blue-900/40"
          )}
        >
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs",
              isRequestDate
                ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800"
                : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800"
            )}
          >
            {isRequestDate ? (
              <CalendarClock className="w-6 h-6" />
            ) : (
              <Bell className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isRequestDate
                  ? "Confirmar Solicitud de Fecha"
                  : "Confirmar Notificación a Coordinación"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRequestDate
                  ? "Se registrará la solicitud en el seguimiento del caso y se alertará al coordinador."
                  : "Se emitirá un aviso operativo en tiempo real para el coordinador a cargo."}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Card 1: Destinatario */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Coordinador Destinatario</span>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                  {coordinatorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {coordinatorName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {hasAssignedCoordinator ? "Coordinador asignado de la cirugía" : "Aviso a canal de coordinación general"}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span className="font-mono text-[10px]">{topicName}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Resumen del Caso */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Detalle del Caso
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                CX {cxId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Paciente</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {surgery.patient}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Sanatorio / Institución</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  {surgery.institution}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Médico / Cirujano</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-slate-400 shrink-0" />
                  Dr. {surgery.surgeon || "Sin asignar"}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Estado Actual</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                  {surgery.state || "Sin estado"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Notificación que se va a enviar (Preview) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Notificación a Enviar
              </span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                Canal Push + Nota
              </span>
            </div>

            {/* Burbuja de previsualización */}
            <div
              className={cn(
                "p-3 rounded-lg border text-xs space-y-1.5 shadow-2xs",
                isRequestDate
                  ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50"
                  : "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/50"
              )}
            >
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between">
                <span>{previewTitle}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Prioridad Alta</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                {defaultMessage}
              </p>
              {customNote.trim() && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-800 dark:text-slate-200 italic font-medium">
                  <span className="font-semibold not-italic">Nota adicional:</span> {customNote.trim()}
                </div>
              )}
            </div>

            {/* Input opcional de observación */}
            <div className="space-y-1 pt-1">
              <Label htmlFor="custom-action-note" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Observación o instrucción adicional (opcional)
              </Label>
              <Textarea
                id="custom-action-note"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder={
                  isRequestDate
                    ? "Ej: Confirmar antes de las 14:00 por solicitud del sanatorio..."
                    : "Ej: Notificar urgente cambio de instrumental..."
                }
                rows={2}
                disabled={isSubmitting}
                className="text-xs resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-1"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9 px-4 font-medium cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={cn(
              "text-xs h-9 px-4 font-semibold text-white shadow-xs gap-1.5 cursor-pointer",
              isRequestDate
                ? "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                {isRequestDate ? <CalendarClock className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                <span>{isRequestDate ? "Confirmar Solicitud" : "Confirmar y Notificar"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

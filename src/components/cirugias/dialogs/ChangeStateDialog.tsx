"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Activity, ArrowRight, Check, FileCheck, FileText, Loader2, UploadCloud, X } from "lucide-react"
import type { SurgeryState } from "@/types"
import { ALL_STATES, CX_STATE_VISUALS, DEFAULT_CX_STATE_VISUAL } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"

interface ChangeStateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dialogSurgery: { id: string; state: string } | null
  newState: SurgeryState
  setNewState: (s: SurgeryState) => void
  onConfirm: (payload?: { authFile?: File | null; reasonWithoutAuthFile?: string }) => void | Promise<void>
}

export function ChangeStateDialog({
  open,
  onOpenChange,
  dialogSurgery,
  newState,
  setNewState,
  onConfirm,
}: ChangeStateDialogProps) {
  const currentState = dialogSurgery?.state || ""
  const currentVisual = CX_STATE_VISUALS[currentState] || DEFAULT_CX_STATE_VISUAL
  const newVisual = CX_STATE_VISUALS[newState] || DEFAULT_CX_STATE_VISUAL

  const [authFile, setAuthFile] = useState<File | null>(null)
  const [noComprobanteCheck, setNoComprobanteCheck] = useState(false)
  const [motivoSinComprobante, setMotivoSinComprobante] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setAuthFile(null)
      setNoComprobanteCheck(false)
      setMotivoSinComprobante("")
      setSubmitting(false)
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAuthFile(file)
      setNoComprobanteCheck(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setAuthFile(file)
      setNoComprobanteCheck(false)
    }
  }

  const isAutorizadaState = newState === "Autorizada"
  const isReasonValid = motivoSinComprobante.trim().length >= 3
  const isAuthRequirementFulfilled = !isAutorizadaState || (authFile !== null) || (noComprobanteCheck && isReasonValid)

  const handleExecuteConfirm = useCallback(async () => {
    if (!isAuthRequirementFulfilled || submitting) return
    setSubmitting(true)
    try {
      await onConfirm({
        authFile: noComprobanteCheck ? null : authFile,
        reasonWithoutAuthFile: noComprobanteCheck ? motivoSinComprobante.trim() : undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }, [authFile, isAuthRequirementFulfilled, motivoSinComprobante, noComprobanteCheck, onConfirm, submitting])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded-xl">
        {/* Header con icono y contexto */}
        <div className="border-b border-slate-100 bg-[#F9FBFD] px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/60 dark:text-sky-300">
                <Activity className="size-4.5" />
              </div>
              <div className="space-y-0.5 text-left">
                <DialogTitle className="text-[15px] font-bold tracking-tight text-slate-950 dark:text-slate-50">
                  Cambiar Estado de Cirugía
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Expediente <span className="font-semibold text-slate-800 dark:text-slate-200">{dialogSurgery?.id}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-4">
          {/* Comparativa visual de transición */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/75 bg-[#F2F5F9] p-3 dark:border-slate-800/80 dark:bg-slate-900/40">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Estado Actual
              </p>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold shadow-2xs",
                  currentVisual.strongClass
                )}
              >
                {currentState || "—"}
              </span>
            </div>

            <ArrowRight className="size-4 shrink-0 text-slate-400" />

            <div className="min-w-0 flex-1 space-y-1 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Nuevo Estado
              </p>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold shadow-2xs transition-colors",
                  newVisual.strongClass
                )}
              >
                {newState}
              </span>
            </div>
          </div>

          {/* Selector interactivo */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Seleccionar nuevo estado
            </Label>
            <Select value={newState} onValueChange={(v) => setNewState(v as SurgeryState)}>
              <SelectTrigger className="h-9 w-full border-slate-200 bg-white font-medium text-slate-900 shadow-2xs hover:border-slate-300 focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                {ALL_STATES.map((st) => {
                  const visual = CX_STATE_VISUALS[st] || DEFAULT_CX_STATE_VISUAL
                  const isSelected = st === newState
                  return (
                    <SelectItem
                      key={st}
                      value={st}
                      className="cursor-pointer py-2 text-slate-800 focus:bg-slate-100 dark:text-slate-200 dark:focus:bg-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", visual.dotClass)} />
                        <span className={cn("text-xs font-semibold", isSelected && "font-bold text-slate-950 dark:text-slate-50")}>
                          {st}
                        </span>
                        {isSelected && <Check className="ml-auto size-3.5 text-primary" />}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Requerimiento de comprobante de autorización */}
          {isAutorizadaState && (
            <div className="space-y-3 rounded-lg border border-blue-200/80 bg-blue-50/40 p-3 dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                <FileCheck className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold">Comprobante de Autorización</p>
              </div>

              {!noComprobanteCheck && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {authFile ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-blue-300 bg-white p-2.5 text-xs dark:border-blue-800 dark:bg-slate-900">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-blue-600" />
                        <span className="truncate font-medium">{authFile.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          ({(authFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-slate-500 hover:text-destructive"
                        onClick={() => setAuthFile(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-blue-300 bg-white/80 p-4 text-center transition hover:bg-blue-50/60 dark:border-blue-800 dark:bg-slate-900/60"
                    >
                      <UploadCloud className="size-6 text-blue-500" />
                      <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                        Cargar imagen o PDF de autorización
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Arrastrá o hacé clic para seleccionar (PNG, JPG, PDF)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Checkbox de excepción */}
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="no-comprobante-check"
                  checked={noComprobanteCheck}
                  onCheckedChange={(checked) => {
                    setNoComprobanteCheck(!!checked)
                    if (checked) setAuthFile(null)
                  }}
                />
                <Label
                  htmlFor="no-comprobante-check"
                  className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  No dispongo de comprobante ahora
                </Label>
              </div>

              {/* Comentario obligatorio si se activa la excepción */}
              {noComprobanteCheck && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="motivo-sin-comprobante" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Motivo obligatorio de autorización *
                  </Label>
                  <Textarea
                    id="motivo-sin-comprobante"
                    value={motivoSinComprobante}
                    onChange={(e) => setMotivoSinComprobante(e.target.value)}
                    placeholder="Detallá el motivo o justificación de la autorización sin comprobante adjunto..."
                    className="h-16 text-xs"
                  />
                  {!isReasonValid && motivoSinComprobante.length > 0 && (
                    <p className="text-[10px] text-destructive">El motivo debe tener al menos 3 caracteres.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con microinteracciones en botones */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 dark:border-slate-800/80 dark:bg-slate-900/30">
          <DialogFooter className="flex items-center justify-end gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                className="h-8 bg-primary text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                onClick={() => void handleExecuteConfirm()}
                disabled={!isAuthRequirementFulfilled || submitting}
              >
                {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Confirmar cambio
              </Button>
            </motion.div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

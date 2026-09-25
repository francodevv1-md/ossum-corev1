"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { Activity, ArrowRight, Check } from "lucide-react"
import type { SurgeryState } from "@/types"
import { ALL_STATES, CX_STATE_VISUALS, DEFAULT_CX_STATE_VISUAL } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"

interface ChangeStateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dialogSurgery: { id: string; state: string } | null
  newState: SurgeryState
  setNewState: (s: SurgeryState) => void
  onConfirm: () => void
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
              >
                Cancelar
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                className="h-8 bg-primary text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                onClick={onConfirm}
              >
                Confirmar cambio
              </Button>
            </motion.div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

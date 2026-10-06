"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

interface ChangeDateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dialogSurgery: { id: string; visibleNumber?: string } | null
  newDate: string
  setNewDate: (v: string) => void
  newTime: string
  setNewTime: (v: string) => void
  onConfirm: () => void | Promise<void>
  isSubmitting?: boolean
  error?: string | null
  dateType?: "surgery" | "shipping"
  setDateType?: (value: "surgery" | "shipping") => void
}

export function ChangeDateDialog({
  open,
  onOpenChange,
  dialogSurgery,
  newDate,
  setNewDate,
  newTime,
  setNewTime,
  onConfirm,
  isSubmitting = false, error = null, dateType = "surgery", setDateType,
}: ChangeDateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded-xl">
        <div className="border-b border-slate-100 bg-[#F9FBFD] px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/60 dark:text-sky-300">
                <CalendarIcon className="size-4.5" />
              </div>
              <div className="space-y-0.5 text-left">
                <DialogTitle className="text-[15px] font-bold tracking-tight text-slate-950 dark:text-slate-50">
                  Reprogramar Fecha Quirúrgica
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Expediente <span className="font-semibold text-slate-800 dark:text-slate-200">{dialogSurgery?.visibleNumber || dialogSurgery?.id}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-3.5 px-6 py-4">
          {error && <p role="alert">{error}</p>}
          {setDateType && <div><Label htmlFor="rescheduling-date-type">Fecha a modificar</Label><select id="rescheduling-date-type" value={dateType} disabled={isSubmitting} onChange={(event) => setDateType(event.target.value as "surgery" | "shipping")}><option value="surgery">Cirugía</option><option value="shipping">Envío de material</option></select></div>}
          <div className="space-y-1.5">
            <Label htmlFor="new-surgery-date" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {dateType === "shipping" ? "Nueva fecha de envío *" : "Nueva fecha de cirugía *"}
            </Label>
            <Input
              type="date"
              id="new-surgery-date"
              disabled={isSubmitting}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-9 border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {dateType === "surgery" && <div className="space-y-1.5">
            <Label htmlFor="new-surgery-time" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Hora de intervención
            </Label>
            <div className="relative">
              <Input
                type="time"
                id="new-surgery-time"
                disabled={isSubmitting}
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-9 border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <p>Opcional (hora operativa en Argentina). Si se deja vacía, se programará sin hora fija.</p>
          </div>}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 dark:border-slate-800/80 dark:bg-slate-900/30">
          <DialogFooter className="flex items-center justify-end gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                className="h-8 bg-primary text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                onClick={onConfirm}
                disabled={!newDate || isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Guardar fecha"}
              </Button>
            </motion.div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

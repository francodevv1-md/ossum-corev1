"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertOctagon } from "lucide-react"

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dialogSurgery: { id: string } | null
  reason: string
  setReason: (v: string) => void
  onConfirm: () => void
}

export function CancelDialog({
  open,
  onOpenChange,
  dialogSurgery,
  reason,
  setReason,
  onConfirm,
}: CancelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded-xl">
        <div className="border-b border-red-100 bg-red-50/60 px-6 py-4 dark:border-red-950/60 dark:bg-red-950/30">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-200/80 bg-red-100/80 text-red-700 dark:border-red-800/60 dark:bg-red-900/60 dark:text-red-300">
                <AlertOctagon className="size-4.5" />
              </div>
              <div className="space-y-0.5 text-left">
                <DialogTitle className="text-[15px] font-bold tracking-tight text-red-950 dark:text-red-100">
                  Cancelar Cirugía Definitivamente
                </DialogTitle>
                <DialogDescription className="text-xs text-red-700/80 dark:text-red-300/80">
                  Esta acción registrará la anulación del expediente <span className="font-semibold">{dialogSurgery?.id}</span>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-2 px-6 py-4">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Motivo de cancelación *
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indique obligatoriamente el motivo de cancelación..."
            rows={3}
            className="resize-none border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 dark:border-slate-800/80 dark:bg-slate-900/30">
          <DialogFooter className="flex items-center justify-end gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => onOpenChange(false)}
              >
                Volver
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 bg-red-600 text-xs font-semibold text-white shadow-xs hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                onClick={onConfirm}
                disabled={!reason.trim()}
              >
                Cancelar Cirugía
              </Button>
            </motion.div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
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
import { MessageSquarePlus, StickyNote } from "lucide-react"
import type { NoteType, NotePriority } from "@/lib/cirugias.types"

interface AddNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgeryId: string | undefined
  noteText: string
  setNoteText: (v: string) => void
  noteType: NoteType
  setNoteType: (v: NoteType) => void
  notePriority: NotePriority
  setNotePriority: (v: NotePriority) => void
  onConfirm: () => void
}

export function AddNoteDialog({
  open,
  onOpenChange,
  surgeryId,
  noteText,
  setNoteText,
  noteType,
  setNoteType,
  notePriority,
  setNotePriority,
  onConfirm,
}: AddNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-slate-200 bg-white p-0 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded-xl">
        <div className="border-b border-slate-100 bg-[#F9FBFD] px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300">
                <StickyNote className="size-4.5" />
              </div>
              <div className="space-y-0.5 text-left">
                <DialogTitle className="text-[15px] font-bold tracking-tight text-slate-950 dark:text-slate-50">
                  Agregar Nota al Expediente
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Cirugía <span className="font-semibold text-slate-800 dark:text-slate-200">{surgeryId}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Contenido de la nota *
            </Label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Describa la novedad, indicación o comunicación..."
              rows={3}
              className="resize-none border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Tipo
              </Label>
              <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                <SelectTrigger className="h-8.5 border-slate-200 bg-white text-xs font-medium dark:border-slate-700 dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                  {(["General", "Urgente", "Logística", "Facturación", "Interna"] as NoteType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Prioridad
              </Label>
              <Select value={notePriority} onValueChange={(v) => setNotePriority(v as NotePriority)}>
                <SelectTrigger className="h-8.5 border-slate-200 bg-white text-xs font-medium dark:border-slate-700 dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                  {(["Baja", "Media", "Alta"] as NotePriority[]).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                Cancelar
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                onClick={onConfirm}
                disabled={!noteText.trim()}
              >
                <MessageSquarePlus className="size-3.5" />
                <span>Registrar nota</span>
              </Button>
            </motion.div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

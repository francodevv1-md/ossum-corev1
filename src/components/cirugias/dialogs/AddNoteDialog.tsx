"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { NoteType, NotePriority } from "@/lib/cirugias.types"

interface AddNoteDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; surgeryId: string | undefined
  noteText: string; setNoteText: (v: string) => void; noteType: NoteType; setNoteType: (v: NoteType) => void
  notePriority: NotePriority; setNotePriority: (v: NotePriority) => void; onConfirm: () => void
}
export function AddNoteDialog({ open, onOpenChange, surgeryId, noteText, setNoteText, noteType, setNoteType, notePriority, setNotePriority, onConfirm }: AddNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Agregar Nota</DialogTitle><DialogDescription>Cirugía {surgeryId}</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Nota *</Label><Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escribir nota..." rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label><Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["General", "Urgente", "Logística", "Facturación", "Interna"] as NoteType[]).map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Prioridad</Label><Select value={notePriority} onValueChange={(v) => setNotePriority(v as NotePriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["Baja", "Media", "Alta"] as NotePriority[]).map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={onConfirm} disabled={!noteText.trim()}>Agregar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

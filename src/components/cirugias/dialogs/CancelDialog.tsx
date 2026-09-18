"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CancelDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; dialogSurgery: { id: string } | null
  reason: string; setReason: (v: string) => void; onConfirm: () => void
}
export function CancelDialog({ open, onOpenChange, dialogSurgery, reason, setReason, onConfirm }: CancelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Cancelar Cirugía</DialogTitle><DialogDescription>Esta acción no se puede deshacer. Cirugía {dialogSurgery?.id}</DialogDescription></DialogHeader>
        <div className="py-4"><Label>Motivo de cancelación *</Label><Textarea className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Indique el motivo..." rows={3} /></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Volver</Button><Button variant="destructive" onClick={onConfirm} disabled={!reason.trim()}>Cancelar Cirugía</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

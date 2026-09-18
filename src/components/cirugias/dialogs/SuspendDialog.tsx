"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface SuspendDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; dialogSurgery: { id: string; patient: string } | null
  reason: string; setReason: (v: string) => void; onConfirm: () => void
}
export function SuspendDialog({ open, onOpenChange, dialogSurgery, reason, setReason, onConfirm }: SuspendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Suspender Cirugía</DialogTitle><DialogDescription>Cirugía {dialogSurgery?.id} — {dialogSurgery?.patient}</DialogDescription></DialogHeader>
        <div className="py-4"><Label>Motivo de suspensión</Label><Textarea className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Indique el motivo..." rows={3} /></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="destructive" onClick={onConfirm}>Suspender</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

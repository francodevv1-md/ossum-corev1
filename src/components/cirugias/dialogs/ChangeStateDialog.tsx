"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { SurgeryState } from "@/types"
import { ALL_STATES } from "@/lib/cirugias.constants"

interface ChangeStateDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void
  dialogSurgery: { id: string; state: string } | null
  newState: SurgeryState; setNewState: (s: SurgeryState) => void; onConfirm: () => void
}
export function ChangeStateDialog({ open, onOpenChange, dialogSurgery, newState, setNewState, onConfirm }: ChangeStateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Cambiar Estado</DialogTitle><DialogDescription>Cirugía {dialogSurgery?.id} — Estado actual: {dialogSurgery?.state}</DialogDescription></DialogHeader>
        <div className="py-4"><Label>Nuevo estado</Label>
          <Select value={newState} onValueChange={(v) => setNewState(v as SurgeryState)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{ALL_STATES.map((st) => (<SelectItem key={st} value={st}>{st}</SelectItem>))}</SelectContent></Select>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={onConfirm}>Confirmar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

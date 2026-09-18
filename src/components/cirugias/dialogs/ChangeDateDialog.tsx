"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ChangeDateDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; dialogSurgery: { id: string } | null
  newDate: string; setNewDate: (v: string) => void; newTime: string; setNewTime: (v: string) => void; onConfirm: () => void
}
export function ChangeDateDialog({ open, onOpenChange, dialogSurgery, newDate, setNewDate, newTime, setNewTime, onConfirm }: ChangeDateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Cambiar Fecha</DialogTitle><DialogDescription>Cirugía {dialogSurgery?.id}</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Nueva fecha *</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Nueva hora</Label><Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={onConfirm} disabled={!newDate}>Confirmar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

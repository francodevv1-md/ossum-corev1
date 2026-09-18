"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * FacturarDialog (LEGACY)
 *
 * CHATZAI-010: Este diálogo simple se mantiene para compatibilidad.
 * El diálogo completo con selector de base está en:
 *   src/components/facturacion/FacturarDialog.tsx
 *
 * Los componentes que necesiten la funcionalidad completa deben usar
 * el nuevo FacturarDialog del módulo facturacion.
 */

interface FacturarDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; surgeryId: string | undefined; patient: string | undefined
  facturaNumber: string; setFacturaNumber: (v: string) => void; onConfirm: () => void
}
export function FacturarDialog({ open, onOpenChange, surgeryId, patient, facturaNumber, setFacturaNumber, onConfirm }: FacturarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Facturar Cirugía</DialogTitle><DialogDescription>Emitir factura para cirugía {surgeryId} — {patient}</DialogDescription></DialogHeader>
        <div className="py-4"><Label>Número de factura *</Label><Input className="mt-1.5" value={facturaNumber} onChange={(e) => setFacturaNumber(e.target.value)} placeholder="FV-2026-XXXX" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={!facturaNumber.trim()} className="bg-emerald-600 hover:bg-emerald-700">Emitir Factura</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

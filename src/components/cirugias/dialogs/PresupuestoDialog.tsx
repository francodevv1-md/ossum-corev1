"use client"
import React from "react"
import { PresupuestoFormDialog } from "@/components/presupuestos/PresupuestoFormDialog"
import type { Surgery } from "@/types"

interface PresupuestoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery: Surgery | null
  onCreated?: (presupuestoId: string) => void
}

export function PresupuestoDialog({ open, onOpenChange, surgery, onCreated }: PresupuestoDialogProps) {
  if (!surgery) return null
  return (
    <PresupuestoFormDialog
      mode="dialog"
      context="surgery"
      surgeryId={surgery.id}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={(pr) => {
        onCreated?.(pr.id)
      }}
    />
  )
}

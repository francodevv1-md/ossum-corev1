"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Box, CheckCircle2, Loader2, PackageCheck } from "lucide-react"
import type { PrepStatus } from "@/lib/validators/surgery.validator"
import type { Surgery } from "@/types"

interface ChangePrepStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery: Surgery | null
  currentPrepStatus?: string | null
  onConfirm: (newStatus: PrepStatus) => Promise<void>
}

export const PREP_STATUS_CHOICES: Array<{ value: PrepStatus; label: string; description: string }> = [
  {
    value: "preparing",
    label: "En preparación",
    description: "Instrumental y cajas en armado en depósito",
  },
  {
    value: "frozen",
    label: "Congelada",
    description: "Asignación reservada y lista para verificación",
  },
  {
    value: "frozen_with_missing",
    label: "Congelada con faltantes",
    description: "Preparación pausada por falta de insumos",
  },
  {
    value: "shipped",
    label: "Despachada",
    description: "En tránsito / vehículo hacia la institución",
  },
  {
    value: "delivered",
    label: "Entregada",
    description: "Recibida en quirófano o institución",
  },
  {
    value: "returned",
    label: "Retirada / Devuelta",
    description: "Retorno completado al depósito",
  },
]

export function ChangePrepStatusDialog({
  open,
  onOpenChange,
  surgery,
  currentPrepStatus,
  onConfirm,
}: ChangePrepStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<PrepStatus>("preparing")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (currentPrepStatus) {
      const match = PREP_STATUS_CHOICES.find(
        (c) => c.value === currentPrepStatus || c.label.toLowerCase() === currentPrepStatus.toLowerCase()
      )
      if (match) {
        setSelectedStatus(match.value)
        return
      }
    }
    setSelectedStatus("preparing")
  }, [currentPrepStatus, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onConfirm(selectedStatus)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Box className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Cambiar Estado de Preparación
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {surgery?.patient ? `Cirugía de ${surgery.patient}` : "Actualizar estado operativo"} · Ref: {surgery?.visibleNumber || surgery?.id || "S/R"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prep-status-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nuevo estado de preparación
              </Label>
              <Select
                value={selectedStatus}
                onValueChange={(val) => setSelectedStatus(val as PrepStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="prep-status-select" className="h-10 text-xs">
                  <SelectValue placeholder="Seleccioná un estado" />
                </SelectTrigger>
                <SelectContent>
                  {PREP_STATUS_CHOICES.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value} className="text-xs py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold">{choice.label}</span>
                        <span className="text-[10px] text-slate-500">{choice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-[#1D2FC0] hover:bg-[#18269e] text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <PackageCheck className="mr-1.5 size-3.5" />
                  Actualizar preparación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

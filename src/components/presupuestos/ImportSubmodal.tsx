"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Import, Check, AlertCircle } from "lucide-react"
import { useOrtoTrackStore } from "@/lib/store"
import type { FormItem } from "@/hooks/usePresupuestoForm"

/**
 * CHATZAI-017F — Import submodal (DF-PRES-03).
 *
 * Opens as Dialog centered within the workspace.
 * V1 functionality: Import items from an existing surgery's presupuesto.
 * Future: Import from PR anterior, import from file, etc.
 */

interface ImportSubmodalProps {
  currentSurgeryId?: string
  onImportItems: (items: FormItem[]) => void
}

export function ImportSubmodal({ currentSurgeryId, onImportItems }: ImportSubmodalProps) {
  const [open, setOpen] = useState(false)
  const store = useOrtoTrackStore()

  // Get surgeries with presupuestos that have items
  const surgeriesWithPR = useMemo(() => {
    return store.surgeries.filter(
      (s) =>
        s.presupuestoId &&
        s.state !== "Cancelada" &&
        s.state !== "Suspendida" &&
        s.id !== currentSurgeryId
    )
  }, [store.surgeries, currentSurgeryId])

  // Get the presupuesto for each surgery
  const availablePresupuestos = useMemo(() => {
    return surgeriesWithPR
      .map((s) => {
        const pr = store.presupuestos.find((p) => p.id === s.presupuestoId)
        if (!pr || pr.items.length === 0) return null
        return { surgery: s, presupuesto: pr }
      })
      .filter(Boolean) as { surgery: typeof surgeriesWithPR[0]; presupuesto: NonNullable<ReturnType<typeof store.presupuestos.find>> }[]
  }, [surgeriesWithPR, store.presupuestos])

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const handleImport = () => {
    if (selectedIdx === null) return
    const selected = availablePresupuestos[selectedIdx]
    if (!selected) return

    const items: FormItem[] = selected.presupuesto.items.map((pi) => ({
      code: pi.code,
      name: pi.name,
      quantity: pi.quantity,
      unitPrice: pi.unitPrice,
      discountPercent: pi.discountPercent || 0,
      // CHATZAI-017L: Preserve catalogItemId if item was linked
      catalogItemId: pi.catalogItemId || "",
      isArticuloLibre: !pi.catalogItemId, // derived: no catalog link → libre
      descripcionLibre: pi.descripcionLibre || "",
      // CHATZAI-025B: Preserve original ivaKey from imported item, fallback to "21"
      ivaKey: pi.ivaKey || "21",
      codeResolved: !!pi.catalogItemId,
    }))

    onImportItems(items)
    setOpen(false)
    setSelectedIdx(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) setSelectedIdx(null)
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-[10px] gap-1 px-2"
        onClick={() => setOpen(true)}
        data-testid="btn-importar"
      >
        <Import className="size-3" /> Importar
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[65vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <DialogTitle className="text-sm">Importar artículos</DialogTitle>
            <DialogDescription className="text-[10px]">
              Seleccione un presupuesto existente para importar sus artículos
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {availablePresupuestos.length > 0 ? (
              availablePresupuestos.map(({ surgery, presupuesto }, idx) => {
                const isSelected = selectedIdx === idx
                return (
                  <button
                    key={`${surgery.id}-${idx}`}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-l-emerald-500"
                        : "hover:bg-muted/60 border-l-2 border-l-transparent"
                    }`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{surgery.patient}</span>
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                          {surgery.classification}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {presupuesto.items.length} artículos
                        {presupuesto.items.filter(i => !i.catalogItemId).length > 0 &&
                          ` · ${presupuesto.items.filter(i => !i.catalogItemId).length} Z`}
                        {" · Total: "}{presupuesto.total.toLocaleString("es-AR")}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                        {surgery.institution} · {surgery.date}
                      </p>
                    </div>
                    {isSelected && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <AlertCircle className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">Sin presupuestos disponibles</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  No hay cirugías con presupuesto para importar artículos.
                </p>
              </div>
            )}
          </div>

          {/* Action bar */}
          {availablePresupuestos.length > 0 && (
            <div className="shrink-0 border-t bg-muted/20 px-4 py-2.5 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                {selectedIdx !== null
                  ? `Se importarán ${availablePresupuestos[selectedIdx].presupuesto.items.length} artículos`
                  : "Seleccione un presupuesto"}
              </p>
              <Button
                size="sm"
                className="h-7 text-[10px] gap-1 px-3 bg-emerald-600 hover:bg-emerald-700"
                disabled={selectedIdx === null}
                onClick={handleImport}
                data-testid="btn-do-import"
              >
                <Import className="size-3" /> Importar artículos
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

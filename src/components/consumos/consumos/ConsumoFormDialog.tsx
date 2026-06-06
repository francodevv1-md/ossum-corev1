"use client"

import React, { useState, useMemo } from "react"
import type { Consumo, ConsumoItem, ValidationIssue } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOrtoTrackStore } from "@/lib/store"
import { ConsumoItemsTable } from "./ConsumoItemsTable"
import { ConsumoSummarySection } from "./ConsumoSummarySection"
import { CONSUMO_ORIGIN_LABELS, CONSUMO_ORIGIN_COLORS } from "@/lib/consumos.constants"
import { canValidateConsumo } from "@/lib/consumoValidation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Truck, PenLine } from "lucide-react"

type ConsumoFormSource = "remito" | "manual"

interface ConsumoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgeryId: string
  source: ConsumoFormSource
  remitoId?: string
  onConsumoCreated?: (consumo: Consumo) => void
}

export function ConsumoFormDialog({
  open,
  onOpenChange,
  surgeryId,
  source,
  remitoId,
  onConsumoCreated,
}: ConsumoFormDialogProps) {
  const store = useOrtoTrackStore()
  const surgery = store.getSurgeryById(surgeryId)
  const remitos = store.getRemitosBySurgeryId(surgeryId)
  const presupuestoVigente = store.getPresupuestoVigenteBySurgeryId?.(surgeryId)

  const [items, setItems] = useState<ConsumoItem[]>([])
  const [justificacion, setJustificacion] = useState("")
  const [selectedRemitoId, setSelectedRemitoId] = useState(remitoId || "")
  const [isSaving, setIsSaving] = useState(false)

  const sentMap = useMemo(() => {
    const map = new Map<string, number>()
    const selectedRemitos = selectedRemitoId
      ? remitos.filter((r) => r.id === selectedRemitoId)
      : remitos
    for (const r of selectedRemitos) {
      for (const item of r.items) {
        const prev = map.get(item.stockItemId) ?? 0
        map.set(item.stockItemId, prev + item.sentQuantity)
      }
    }
    return map
  }, [remitos, selectedRemitoId])

  // When source=remito and a remito is selected, pre-fill items
  const handleRemitoSelect = (rId: string) => {
    setSelectedRemitoId(rId)
    const remito = remitos.find((r) => r.id === rId)
    if (remito) {
      const stock = store.stock
      setItems(
        remito.items.map((ri) => {
          const stockItem = stock.find((s) => s.id === ri.stockItemId)
          return {
            stockItemId: ri.stockItemId,
            name: ri.name,
            code: ri.code,
            lot: stockItem?.lot || "",
            department: stockItem?.department || "",
            rubro: stockItem?.rubro || "",
            brand: stockItem?.brand || "",
            consumed: ri.consumedQuantity,
            returned: ri.returnedQuantity,
            remitoOrigen: rId,
          }
        })
      )
    }
  }

  const handleSave = (andValidate: boolean) => {
    if (!surgeryId) return

    // Validate basic data
    if (items.length === 0) {
      toast.error("Debe agregar al menos un artículo")
      return
    }

    if (source === "manual" && !justificacion.trim()) {
      toast.error("La justificación es obligatoria para consumos manuales")
      return
    }

    setIsSaving(true)
    try {
      let consumo: Consumo
      if (source === "remito" && selectedRemitoId) {
        consumo = store.createConsumptionFromDeliveryNote(selectedRemitoId)
      } else {
        consumo = store.createConsumoManual(surgeryId, items, justificacion)
      }

      if (andValidate) {
        const remitosForValidation = store.getRemitosBySurgeryId(surgeryId)
        const result = canValidateConsumo(consumo, remitosForValidation)
        if (!result.allowed) {
          toast.warning("Consumo guardado pero no se puede validar aún. Hay datos incompletos.")
        } else {
          store.validateConsumption(consumo.id)
          toast.success("Consumo guardado y validado exitosamente")
        }
      } else {
        toast.success("Consumo guardado como pendiente")
      }

      onConsumoCreated?.(consumo)
      onOpenChange(false)
      resetForm()
    } catch {
      toast.error("Error al guardar el consumo")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setItems([])
    setJustificacion("")
    setSelectedRemitoId(remitoId || "")
  }

  // Build a temporary consumo for validation preview
  const tempConsumo: Consumo = {
    id: "TEMP",
    surgeryId,
    boxId: "",
    items,
    origen: source,
    justificacion: source === "manual" ? justificacion : undefined,
    remitoId: source === "remito" ? selectedRemitoId : undefined,
    validatedBy: "",
    state: "Pendiente",
  }

  const validationResult = useMemo(
    () => items.length > 0 ? canValidateConsumo(tempConsumo, remitos) : { allowed: false, issues: [] as ValidationIssue[] },
    [items, justificacion, source, selectedRemitoId, remitos]
  )

  const originLabel = CONSUMO_ORIGIN_LABELS[source]
  const originColor = CONSUMO_ORIGIN_COLORS[source]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Cargar Consumo
            <Badge className={cn("text-[10px]", originColor)}>
              {source === "remito" ? <Truck className="size-3 mr-1" /> : <PenLine className="size-3 mr-1" />}
              {originLabel}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {surgery ? `${surgery.id} — ${surgery.patient} — ${surgery.institution}` : surgeryId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Remito selector (only for remito mode) */}
          {source === "remito" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Remito</Label>
              <Select value={selectedRemitoId} onValueChange={handleRemitoSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar remito..." />
                </SelectTrigger>
                <SelectContent>
                  {remitos.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.id} — {r.destination} ({r.date})
                    </SelectItem>
                  ))}
                  {remitos.length === 0 && (
                    <SelectItem value="none" disabled>No hay remitos disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Justification (only for manual mode) */}
          {source === "manual" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Justificación <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Motivo de carga sin remito (obligatorio)"
                className="text-xs min-h-[60px]"
              />
            </div>
          )}

          {/* Items table */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Artículos</Label>
            <ConsumoItemsTable
              items={items}
              onChange={setItems}
              isEditing={true}
              showSent={source === "remito" && !!selectedRemitoId}
              sentMap={source === "remito" ? sentMap : undefined}
              validationIssues={validationResult.issues}
              origen={source}
            />
          </div>

          {/* Summary */}
          <ConsumoSummarySection
            items={items}
            sentMap={source === "remito" ? sentMap : undefined}
            origen={source}
            hasPresupuesto={!!presupuestoVigente}
            validationIssues={validationResult.issues}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm() }} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving || items.length === 0}>
            Guardar como Pendiente
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving || items.length === 0 || !validationResult.allowed}>
            Guardar y Validar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

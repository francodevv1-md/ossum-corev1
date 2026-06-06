"use client"

import React, { useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useOrtoTrackStore } from "@/lib/store"
import { usePresupuestoForm } from "@/hooks/usePresupuestoForm"
import { DatosComercialesSection } from "./DatosComercialesSection"
import { CondicionesSection } from "./CondicionesSection"
import { PresupuestoItemsTable } from "./PresupuestoItemsTable"
import { TotalesSection } from "./TotalesSection"
import type { Presupuesto, Surgery, PresupuestoItem } from "@/types"
import { Receipt } from "lucide-react"

// ─── Types ───

export type PresupuestoFormMode = "dialog" | "inline"
export type PresupuestoFormContext = "surgery" | "independent"

export interface PresupuestoFormDialogProps {
  mode: PresupuestoFormMode
  context: PresupuestoFormContext
  surgeryId?: string           // Required if context="surgery"
  presupuestoId?: string       // For editing (future, not V1)
  open?: boolean               // Dialog mode
  onOpenChange?: (open: boolean) => void
  onSubmit?: (presupuesto: Presupuesto) => void
  onCancel?: () => void
}

// ─── Helper: convert form items to PresupuestoItem[] ───

function formItemsToPresupuestoItems(items: ReturnType<typeof usePresupuestoForm>["items"]): PresupuestoItem[] {
  return items.map((item) => {
    const subtotalBruto = item.quantity * item.unitPrice
    const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
    const descuentoLinea = subtotalBruto * (clampedDiscount / 100)
    const subtotalNeto = subtotalBruto - descuentoLinea
    // CHATZAI-017L: stockItemId comes from catalogItemId if linked, or generated for libre items
    const isLibre = item.isArticuloLibre
    return {
      stockItemId: item.catalogItemId || `Z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: isLibre && item.descripcionLibre ? item.descripcionLibre : item.name,
      code: item.code || (isLibre ? "Z-LIBRE" : "SIN-COD"),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: clampedDiscount > 0 ? clampedDiscount : undefined,
      subtotal: subtotalNeto,
      catalogItemId: item.catalogItemId || undefined,
      // Backward compat: isArticuloZ derived from isArticuloLibre
      isArticuloZ: isLibre || undefined,
      descripcionLibre: isLibre ? item.descripcionLibre : undefined,
      // CHATZAI-025: IVA per item
      ivaKey: item.ivaKey,
    }
  })
}

// ─── Form Content (shared between dialog and inline) ───

interface FormContentProps {
  context: PresupuestoFormContext
  surgeryId?: string
  onSubmit: (presupuesto: Presupuesto) => void
  onCancel?: () => void
}

function PresupuestoFormContent({ context, surgeryId, onSubmit, onCancel }: FormContentProps) {
  const store = useOrtoTrackStore()
  const surgery = surgeryId ? store.getSurgeryById(surgeryId) : undefined
  const availableSurgeries = store.surgeries.filter(
    (s) => !s.presupuestoId && s.state !== "Cancelada" && s.state !== "Suspendida"
  )

  const {
    formData,
    updateField,
    items,
    addItem,
    removeItem,
    updateItem,
    errors,
    validate,
    subtotal,
    descuento,
    descuentoMonto,
    descuentoLineasMonto,
    ivaPercentage,
    ivaMonto,
    ivaDesglose,
    total,
    articuloZCount,
    resetForm,
    populateFromSurgery,
  } = usePresupuestoForm()

  // Auto-populate from surgery when context is surgery
  useEffect(() => {
    if (context === "surgery" && surgery) {
      populateFromSurgery(surgery)
    }
  }, [context, surgery, populateFromSurgery])

  const handleSurgerySelect = useCallback((selectedSurgery: Surgery) => {
    populateFromSurgery(selectedSurgery)
  }, [populateFromSurgery])

  const handleSubmit = useCallback(() => {
    if (!validate()) return

    const presupuestoItems = formItemsToPresupuestoItems(items)

    const presupuestoData = {
      surgeryId: context === "surgery" ? surgeryId : formData.surgeryId,
      client: formData.client,
      obraSocial: formData.obraSocial || undefined,
      financiador: formData.financiador || undefined,
      vendedor: formData.vendedor,
      patient: formData.patient || undefined,
      institution: formData.institution || undefined,
      concepto: formData.concepto || undefined,
      fechaEmision: formData.fechaEmision,
      vigencia: formData.vigencia,
      listaPrecios: formData.listaPrecios,
      condicionPago: formData.condicionPago || undefined,
      descuento: formData.descuento > 0 ? formData.descuento : undefined,
      items: presupuestoItems,
      subtotal,
      total,
      state: "Borrador" as const,
      observaciones: formData.observaciones || undefined,
      bloqueado: false,
      version: 1,
      versionStatus: "vigente" as const,
    }

    let presupuesto: Presupuesto

    if (context === "surgery" && surgeryId) {
      presupuesto = store.createBudgetForSurgery(surgeryId, presupuestoData)
    } else if (formData.surgeryId) {
      // Independent context but linked to a surgery
      presupuesto = store.createBudgetForSurgery(formData.surgeryId, presupuestoData)
    } else {
      presupuesto = store.createBudgetIndependent(presupuestoData)
    }

    resetForm()
    onSubmit(presupuesto)
  }, [validate, items, context, surgeryId, formData, subtotal, total, store, resetForm, onSubmit])

  return (
    <div className="space-y-6">
      {/* Section 1: Datos Comerciales */}
      <DatosComercialesSection
        formData={formData}
        updateField={updateField}
        errors={errors}
        context={context}
        surgery={surgery}
        surgeries={context === "independent" ? availableSurgeries : undefined}
        onSurgerySelect={context === "independent" ? handleSurgerySelect : undefined}
      />

      <Separator />

      {/* Section 2: Condiciones */}
      <CondicionesSection
        formData={formData}
        updateField={updateField}
        errors={errors}
      />

      <Separator />

      {/* Section 3: Items */}
      <PresupuestoItemsTable
        items={items}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        errors={errors}
      />

      <Separator />

      {/* Section 4: Totales */}
      <TotalesSection
        subtotal={subtotal}
        descuento={descuento}
        descuentoMonto={descuentoMonto}
        descuentoLineasMonto={descuentoLineasMonto}
        ivaPercentage={ivaPercentage}
        ivaMonto={ivaMonto}
        ivaKey={formData.iva}
        ivaDesglose={ivaDesglose}
        total={total}
        articuloLibreCount={articuloZCount}
        articuloZCount={articuloZCount}
      />

      <Separator />

      {/* Section 5: Observaciones */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Observaciones</Label>
        <Textarea
          value={formData.observaciones}
          onChange={(e) => updateField("observaciones", e.target.value)}
          placeholder="Observaciones del presupuesto..."
          rows={2}
          className="text-sm"
        />
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit}>
          <Receipt className="size-3.5 mr-1.5" />
          Guardar presupuesto
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───

export function PresupuestoFormDialog({
  mode,
  context,
  surgeryId,
  presupuestoId,
  open,
  onOpenChange,
  onSubmit,
  onCancel,
}: PresupuestoFormDialogProps) {
  const handleSubmit = useCallback((presupuesto: Presupuesto) => {
    onSubmit?.(presupuesto)
    if (mode === "dialog") {
      onOpenChange?.(false)
    }
  }, [onSubmit, onOpenChange, mode])

  const handleCancel = useCallback(() => {
    onCancel?.()
    if (mode === "dialog") {
      onOpenChange?.(false)
    }
  }, [onCancel, onOpenChange, mode])

  // Dialog mode
  if (mode === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {presupuestoId ? "Editar Presupuesto" : "Nuevo Presupuesto"}
            </DialogTitle>
            <DialogDescription>
              {context === "surgery"
                ? `Presupuesto para cirugía ${surgeryId || ""}`
                : "Presupuesto independiente"
              }
            </DialogDescription>
          </DialogHeader>
          <PresupuestoFormContent
            context={context}
            surgeryId={surgeryId}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // Inline mode (for wizard step, etc.)
  return (
    <PresupuestoFormContent
      context={context}
      surgeryId={surgeryId}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

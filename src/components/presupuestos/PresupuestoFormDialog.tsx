"use client"

import React, { useEffect, useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useOrtoTrackStore } from "@/lib/store"
import { usePresupuestoForm } from "@/hooks/usePresupuestoForm"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { DatosComercialesSection } from "./DatosComercialesSection"
import { CondicionesSection } from "./CondicionesSection"
import { PresupuestoItemsTable } from "./PresupuestoItemsTable"
import { TotalesSection } from "./TotalesSection"
import type { Surgery } from "@/types"
import { buildEstimativePresupuestoPayload, type PresupuestoApiRow } from "@/lib/api/presupuestos"
import { Receipt } from "lucide-react"
import { toast } from "sonner"

// ─── Types ───

export type PresupuestoFormMode = "dialog" | "inline"
export type PresupuestoFormContext = "surgery" | "independent"

export interface PresupuestoFormDialogProps {
  mode: PresupuestoFormMode
  context: PresupuestoFormContext
  surgeryId?: string           // Required if context="surgery"
  presupuestoId?: string       // For editing (future, not V1)
  presupuesto?: PresupuestoApiRow
  open?: boolean               // Dialog mode
  onOpenChange?: (open: boolean) => void
  onSubmit?: (presupuesto: PresupuestoApiRow) => void
  onCancel?: () => void
}

// ─── Form Content (shared between dialog and inline) ───

interface FormContentProps {
  context: PresupuestoFormContext
  surgeryId?: string
  presupuesto?: PresupuestoApiRow
  onSubmit: (presupuesto: PresupuestoApiRow) => void
  onCancel?: () => void
}

function PresupuestoFormContent({ context, surgeryId, presupuesto, onSubmit, onCancel }: FormContentProps) {
  const store = useOrtoTrackStore()
  const presupuestoApi = usePresupuestos({ take: 100 })
  const [saving, setSaving] = useState(false)
  const surgery = surgeryId ? store.getSurgeryById(surgeryId) : undefined
  const linkedSurgeryIds = new Set(presupuestoApi.presupuestos.map((item) => item.surgeryId).filter(Boolean))
  const availableSurgeries = presupuestoApi.error ? [] : store.surgeries.filter(
    (s) => !linkedSurgeryIds.has(s.backendId ?? s.id) && s.state !== "Cancelada" && s.state !== "Suspendida"
  )

  const initialData = useMemo(() => presupuesto ? {
    branchId: presupuesto.branchId ?? "",
    clientContactId: presupuesto.clientContactId ?? "",
    payerContactId: presupuesto.payerContactId ?? "",
    concepto: presupuesto.title ?? "",
    fechaEmision: presupuesto.documentDate?.slice(0, 10) ?? "",
    vigencia: presupuesto.documentDate && presupuesto.validUntil
      ? `${Math.max(1, Math.round((new Date(presupuesto.validUntil).getTime() - new Date(presupuesto.documentDate).getTime()) / 86_400_000))} días`
      : "30 días",
    listaPrecios: presupuesto.priceListCode ?? "",
    condicionPago: presupuesto.paymentTerms ?? "",
    descuento: Number(presupuesto.generalDiscountRate),
    items: presupuesto.items.map((item) => ({
      code: item.sku ?? "",
      name: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountRate),
      catalogItemId: "",
      isArticuloLibre: true,
      descripcionLibre: item.description,
      ivaKey: item.taxRate,
      codeResolved: false,
    })),
    observaciones: presupuesto.notes ?? "",
    surgeryId: presupuesto.surgeryId ?? undefined,
  } : undefined, [presupuesto])

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
  } = usePresupuestoForm(initialData)

  // Auto-populate from surgery when context is surgery
  useEffect(() => {
    if (context === "surgery" && surgery) {
      populateFromSurgery(surgery)
    }
  }, [context, surgery, populateFromSurgery])

  const handleSurgerySelect = useCallback((selectedSurgery: Surgery) => {
    populateFromSurgery(selectedSurgery)
  }, [populateFromSurgery])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    const selectedSurgeryId = context === "surgery" ? surgeryId : formData.surgeryId
    const selectedSurgery = selectedSurgeryId ? store.getSurgeryById(selectedSurgeryId) : undefined
    setSaving(true)
    try {
      const payload = buildEstimativePresupuestoPayload(formData, items)
      const saved = presupuesto
        ? await presupuestoApi.replaceDraft(presupuesto.id, { ...payload, expectedRevision: presupuesto.revision })
        : await presupuestoApi.create({ ...payload, surgeryId: selectedSurgery?.backendId ?? selectedSurgeryId })
      resetForm()
      onSubmit(saved)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo crear el presupuesto")
    } finally {
      setSaving(false)
    }
  }, [validate, context, surgeryId, formData, store, presupuestoApi, items, presupuesto, resetForm, onSubmit])

  return (
    <div className="space-y-6">
      {presupuestoApi.error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{presupuestoApi.error}</p>}
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
        <Button size="sm" onClick={() => void handleSubmit()} disabled={saving}>
          <Receipt className="size-3.5 mr-1.5" />
          {saving ? "Guardando…" : "Guardar presupuesto"}
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
  presupuesto,
  open,
  onOpenChange,
  onSubmit,
  onCancel,
}: PresupuestoFormDialogProps) {
  const handleSubmit = useCallback((presupuesto: PresupuestoApiRow) => {
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
              {presupuestoId || presupuesto ? "Editar Presupuesto" : "Nuevo Presupuesto"}
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
            presupuesto={presupuesto}
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
      presupuesto={presupuesto}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

"use client"

import React, { useEffect, useLayoutEffect, useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { useOrtoTrackStore } from "@/lib/store"
import { usePresupuestoForm } from "@/hooks/usePresupuestoForm"
import { DatosComercialesSection } from "./DatosComercialesSection"
import { CondicionesSection } from "./CondicionesSection"
import { PresupuestoItemsTable } from "./PresupuestoItemsTable"
import { TotalesSection } from "./TotalesSection"
import {
  buildEstimativePresupuestoPayload,
  buildPresupuestoEditPayload,
  fetchPresupuesto,
  toPresupuestoEditFormData,
  createPresupuesto,
  replacePresupuestoDraft,
  toLegacyPresupuestoProjection,
  type PresupuestoApiRow,
} from "@/lib/api/presupuestos"
import { ApiClientError } from "@/lib/api/client"
import type { Presupuesto, Surgery } from "@/types"
import { Receipt, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ─── Types ───

export type PresupuestoFormMode = "dialog" | "inline"
export type PresupuestoFormContext = "surgery" | "independent"

export interface PresupuestoFormDialogProps {
  mode: PresupuestoFormMode
  context: PresupuestoFormContext
  surgeryId?: string           // Required if context="surgery"
  presupuestoId?: string       // For editing
  open?: boolean               // Dialog mode
  onOpenChange?: (open: boolean) => void
  onSubmit?: (presupuesto: Presupuesto) => void
  onCancel?: () => void
}

// ─── Form Content (shared between dialog and inline) ───

interface FormContentProps {
  context: PresupuestoFormContext
  surgeryId?: string
  presupuestoId?: string
  onSubmit: (presupuesto: Presupuesto) => void
  onCancel?: () => void
}

function PresupuestoFormContent({ context, surgeryId, presupuestoId, onSubmit, onCancel }: FormContentProps) {
  const { activeCompany } = useAuth()
  const store = useOrtoTrackStore()
  const surgery = surgeryId ? store.getSurgeryById(surgeryId) : undefined
  const availableSurgeries = store.surgeries.filter(
    (s) => !s.presupuestoId && s.state !== "Cancelada" && s.state !== "Suspendida"
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [persistedDraft, setPersistedDraft] = useState<PresupuestoApiRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const alive = useRef(true)
  const submitting = useRef(false)

  const {
    formData,
    setFormData,
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

  useLayoutEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if (!presupuestoId || !activeCompany?.id) return
    let active = true
    void fetchPresupuesto(activeCompany.id, presupuestoId).then((row) => {
      if (!active) return
      if (row.state !== "Borrador") { setFormError("Este presupuesto ya no es un borrador editable."); return }
      setFormData((previous) => ({ ...previous, ...toPresupuestoEditFormData(row) }))
      setPersistedDraft(row)
    }).catch((cause: unknown) => {
      if (active) setFormError(cause instanceof Error ? cause.message : "No se pudo cargar el borrador")
    })
    return () => { active = false }
  }, [activeCompany?.id, presupuestoId, setFormData])

  // Auto-populate from surgery when context is surgery
  useEffect(() => {
    if (!presupuestoId && context === "surgery" && surgery) {
      populateFromSurgery(surgery)
    }
  }, [context, surgery, populateFromSurgery, presupuestoId])

  const handleSurgerySelect = useCallback((selectedSurgery: Surgery) => {
    populateFromSurgery(selectedSurgery)
  }, [populateFromSurgery])

  const handleSubmit = async () => {
    if (submitting.current || conflict || (presupuestoId && !persistedDraft)) return
    if (!validate()) return
    if (!activeCompany?.id) {
      toast.error("No hay una empresa activa seleccionada")
      return
    }

    submitting.current = true
    setIsSubmitting(true)
    setFormError(null)
    try {
      const payload = buildEstimativePresupuestoPayload(formData, items)

      let resultRow
      if (presupuestoId) {
        resultRow = await replacePresupuestoDraft(activeCompany.id, presupuestoId, buildPresupuestoEditPayload(persistedDraft!, formData, items))
      } else {
        const selectedId = context === "surgery" ? surgeryId : formData.surgeryId
        const selected = selectedId ? store.surgeries.find((entry) => entry.id === selectedId || entry.backendId === selectedId) : undefined
        const targetSurgeryId = selected?.backendId?.trim()
        if (selectedId && !targetSurgeryId) throw new Error("La cirugía seleccionada no tiene identidad backend. Seleccione una cirugía persistida.")
        resultRow = await createPresupuesto(activeCompany.id, {
          ...payload,
          surgeryId: targetSurgeryId,
        })
      }

      if (!alive.current) return
      toast.success(presupuestoId ? "Borrador de presupuesto actualizado" : "Presupuesto guardado exitosamente en el servidor")
      const legacy = toLegacyPresupuestoProjection(resultRow)
      resetForm()
      onSubmit(legacy)
    } catch (cause) {
      if (!alive.current) return
      const changed = cause instanceof ApiClientError && cause.status === 409
      setConflict(changed)
      const msg = cause instanceof Error ? cause.message : "Error al guardar el presupuesto"
      setFormError(changed ? "El presupuesto cambió en el servidor. Conservamos sus cambios; cierre y vuelva a abrir la edición para revisar la versión actual." : msg)
      toast.error(msg)
    } finally {
      submitting.current = false
      if (alive.current) setIsSubmitting(false)
    }
  }

  if (presupuestoId && !persistedDraft) return <div className="space-y-3">
    <p role={formError ? "alert" : "status"}>{formError ?? "Cargando borrador persistido…"}</p>
    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
  </div>

  return (
    <div className="space-y-6">
      {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
      <fieldset disabled={isSubmitting} className="space-y-6">
      {/* Section 1: Datos Comerciales */}
      <DatosComercialesSection
        formData={formData}
        updateField={updateField}
        errors={errors}
        context={presupuestoId ? "surgery" : context}
        surgery={surgery}
        surgeries={!presupuestoId && context === "independent" ? availableSurgeries : undefined}
        onSurgerySelect={!presupuestoId && context === "independent" ? handleSurgerySelect : undefined}
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

      </fieldset>

      {/* Actions bar */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || conflict}>
          {isSubmitting ? (
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <Receipt className="size-3.5 mr-1.5" />
          )}
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
  const { activeCompany } = useAuth()
  const formKey = JSON.stringify([activeCompany?.id, context, surgeryId, presupuestoId])
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
            key={formKey}
            context={context}
            surgeryId={surgeryId}
            presupuestoId={presupuestoId}
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
      key={formKey}
      context={context}
      surgeryId={surgeryId}
      presupuestoId={presupuestoId}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

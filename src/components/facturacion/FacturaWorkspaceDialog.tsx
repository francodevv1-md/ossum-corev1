"use client"

import React, { useState } from "react"
import { FileText, Loader2, Save, Send, HelpCircle, ShieldAlert, Truck, FileCheck, MessageSquare } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { useInvoiceForm } from "@/hooks/useInvoiceForm"
import { InvoiceHeaderCompact } from "@/components/facturacion/InvoiceHeaderCompact"
import { InvoiceItemsTable } from "@/components/facturacion/InvoiceItemsTable"
import { InvoiceStickySummary } from "@/components/facturacion/InvoiceStickySummary"
import { createInvoiceDraft, type CreateInvoicePayload, type InvoiceApiRow } from "@/lib/api/invoices"
import type { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries"

interface FacturaWorkspaceDialogProps {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  surgeries: Awaited<ReturnType<typeof fetchBackendActiveSurgeries>>
  onCreated: (invoice: InvoiceApiRow) => void
}

export function FacturaWorkspaceDialog({
  companyId,
  open,
  onOpenChange,
  surgeries,
  onCreated,
}: FacturaWorkspaceDialogProps) {
  const {
    formData,
    errors,
    totals,
    updateField,
    addItem,
    removeItem,
    updateItem,
    resetForm,
    validate,
    toApiPayload,
  } = useInvoiceForm()

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSaveDraft = async () => {
    setSubmitError(null)
    if (!companyId) {
      setSubmitError("No hay empresa activa seleccionada.")
      return
    }

    const isValid = validate()
    if (!isValid) {
      toast.error("Revisá los errores en la grilla de artículos")
      return
    }

    const payload = toApiPayload()
    setSubmitting(true)
    try {
      const created = await createInvoiceDraft(companyId, payload)
      toast.success("Factura borrador creada exitosamente")
      onCreated(created)
      onOpenChange(false)
      resetForm()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "No se pudo guardar la factura"
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-h-[96vh] h-[94vh] w-[98vw] sm:max-w-[1500px] xl:max-w-[1700px] flex flex-col p-3.5 sm:p-4 overflow-hidden"
      >
        <DialogHeader className="pb-2 border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <FileText className="size-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                Nueva Factura Operativa
              </DialogTitle>

              {/* Estado Operativo */}
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Borrador operativo
              </span>

              {/* Estado Fiscal DEV */}
              <span className="text-[10px] font-semibold tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full">
                Fiscal DEV: Sin solicitar
              </span>

              {/* Tooltip (?) Reusable Library Component */}
              <InfoTooltip
                title="Factura Operativa (DEV / Interna)"
                description="Carga ágil estilo planilla con catálogo backend, cálculo automático de IVA y navegación rápida con teclado."
                shortcuts={[
                  { key: "Tab / Enter", label: "Navegar celdas" },
                  { key: "F2", label: "Catálogo backend" },
                ]}
                side="right"
              />
            </div>
          </div>
        </DialogHeader>

        {submitError ? (
          <div className="bg-destructive/10 border border-destructive/30 px-3 py-2 rounded text-xs text-destructive font-medium">
            {submitError}
          </div>
        ) : null}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {/* Header Compact Section */}
          <InvoiceHeaderCompact
            formData={formData}
            updateField={updateField}
            surgeries={surgeries}
          />

          {/* Densa Excel-like Grid Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Ítems / Detalle de Factura
              </span>
              <span className="text-[11px] text-muted-foreground">
                Navegación: <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Tab</kbd> / <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Enter</kbd>
              </span>
            </div>

            <InvoiceItemsTable
              companyId={companyId}
              items={formData.items}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              errors={errors}
              workspace
            />
          </div>

          {/* ─── Banda Inferior Compacta: Condiciones / Entrega / Obs + Resumen Sticky ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
            {/* Banda Colapsable de Solapas (Izquierda) */}
            <div className="lg:col-span-7 xl:col-span-8">
              <Tabs defaultValue="commercial" className="w-full">
                <TabsList className="h-8 w-full justify-start bg-slate-200/80 dark:bg-slate-800/80 p-0.5 border border-slate-300 dark:border-slate-700/80">
                  <TabsTrigger value="commercial" className="text-xs font-semibold px-3 py-1 data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                    <FileCheck className="size-3.5 mr-1 text-primary" /> Condiciones comerciales
                  </TabsTrigger>
                  <TabsTrigger value="delivery" className="text-xs font-semibold px-3 py-1 data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                    <Truck className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Entrega / Origen
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs font-semibold px-3 py-1 data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                    <MessageSquare className="size-3.5 mr-1 text-amber-600 dark:text-amber-400" /> Observaciones
                  </TabsTrigger>
                </TabsList>

                <div className="rounded-lg border border-slate-300/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-3 mt-1.5 shadow-2xs">
                  {/* Tab 1: Condiciones Comerciales */}
                  <TabsContent value="commercial" className="m-0 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="tab-payment-condition" className="text-[11px] font-semibold text-muted-foreground">
                          Condición de Pago
                        </Label>
                        <Input
                          id="tab-payment-condition"
                          value={formData.paymentCondition}
                          onChange={(e) => updateField("paymentCondition", e.target.value)}
                          placeholder="Ej. Cuenta Corriente 30 días"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tab-percepciones" className="text-[11px] font-semibold text-muted-foreground">
                          Percepciones / Impuestos Adicionales ($)
                        </Label>
                        <Input
                          id="tab-percepciones"
                          type="number"
                          min={0}
                          step="0.01"
                          value={formData.percepciones || ""}
                          onChange={(e) => updateField("percepciones", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-8 text-xs font-mono bg-background"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Entrega / Origen */}
                  <TabsContent value="delivery" className="m-0 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="tab-delivery-address" className="text-[11px] font-semibold text-muted-foreground">
                          Dirección / Punto de Entrega
                        </Label>
                        <Input
                          id="tab-delivery-address"
                          value={formData.deliveryAddress || ""}
                          onChange={(e) => updateField("deliveryAddress", e.target.value)}
                          placeholder="Ej. Hospital Central / Quirófano 4"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tab-reference" className="text-[11px] font-semibold text-muted-foreground">
                          Referencia Interna / Orden de Compra
                        </Label>
                        <Input
                          id="tab-reference"
                          value={formData.reference}
                          onChange={(e) => updateField("reference", e.target.value)}
                          placeholder="Ej. OC-2026-904"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Observaciones */}
                  <TabsContent value="notes" className="m-0 space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="tab-observations" className="text-[11px] font-semibold text-muted-foreground">
                        Leyenda u Observación al pie del Comprobante
                      </Label>
                      <textarea
                        id="tab-observations"
                        value={formData.observations}
                        onChange={(e) => updateField("observations", e.target.value)}
                        placeholder="Texto que figurará en el pie de la factura impresa..."
                        className="w-full h-14 p-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Resumen Sticky Estructurado (Derecha) */}
            <div className="lg:col-span-5 xl:col-span-4">
              <InvoiceStickySummary
                totals={totals}
                currency={formData.currency}
                layout="card"
              />
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting}
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar borrador
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

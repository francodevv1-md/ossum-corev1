"use client"

import React, { useState, useMemo, useEffect } from "react"
import { ArrowLeft, FileText, Loader2, Save, Send, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { useInvoiceForm, DEFAULT_INVOICE_FORM_DATA } from "@/hooks/useInvoiceForm"
import { InvoiceHeaderCompact } from "@/components/facturacion/InvoiceHeaderCompact"
import { InvoiceItemsTable } from "@/components/facturacion/InvoiceItemsTable"
import { InvoiceStickySummary } from "@/components/facturacion/InvoiceStickySummary"
import { createInvoiceDraft } from "@/lib/api/invoices"
import { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries"
import { FileCheck, Truck, MessageSquare } from "lucide-react"

export function InvoiceWorkspace() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

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
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [surgeries, setSurgeries] = useState<Awaited<ReturnType<typeof fetchBackendActiveSurgeries>>>([])

  useEffect(() => {
    if (!companyId) return
    let active = true
    void fetchBackendActiveSurgeries(companyId)
      .then((rows) => {
        if (active) setSurgeries(rows)
      })
      .catch(() => {
        if (active) setSurgeries([])
      })
    return () => {
      active = false
    }
  }, [companyId])

  const isDirty = useMemo(() => {
    const hasItems = formData.items.some(
      (item) => item.code.trim() || item.description.trim() || item.unitPrice > 0
    )
    const hasClient = Boolean(formData.clientName.trim() || formData.clientTaxId.trim())
    const hasReference = Boolean(formData.reference.trim() || formData.observations.trim())
    return hasItems || hasClient || hasReference
  }, [formData])

  const handleBack = () => {
    if (isDirty) {
      setPendingNavigation("/ventas/facturacion")
      setLeaveDialogOpen(true)
    } else {
      router.push("/ventas/facturacion")
    }
  }

  const handleConfirmLeave = () => {
    setLeaveDialogOpen(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
    } else {
      router.push("/ventas/facturacion")
    }
  }

  const handleSaveDraft = async () => {
    setSubmitError(null)
    if (!companyId) {
      setSubmitError("No hay empresa activa seleccionada.")
      toast.error("Seleccioná una empresa activa para continuar.")
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
      router.push("/ventas/facturacion")
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "No se pudo guardar la factura"
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3 pb-16"
    >
      {/* ─── Encabezado de Navegación y Contexto ─── */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="h-8 gap-1.5 text-xs font-semibold hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" />
            <span>Facturación</span>
          </Button>

          <div className="h-4 w-px bg-border/80" />

          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <FileText className="size-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Nueva Factura Operativa
            </h1>
          </div>

          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 px-2 py-0.5 rounded-full">
            Borrador operativo
          </Badge>

          <Badge variant="outline" className="text-[10px] font-semibold tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 px-2 py-0.5 rounded-full">
            Fiscal DEV: Sin solicitar
          </Badge>

          <InfoTooltip
            title="Workspace de Facturación Operativa"
            description="Carga ágil estilo planilla con catálogo backend, cálculo automático de IVA y navegación rápida por teclado."
            shortcuts={[
              { key: "Tab / Enter", label: "Navegar celdas" },
              { key: "F2", label: "Catálogo backend" },
            ]}
            side="right"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={submitting}
            className="h-8 text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSaveDraft}
            disabled={submitting}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar borrador
          </Button>
        </div>
      </div>

      {submitError ? (
        <div className="bg-destructive/10 border border-destructive/30 px-3 py-2 rounded text-xs text-destructive font-medium">
          {submitError}
        </div>
      ) : null}

      {/* ─── Encabezado Comercial Compacto ─── */}
      <InvoiceHeaderCompact
        formData={formData}
        updateField={updateField}
        surgeries={surgeries}
      />

      {/* ─── Grilla Principal de Artículos / Excel-like Grid ─── */}
      <div className="space-y-1 rounded-lg border bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between px-0.5 pb-1">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Ítems / Detalle del Comprobante
          </span>
          <span className="text-[11px] text-muted-foreground">
            Navegación: <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Tab</kbd> / <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Enter</kbd>
          </span>
        </div>

        {companyId ? (
          <InvoiceItemsTable
            companyId={companyId}
            items={formData.items}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            errors={errors}
          />
        ) : null}
      </div>

      {/* ─── Banda Inferior: Solapas Compactas + Resumen Sticky ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
        {/* Banda Colapsable de Solapas (Izquierda en desktop) */}
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
                    <Label htmlFor="ws-payment-condition" className="text-[11px] font-semibold text-muted-foreground">
                      Condición de Pago
                    </Label>
                    <Input
                      id="ws-payment-condition"
                      value={formData.paymentCondition}
                      onChange={(e) => updateField("paymentCondition", e.target.value)}
                      placeholder="Ej. Cuenta Corriente 30 días"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ws-percepciones" className="text-[11px] font-semibold text-muted-foreground">
                      Percepciones / Impuestos Adicionales ($)
                    </Label>
                    <Input
                      id="ws-percepciones"
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
                    <Label htmlFor="ws-delivery-address" className="text-[11px] font-semibold text-muted-foreground">
                      Dirección / Punto de Entrega
                    </Label>
                    <Input
                      id="ws-delivery-address"
                      value={formData.deliveryAddress || ""}
                      onChange={(e) => updateField("deliveryAddress", e.target.value)}
                      placeholder="Ej. Hospital Central / Quirófano 4"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ws-reference" className="text-[11px] font-semibold text-muted-foreground">
                      Referencia Interna / Orden de Compra
                    </Label>
                    <Input
                      id="ws-reference"
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
                  <Label htmlFor="ws-observations" className="text-[11px] font-semibold text-muted-foreground">
                    Leyenda u Observación al pie del Comprobante
                  </Label>
                  <textarea
                    id="ws-observations"
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

        {/* Resumen Sticky Estructurado (Derecha en desktop) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <InvoiceStickySummary
            totals={totals}
            currency={formData.currency}
            layout="card"
          />
        </div>
      </div>

      {/* ─── Footer Fijo de Acciones ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-lg flex items-center justify-between sm:justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={submitting}
          className="h-8 text-xs"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          onClick={handleSaveDraft}
          disabled={submitting}
          className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs px-4"
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Guardar borrador
        </Button>
      </div>

      {/* Dialog de Confirmación de Descarte de Cambios */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              ¿Descartar cambios sin guardar?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1 leading-relaxed">
              Tenés datos cargados en esta factura que se perderán si salís del formulario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeaveDialogOpen(false)}
              className="text-xs"
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmLeave}
              className="text-xs"
            >
              Descartar y salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

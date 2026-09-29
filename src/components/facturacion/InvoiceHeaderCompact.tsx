"use client"

import React, { useState } from "react"
import {
  Building2,
  Calendar,
  CreditCard,
  Hash,
  Activity,
  DollarSign,
  Bookmark,
  Search,
  X,
  MapPin,
  Mail,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  Layers,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import type { InvoiceFormData } from "@/hooks/useInvoiceForm"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ContactSearchModal } from "@/components/contactos/ContactSearchModal"
import { InvoiceSurgeryLinkModal } from "@/components/facturacion/InvoiceSurgeryLinkModal"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { formatDate } from "@/lib/formatters"
import type { Contacto, Surgery } from "@/types"

interface InvoiceHeaderCompactProps {
  formData: InvoiceFormData
  updateField: <K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) => void
  surgeries: Surgery[]
}

const INVOICE_TYPES = [
  { value: "FV", label: "FV · Factura de Venta Operativa", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  { value: "FA", label: "FA · Factura A (Resp. Inscripto)", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  { value: "FB", label: "FB · Factura B (Cons. Final)", badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" },
  { value: "FC", label: "FC · Factura C (Exento/Mono)", badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20" },
  { value: "ND", label: "ND · Nota de Débito", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  { value: "NC", label: "NC · Nota de Crédito", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
]

const PAYMENT_CONDITIONS = [
  "Contado",
  "Cuenta Corriente 30 días",
  "Cuenta Corriente 60 días",
  "Transferencia Bancaria",
  "Cheque a 30 días",
  "Contra Entrega",
]

const VAT_CONDITIONS = [
  "IVA Responsable Inscripto",
  "IVA Sujeto Exento",
  "Consumidor Final",
  "Responsable Monotributo",
  "Proveedor del Exterior",
  "Cliente del Exterior",
]

export function InvoiceHeaderCompact({ formData, updateField, surgeries }: InvoiceHeaderCompactProps) {
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [surgeryModalOpen, setSurgeryModalOpen] = useState(false)
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false)
  const [showOverrides, setShowOverrides] = useState(false)

  const { openExpediente } = useExpedienteDrawer()

  const currentType = INVOICE_TYPES.find((t) => t.value === formData.type) || INVOICE_TYPES[0]

  // Find linked surgery if any
  const linkedSurgery = formData.surgeryId
    ? surgeries.find((s) => s.backendId === formData.surgeryId || s.id === formData.surgeryId)
    : null

  const handleSelectContact = (contact: Contacto) => {
    updateField("clientContactId", contact.id)
    updateField("clientName", contact.razonSocial || contact.nombre)
    updateField("clientTaxId", contact.cuit || contact.dni || "")
    if (contact.datosClientePagador?.condicionIva) {
      updateField("clientVatCondition", contact.datosClientePagador.condicionIva)
    } else if (contact.cuit) {
      updateField("clientVatCondition", "IVA Responsable Inscripto")
    }
    if (contact.domicilio) {
      updateField("clientAddress", contact.domicilio)
    }
    if (contact.email) {
      updateField("clientEmail", contact.email)
    }
    if (contact.datosClientePagador?.condicionPago) {
      updateField("paymentCondition", contact.datosClientePagador.condicionPago)
    }
  }

  const handleClearContact = () => {
    updateField("clientContactId", "")
    updateField("clientName", "")
    updateField("clientTaxId", "")
    updateField("clientVatCondition", "IVA Responsable Inscripto")
    updateField("clientAddress", "")
    updateField("clientEmail", "")
  }

  const handleSelectSurgery = (surgery: Surgery) => {
    const surgeryId = surgery.backendId || surgery.id
    updateField("surgeryId", surgeryId)

    // Autocomplete client if blank
    if (!formData.clientName.trim()) {
      const targetClient = surgery.obraSocial || surgery.client || surgery.patient
      if (targetClient) {
        updateField("clientName", targetClient)
      }
    }

    // Autocomplete reference if blank
    if (!formData.reference.trim()) {
      const cxCode = surgery.visibleNumber || surgery.id
      updateField("reference", `Cirugía ${cxCode} · ${surgery.patient}`)
    }

    // Autocomplete delivery address if blank and institution exists
    if (!formData.deliveryAddress?.trim() && surgery.institution) {
      updateField("deliveryAddress", surgery.institution)
    }
  }

  const handleUnlinkClick = () => {
    const hasItems = formData.items.some(
      (item) => item.code.trim() || item.description.trim() || item.unitPrice > 0
    )
    if (hasItems) {
      setUnlinkDialogOpen(true)
    } else {
      updateField("surgeryId", "")
    }
  }

  const handleConfirmUnlink = () => {
    updateField("surgeryId", "")
    setUnlinkDialogOpen(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-slate-300/80 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 p-3 shadow-xs space-y-3"
    >
      {/* ─── Nivel 1: Origen Operativo + Cliente / Facturar A + Tipo Comprobante ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Bloque 1: ORIGEN OPERATIVO (Cirugía vs. Venta Directa) */}
        <div className="lg:col-span-4 space-y-1.5 bg-background/80 dark:bg-background/40 p-2 rounded-lg border border-border/70 shadow-2xs">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ORIGEN OPERATIVO
            </Label>
            {linkedSurgery ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold uppercase">
                Cirugía Vinculada
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-semibold uppercase">
                Venta Directa
              </Badge>
            )}
          </div>

          {linkedSurgery ? (
            /* Estado Vinculado: Badge de Cirugía + Ver Expediente + Desvincular */
            <div className="flex items-center gap-1.5 flex-wrap">
              <div
                className="flex-1 min-w-[160px] flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-950 dark:text-emerald-200 truncate"
                title={`${linkedSurgery.visibleNumber || linkedSurgery.id} · ${linkedSurgery.patient} (${linkedSurgery.institution || "Sin institución"})`}
              >
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-mono font-bold">{linkedSurgery.visibleNumber || linkedSurgery.id}</span>
                <span className="text-emerald-700/60 dark:text-emerald-400/60">·</span>
                <span className="truncate">{linkedSurgery.patient}</span>
                {linkedSurgery.date ? (
                  <>
                    <span className="text-emerald-700/60 dark:text-emerald-400/60">·</span>
                    <span className="text-[11px] font-normal text-emerald-800 dark:text-emerald-300 shrink-0">
                      {formatDate(linkedSurgery.date)}
                    </span>
                  </>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openExpediente(linkedSurgery.id || linkedSurgery.backendId!)}
                className="h-7 px-2 text-xs font-medium gap-1 bg-background hover:bg-muted shrink-0"
                title="Abrir expediente completo de la cirugía"
              >
                <ExternalLink className="size-3" />
                <span className="hidden sm:inline">Ver expediente</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUnlinkClick}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="Desvincular cirugía"
                aria-label="Desvincular cirugía"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            /* Estado No Vinculado: Venta Directa + Botón Vincular Cirugía */
            <div className="flex items-center gap-2">
              <div className="flex-1 px-2.5 py-1 rounded-md bg-muted/60 border border-dashed border-border/80 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                <span className="size-2 rounded-full bg-slate-400 shrink-0" />
                <span className="truncate font-medium">Sin cirugía vinculada</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSurgeryModalOpen(true)}
                className="h-7.5 px-2.5 text-xs font-semibold gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shrink-0 shadow-2xs"
              >
                <Activity className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Vincular cirugía</span>
              </Button>
            </div>
          )}
        </div>

        {/* Bloque 2: CLIENTE / OBRA SOCIAL / INSTITUCIÓN */}
        <div className="lg:col-span-5 space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="invoice-client-name" className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5 text-primary" />
              Cliente / Obra Social / Institución
              <span className="text-destructive font-bold">*</span>
            </Label>
            <div className="flex items-center gap-1.5">
              {formData.clientName ? (
                <button
                  type="button"
                  onClick={() => setShowOverrides(!showOverrides)}
                  className="text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>{showOverrides ? "Ocultar datos" : "Ver / Modificar datos"}</span>
                  {showOverrides ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Input
                id="invoice-client-name"
                placeholder="Buscar contacto o escribir razón social..."
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                className="h-8 text-xs font-medium bg-background/90 pr-7 focus-visible:ring-primary/40"
              />
              {formData.clientName ? (
                <button
                  type="button"
                  onClick={handleClearContact}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                  title="Limpiar cliente"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setContactSearchOpen(true)}
              className="h-8 gap-1 px-2.5 text-xs bg-background/90 font-medium hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              title="Buscar en padrón de Contactos / Obras Sociales / Instituciones"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Padrón</span>
            </Button>
          </div>
        </div>

        {/* Bloque 3: TIPO DE COMPROBANTE & CUIT */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
          {/* CUIT / DNI */}
          <div className="space-y-1">
            <Label htmlFor="invoice-client-taxid" className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Hash className="size-3.5 text-muted-foreground" />
              CUIT / DNI
            </Label>
            <Input
              id="invoice-client-taxid"
              placeholder="30-xxxxxxxx-x"
              value={formData.clientTaxId}
              onChange={(e) => updateField("clientTaxId", e.target.value)}
              className="h-8 text-xs font-mono bg-background/90 focus-visible:ring-primary/40"
            />
          </div>

          {/* Tipo de Comprobante */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="invoice-type" className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                <CreditCard className="size-3.5 text-muted-foreground" />
                Tipo
              </Label>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 font-bold uppercase ${currentType.badge}`}>
                {formData.type}
              </Badge>
            </div>
            <Select value={formData.type} onValueChange={(v) => updateField("type", v)}>
              <SelectTrigger id="invoice-type" className="h-8 text-xs bg-background/90 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── Fila Colapsable de Override / Datos Extendidos del Cliente ─── */}
      <AnimatePresence>
        {showOverrides ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-dashed border-border/80 pt-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-background/50 p-2.5 rounded-md border border-border/50">
              <div className="space-y-1">
                <Label htmlFor="invoice-vat-condition" className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3 text-primary" /> Condición IVA
                </Label>
                <Select
                  value={formData.clientVatCondition || "IVA Responsable Inscripto"}
                  onValueChange={(v) => updateField("clientVatCondition", v)}
                >
                  <SelectTrigger id="invoice-vat-condition" className="h-7 text-xs bg-background/90">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_CONDITIONS.map((cond) => (
                      <SelectItem key={cond} value={cond} className="text-xs">
                        {cond}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="invoice-client-address" className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" /> Domicilio fiscal / comercial
                </Label>
                <Input
                  id="invoice-client-address"
                  placeholder="Calle, número, localidad..."
                  value={formData.clientAddress || ""}
                  onChange={(e) => updateField("clientAddress", e.target.value)}
                  className="h-7 text-xs bg-background/90"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="invoice-client-email" className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Mail className="size-3 text-muted-foreground" /> Email de facturación
                </Label>
                <Input
                  id="invoice-client-email"
                  type="email"
                  placeholder="facturacion@cliente.com"
                  value={formData.clientEmail || ""}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  className="h-7 text-xs bg-background/90"
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ─── Separador Visual Sutil ─── */}
      <div className="h-px bg-border/60" />

      {/* ─── Nivel 2: Fechas, Condiciones Comerciales, Moneda y Referencia ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 text-xs items-center">
        {/* Fecha Emisión */}
        <div className="lg:col-span-3 space-y-1">
          <Label htmlFor="invoice-date" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="size-3 text-muted-foreground" />
            Emisión
          </Label>
          <Input
            id="invoice-date"
            type="date"
            value={formData.issueDate}
            onChange={(e) => updateField("issueDate", e.target.value)}
            className="h-7.5 text-xs bg-background/60"
          />
        </div>

        {/* Fecha Vencimiento */}
        <div className="lg:col-span-3 space-y-1">
          <Label htmlFor="invoice-due-date" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="size-3 text-amber-600 dark:text-amber-400" />
            Vencimiento
          </Label>
          <Input
            id="invoice-due-date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => updateField("dueDate", e.target.value)}
            className="h-7.5 text-xs bg-background/60"
          />
        </div>

        {/* Condición de Pago */}
        <div className="lg:col-span-3 space-y-1">
          <Label htmlFor="invoice-payment-condition" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
            Condición
          </Label>
          <Select
            value={formData.paymentCondition}
            onValueChange={(v) => updateField("paymentCondition", v)}
          >
            <SelectTrigger id="invoice-payment-condition" className="h-7.5 text-xs bg-background/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_CONDITIONS.map((cond) => (
                <SelectItem key={cond} value={cond} className="text-xs">
                  {cond}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Moneda */}
        <div className="lg:col-span-1.5 space-y-1">
          <Label htmlFor="invoice-currency" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="size-3 text-muted-foreground" />
            Moneda
          </Label>
          <Select value={formData.currency} onValueChange={(v) => updateField("currency", v)}>
            <SelectTrigger id="invoice-currency" className="h-7.5 text-xs bg-background/60 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS" className="text-xs font-semibold">ARS ($)</SelectItem>
              <SelectItem value="USD" className="text-xs font-semibold">USD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Referencia */}
        <div className="lg:col-span-1.5 space-y-1">
          <Label htmlFor="invoice-header-reference" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Bookmark className="size-3 text-muted-foreground" />
            Ref.
          </Label>
          <Input
            id="invoice-header-reference"
            placeholder="OC/Ref"
            value={formData.reference}
            onChange={(e) => updateField("reference", e.target.value)}
            className="h-7.5 text-xs bg-background/60"
          />
        </div>
      </div>

      {/* Modal para Búsqueda y Selección en Padrón de Contactos */}
      <ContactSearchModal
        open={contactSearchOpen}
        onOpenChange={setContactSearchOpen}
        context={{
          title: "Seleccionar Cliente / Obra Social / Institución",
          preferredRoles: ["cliente"],
          preferredGroups: ["obras-sociales", "instituciones"],
          allowCreate: true,
        }}
        onSelect={(contact) => {
          handleSelectContact(contact)
          setContactSearchOpen(false)
        }}
      />

      {/* Modal Accesible para Búsqueda y Vinculación de Cirugía */}
      <InvoiceSurgeryLinkModal
        open={surgeryModalOpen}
        onOpenChange={setSurgeryModalOpen}
        surgeries={surgeries}
        selectedSurgeryId={formData.surgeryId}
        onSelect={handleSelectSurgery}
      />

      {/* Dialog de Confirmación de Desvinculación de Cirugía */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              ¿Desvincular cirugía de la factura?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1 leading-relaxed">
              La factura pasará a estado de <strong className="text-foreground">Venta Directa</strong> (sin cirugía vinculada). Los ítems y montos cargados en la grilla se conservarán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnlinkDialogOpen(false)}
              className="text-xs"
            >
              Mantener vinculada
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmUnlink}
              className="text-xs"
            >
              Desvincular cirugía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

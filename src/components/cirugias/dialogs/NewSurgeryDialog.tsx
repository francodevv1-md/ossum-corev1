"use client"

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
// CHATZAI-025A.3: Popover/Command removed — replaced by ClasificacionSelectorModal
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
// CHATZAI-025A.3: CLASSIFICATIONS static import removed — now reads from store
import { PROVINCIAS_ARGENTINA, LOCALIDADES_POR_PROVINCIA } from "@/data/argentina-geography"
import { WIZARD_SEARCH_CONTEXTS } from "@/lib/contacts.constants"
import { getClienteByName, suggestIvaKey } from "@/data/mock-clientes"
import { ContactLookupField } from "@/components/contactos/ContactLookupField"
import { useOrtoTrackStore } from "@/lib/store"
import { ReferenciasAdministrativasEditor } from "@/components/cirugias/ReferenciasAdministrativasEditor"
import { CondicionesSection } from "@/components/presupuestos/CondicionesSection"
import { PresupuestoItemsTable } from "@/components/presupuestos/PresupuestoItemsTable"
import { TotalesSection } from "@/components/presupuestos/TotalesSection"
import { TemplateSelector } from "@/components/presupuestos/TemplateSelector"
import { ImportSubmodal } from "@/components/presupuestos/ImportSubmodal"
import { PostCreationPanel } from "@/components/cirugias/PostCreationPanel"
import { LeyendaPresupuestoSection } from "@/components/presupuestos/LeyendaPresupuestoSection"
import { ClasificacionSelectorModal } from "@/components/presupuestos/ClasificacionSelectorModal"
import { Plus, Settings2, FileText, Info } from "lucide-react"
import type { NewSurgeryForm } from "@/lib/cirugias.types"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import type { SurgeryClassification, ReferenciaAdministrativa, PlantillaPresupuesto } from "@/types"
import type { PresupuestoFormData, PresupuestoFormErrors, FormItem } from "@/hooks/usePresupuestoForm"

// ─── Step labels (3 steps) ───
const STEP_LABELS = ["Datos del caso", "Presupuesto", "Confirmación"] as const

// ─── CHATZAI-017H: Definitive wizard sizes (hoisted as module constant) ───
// Paso 1 & 2 (Datos + Presupuesto): 88vw × 85vh — wide workspace (~10% reduction from 98×95)
// Paso 3 (Confirmación): 62vw × 65vh — compact summary (~30% smaller)
// MUST override base DialogContent's sm:max-w-lg — that class wins at sm+ breakpoint.
// Fixed dimensions: container never adjusts to content; grid/content adapts inside.
const DIALOG_SIZES: Record<number, string> = {
  0: "w-[88vw] sm:w-[88vw] max-w-[88vw] sm:max-w-[88vw] h-[85vh] max-h-[85vh]",
  1: "w-[88vw] sm:w-[88vw] max-w-[88vw] sm:max-w-[88vw] h-[85vh] max-h-[85vh]",
  2: "w-[62vw] sm:w-[62vw] max-w-[62vw] sm:max-w-[62vw] h-[65vh] max-h-[65vh]",
}

// ─── Types ───

interface NewSurgeryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wizardStep: number
  setWizardStep: (step: number) => void
  newForm: NewSurgeryForm
  setNewForm: React.Dispatch<React.SetStateAction<NewSurgeryForm>>
  createPRNow: boolean
  setCreatePRNow: (v: boolean) => void
  prForm: {
    formData: PresupuestoFormData
    updateField: <K extends keyof PresupuestoFormData>(key: K, value: PresupuestoFormData[K]) => void
    items: import("@/hooks/usePresupuestoForm").FormItem[]
    addItem: () => void
    removeItem: (idx: number) => void
    updateItem: (idx: number, updates: Partial<import("@/hooks/usePresupuestoForm").FormItem>) => void
    errors: PresupuestoFormErrors
    validate: () => boolean
    subtotal: number
    descuento: number
    descuentoMonto: number
    iva: string
    ivaPercentage: number
    ivaMonto: number
    ivaDesglose: Record<string, number>
    descuentoLineasMonto: number
    total: number
    articuloZCount: number
    articuloLibreCount: number
    resetForm: () => void
    loadTemplate: (template: PlantillaPresupuesto) => void
    addItems: (items: FormItem[]) => void
  }
  onConfirm: () => boolean
  /** CHATZAI-017E: ID of the just-created surgery (for post-creation actions) */
  createdSurgeryId?: string
  instrumentadores: string[]
}

// ─── Step 0 validation fields ───
interface Step0Errors {
  patient?: string
  surgeon?: string
  institution?: string
  client?: string
  classification?: string
}

// ─── Step 1 (Presupuesto) validation uses same type as PR form ───
type Step1Errors = PresupuestoFormErrors

export function NewSurgeryDialog({
  open, onOpenChange, wizardStep, setWizardStep,
  newForm, setNewForm,
  createPRNow, setCreatePRNow,
  prForm,
  onConfirm, createdSurgeryId, instrumentadores,
}: NewSurgeryDialogProps) {
  // ─── CHATZAI-020: Store access for Contacto lookups ───
  const store = useOrtoTrackStore()

  // ─── Step validation errors ───
  const [step0Errors, setStep0Errors] = useState<Step0Errors>({})
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({})
  const [creationDone, setCreationDone] = useState(false)

  // ─── CHATZAI-025: Cancel confirmation state ───
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

  // ─── CHATZAI-025: Track auto-filled provincia/localidad ───
  const [autoFilledProvincia, setAutoFilledProvincia] = useState(false)
  const [autoFilledLocalidad, setAutoFilledLocalidad] = useState(false)

  // ─── Scroll container refs for scroll-to-error ───
  const step0Ref = useRef<HTMLDivElement>(null)
  const step1Ref = useRef<HTMLDivElement>(null)

  // ─── Derived: localidades based on provincia ───
  const localidades = useMemo(() => {
    if (!newForm.provincia) return []
    return LOCALIDADES_POR_PROVINCIA[newForm.provincia] ?? []
  }, [newForm.provincia])

  // ─── CHATZAI-020: Try Contacto first, then fall back to legacy mock-clientes ───
  const clientContacto = store.getContactoById(newForm.clientContactId || "")
  const clienteData = useMemo(() => {
    if (clientContacto?.datosClientePagador) {
      return {
        nombre: clientContacto.nombre,
        cuit: clientContacto.cuit || "—",
        condicionIva: clientContacto.datosClientePagador.condicionIva,
        estadoPagador: clientContacto.datosClientePagador.esPagador ? "Pagador" as const : "No pagador" as const,
      }
    }
    // Legacy fallback
    return getClienteByName(newForm.client)
  }, [newForm.clientContactId, newForm.client, clientContacto])

  // ─── CHATZAI-017J / CHATZAI-020: Auto-suggest IVA when client changes ───
  // When the user changes the client in Step 0, we auto-set the IVA in the presupuesto form.
  // This is a suggestion — the user can override it manually in Step 1.
  useEffect(() => {
    if (clienteData) {
      const suggestedIva = suggestIvaKey(clienteData.condicionIva)
      prForm.updateField("iva", suggestedIva)
    }
  }, [newForm.clientContactId, clienteData])

  // ─── Clean refs before persisting ───
  const cleanRefs = (refs: ReferenciaAdministrativa[]): ReferenciaAdministrativa[] =>
    refs.filter((r) => r.tipo || r.valor)

  // ─── Step 0 validation ───
  const validateStep0 = useCallback((): boolean => {
    const errs: Step0Errors = {}
    if (!newForm.patient.trim()) errs.patient = "Paciente es obligatorio"
    if (!newForm.surgeon.trim()) errs.surgeon = "Médico es obligatorio"
    if (!newForm.institution.trim()) errs.institution = "Institución es obligatoria"
    if (!newForm.client) errs.client = "Cliente / Pagador es obligatorio"
    if (!newForm.classification) errs.classification = "Clasificación es obligatoria"
    setStep0Errors(errs)
    return Object.keys(errs).length === 0
  }, [newForm])

  // ─── Step 1 (Presupuesto) validation ───
  const validateStep1 = useCallback((): boolean => {
    if (!createPRNow) return true // "Sin presupuesto" → no validation needed

    const errs: Step1Errors = {}
    if (!prForm.formData.fechaEmision) errs.fechaEmision = "Fecha emisión es obligatoria"
    if (!prForm.formData.vigencia) errs.vigencia = "Vigencia es obligatoria"
    if (!prForm.formData.listaPrecios) errs.listaPrecios = "Lista de precios es obligatoria"
    if (prForm.items.length === 0) {
      errs.items = "Debe agregar al menos un artículo"
    } else {
      const itemErrs: string[] = []
      prForm.items.forEach((item, idx) => {
        if (!item.name.trim()) itemErrs.push(`Art. ${idx + 1}: nombre requerido`)
        if (item.unitPrice <= 0) itemErrs.push(`Art. ${idx + 1}: precio > 0`)
      })
      if (itemErrs.length > 0) errs.items = itemErrs.join("; ")
    }
    setStep1Errors(errs)
    return Object.keys(errs).length === 0
  }, [createPRNow, prForm])

  // ─── Scroll to first error element ───
  const scrollToFirstError = useCallback((containerRef: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) {
        // Fallback: search entire document
        const firstError = document.querySelector('[data-error="true"], .border-destructive, .border-b-destructive')
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const input = firstError.querySelector('input, select, textarea') as HTMLElement | null
          input?.focus()
        }
        return
      }
      const firstError = container.querySelector('[data-error="true"], .border-destructive, .border-b-destructive, .ring-destructive')
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const input = firstError.querySelector('input, select, textarea') as HTMLElement | null
        input?.focus()
      }
    })
  }, [])

  // ─── Handle "Siguiente" with validation ───
  const handleNext = useCallback(() => {
    if (wizardStep === 0) {
      if (!validateStep0()) {
        scrollToFirstError(step0Ref)
        return
      }
      setWizardStep(1)
    } else if (wizardStep === 1) {
      if (!validateStep1()) {
        scrollToFirstError(step1Ref)
        return
      }
      setWizardStep(2)
    }
  }, [wizardStep, validateStep0, validateStep1, setWizardStep, scrollToFirstError])

  // ─── CHATZAI-025: Check if form is dirty (has any user-entered data) ───
  const isFormDirty = useMemo(() => {
    const empty = EMPTY_NEW_FORM
    return (
      newForm.patient !== empty.patient ||
      newForm.surgeon !== empty.surgeon ||
      newForm.institution !== empty.institution ||
      newForm.client !== empty.client ||
      newForm.classification !== empty.classification ||
      newForm.provincia !== empty.provincia ||
      newForm.localidad !== empty.localidad ||
      newForm.vendedor !== empty.vendedor ||
      newForm.instrumentador !== empty.instrumentador ||
      newForm.coordinadorCx !== empty.coordinadorCx ||
      newForm.date !== empty.date ||
      newForm.time !== empty.time ||
      newForm.probableDate !== empty.probableDate ||
      newForm.fechaEnvioMaterial !== empty.fechaEnvioMaterial ||
      newForm.urgente !== empty.urgente ||
      newForm.leyenda !== empty.leyenda ||
      newForm.leyendaDestacada !== empty.leyendaDestacada ||
      newForm.notes !== empty.notes ||
      newForm.referenciasAdministrativas.length > 0 ||
      !!newForm.clientContactId ||
      !!newForm.surgeonContactId ||
      !!newForm.patientContactId ||
      !!newForm.institutionContactId ||
      !!newForm.vendedorContactId ||
      !!newForm.instrumentadorContactId ||
      !!newForm.coordinadorContactId
    )
  }, [newForm])

  // ─── Handle confirm ───
  const handleConfirm = useCallback(() => {
    const success = onConfirm()
    if (success) {
      setCreationDone(true)
    }
  }, [onConfirm])

  // ─── Reset on close ───
  const handleClose = useCallback(() => {
    onOpenChange(false)
    setWizardStep(0)
    setCreationDone(false)
    setStep0Errors({})
    setStep1Errors({})
    setCancelConfirmOpen(false)
    setAutoFilledProvincia(false)
    setAutoFilledLocalidad(false)
  }, [onOpenChange, setWizardStep])

  // ─── CHATZAI-025: Handle close with dirty check ───
  const handleRequestClose = useCallback(() => {
    if (isFormDirty && !creationDone) {
      setCancelConfirmOpen(true)
    } else {
      handleClose()
    }
  }, [isFormDirty, creationDone, handleClose])

  const dialogClass = DIALOG_SIZES[wizardStep] ?? DIALOG_SIZES[0]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { handleRequestClose() } else { onOpenChange(true) } }}>
      <DialogContent className={cn(
        dialogClass,
        "flex flex-col overflow-hidden p-0 gap-0"
      )}>
        {/* ═══════════ Compact header (always visible) ═══════════ */}
        <DialogHeader className={cn(
          "shrink-0 px-4 pt-3 pb-2 border-b",
          wizardStep === 1 && "bg-muted/30"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm">
                {creationDone ? "Cirugía creada" : "Nueva Cirugía"}
              </DialogTitle>
              {!creationDone && (
                <DialogDescription className="text-[10px]">
                  Paso {wizardStep + 1} de 3 — {STEP_LABELS[wizardStep]}
                </DialogDescription>
              )}
            </div>
            {/* Wizard progress — compact inline */}
            {!creationDone && (
              <div className="flex items-center gap-1">
                {STEP_LABELS.map((step, i) => (
                  <React.Fragment key={i}>
                    <div className={cn(
                      "flex items-center justify-center size-5 rounded-full text-[9px] font-semibold shrink-0",
                      i <= wizardStep ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </div>
                    {i < 2 && (
                      <div className={cn("w-4 h-0.5", i < wizardStep ? "bg-emerald-600" : "bg-muted")} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ═══════════ Paso 0 — Datos del caso ═══════════ */}
        {wizardStep === 0 && !creationDone && (
          <div ref={step0Ref} className="space-y-1 overflow-y-auto flex-1 px-4 py-3">

            {/* ── Section 1: Datos principales ── */}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-2">
              Datos principales
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Urgente */}
              <div className="sm:col-span-2 flex items-center gap-3">
                <Switch
                  checked={newForm.urgente}
                  onCheckedChange={(checked) => setNewForm({ ...newForm, urgente: !!checked })}
                />
                <Label className="cursor-pointer select-none" onClick={() => setNewForm({ ...newForm, urgente: !newForm.urgente })}>
                  Urgente
                </Label>
                {newForm.urgente && <Badge variant="destructive" className="text-[10px]">URGENTE</Badge>}
              </div>

              {/* Cliente / Pagador — CHATZAI-025: Moved to FIRST field after Urgente */}
              <ContactLookupField
                label="Cliente / Pagador *"
                context={WIZARD_SEARCH_CONTEXTS.client}
                value={store.getContactoById(newForm.clientContactId || "")}
                onChange={(contacto) => {
                  if (contacto) {
                    setNewForm({ ...newForm, client: contacto.nombre, clientContactId: contacto.id })
                  } else {
                    setNewForm({ ...newForm, client: "", clientContactId: undefined })
                  }
                  if (step0Errors.client) setStep0Errors({ ...step0Errors, client: undefined })
                }}
                placeholder="Buscar cliente/pagador..."
                error={step0Errors.client}
              />

              {/* Paciente — CHATZAI-020: ContactLookupField replaces free-text Input */}
              <ContactLookupField
                label="Paciente *"
                context={WIZARD_SEARCH_CONTEXTS.patient}
                value={store.getContactoById(newForm.patientContactId || "")}
                onChange={(contacto) => {
                  if (contacto) {
                    setNewForm({ ...newForm, patient: contacto.nombre, patientContactId: contacto.id })
                  } else {
                    setNewForm({ ...newForm, patient: "", patientContactId: undefined })
                  }
                  if (step0Errors.patient) setStep0Errors({ ...step0Errors, patient: undefined })
                }}
                placeholder="Buscar paciente..."
                error={step0Errors.patient}
              />

              {/* Médico — CHATZAI-020: ContactLookupField replaces free-text Input */}
              <ContactLookupField
                label="Médico *"
                context={WIZARD_SEARCH_CONTEXTS.surgeon}
                value={store.getContactoById(newForm.surgeonContactId || "")}
                onChange={(contacto) => {
                  if (contacto) {
                    setNewForm({ ...newForm, surgeon: contacto.nombre, surgeonContactId: contacto.id })
                  } else {
                    setNewForm({ ...newForm, surgeon: "", surgeonContactId: undefined })
                  }
                  if (step0Errors.surgeon) setStep0Errors({ ...step0Errors, surgeon: undefined })
                }}
                placeholder="Buscar médico..."
                error={step0Errors.surgeon}
              />

              {/* Institución — CHATZAI-025: Auto-fills provincia/localidad + allowCreate */}
              <ContactLookupField
                label="Institución *"
                context={WIZARD_SEARCH_CONTEXTS.institution}
                value={store.getContactoById(newForm.institutionContactId || "")}
                onChange={(contacto) => {
                  if (contacto) {
                    const updates: Partial<NewSurgeryForm> = {
                      institution: contacto.nombre,
                      institutionContactId: contacto.id,
                    }
                    // CHATZAI-025: Auto-fill provincia/localidad from institution if available and form fields are empty
                    if (contacto.provincia && !newForm.provincia) {
                      updates.provincia = contacto.provincia
                      setAutoFilledProvincia(true)
                    }
                    if (contacto.localidad && !newForm.localidad) {
                      updates.localidad = contacto.localidad
                      setAutoFilledLocalidad(true)
                    }
                    setNewForm({ ...newForm, ...updates })
                  } else {
                    setNewForm({ ...newForm, institution: "", institutionContactId: undefined })
                    setAutoFilledProvincia(false)
                    setAutoFilledLocalidad(false)
                  }
                  if (step0Errors.institution) setStep0Errors({ ...step0Errors, institution: undefined })
                }}
                placeholder="Buscar institución..."
                error={step0Errors.institution}
              />

              {/* Clasificación — CHATZAI-025A.3: Independent modal selector */}
              <div className="space-y-1">
                <Label className="text-xs">Clasificación *</Label>
                <ClasificacionSelectorModal
                  value={newForm.classification}
                  onSelect={(classification) => {
                    setNewForm({ ...newForm, classification })
                    if (step0Errors.classification) setStep0Errors({ ...step0Errors, classification: undefined })
                  }}
                >
                  {(openModal) => (
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "h-8 text-sm w-full justify-between font-normal",
                        step0Errors.classification && "border-destructive"
                      )}
                      onClick={openModal}
                    >
                      {newForm.classification || "Seleccionar clasificación..."}
                    </Button>
                  )}
                </ClasificacionSelectorModal>
                {step0Errors.classification && (
                  <p className="text-[10px] text-destructive mt-1">{step0Errors.classification}</p>
                )}
              </div>

              {/* Fecha CX */}
              <div className="space-y-1">
                <Label className="text-xs">Fecha CX</Label>
                <Input type="date" value={newForm.date} onChange={(e) => setNewForm({ ...newForm, date: e.target.value })} className="h-8 text-sm" />
              </div>

              {/* Hora */}
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <Input type="time" value={newForm.time} onChange={(e) => setNewForm({ ...newForm, time: e.target.value })} className="h-8 text-sm" />
              </div>

              {/* Fecha probable */}
              <div className="space-y-1">
                <Label className="text-xs">Fecha probable</Label>
                <Input type="date" value={newForm.probableDate} onChange={(e) => setNewForm({ ...newForm, probableDate: e.target.value })} className="h-8 text-sm" />
              </div>

              {/* Fecha envío material */}
              <div className="space-y-1">
                <Label className="text-xs">Fecha envío material</Label>
                <Input type="date" value={newForm.fechaEnvioMaterial} onChange={(e) => setNewForm({ ...newForm, fechaEnvioMaterial: e.target.value })} className="h-8 text-sm" />
              </div>
            </div>

            {/* ── Section 2: Ubicación y gestión ── */}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-2">
              Ubicación y gestión
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Provincia — CHATZAI-025: Shows auto indicator when auto-filled */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Provincia</Label>
                  {autoFilledProvincia && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground" title="Auto-completado desde la institución">
                      <Info className="size-2.5" /> auto
                    </span>
                  )}
                </div>
                <Select value={newForm.provincia || undefined} onValueChange={(v) => {
                  setNewForm({ ...newForm, provincia: v, localidad: "" })
                  setAutoFilledProvincia(false)
                  setAutoFilledLocalidad(false)
                }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger>
                  <SelectContent>
                    {PROVINCIAS_ARGENTINA.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Localidad — CHATZAI-025: Shows auto indicator when auto-filled */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Localidad</Label>
                  {autoFilledLocalidad && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground" title="Auto-completado desde la institución">
                      <Info className="size-2.5" /> auto
                    </span>
                  )}
                </div>
                <Select value={newForm.localidad || undefined} onValueChange={(v) => {
                  setNewForm({ ...newForm, localidad: v })
                  setAutoFilledLocalidad(false)
                }} disabled={!newForm.provincia || localidades.length === 0}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={newForm.provincia ? "Seleccionar localidad" : "Seleccione provincia primero"} /></SelectTrigger>
                  <SelectContent>
                    {localidades.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Coordinador CX — CHATZAI-025: ContactLookupField replaces Select */}
              <ContactLookupField
                label="Coordinador de CX"
                context={WIZARD_SEARCH_CONTEXTS.coordinadorCx}
                value={store.getContactoById(newForm.coordinadorContactId || "")}
                onChange={(contacto) => {
                  if (contacto) {
                    setNewForm({ ...newForm, coordinadorCx: contacto.nombre, coordinadorContactId: contacto.id })
                  } else {
                    setNewForm({ ...newForm, coordinadorCx: "Sin asignar", coordinadorContactId: undefined })
                  }
                }}
                placeholder="Buscar coordinador..."
              />

              {/* Vendedor — CHATZAI-025: ContactLookupField replaces Select */}
              <ContactLookupField
                label="Vendedor"
                context={WIZARD_SEARCH_CONTEXTS.vendedor}
                value={store.getContactoById(newForm.vendedorContactId || "")}
                onChange={(contacto) => {
                  if (contacto) {
                    setNewForm({ ...newForm, vendedor: contacto.nombre, vendedorContactId: contacto.id })
                  } else {
                    setNewForm({ ...newForm, vendedor: "Sin asignar", vendedorContactId: undefined })
                  }
                }}
                placeholder="Buscar vendedor..."
              />

              {/* Instrumentador — CHATZAI-025: ContactLookupField replaces Select */}
              <ContactLookupField
                label="Instrumentador"
                context={WIZARD_SEARCH_CONTEXTS.instrumentador}
                value={store.getContactoById(newForm.instrumentadorContactId || "")}
                onChange={(contacto) => {
                  if (contacto) {
                    setNewForm({ ...newForm, instrumentador: contacto.nombre, instrumentadorContactId: contacto.id })
                  } else {
                    setNewForm({ ...newForm, instrumentador: "Sin asignar", instrumentadorContactId: undefined })
                  }
                }}
                placeholder="Buscar instrumentador..."
              />
            </div>

            {/* ── Section 3: Referencias administrativas ── */}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-2">
              Referencias administrativas
            </h3>
            <ReferenciasAdministrativasEditor
              value={newForm.referenciasAdministrativas}
              onChange={(refs) => setNewForm({ ...newForm, referenciasAdministrativas: refs })}
            />

            {/* ── Section 4: Observaciones ── */}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-2">
              Observaciones
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Leyenda</Label>
                <Textarea
                  value={newForm.leyenda}
                  onChange={(e) => setNewForm({ ...newForm, leyenda: e.target.value })}
                  placeholder="Observaciones / leyenda..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="leyenda-destacada" checked={newForm.leyendaDestacada} onCheckedChange={(checked) => setNewForm({ ...newForm, leyendaDestacada: !!checked })} />
                <Label htmlFor="leyenda-destacada" className="cursor-pointer select-none text-xs">Destacada</Label>
                {newForm.leyendaDestacada && <Badge variant="warning" className="text-[10px]">DESTACADA</Badge>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notas internas</Label>
                <Textarea value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Notas internas..." rows={2} className="text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ Paso 1 — Presupuesto (WORKSPACE LAYOUT) ═══════════ */}
        {wizardStep === 1 && !creationDone && (
          <div ref={step1Ref} className="flex flex-col flex-1 min-h-0">
            {/* ── B: Context bar — cotización context (CHATZAI-017I: enriched with fiscal/commercial data) ── */}
            <div className="shrink-0 px-4 py-1.5 bg-muted/20 border-b text-[11px]">
              {/* Row 1: Cliente + datos fiscales/comerciales (prioridad visual) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Cliente / Pagador:</span>
                  <span className="font-semibold text-foreground">{newForm.client || "—"}</span>
                </div>
                {clienteData && (<>
                  <div className="w-px h-3 bg-border shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">CUIT:</span>
                    <span className="font-medium tabular-nums">{clienteData.cuit}</span>
                  </div>
                  <div className="w-px h-3 bg-border shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">IVA:</span>
                    <span className="font-medium">{clienteData.condicionIva}</span>
                  </div>
                  <div className="w-px h-3 bg-border shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge
                      variant={clienteData.estadoPagador === "Pagador" ? "default" : "secondary"}
                      className={cn(
                        "h-4 text-[9px] px-1.5 font-semibold",
                        clienteData.estadoPagador === "Pagador"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100"
                      )}
                    >
                      {clienteData.estadoPagador}
                    </Badge>
                  </div>
                </>)}
              </div>
              {/* Row 2: Datos del caso */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Paciente:</span>
                  <span className="font-medium">{newForm.patient || "—"}</span>
                </div>
                <div className="w-px h-3 bg-border shrink-0" />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Médico:</span>
                  <span className="font-medium">{newForm.surgeon || "—"}</span>
                </div>
                <div className="w-px h-3 bg-border shrink-0" />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Institución:</span>
                  <span className="font-medium">{newForm.institution || "—"}</span>
                </div>
                <div className="w-px h-3 bg-border shrink-0" />
                {/* CHATZAI-025A.3: Clasificación clickable to open modal from Presupuesto step */}
                <ClasificacionSelectorModal
                  value={newForm.classification}
                  onSelect={(classification) => setNewForm({ ...newForm, classification })}
                >
                  {(openModal) => (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 group cursor-pointer"
                      onClick={openModal}
                      title="Click para cambiar clasificación"
                    >
                      <span className="text-muted-foreground">Clasificación:</span>
                      <span className="font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {newForm.classification || "—"}
                      </span>
                    </button>
                  )}
                </ClasificacionSelectorModal>
              </div>
            </div>

            {/* ── Toggle + Conditions strip (flat, no card) ── */}
            <div className="shrink-0 px-4 pt-2 pb-1 space-y-1.5">
              {/* Toggle: Crear presupuesto ahora vs Sin presupuesto */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={createPRNow ? "default" : "outline"}
                  className={cn("h-6 text-[10px] px-2.5", createPRNow && "bg-emerald-600 hover:bg-emerald-700")}
                  onClick={() => setCreatePRNow(true)}
                  data-testid="toggle-create-pr"
                >
                  Con presupuesto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!createPRNow ? "default" : "outline"}
                  className={cn("h-6 text-[10px] px-2.5", !createPRNow && "bg-muted text-muted-foreground hover:bg-muted/80")}
                  onClick={() => setCreatePRNow(false)}
                  data-testid="toggle-no-pr"
                >
                  Sin presupuesto
                </Button>
              </div>

              {/* Compact conditions strip — only shown when creating PR */}
              {createPRNow && (
                <CondicionesSection
                  formData={prForm.formData}
                  updateField={prForm.updateField}
                  errors={step1Errors}
                  compact
                />
              )}
            </div>

            {createPRNow ? (
              <>
                {/* ── Toolbar (CHATZAI-017F: operational bar, part of workspace) ── */}
                <div className="shrink-0 px-3 py-1 border-b border-gray-300 dark:border-gray-600 border-t flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800/40">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => prForm.addItem()} data-testid="add-item-btn">
                      <Plus className="size-3" /> Agregar fila
                    </Button>
                    <ImportSubmodal
                      onImportItems={(items) => {
                        prForm.addItems(items)
                      }}
                    />
                    <TemplateSelector
                      currentClassification={newForm.classification || undefined}
                      currentClient={newForm.client}
                      currentSurgeon={newForm.surgeon}
                      onLoadTemplate={prForm.loadTemplate}
                    />
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" disabled title="Configuración de columnas (próximamente)">
                      <Settings2 className="size-3" /> Columnas
                    </Button>
                </div>

                {/* ── Step 1 validation errors ── */}
                {step1Errors.items && (
                  <div className="shrink-0 px-4 py-1 bg-destructive/5 border-b border-destructive/20">
                    <p className="text-[10px] text-destructive">{step1Errors.items}</p>
                  </div>
                )}

                {/* ── Grid-dominant items table (workspace mode — Excel-like) ── */}
                {/* CHATZAI-025A.4: Added flex flex-col so inner flex-1 min-h-0 propagates height constraint → scroll works */}
                <div className="flex-1 min-h-0 flex flex-col px-3 py-1.5">
                  <PresupuestoItemsTable
                    items={prForm.items}
                    addItem={prForm.addItem}
                    removeItem={prForm.removeItem}
                    updateItem={prForm.updateItem}
                    errors={prForm.errors}
                    workspace
                  />
                </div>

                {/* ── F: Economic closure footer (DF-PRES-WIN-02) ── */}
                {/* CHATZAI-025A.4: Side-by-side layout — Leyenda left, Totales right — saves vertical space for grid */}
                <div className="shrink-0 border-t-2 border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800/60 px-4 py-1.5 flex items-start gap-4">
                  {/* CHATZAI-017M: Leyenda preview in presupuesto workspace — compact inline */}
                  <div className="flex-1 min-w-0">
                    <LeyendaPresupuestoSection
                      leyenda={newForm.leyenda}
                      leyendaDestacada={newForm.leyendaDestacada}
                      onLeyendaChange={(value) => setNewForm({ ...newForm, leyenda: value })}
                      onLeyendaDestacadaChange={(value) => setNewForm({ ...newForm, leyendaDestacada: value })}
                      compact
                    />
                  </div>
                  <div className="shrink-0">
                    <TotalesSection
                      subtotal={prForm.subtotal}
                      descuento={prForm.descuento}
                      descuentoMonto={prForm.descuentoMonto}
                      descuentoLineasMonto={prForm.descuentoLineasMonto}
                      ivaPercentage={prForm.ivaPercentage}
                      ivaMonto={prForm.ivaMonto}
                      ivaKey={prForm.iva}
                      ivaDesglose={prForm.ivaDesglose}
                      total={prForm.total}
                      articuloLibreCount={prForm.articuloLibreCount}
                      articuloZCount={prForm.articuloZCount}
                      compact
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="text-center space-y-2 py-8">
                    <FileText className="size-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-medium text-muted-foreground">Sin presupuesto</p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs">
                      La cirugía se creará sin presupuesto. Podrá crearlo más tarde desde el expediente.
                    </p>
                  </div>
                </div>
                {/* CHATZAI-017M: Leyenda preview even when no presupuesto — CHATZAI-025A.4: compact */}
                <div className="shrink-0 border-t bg-muted/30 px-4 py-1.5">
                  <LeyendaPresupuestoSection
                    leyenda={newForm.leyenda}
                    leyendaDestacada={newForm.leyendaDestacada}
                    onLeyendaChange={(value) => setNewForm({ ...newForm, leyenda: value })}
                    onLeyendaDestacadaChange={(value) => setNewForm({ ...newForm, leyendaDestacada: value })}
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ Paso 2 — Confirmación y acciones ═══════════ */}
        {wizardStep === 2 && !creationDone && (
          <div className="space-y-3 overflow-y-auto flex-1 px-4 py-3">
            <p className="text-xs font-semibold">Resumen de la Cirugía</p>

            {/* Main data */}
            <div className="grid gap-1.5 sm:grid-cols-2 text-xs">
              <div><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{newForm.patient || "—"}</span></div>
              <div><span className="text-muted-foreground">Médico:</span> <span className="font-medium">{newForm.surgeon || "—"}</span></div>
              <div><span className="text-muted-foreground">Institución:</span> <span className="font-medium">{newForm.institution || "—"}</span></div>
              <div><span className="text-muted-foreground">Clasificación:</span> <span className="font-medium">{newForm.classification}</span></div>
              <div><span className="text-muted-foreground">Cliente / Pagador:</span> <span className="font-medium">{newForm.client || "—"}</span></div>
              {newForm.urgente && <div><Badge variant="destructive" className="text-[10px]">URGENTE</Badge></div>}
            </div>

            {/* Location & management */}
            <div className="grid gap-1.5 sm:grid-cols-2 text-xs">
              <div><span className="text-muted-foreground">Provincia:</span> <span className="font-medium">{newForm.provincia || "—"}</span></div>
              <div><span className="text-muted-foreground">Localidad:</span> <span className="font-medium">{newForm.localidad || "—"}</span></div>
              <div><span className="text-muted-foreground">Coordinador CX:</span> <span className="font-medium">{newForm.coordinadorCx || "Sin asignar"}</span></div>
              <div><span className="text-muted-foreground">Vendedor:</span> <span className="font-medium">{newForm.vendedor || "Sin asignar"}</span></div>
              <div><span className="text-muted-foreground">Instrumentador:</span> <span className="font-medium">{newForm.instrumentador || "Sin asignar"}</span></div>
            </div>

            {/* Dates */}
            {(newForm.date || newForm.probableDate || newForm.fechaEnvioMaterial) && (
              <div className="grid gap-1.5 sm:grid-cols-3 text-xs">
                {newForm.date && <div><span className="text-muted-foreground">Fecha CX:</span> <span className="font-medium">{formatDate(newForm.date)}</span></div>}
                {newForm.probableDate && <div><span className="text-muted-foreground">Fecha probable:</span> <span className="font-medium">{formatDate(newForm.probableDate)}</span></div>}
                {newForm.fechaEnvioMaterial && <div><span className="text-muted-foreground">Fecha envío material:</span> <span className="font-medium">{formatDate(newForm.fechaEnvioMaterial)}</span></div>}
              </div>
            )}

            {/* Referencias administrativas */}
            {cleanRefs(newForm.referenciasAdministrativas).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Referencias administrativas</p>
                <div className="flex flex-wrap gap-1.5">
                  {cleanRefs(newForm.referenciasAdministrativas).map((ref) => (
                    <Badge key={ref.id} variant="outline" className="text-[10px]">
                      {ref.tipo}: {ref.valor}{ref.observacion ? ` (${ref.observacion})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Leyenda */}
            {newForm.leyenda && (
              <div className={cn("rounded-md p-2 text-xs", newForm.leyendaDestacada ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700" : "")}>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide", newForm.leyendaDestacada ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                  Leyenda {newForm.leyendaDestacada ? "(Destacada)" : ""}
                </p>
                <p className="mt-0.5">{newForm.leyenda}</p>
              </div>
            )}

            {/* Notas internas */}
            {newForm.notes && (
              <div className="rounded-md bg-muted/50 p-2 text-xs">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Notas internas</p>
                <p className="mt-0.5">{newForm.notes}</p>
              </div>
            )}

            {/* Presupuesto summary */}
            {createPRNow && prForm.items.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold">
                  Presupuesto: {prForm.items.length} artículos — Total: ${prForm.total.toLocaleString("es-AR")}
                </p>
                <div className="grid gap-1 sm:grid-cols-3 text-[10px] text-muted-foreground">
                  <div>Vigencia: {prForm.formData.vigencia || "Sin seleccionar"}</div>
                  <div>Lista: {prForm.formData.listaPrecios || "Sin seleccionar"}</div>
                  <div>Cond. pago: {prForm.formData.condicionPago || "Sin seleccionar"}</div>
                </div>
                {/* Compact items table */}
                <div className="border rounded-sm overflow-hidden">
                  <div className="grid grid-cols-[60px_1fr_40px_70px_40px_70px] bg-muted/60 text-[9px] font-semibold text-muted-foreground border-b">
                    <div className="px-1.5 py-1">Código</div>
                    <div className="px-1.5 py-1">Artículo</div>
                    <div className="px-1.5 py-1 text-right">Cant.</div>
                    <div className="px-1.5 py-1 text-right">P.Unit.</div>
                    <div className="px-1.5 py-1 text-right">Dto.%</div>
                    <div className="px-1.5 py-1 text-right">Subtotal</div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {prForm.items.map((item, idx) => {
                      const lineBruto = item.quantity * item.unitPrice
                      const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
                      const lineNeto = lineBruto * (1 - clampedDiscount / 100)
                      return (
                        <div key={idx} className="grid grid-cols-[60px_1fr_40px_70px_40px_70px] border-b last:border-b-0 text-[10px]">
                          <div className="px-1.5 py-0.5 truncate">{item.code || "—"}</div>
                          <div className="px-1.5 py-0.5 truncate font-medium">{item.name}</div>
                          <div className="px-1.5 py-0.5 text-right tabular-nums">{item.quantity}</div>
                          <div className="px-1.5 py-0.5 text-right tabular-nums">${item.unitPrice.toLocaleString("es-AR")}</div>
                          <div className="px-1.5 py-0.5 text-right tabular-nums">{clampedDiscount > 0 ? `${clampedDiscount}%` : "—"}</div>
                          <div className="px-1.5 py-0.5 text-right tabular-nums font-medium">${lineNeto.toLocaleString("es-AR")}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between bg-muted/30 px-2 py-1">
                    <span className="text-[9px] text-muted-foreground">{prForm.items.length} artículo{prForm.items.length !== 1 ? "s" : ""}</span>
                    <span className="text-[10px] font-semibold tabular-nums">Total: ${prForm.total.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Sin presupuesto</Badge>
                <span className="text-xs text-muted-foreground">La cirugía se creará sin presupuesto asociado.</span>
              </div>
            )}

            {/* ── Anticipated actions preview ── */}
            <div className="rounded-md border bg-muted/20 p-2 mt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Al confirmar se creará la cirugía
                {createPRNow ? " con el presupuesto asociado" : " sin presupuesto"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {createPRNow
                  ? "Luego podrá imprimir, enviar por correo o compartir el presupuesto por WhatsApp."
                  : "Podrá crear el presupuesto más tarde desde el expediente de la cirugía."
                }
              </p>
            </div>
          </div>
        )}

        {/* ═══════════ Post-creation success panel ═══════════ */}
        {creationDone && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <PostCreationPanel
              hasPresupuesto={createPRNow && prForm.items.length > 0}
              surgeryId={createdSurgeryId || "—"}
              patientName={newForm.patient}
              classification={newForm.classification}
              onGoToExpediente={() => {
                if (createdSurgeryId) {
                  handleClose()
                }
              }}
              onCreatePresupuestoLater={() => {
                handleClose()
              }}
            />
          </div>
        )}

        {/* ═══════════ Footer ═══════════ */}
        <DialogFooter className={cn(
          "shrink-0 border-t px-4 py-2",
          wizardStep === 1 && "bg-muted/20"
        )}>
          {!creationDone && wizardStep > 0 && (
            <Button variant="outline" size="sm" onClick={() => setWizardStep(wizardStep - 1)}>
              Anterior
            </Button>
          )}
          {!creationDone && wizardStep < 2 && (
            <Button size="sm" onClick={handleNext} data-testid="wizard-next-btn" className="bg-emerald-600 hover:bg-emerald-700">
              Siguiente
            </Button>
          )}
          {!creationDone && wizardStep === 2 && (
            <Button size="sm" onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700" data-testid="wizard-confirm-btn">
              {createPRNow && prForm.items.length > 0 ? "Crear cirugía + Generar PR" : "Crear cirugía"}
            </Button>
          )}
          {creationDone && (
            <Button size="sm" onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">
              Cerrar
            </Button>
          )}
          {!creationDone && (
            <Button variant="ghost" size="sm" onClick={handleRequestClose}>Cancelar</Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* CHATZAI-025: Cancel confirmation dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar la nueva cirugía?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderán los datos cargados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

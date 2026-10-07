"use client"

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
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
import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { useOrtoTrackStore } from "@/lib/store"
import { AiResultsPanel } from "@/components/cirugias/AiResultsPanel"
import { AiUploadZone } from "@/components/cirugias/AiUploadZone"
import { AiLateralRail } from "@/components/cirugias/AiLateralRail"
// NUEVA-CIRUGIA-IA-UX-P1 (Phase A): presentational sub-components.
// Pure, stateless, consume existing state via props — no behavior change.
import { MissingFieldsBar, type MissingFieldTarget } from "@/components/cirugias/MissingFieldsBar"
import { MissingCountText } from "@/components/cirugias/MissingCountText"
import { ReferenciasAdministrativasEditor } from "@/components/cirugias/ReferenciasAdministrativasEditor"
import { CondicionesSection } from "@/components/presupuestos/CondicionesSection"
import { PresupuestoItemsTable } from "@/components/presupuestos/PresupuestoItemsTable"
import { PresupuestoCommercialIdentityFields } from "@/components/presupuestos/PresupuestoCommercialIdentityFields"
import { buildEstimativePresupuestoPayload, createPresupuesto, fetchPresupuestos } from "@/lib/api/presupuestos"
import type { SurgeryIntakeResult } from "@/hooks/useCirugiaActions"
import { ApiClientError } from "@/lib/api/client"
import { TotalesSection } from "@/components/presupuestos/TotalesSection"
import { TemplateSelector } from "@/components/presupuestos/TemplateSelector"
import { ImportSubmodal } from "@/components/presupuestos/ImportSubmodal"
import { PostCreationPanel } from "@/components/cirugias/PostCreationPanel"
import { LeyendaPresupuestoSection } from "@/components/presupuestos/LeyendaPresupuestoSection"
import { ClasificacionSelectorModal } from "@/components/presupuestos/ClasificacionSelectorModal"
import { LugarSelector } from "@/components/cirugias/LugarSelector"
import { HelpTip } from "@/components/ui/info-tooltip"
import { CheckCircle2, Plus, Settings2, FileText, Info, Sparkles, AlertCircle, Calendar, User, Receipt, Stethoscope, ClipboardList, Users, Truck, CalendarDays, UploadCloud, MapPin, Building2, Check } from "lucide-react"
import { useAiExtraction } from "@/hooks/useAiExtraction"
import type { NewSurgeryForm } from "@/lib/cirugias.types"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import type { Contacto, ReferenciaAdministrativa, PlantillaPresupuesto } from "@/types"
import type { ContactRole, TipoPersona } from "@/types"
import type { PresupuestoFormData, PresupuestoFormErrors, FormItem } from "@/hooks/usePresupuestoForm"
import { mapAiToWizardForm } from "@/lib/validators/autorizacion-ai"

// ─── Step labels (3 steps) ───
const STEP_LABELS = ["Datos del caso", "Presupuesto", "Confirmación"] as const

type ContactSuggestionField = "patient" | "surgeon" | "institution" | "client"

type ContactCandidate = {
  contacto: Contacto
  score: number
  compatibilityScore: number
  reason: string
}

type ContactSuggestionGroup = {
  field: ContactSuggestionField
  label: string
  detectedText: string
  detectedDni?: string
  candidates: ContactCandidate[]
}

type PendingContactCreation = {
  field: ContactSuggestionField
  detectedText: string
  detectedDni?: string
  defaultRoles: ContactRole[]
  defaultGroups: string[]
  tipoPersona: TipoPersona
}

type InlineAiValueField = "date" | "probableDate" | "provincia" | "patient" | "surgeon" | "institution" | "client"

type ContactSelectionOverrides = Partial<Record<ContactSuggestionField, Contacto | null>>
type TextOnlyContactFields = Partial<Record<ContactSuggestionField, boolean>>

const QUICK_CREATE_LABELS: Record<ContactSuggestionField, string> = {
  patient: "Crear paciente",
  surgeon: "Crear médico",
  institution: "Crear institución",
  client: "Crear pagador",
}

const CONTACT_PREFIXES_TO_REMOVE = [
  "dr",
  "dra",
  "doctor",
  "doctora",
  "sanatorio",
  "hospital",
  "clinica",
  "clínica",
  "instituto",
  "institucion",
  "institución",
  "centro",
  "medico",
  "médico",
  "lic",
]

const GROUP_COMPATIBILITY = {
  patient: {
    preferredGroups: ["pacientes"],
    incompatibleGroups: ["medicos", "instituciones", "obras_sociales", "prepagas", "prov_implantes"],
  },
  surgeon: {
    preferredGroups: ["medicos"],
    incompatibleGroups: ["pacientes", "instituciones", "obras_sociales", "prepagas", "prov_implantes"],
  },
  institution: {
    preferredGroups: ["instituciones"],
    incompatibleGroups: ["pacientes", "medicos"],
  },
  client: {
    preferredGroups: ["obras_sociales", "prepagas", "particulares"],
    incompatibleGroups: ["pacientes", "medicos", "coordinadores", "vendedores", "instrumentadores"],
  },
} as const

function hasAnyGroup(contacto: Contacto, groups: readonly string[]): boolean {
  return groups.some((group) => contacto.groups.includes(group))
}

function getCompatibilityAdjustments(contacto: Contacto, field: ContactSuggestionField): {
  score: number
  reasons: string[]
} {
  const adjustments = { score: 0, reasons: [] as string[] }
  const rules = GROUP_COMPATIBILITY[field]

  if (hasAnyGroup(contacto, rules.preferredGroups)) {
    adjustments.score += 40
    adjustments.reasons.push(`grupo ${rules.preferredGroups.join("/")}`)
  }

  if (hasAnyGroup(contacto, rules.incompatibleGroups)) {
    adjustments.score -= 30
    adjustments.reasons.push("grupo incompatible")
  }

  if (field === "patient") {
    if (contacto.tipoPersona === "fisica") {
      adjustments.score += 5
      adjustments.reasons.push("persona física")
    }
  }

  if (field === "surgeon") {
    if (contacto.datosMedico) {
      adjustments.score += 15
      adjustments.reasons.push("perfil médico")
    }
    if (contacto.tipoPersona === "juridica") {
      adjustments.score -= 15
      adjustments.reasons.push("persona jurídica")
    }
  }

  if (field === "institution") {
    if (contacto.datosInstitucion) {
      adjustments.score += 15
      adjustments.reasons.push("perfil institución")
    }
    if (contacto.tipoPersona === "juridica") {
      adjustments.score += 10
      adjustments.reasons.push("persona jurídica")
    }
  }

  if (field === "client") {
    if (contacto.datosClientePagador) {
      adjustments.score += 15
      adjustments.reasons.push("perfil pagador")
      if (contacto.datosClientePagador.esPagador) {
        adjustments.score += 10
        adjustments.reasons.push("pagador")
      }
    }
  }

  return adjustments
}

function normalizeContactName(value: string): string {
  if (!value) return ""

  const withoutAccents = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  const cleaned = withoutAccents
    .replace(/[.,;:/\\()\[\]{}\-_'"`]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !CONTACT_PREFIXES_TO_REMOVE.includes(token))

  return cleaned.join(" ").trim()
}

function buildSortedTokenKey(value: string): string {
  return normalizeContactName(value)
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ")
}

function getContactIdentityMeta(contacto: Contacto): string[] {
  return [contacto.codigoContacto, contacto.dni, contacto.cuit].filter(
    (value): value is string => Boolean(value?.trim())
  )
}

export function scoreContactMatch(params: {
  contacto: Contacto
  detectedName: string
  detectedDni?: string
  field: ContactSuggestionField
}): ContactCandidate | null {
  const { contacto, detectedName, detectedDni, field } = params
  const normalizedDetected = normalizeContactName(detectedName)
  const normalizedContact = normalizeContactName(contacto.nombre)
  const normalizedDetectedDni = detectedDni ? detectedDni.replace(/\D/g, "") : ""
  const normalizedContactDni = contacto.dni ? contacto.dni.replace(/\D/g, "") : ""

  if (!normalizedDetected && !normalizedDetectedDni) {
    return null
  }

  let score = 0
  let compatibilityScore = 0
  const reasons: string[] = []

  if (normalizedDetectedDni && normalizedContactDni && normalizedDetectedDni === normalizedContactDni) {
    score += 70
    reasons.push("DNI coincide")
  }

  if (normalizedDetected && normalizedContact) {
    if (normalizedDetected === normalizedContact) {
      score += 45
      reasons.push("nombre exacto")
    }

    const detectedTokenKey = buildSortedTokenKey(detectedName)
    const contactTokenKey = buildSortedTokenKey(contacto.nombre)
    if (detectedTokenKey && detectedTokenKey === contactTokenKey) {
      score += 30
      reasons.push("mismos tokens")
    }

    const detectedTokens = new Set(normalizedDetected.split(" ").filter(Boolean))
    const contactTokens = new Set(normalizedContact.split(" ").filter(Boolean))
    const overlap = Array.from(detectedTokens).filter((token) => contactTokens.has(token)).length
    const union = new Set([...detectedTokens, ...contactTokens]).size || 1
    const overlapRatio = overlap / union

    if (overlap > 0) {
      score += Math.round(overlapRatio * 25)
      reasons.push(`tokens en común (${overlap})`)
    }

    if (
      normalizedContact.includes(normalizedDetected) ||
      normalizedDetected.includes(normalizedContact)
    ) {
      score += 15
      reasons.push("nombre parcial")
    }
  }

  if (contacto.estado !== "activo") {
    score -= 20
    reasons.push("contacto inactivo")
  }

  // Base match check: prevent false positives when only a single common first name matches
  const hasDniMatch = Boolean(normalizedDetectedDni && normalizedContactDni && normalizedDetectedDni === normalizedContactDni)
  const hasDirectNameMatch = Boolean(
    score >= 20 ||
    (normalizedDetected && normalizedContact && (normalizedDetected === normalizedContact || buildSortedTokenKey(detectedName) === buildSortedTokenKey(contacto.nombre)))
  )

  if (!hasDniMatch && !hasDirectNameMatch) {
    return null
  }

  const compatibility = getCompatibilityAdjustments(contacto, field)
  compatibilityScore = compatibility.score
  score += compatibility.score
  reasons.push(...compatibility.reasons)

  if (score < 25) {
    return null
  }

  return {
    contacto,
    score,
    compatibilityScore,
    reason: reasons.join(" · "),
  }
}

export function findContactCandidates(params: {
  contactos: Contacto[]
  field: ContactSuggestionField
  detectedName: string
  detectedDni?: string
  limit?: number
}): ContactCandidate[] {
  const { contactos, field, detectedName, detectedDni, limit = 2 } = params

  const rankedCandidates = contactos
    .map((contacto) =>
      scoreContactMatch({
        contacto,
        field,
        detectedName,
        detectedDni,
      })
    )
    .filter((candidate): candidate is ContactCandidate => candidate !== null)
    .sort(
      (a, b) =>
        b.compatibilityScore - a.compatibilityScore ||
        b.score - a.score ||
        a.contacto.nombre.localeCompare(b.contacto.nombre)
    )

  const compatibleCandidates = rankedCandidates.filter((candidate) => candidate.compatibilityScore > 0)
  const visibleCandidates = compatibleCandidates.length > 0 ? compatibleCandidates : rankedCandidates

  return visibleCandidates.slice(0, limit)
}

// ─── CHATZAI-017H: Definitive wizard sizes (hoisted as module constant) ───
// Paso 1 & 2 (Datos + Presupuesto): 88vw × 85vh — wide workspace (~10% reduction from 98×95)
// Paso 3 (Confirmación): 62vw × 65vh — compact summary (~30% smaller)
// MUST override base DialogContent's sm:max-w-lg — that class wins at sm+ breakpoint.
// Fixed dimensions: container never adjusts to content; grid/content adapts inside.
const DIALOG_SIZES: Record<number, string> = {
  0: "fixed inset-0 top-0 left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none sm:!max-w-none !max-h-none !rounded-none !border-0 bg-background",
  1: "fixed inset-0 top-0 left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none sm:!max-w-none !max-h-none !rounded-none !border-0 bg-background",
  2: "fixed inset-0 top-0 left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none sm:!max-w-none !max-h-none !rounded-none !border-0 bg-background",
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
  onConfirm: (options?: { authorizationFile?: File | null }) => boolean | SurgeryIntakeResult | Promise<boolean | SurgeryIntakeResult>
  /** CHATZAI-017E: ID of the just-created surgery (for post-creation actions) */
  createdSurgeryId?: string
  instrumentadores: string[]
  onOpenCreatedSurgery?: (surgeryId: string) => void
}

// ─── Step 0 validation fields ───
// NUEVA-CIRUGIA-IA-UX-P1 (Phase A): exported for reuse by MissingFieldsBar
// (type-only import — no runtime coupling). Additive export, no behavior change.
export interface Step0Errors {
  patient?: string
  surgeon?: string
  institution?: string
  client?: string
  classification?: string
}
export type Step0ErrorKey = keyof Step0Errors

// NUEVA-CIRUGIA-IA-UX-P1 (Phase A, DESIGN §5): step0Errors key → chip label → focus target.
// Drives MissingFieldsBar. The focus selector targets the `data-step0-field="<key>"`
// wrapper attributes added around each Paso 1 field block (DESIGN §6.5).
// Visual chip order is controlled by MissingFieldsBar: Cliente → Paciente → Médico → Institución → Clasificación.
const STEP0_FIELD_MAP: Record<Step0ErrorKey, MissingFieldTarget> = {
  patient: { label: "Paciente", focusSelector: '[data-step0-field="patient"]' },
  surgeon: { label: "Médico", focusSelector: '[data-step0-field="surgeon"]' },
  institution: { label: "Institución", focusSelector: '[data-step0-field="institution"]' },
  client: { label: "Cliente / Pagador", focusSelector: '[data-step0-field="client"]' },
  classification: { label: "Clasificación", focusSelector: '[data-step0-field="classification"]' },
}

// ─── Step 1 (Presupuesto) validation uses same type as PR form ───
type Step1Errors = PresupuestoFormErrors

export function NewSurgeryDialog({
  open, onOpenChange, wizardStep, setWizardStep,
  newForm, setNewForm,
  createPRNow, setCreatePRNow,
  prForm,
  onConfirm, createdSurgeryId, onOpenCreatedSurgery,
}: NewSurgeryDialogProps) {
  // ─── CHATZAI-020: Store access for Contacto lookups ───
  const store = useOrtoTrackStore()
  const { activeCompany } = useAuth()

  // ─── Step validation errors ───
  const [step0Errors, setStep0Errors] = useState<Step0Errors>({})
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({})
  const [creationDone, setCreationDone] = useState(false)
  const [presupuestoCreated, setPresupuestoCreated] = useState(false)
  const [presupuestoRetrying, setPresupuestoRetrying] = useState(false)
  const [intakeResult, setIntakeResult] = useState<SurgeryIntakeResult | null>(null)
  const [budgetStatus, setBudgetStatus] = useState<SurgeryIntakeResult["budget"]>("not-requested")
  const [confirming, setConfirming] = useState(false)
  const operationRef = useRef<number | null>(null)
  const sessionRef = useRef({ open, companyId: activeCompany?.id, generation: 0 })
  if (sessionRef.current.open !== open || sessionRef.current.companyId !== activeCompany?.id) {
    sessionRef.current = { open, companyId: activeCompany?.id, generation: sessionRef.current.generation + 1 }
    operationRef.current = null
  }
  useEffect(() => {
    setCreationDone(false)
    setPresupuestoCreated(false)
    setIntakeResult(null)
    setBudgetStatus("not-requested")
    setConfirming(false)
    setPresupuestoRetrying(false)
  }, [open, activeCompany?.id])
  useEffect(() => () => { sessionRef.current.generation += 1 }, [])
  const [contactCreateOpen, setContactCreateOpen] = useState(false)
  const [contactFormKey, setContactFormKey] = useState(0)
  const [pendingContactCreation, setPendingContactCreation] = useState<PendingContactCreation | null>(null)
  const [contactLookupRenderVersion, setContactLookupRenderVersion] = useState(0)
  const [contactSelectionOverrides, setContactSelectionOverrides] = useState<ContactSelectionOverrides>({})
  const [textOnlyContactFields, setTextOnlyContactFields] = useState<TextOnlyContactFields>({})
  const [aiSuggestionsApplied, setAiSuggestionsApplied] = useState(false)
  const [uploadedAiFile, setUploadedAiFile] = useState<File | null>(null)
  const [saveAuthorizationImage, setSaveAuthorizationImage] = useState(true)
  const [aiRailOpen, setAiRailOpen] = useState(false)

  // ─── CHATZAI-025: Cancel confirmation state ───
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

  // ─── CHATZAI-025: Track auto-filled provincia/localidad ───
  const [autoFilledProvincia, setAutoFilledProvincia] = useState(false)
  const [autoFilledLocalidad, setAutoFilledLocalidad] = useState(false)

  // ─── Estado de nuevo formulario horizontal ───
  const [facturarA, setFacturarA] = useState<"cliente" | "paciente" | "medico" | "institucion">("cliente")
  const [remitirAInstitucion, setRemitirAInstitucion] = useState(true)
  const [showAdditionalRefs, setShowAdditionalRefs] = useState(false)

  // Sincronizar automáticamente el pagador si 'facturarA' no es 'cliente'
  useEffect(() => {
    if (facturarA === "paciente") {
      setNewForm((prev) => {
        if (prev.client === prev.patient && prev.clientContactId === prev.patientContactId) return prev
        return {
          ...prev,
          client: prev.patient || "",
          clientContactId: prev.patientContactId,
        }
      })
    } else if (facturarA === "medico") {
      setNewForm((prev) => {
        if (prev.client === prev.surgeon && prev.clientContactId === prev.surgeonContactId) return prev
        return {
          ...prev,
          client: prev.surgeon || "",
          clientContactId: prev.surgeonContactId,
        }
      })
    } else if (facturarA === "institucion") {
      setNewForm((prev) => {
        if (prev.client === prev.institution && prev.clientContactId === prev.institutionContactId) return prev
        return {
          ...prev,
          client: prev.institution || "",
          clientContactId: prev.institutionContactId,
        }
      })
    }
  }, [facturarA, newForm.patient, newForm.patientContactId, newForm.surgeon, newForm.surgeonContactId, newForm.institution, newForm.institutionContactId, setNewForm])

  // Sincronizar ubicación de la institución si remitirAInstitucion está activo
  useEffect(() => {
    if (remitirAInstitucion && newForm.institutionContactId) {
      const inst = store.getContactoById(newForm.institutionContactId)
      if (inst) {
        if ((inst.provincia || "") !== newForm.provincia || (inst.localidad || "") !== newForm.localidad) {
          setNewForm((prev) => ({
            ...prev,
            provincia: inst.provincia || "",
            localidad: inst.localidad || "",
          }))
          setAutoFilledProvincia(Boolean(inst.provincia))
          setAutoFilledLocalidad(Boolean(inst.localidad))
        }
      }
    }
  }, [remitirAInstitucion, newForm.institutionContactId, store, newForm.provincia, newForm.localidad, setNewForm])

  // Número principal de autorización
  const primaryAuthNumber = useMemo(() => {
    const authRef = newForm.referenciasAdministrativas.find((r) => r.tipo === "Autorización")
    return authRef ? authRef.valor : ""
  }, [newForm.referenciasAdministrativas])

  const handleAuthNumberChange = useCallback((val: string) => {
    setNewForm((prev) => {
      const existingIdx = prev.referenciasAdministrativas.findIndex((r) => r.tipo === "Autorización")
      const updated = [...prev.referenciasAdministrativas]
      if (existingIdx >= 0) {
        updated[existingIdx] = { ...updated[existingIdx], valor: val }
      } else if (val.trim()) {
        updated.unshift({
          id: `ref-auth-${Date.now()}`,
          tipo: "Autorización",
          valor: val,
        })
      }
      return { ...prev, referenciasAdministrativas: updated }
    })
  }, [setNewForm])

  const companyId = activeCompany?.id || process.env.NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID || ""

  const aiExtraction = useAiExtraction({
    companyId,
  })

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
  const handleConfirm = useCallback(async () => {
    if (operationRef.current !== null || creationDone) return
    const generation = sessionRef.current.generation
    operationRef.current = generation
    setConfirming(true)
    try {
      const result = await onConfirm({ authorizationFile: saveAuthorizationImage ? uploadedAiFile : null })
      if (sessionRef.current.generation !== generation || !sessionRef.current.open) return
      if (result) {
        if (typeof result !== "boolean") {
          if (result.companyId !== sessionRef.current.companyId) return
          setIntakeResult(result)
          setBudgetStatus(result.budget)
          setPresupuestoCreated(result.budget === "confirmed")
        }
        setCreationDone(true)
      }
    } catch (cause) {
      if (sessionRef.current.generation === generation) toast.error(cause instanceof Error ? cause.message : "No se pudo confirmar la cirugía")
    } finally {
      if (operationRef.current === generation) {
        operationRef.current = null
        setConfirming(false)
      }
    }
  }, [onConfirm, saveAuthorizationImage, uploadedAiFile, creationDone])

  useEffect(() => {
    if (!open || intakeResult || !creationDone || !createPRNow || !createdSurgeryId || !activeCompany?.id) return
    let active = true
    const generation = sessionRef.current.generation
    setBudgetStatus("unverified")
    fetchPresupuestos(activeCompany.id, { surgeryId: createdSurgeryId, take: 1 })
      .then((rows) => {
        if (active && sessionRef.current.generation === generation) {
          setPresupuestoCreated(rows.length > 0)
          setBudgetStatus(rows.length ? "confirmed" : "unverified")
        }
      })
      .catch(() => { /* Unknown persistence is not evidence of absence. */ })
    return () => { active = false }
  }, [open, intakeResult, activeCompany?.id, createPRNow, createdSurgeryId, creationDone])

  const retryPresupuesto = useCallback(async () => {
    const companyId = intakeResult?.companyId ?? activeCompany?.id
    const surgeryId = intakeResult?.surgeryId ?? createdSurgeryId
    if (!open || !companyId || companyId !== activeCompany?.id || !surgeryId || operationRef.current !== null || presupuestoCreated) return
    const generation = sessionRef.current.generation
    const isCurrent = () => sessionRef.current.open && sessionRef.current.generation === generation
    const payload = buildEstimativePresupuestoPayload(prForm.formData, prForm.items)
    operationRef.current = generation
    setPresupuestoRetrying(true)
    let retryStatus = budgetStatus
    try {
      // Always reconcile before another POST: the previous response may have been lost.
      const existing = await fetchPresupuestos(companyId, { surgeryId, take: 1 })
      if (!isCurrent()) return
      if (!existing.length) {
        if (budgetStatus !== "missing") {
          setBudgetStatus("unverified")
          return
        }
        try {
          await createPresupuesto(companyId, { ...payload, surgeryId })
        } catch (cause) {
          retryStatus = cause instanceof ApiClientError && cause.status >= 400 && cause.status < 500 ? "missing" : "unverified"
          throw cause
        }
      }
      if (!isCurrent()) return
      setPresupuestoCreated(true)
      setBudgetStatus("confirmed")
      toast.success("Presupuesto creado exitosamente")
    } catch (cause) {
      if (!isCurrent()) return
      setBudgetStatus(retryStatus)
      try {
        const rows = await fetchPresupuestos(companyId, { surgeryId, take: 1 })
        if (!isCurrent()) return
        if (rows.length > 0) {
          setPresupuestoCreated(true)
          setBudgetStatus("confirmed")
          toast.success("Presupuesto creado exitosamente")
          return
        }
      } catch {
        // Keep the original create failure when reconciliation is unavailable.
      }
      if (isCurrent()) toast.error(cause instanceof Error ? cause.message : "No se pudo crear el presupuesto")
    } finally {
      if (operationRef.current === generation) {
        operationRef.current = null
        setPresupuestoRetrying(false)
      }
    }
  }, [open, activeCompany?.id, intakeResult, createdSurgeryId, prForm.formData, prForm.items, presupuestoCreated, budgetStatus])

  // ─── Reset on close ───
  const handleClose = useCallback(() => {
    sessionRef.current.generation += 1
    operationRef.current = null
    onOpenChange(false)
    setWizardStep(0)
    setCreationDone(false)
    setPresupuestoCreated(false)
    setPresupuestoRetrying(false)
    setConfirming(false)
    setIntakeResult(null)
    setBudgetStatus("not-requested")
    setContactCreateOpen(false)
    setPendingContactCreation(null)
    setTextOnlyContactFields({})
    setAiSuggestionsApplied(false)
    setUploadedAiFile(null)
    setSaveAuthorizationImage(true)
    setStep0Errors({})
    setStep1Errors({})
    setCancelConfirmOpen(false)
    setAutoFilledProvincia(false)
    setAutoFilledLocalidad(false)
    aiExtraction.reset()
  }, [onOpenChange, setWizardStep, aiExtraction])

  // ─── CHATZAI-025: Handle close with dirty check ───
  const handleRequestClose = useCallback(() => {
    if (isFormDirty && !creationDone) {
      setCancelConfirmOpen(true)
    } else {
      handleClose()
    }
  }, [isFormDirty, creationDone, handleClose])

  const dialogClass = DIALOG_SIZES[wizardStep] ?? DIALOG_SIZES[0]

  const handleAiFileSelected = useCallback(async (file: File) => {
    if (!companyId) {
      throw new Error("No hay empresa activa disponible para procesar la autorización")
    }

    setUploadedAiFile(file)
    setSaveAuthorizationImage(true)
    setAiSuggestionsApplied(false)
    await aiExtraction.extract(file)
  }, [aiExtraction, companyId])

  const handleResetAiResult = useCallback(() => {
    setUploadedAiFile(null)
    setSaveAuthorizationImage(true)
    setAiSuggestionsApplied(false)
    aiExtraction.reset()
  }, [aiExtraction])

  const handleReviewAiFields = useCallback(() => {
    const firstField = step0Ref.current?.querySelector('[data-step0-field="client"]')
    firstField?.scrollIntoView({ behavior: "smooth", block: "center" })
    const control = firstField?.querySelector("input, button, select, textarea") as HTMLElement | null
    control?.focus()
  }, [])

  const handleApplyAiResult = useCallback(() => {
    if (!aiExtraction.result) return

    const extracted = aiExtraction.result.extracted
    const { formFields } = mapAiToWizardForm(extracted)
    const hasSuggestedProvincia = Boolean(extracted.provincia_sugerida.trim())
    const hasSuggestedLocalidad = Boolean(extracted.localidad_sugerida.trim())

    setNewForm((prev) => {
      const next: NewSurgeryForm = { ...prev }

      if (!prev.patient.trim() && formFields.patient) next.patient = formFields.patient
      if (!prev.surgeon.trim() && formFields.surgeon) next.surgeon = formFields.surgeon
      if (!prev.institution.trim() && formFields.institution) next.institution = formFields.institution
      if (!prev.client.trim() && formFields.client) next.client = formFields.client
      if (!prev.date.trim() && formFields.date) next.date = formFields.date
      if (!prev.probableDate.trim() && formFields.probableDate) next.probableDate = formFields.probableDate
      if (!prev.provincia.trim() && extracted.provincia_sugerida.trim()) {
        next.provincia = extracted.provincia_sugerida.trim()
      }
      if (!prev.localidad.trim() && extracted.localidad_sugerida.trim()) {
        next.localidad = extracted.localidad_sugerida.trim()
      }

      if (formFields.notes?.trim()) {
        const aiNotes = formFields.notes.trim()
        if (!prev.notes.trim()) {
          next.notes = aiNotes
        } else if (!prev.notes.includes(aiNotes)) {
          next.notes = `${prev.notes.trim()}\n\n— IA —\n${aiNotes}`
        }
      }

      if (formFields.referenciasAdministrativas?.length) {
        const existing = prev.referenciasAdministrativas
        const additions = formFields.referenciasAdministrativas.filter((candidate) => {
          const candidateObs = candidate.observacion?.trim() || ""
          return !existing.some((current) => {
            const currentObs = current.observacion?.trim() || ""
            return (
              current.tipo === candidate.tipo &&
              current.valor.trim() === candidate.valor.trim() &&
              currentObs === candidateObs
            )
          })
        })

        if (additions.length > 0) {
          next.referenciasAdministrativas = [...existing, ...additions]
        }
      }

      return next
    })

    if (hasSuggestedProvincia) setAutoFilledProvincia(true)
    if (hasSuggestedLocalidad) setAutoFilledLocalidad(true)
    setAiSuggestionsApplied(true)
  }, [aiExtraction.result, setNewForm])

  const contactSuggestionGroups = useMemo<ContactSuggestionGroup[]>(() => {
    if (!aiExtraction.result) return []

    const { extracted } = aiExtraction.result

    const groups: ContactSuggestionGroup[] = []

    if (extracted.paciente.trim()) {
      groups.push({
        field: "patient",
        label: "Paciente detectado",
        detectedText: extracted.paciente.trim(),
        detectedDni: extracted.dni.trim() || undefined,
        candidates: findContactCandidates({
          contactos: store.contactos,
          field: "patient",
          detectedName: extracted.paciente,
          detectedDni: extracted.dni,
        }),
      })
    }

    if (extracted.medico.trim()) {
      groups.push({
        field: "surgeon",
        label: "Médico detectado",
        detectedText: extracted.medico.trim(),
        candidates: findContactCandidates({
          contactos: store.contactos,
          field: "surgeon",
          detectedName: extracted.medico,
        }),
      })
    }

    if (extracted.institucion.trim()) {
      groups.push({
        field: "institution",
        label: "Institución detectada",
        detectedText: extracted.institucion.trim(),
        candidates: findContactCandidates({
          contactos: store.contactos,
          field: "institution",
          detectedName: extracted.institucion,
        }),
      })
    }

    if (extracted.obra_social.trim()) {
      groups.push({
        field: "client",
        label: "Pagador / obra social detectada",
        detectedText: extracted.obra_social.trim(),
        candidates: findContactCandidates({
          contactos: store.contactos,
          field: "client",
          detectedName: extracted.obra_social,
        }),
      })
    }

    return groups
  }, [aiExtraction.result, store.contactos])

  const applySuggestedContact = useCallback((field: ContactSuggestionField, contacto: Contacto) => {
    setContactSelectionOverrides((prev) => ({ ...prev, [field]: contacto }))
    setTextOnlyContactFields((prev) => ({ ...prev, [field]: false }))

    setNewForm((prev) => {
      switch (field) {
        case "patient":
          return { ...prev, patient: contacto.nombre, patientContactId: contacto.id }
        case "surgeon":
          return { ...prev, surgeon: contacto.nombre, surgeonContactId: contacto.id }
        case "institution":
          return { ...prev, institution: contacto.nombre, institutionContactId: contacto.id }
        case "client":
          return { ...prev, client: contacto.nombre, clientContactId: contacto.id }
        default:
          return prev
      }
    })

    setContactLookupRenderVersion((prev) => prev + 1)

    setStep0Errors((prev) => {
      switch (field) {
        case "patient":
          return { ...prev, patient: undefined }
        case "surgeon":
          return { ...prev, surgeon: undefined }
        case "institution":
          return { ...prev, institution: undefined }
        case "client":
          return { ...prev, client: undefined }
        default:
          return prev
      }
    })
  }, [setNewForm])

  const applyDetectedTextOnly = useCallback((field: ContactSuggestionField, detectedText: string) => {
    const safeText = detectedText.trim()
    if (!safeText) return

    setContactSelectionOverrides((prev) => ({ ...prev, [field]: null }))
    setTextOnlyContactFields((prev) => ({ ...prev, [field]: true }))

    setNewForm((prev) => {
      switch (field) {
        case "patient":
          return { ...prev, patient: safeText, patientContactId: undefined }
        case "surgeon":
          return { ...prev, surgeon: safeText, surgeonContactId: undefined }
        case "institution":
          return { ...prev, institution: safeText, institutionContactId: undefined }
        case "client":
          return { ...prev, client: safeText, clientContactId: undefined }
        default:
          return prev
      }
    })

    setContactLookupRenderVersion((prev) => prev + 1)

    setStep0Errors((prev) => {
      switch (field) {
        case "patient":
          return { ...prev, patient: undefined }
        case "surgeon":
          return { ...prev, surgeon: undefined }
        case "institution":
          return { ...prev, institution: undefined }
        case "client":
          return { ...prev, client: undefined }
        default:
          return prev
      }
    })
  }, [setNewForm])

  const openCreateContactForField = useCallback((group: ContactSuggestionGroup) => {
    const defaultsByField: Record<ContactSuggestionField, Omit<PendingContactCreation, "field" | "detectedText" | "detectedDni">> = {
      patient: {
        defaultRoles: ["cliente"],
        defaultGroups: ["pacientes"],
        tipoPersona: "fisica",
      },
      surgeon: {
        defaultRoles: ["cliente"],
        defaultGroups: ["medicos"],
        tipoPersona: "fisica",
      },
      institution: {
        defaultRoles: ["cliente"],
        defaultGroups: ["instituciones"],
        tipoPersona: "juridica",
      },
      client: {
        defaultRoles: ["cliente"],
        defaultGroups: ["obras_sociales"],
        tipoPersona: "juridica",
      },
    }

    const defaults = defaultsByField[group.field]

    setPendingContactCreation({
      field: group.field,
      detectedText: group.detectedText,
      detectedDni: group.detectedDni,
      defaultRoles: defaults.defaultRoles,
      defaultGroups: defaults.defaultGroups,
      tipoPersona: defaults.tipoPersona,
    })
    setContactFormKey((prev) => prev + 1)
    setContactCreateOpen(true)
  }, [])

  const handleCreatedContactFromIa = useCallback((contacto: Contacto) => {
    if (!pendingContactCreation) return

    applySuggestedContact(pendingContactCreation.field, contacto)
    setContactCreateOpen(false)
    setPendingContactCreation(null)
  }, [applySuggestedContact, pendingContactCreation])

  const applyInlineAiValue = useCallback((field: InlineAiValueField) => {
    if (!aiExtraction.result) return

    const { extracted } = aiExtraction.result
    const { formFields } = mapAiToWizardForm(extracted)

    if (field === "patient" || field === "surgeon" || field === "institution" || field === "client") {
      const group = contactSuggestionGroups.find((g) => g.field === field)
      if (group?.candidates[0]) {
        applySuggestedContact(field, group.candidates[0].contacto)
      } else if (group?.detectedText) {
        applyDetectedTextOnly(field, group.detectedText)
      }
      return
    }

    setNewForm((prev) => {
      switch (field) {
        case "date":
          return formFields.date ? { ...prev, date: formFields.date } : prev
        case "probableDate":
          return formFields.probableDate ? { ...prev, probableDate: formFields.probableDate } : prev
        case "provincia": {
          const updates: Partial<NewSurgeryForm> = {}
          if (extracted.provincia_sugerida.trim()) updates.provincia = extracted.provincia_sugerida.trim()
          if (extracted.localidad_sugerida.trim() && !prev.localidad.trim()) updates.localidad = extracted.localidad_sugerida.trim()
          return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev
        }
        default:
          return prev
      }
    })

    if (field === "provincia") {
      if (extracted.provincia_sugerida.trim()) setAutoFilledProvincia(true)
      if (extracted.localidad_sugerida.trim()) setAutoFilledLocalidad(true)
    }
  }, [aiExtraction.result, contactSuggestionGroups, applySuggestedContact, applyDetectedTextOnly, setNewForm])

  const renderInlineContactSuggestion = (field: ContactSuggestionField) => {
    const group = contactSuggestionGroups.find((candidate) => candidate.field === field)
    if (!group) return null

    const [bestCandidate, ...alternativeCandidates] = group.candidates
    const bestCandidateMeta = bestCandidate ? getContactIdentityMeta(bestCandidate.contacto) : []
    const quickCreateLabel = QUICK_CREATE_LABELS[group.field]

    return (
      <div className="mt-2 rounded-lg border border-border/80 bg-muted/30 p-2.5 text-[11px] dark:bg-muted/15 space-y-2">
        <div className="space-y-1">
          <p className="break-words leading-snug text-muted-foreground">
            <span className="font-semibold text-foreground">Detectado por IA:</span>{" "}
            <span className="text-foreground font-medium">{group.detectedText}</span>
            {group.detectedDni ? <span className="text-muted-foreground"> · DNI {group.detectedDni}</span> : null}
          </p>
          {bestCandidate ? (
            <p className="break-words leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground">Coincidencia:</span>{" "}
              <span className="text-foreground font-medium">{bestCandidate.contacto.nombre}</span>
              {bestCandidateMeta.length > 0 ? <span> · {bestCandidateMeta.join(" · ")}</span> : null}
            </p>
          ) : (
            <p className="leading-snug text-muted-foreground">Sin coincidencia clara en contactos existentes.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/40">
          {bestCandidate ? (
            <Button type="button" size="sm" className="h-6.5 px-2 text-[10px] font-medium" onClick={() => applySuggestedContact(group.field, bestCandidate.contacto)}>
              Usar
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="h-6.5 px-2 text-[10px] font-medium" onClick={() => openCreateContactForField(group)}>
            {quickCreateLabel}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-6.5 px-2 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => applyDetectedTextOnly(group.field, group.detectedText)}>
            Mantener texto
          </Button>
        </div>

        {alternativeCandidates.length > 0 && (
          <details className="pt-1.5 border-t border-border/40">
            <summary className="cursor-pointer list-none text-[10px] font-medium text-muted-foreground hover:text-foreground">
              Ver alternativas ({alternativeCandidates.length})
            </summary>
            <div className="mt-1 space-y-1">
              {alternativeCandidates.map((candidate, index) => {
                const candidateMeta = getContactIdentityMeta(candidate.contacto)

                return (
                  <div key={`${group.field}-${candidate.contacto.id}-${index}`} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-muted/40">
                    <p className="min-w-0 truncate text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground">{candidate.contacto.nombre}</span>
                      {candidateMeta.length > 0 ? <span> · {candidateMeta.join(" · ")}</span> : null}
                    </p>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => applySuggestedContact(group.field, candidate.contacto)}>
                      Usar
                    </Button>
                  </div>
                )
              })}
            </div>
          </details>
        )}
      </div>
    )
  }

  const renderInlineAiValueSuggestion = (params: {
    field: InlineAiValueField
    eyebrow: string
    value?: string
    secondaryValue?: string
    hidden?: boolean
    applyLabel?: string
  }) => {
    const { field, eyebrow, value, secondaryValue, hidden, applyLabel = "Aplicar" } = params

    if (hidden || !value?.trim()) return null

    return (
      <div className="mt-2 rounded-md border border-emerald-200/80 bg-emerald-50/50 px-2.5 py-2 text-[11px] text-foreground dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {eyebrow}
            </p>
            <p className="font-medium break-words">{value}</p>
            {secondaryValue ? <p className="text-muted-foreground mt-0.5">{secondaryValue}</p> : null}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => applyInlineAiValue(field)}>
            {applyLabel}
          </Button>
        </div>
      </div>
    )
  }

  const getResolvedContactValue = useCallback((field: ContactSuggestionField, contactId?: string) => {
    const override = contactSelectionOverrides[field]
    if (override && contactId && override.id === contactId) {
      return override
    }
    return store.getContactoById(contactId || "")
  }, [contactSelectionOverrides, store])

  const hasTextOnlyContactField = useCallback((field: ContactSuggestionField) => {
    switch (field) {
      case "patient":
        return Boolean(textOnlyContactFields.patient && newForm.patient.trim() && !newForm.patientContactId)
      case "surgeon":
        return Boolean(textOnlyContactFields.surgeon && newForm.surgeon.trim() && !newForm.surgeonContactId)
      case "institution":
        return Boolean(textOnlyContactFields.institution && newForm.institution.trim() && !newForm.institutionContactId)
      case "client":
        return Boolean(textOnlyContactFields.client && newForm.client.trim() && !newForm.clientContactId)
      default:
        return false
    }
  }, [newForm, textOnlyContactFields])

  const renderTextOnlyContactIndicator = (field: ContactSuggestionField) => {
    if (!hasTextOnlyContactField(field)) return null

    return (
      <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1.5 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
        <span className="font-semibold">Texto sin contacto vinculado.</span>{" "}
        <span className="text-amber-700/90 dark:text-amber-300/80">Se usará el texto detectado; no queda asociado a una ficha de contacto.</span>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { handleRequestClose() } else { onOpenChange(true) } }}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className={cn(
          dialogClass,
          "flex flex-col overflow-hidden p-0 gap-0"
        )}
      >
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
            {/* Wizard progress + AI rail toggle */}
            {!creationDone && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2" aria-label="Wizard steps">
                  {STEP_LABELS.map((step, i) => {
                    const isCurrent = i === wizardStep
                    const isCompleted = i < wizardStep

                    return (
                      <React.Fragment key={i}>
                        <div
                          aria-current={isCurrent ? "step" : undefined}
                          className={cn(
                            "flex items-center gap-2 rounded-full border px-2 py-1 shrink-0 transition-colors",
                            isCurrent && "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
                            isCompleted && "border-emerald-200 bg-emerald-600 text-white dark:border-emerald-700",
                            !isCurrent && !isCompleted && "border-border bg-background text-muted-foreground"
                          )}
                        >
                          <span className={cn(
                            "flex items-center justify-center size-5 rounded-full text-[10px] font-semibold",
                            isCompleted && "bg-white/20 text-white",
                            isCurrent && "bg-emerald-600 text-white",
                            !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                          )}>
                            {i + 1}
                          </span>
                          <span className="hidden sm:inline text-[10px] font-medium whitespace-nowrap">
                            {step}
                          </span>
                        </div>
                        {i < STEP_LABELS.length - 1 && (
                          <div className={cn("hidden sm:block w-5 h-px", i < wizardStep ? "bg-emerald-500" : "bg-border")} />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>

                {wizardStep === 0 && (
                  <Button
                    type="button"
                    variant={aiRailOpen ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5 px-3 rounded-full transition-all duration-150 active:scale-[0.98]",
                      aiRailOpen
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs font-semibold"
                        : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/60 font-medium"
                    )}
                    onClick={() => setAiRailOpen(!aiRailOpen)}
                    title={aiRailOpen ? "Ocultar panel asistente IA" : "Mostrar panel asistente IA"}
                  >
                    <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Asistente IA</span>
                    {!aiRailOpen ? (
                      <span className="relative flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ═══════════ Paso 0 — Datos del caso ═══════════ */}
        {wizardStep === 0 && !creationDone && (
          <div ref={step0Ref} className="flex-1 min-h-0 flex overflow-hidden bg-background">
            {/* Formulario principal continuo adaptativo a 1080p y 1366x768 */}
            <div className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-6 py-3 sm:py-3.5 space-y-3 sm:space-y-3.5 @container/form">
              {/* NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-01): Critical Missing Bar. */}
              {Object.keys(step0Errors).length > 0 && (
                <div>
                  <MissingFieldsBar errors={step0Errors} fields={STEP0_FIELD_MAP} />
                </div>
              )}

              {/* Sub-header con interruptor de Urgencia */}
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                    Datos del caso clínico
                  </h3>
                  <span className="hidden sm:inline text-xs text-muted-foreground">· Información quirúrgica, paciente y cobertura comercial</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-0.5 dark:border-slate-800 dark:bg-slate-900/70 shadow-2xs">
                  <Switch
                    id="urgente-switch"
                    checked={newForm.urgente}
                    onCheckedChange={(checked) => setNewForm({ ...newForm, urgente: !!checked })}
                    className="scale-75"
                  />
                  <Label htmlFor="urgente-switch" className="cursor-pointer select-none text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Urgente
                  </Label>
                  {newForm.urgente && <Badge variant="destructive" className="text-[9px] px-1 py-0 font-bold">URGENTE</Badge>}
                </div>
              </div>

              {/* Formulario adaptativo de 2 columnas en desktop para aprovechar el ancho y eliminar scroll */}
              <div className="max-w-[1540px] mx-auto pb-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 @[960px]/form:grid-cols-2 gap-3.5 items-start">
                  {/* Columna Izquierda: Actores y Destino */}
                  <div className="space-y-3 min-w-0">
                    {/* ── Bloque 1: Actores Intervinientes ── */}
                <section className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                        <Users className="size-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground">
                        1. Actores Intervinientes
                      </h4>
                    </div>
                    {newForm.patient.trim() && newForm.surgeon.trim() && newForm.institution.trim() && (facturarA !== "cliente" || newForm.client.trim()) ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                        Completos ✓
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                        {[!newForm.patient.trim(), !newForm.surgeon.trim(), !newForm.institution.trim(), facturarA === "cliente" && !newForm.client.trim()].filter(Boolean).length} requeridos pendientes
                      </Badge>
                    )}
                  </div>

                  {/* Fila Actores: 2 columnas balanceadas para que ContactLookupField respire sin colapsar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 items-start">
                    {/* Paciente */}
                    <div data-step0-field="patient">
                      <ContactLookupField
                        key={`patient-${contactLookupRenderVersion}-${newForm.patientContactId || "none"}`}
                        label="Paciente *"
                        context={WIZARD_SEARCH_CONTEXTS.patient}
                        value={getResolvedContactValue("patient", newForm.patientContactId)}
                        onChange={(contacto) => {
                          setContactSelectionOverrides((prev) => ({ ...prev, patient: contacto }))
                          setTextOnlyContactFields((prev) => ({ ...prev, patient: false }))
                          if (contacto) {
                            setNewForm((prev) => ({ ...prev, patient: contacto.nombre, patientContactId: contacto.id }))
                          } else {
                            setNewForm((prev) => ({ ...prev, patient: "", patientContactId: undefined }))
                          }
                          if (step0Errors.patient) setStep0Errors({ ...step0Errors, patient: undefined })
                        }}
                        placeholder="Buscar paciente..."
                        error={step0Errors.patient}
                      />
                      {renderTextOnlyContactIndicator("patient")}
                      {renderInlineContactSuggestion("patient")}
                    </div>

                    {/* Médico */}
                    <div data-step0-field="surgeon">
                      <ContactLookupField
                        key={`surgeon-${contactLookupRenderVersion}-${newForm.surgeonContactId || "none"}`}
                        label="Médico *"
                        context={WIZARD_SEARCH_CONTEXTS.surgeon}
                        value={getResolvedContactValue("surgeon", newForm.surgeonContactId)}
                        onChange={(contacto) => {
                          setContactSelectionOverrides((prev) => ({ ...prev, surgeon: contacto }))
                          setTextOnlyContactFields((prev) => ({ ...prev, surgeon: false }))
                          if (contacto) {
                            setNewForm((prev) => ({ ...prev, surgeon: contacto.nombre, surgeonContactId: contacto.id }))
                          } else {
                            setNewForm((prev) => ({ ...prev, surgeon: "", surgeonContactId: undefined }))
                          }
                          if (step0Errors.surgeon) setStep0Errors({ ...step0Errors, surgeon: undefined })
                        }}
                        placeholder="Buscar médico..."
                        error={step0Errors.surgeon}
                      />
                      {renderTextOnlyContactIndicator("surgeon")}
                      {renderInlineContactSuggestion("surgeon")}
                    </div>

                    {/* Institución */}
                    <div data-step0-field="institution">
                      <ContactLookupField
                        key={`institution-${contactLookupRenderVersion}-${newForm.institutionContactId || "none"}`}
                        label="Institución *"
                        context={WIZARD_SEARCH_CONTEXTS.institution}
                        value={getResolvedContactValue("institution", newForm.institutionContactId)}
                        onChange={(contacto) => {
                          setContactSelectionOverrides((prev) => ({ ...prev, institution: contacto }))
                          setTextOnlyContactFields((prev) => ({ ...prev, institution: false }))
                          if (contacto) {
                            setNewForm((prev) => {
                              const updates: Partial<NewSurgeryForm> = {
                                institution: contacto.nombre,
                                institutionContactId: contacto.id,
                              }
                              if (remitirAInstitucion) {
                                updates.provincia = contacto.provincia || ""
                                updates.localidad = contacto.localidad || ""
                                setAutoFilledProvincia(Boolean(contacto.provincia))
                                setAutoFilledLocalidad(Boolean(contacto.localidad))
                              }
                            return { ...prev, ...updates }
                          })
                        } else {
                          setNewForm((prev) => ({ ...prev, institution: "", institutionContactId: undefined, ...(remitirAInstitucion ? { provincia: "", localidad: "" } : {}) }))
                          if (remitirAInstitucion) {
                            setAutoFilledProvincia(false)
                            setAutoFilledLocalidad(false)
                          }
                        }
                        if (step0Errors.institution) setStep0Errors({ ...step0Errors, institution: undefined })
                      }}
                      placeholder="Buscar institución..."
                      error={step0Errors.institution}
                    />
                    {renderTextOnlyContactIndicator("institution")}
                    {renderInlineContactSuggestion("institution")}
                  </div>

                  {/* Coordinador de CX */}
                  <div>
                    <ContactLookupField
                      label="Coordinador de CX"
                      context={WIZARD_SEARCH_CONTEXTS.coordinadorCx}
                      value={store.getContactoById(newForm.coordinadorContactId || "")}
                      onChange={(contacto) => {
                        if (contacto) {
                          setNewForm((prev) => ({ ...prev, coordinadorCx: contacto.nombre, coordinadorContactId: contacto.id }))
                        } else {
                          setNewForm((prev) => ({ ...prev, coordinadorCx: "Sin asignar", coordinadorContactId: undefined }))
                        }
                      }}
                      placeholder="Buscar coordinador..."
                    />
                  </div>
                </div>

                {/* Facturar a — Segmented Control estilizado */}
                <div className="pt-2.5 border-t border-border/50 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-foreground">Facturar a:</span>
                      <HelpTip text="Indica a qué contacto o entidad se imputará el presupuesto y la factura emitida de este caso." side="top" />
                    </div>
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-border/50 gap-0.5 flex-wrap">
                      {[
                        { id: "cliente", label: "Cliente / Obra Social" },
                        { id: "paciente", label: "Al Paciente" },
                        { id: "medico", label: "Al Médico" },
                        { id: "institucion", label: "A la Institución" },
                      ].map((opt) => {
                        const active = facturarA === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setFacturarA(opt.id as any)
                              if (opt.id === "paciente") {
                                setNewForm((prev) => ({ ...prev, client: prev.patient || "Paciente", clientContactId: prev.patientContactId }))
                                if (step0Errors.client) setStep0Errors({ ...step0Errors, client: undefined })
                              } else if (opt.id === "medico") {
                                setNewForm((prev) => ({ ...prev, client: prev.surgeon || "Médico", clientContactId: prev.surgeonContactId }))
                                if (step0Errors.client) setStep0Errors({ ...step0Errors, client: undefined })
                              } else if (opt.id === "institucion") {
                                setNewForm((prev) => ({ ...prev, client: prev.institution || "Institución", clientContactId: prev.institutionContactId }))
                                if (step0Errors.client) setStep0Errors({ ...step0Errors, client: undefined })
                              }
                            }}
                            className={cn(
                              "h-7 text-xs font-medium rounded-md px-2.5 transition-all duration-150 ease-out active:scale-[0.98]",
                              active
                                ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                                : "text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                            )}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {facturarA === "cliente" ? (
                    <div data-step0-field="client" className="pt-0.5 max-w-2xl">
                      <ContactLookupField
                        key={`client-${contactLookupRenderVersion}-${newForm.clientContactId || "none"}`}
                        label="Cliente / Pagador *"
                        context={WIZARD_SEARCH_CONTEXTS.client}
                        value={getResolvedContactValue("client", newForm.clientContactId)}
                        onChange={(contacto) => {
                          setContactSelectionOverrides((prev) => ({ ...prev, client: contacto }))
                          setTextOnlyContactFields((prev) => ({ ...prev, client: false }))
                          if (contacto) {
                            setNewForm((prev) => ({ ...prev, client: contacto.nombre, clientContactId: contacto.id }))
                          } else {
                            setNewForm((prev) => ({ ...prev, client: "", clientContactId: undefined }))
                          }
                          if (step0Errors.client) setStep0Errors({ ...step0Errors, client: undefined })
                        }}
                        placeholder="Buscar obra social, prepaga o empresa..."
                        error={step0Errors.client}
                      />
                      {renderTextOnlyContactIndicator("client")}
                      {renderInlineContactSuggestion("client")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-foreground max-w-2xl">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">
                        Factura y presupuesto a nombre de{" "}
                        <strong>{facturarA === "paciente" ? "Paciente" : facturarA === "medico" ? "Médico" : "Institución"}</strong>:{" "}
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                          {newForm.client || "(Seleccione el contacto arriba para completar el pagador)"}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </section>

                {/* ── Bloque 2: Lugar de Entrega & Remisión ── */}
                <section className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                        <Truck className="size-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground">
                        2. Lugar de Entrega & Remisión
                      </h4>
                      <HelpTip text="Destino para el remito de materiales y logística de cajas de cirugía." side="top" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="remitir-inst-switch"
                        checked={remitirAInstitucion}
                        onCheckedChange={(checked) => {
                          const val = !!checked
                          setRemitirAInstitucion(val)
                          if (val && newForm.institutionContactId) {
                            const inst = store.getContactoById(newForm.institutionContactId)
                            if (inst) {
                              setNewForm((prev) => ({
                                ...prev,
                                provincia: inst.provincia || "",
                                localidad: inst.localidad || "",
                              }))
                            }
                          }
                        }}
                        className="scale-75"
                      />
                      <Label htmlFor="remitir-inst-switch" className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        Remitir a la institución por defecto
                        <HelpTip text="Sincroniza automáticamente localidad y provincia con la institución seleccionada." side="top" />
                      </Label>
                    </div>
                  </div>

                  <div className="max-w-2xl space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs font-semibold text-foreground/90">Lugar (Localidad & Provincia)</Label>
                      <HelpTip text="Podés buscar cualquier localidad de Argentina o ingresar texto libre. Se utilizará para remito y logística." side="top" />
                      {remitirAInstitucion && newForm.institution.trim() && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                          Tomado de {newForm.institution}
                        </Badge>
                      )}
                    </div>
                    <LugarSelector
                      provincia={newForm.provincia}
                      localidad={newForm.localidad}
                      onChange={({ provincia, localidad }) => {
                        setNewForm((prev) => ({ ...prev, provincia, localidad }))
                        setAutoFilledProvincia(false)
                        setAutoFilledLocalidad(false)
                        if (remitirAInstitucion) setRemitirAInstitucion(false)
                      }}
                      placeholder="Buscar localidad y provincia (ej: Curuzú Cuatiá, Corrientes)..."
                    />
                    {renderInlineAiValueSuggestion({
                      field: "provincia",
                      eyebrow: "IA detectó ubicación",
                      value: aiExtraction.result?.extracted.provincia_sugerida,
                      secondaryValue: aiExtraction.result?.extracted.localidad_sugerida
                        ? `Localidad sugerida: ${aiExtraction.result.extracted.localidad_sugerida}`
                        : undefined,
                      hidden: Boolean(newForm.provincia.trim() && newForm.localidad.trim()),
                      applyLabel: "Pasar al campo",
                    })}
                  </div>
                </section>
              </div>

              {/* Columna Derecha: Tiempos, Autorización & Operatoria */}
              <div className="space-y-3 min-w-0">
                {/* ── Bloque 3: Fechas & Autorización ── */}
                <section className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                        <CalendarDays className="size-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground">
                        3. Fechas & Autorización Médica
                      </h4>
                    </div>
                  </div>

                  {/* Fila Fechas Operativas */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 @[600px]/form:grid-cols-4 gap-2.5 items-start">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        Fecha CX
                        <HelpTip text="Fecha programada de la intervención quirúrgica." side="top" />
                      </Label>
                      <Input
                        type="date"
                        value={newForm.date}
                        onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                        className="h-8 text-sm"
                      />
                      {renderInlineAiValueSuggestion({
                        field: "date",
                        eyebrow: "IA detectó fecha de cirugía",
                        value: aiExtraction.result?.extracted.fecha_cirugia,
                        hidden: Boolean(newForm.date.trim()),
                        applyLabel: "Pasar al campo",
                      })}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Hora</Label>
                      <Input
                        type="time"
                        value={newForm.time}
                        onChange={(e) => setNewForm({ ...newForm, time: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        Fecha probable
                        <HelpTip text="Fecha estimada si la confirmación de quirófano aún no es definitiva." side="top" />
                      </Label>
                      <Input
                        type="date"
                        value={newForm.probableDate}
                        onChange={(e) => setNewForm({ ...newForm, probableDate: e.target.value })}
                        className="h-8 text-sm"
                      />
                      {renderInlineAiValueSuggestion({
                        field: "probableDate",
                        eyebrow: "IA detectó fecha probable",
                        value: aiExtraction.result?.extracted.fecha_probable,
                        hidden: Boolean(newForm.probableDate.trim()),
                        applyLabel: "Pasar al campo",
                      })}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        Fecha envío material
                        <HelpTip text="Fecha límite en que la caja e implantes deben arribar al centro médico." side="top" />
                      </Label>
                      <Input
                        type="date"
                        value={newForm.fechaEnvioMaterial}
                        onChange={(e) => setNewForm({ ...newForm, fechaEnvioMaterial: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Fila Autorización & Carga IA */}
                  <div className="pt-2.5 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    {/* N° de Autorización */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            N° de Autorización
                            <HelpTip text="Número emitido por la obra social o prepaga para trazabilidad y facturación." side="top" />
                          </Label>
                          {aiExtraction.result?.extracted.numero_autorizacion && !primaryAuthNumber && (
                            <button
                              type="button"
                              onClick={() => handleAuthNumberChange(aiExtraction.result?.extracted.numero_autorizacion || "")}
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Sparkles className="size-2.5" /> Aplicar: {aiExtraction.result.extracted.numero_autorizacion}
                            </button>
                          )}
                        </div>
                        <Input
                          type="text"
                          value={primaryAuthNumber}
                          onChange={(e) => handleAuthNumberChange(e.target.value)}
                          placeholder="Ej: AUT-2026-9812..."
                          className="h-8 text-sm"
                        />
                      </div>

                      <div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowAdditionalRefs(!showAdditionalRefs)}
                        >
                          {showAdditionalRefs ? "Ocultar referencias adicionales ▲" : "+ Agregar otras referencias (DNI, Siniestro, etc.) ▼"}
                        </Button>
                      </div>
                    </div>

                    {/* Dropzone directa de orden / autorización */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        Documento de orden / autorización médica
                        <HelpTip text="Subí el PDF o foto para autocompletar el caso automáticamente con IA." side="top" />
                      </Label>
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files?.[0]) {
                            await handleAiFileSelected(e.dataTransfer.files[0])
                          }
                        }}
                        className={cn(
                          "relative flex items-center justify-center border border-dashed rounded-lg p-2.5 text-center transition-colors cursor-pointer hover:bg-muted/30 min-h-[58px]",
                          uploadedAiFile ? "border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20" : "border-border/80"
                        )}
                      >
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              await handleAiFileSelected(e.target.files[0])
                            }
                          }}
                        />
                        {uploadedAiFile ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <div className="text-left">
                              <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{uploadedAiFile.name}</p>
                              <p className="text-[10px] text-muted-foreground">Documento adjunto y procesado con IA</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive ml-2 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetAiResult();
                              }}
                            >
                              Cambiar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground py-0.5">
                            <UploadCloud className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="text-left">
                              <p className="text-xs font-medium text-foreground">Soltá la orden médica acá o hacé clic</p>
                              <p className="text-[10px]">PDF o imagen hasta 4MB para autocompletar con IA</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Editor colapsable de referencias adicionales */}
                  {showAdditionalRefs && (
                    <div className="pt-2 border-t border-border/40">
                      <ReferenciasAdministrativasEditor
                        value={newForm.referenciasAdministrativas}
                        onChange={(refs) => setNewForm({ ...newForm, referenciasAdministrativas: refs })}
                      />
                    </div>
                  )}
                </section>

                {/* ── Bloque 4: Operativo & Observaciones ── */}
                <section className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                        <ClipboardList className="size-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground">
                        4. Procedimiento & Observaciones Operativas
                      </h4>
                    </div>
                    {newForm.classification ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                        Clasificación asignada ✓
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                        Clasificación pendiente *
                      </Badge>
                    )}
                  </div>

                  {/* Fila Clasificación, Vendedor, Instrumentador */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 items-start">
                    {/* Clasificación */}
                    <div className="space-y-1" data-step0-field="classification">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        Clasificación *
                        <HelpTip text="Clasificación quirúrgica para parametrización y estadísticas operativas." side="top" />
                      </Label>
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
                              step0Errors.classification && "border-destructive text-destructive"
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

                    {/* Vendedor */}
                    <div>
                      <ContactLookupField
                        label="Vendedor"
                        context={WIZARD_SEARCH_CONTEXTS.vendedor}
                        value={store.getContactoById(newForm.vendedorContactId || "")}
                        onChange={(contacto) => {
                          if (contacto) {
                            setNewForm((prev) => ({ ...prev, vendedor: contacto.nombre, vendedorContactId: contacto.id }))
                          } else {
                            setNewForm((prev) => ({ ...prev, vendedor: "Sin asignar", vendedorContactId: undefined }))
                          }
                        }}
                        placeholder="Buscar vendedor..."
                      />
                    </div>

                    {/* Instrumentador */}
                    <div>
                      <ContactLookupField
                        label="Instrumentador"
                        context={WIZARD_SEARCH_CONTEXTS.instrumentador}
                        value={store.getContactoById(newForm.instrumentadorContactId || "")}
                        onChange={(contacto) => {
                          if (contacto) {
                            setNewForm((prev) => ({ ...prev, instrumentador: contacto.nombre, instrumentadorContactId: contacto.id }))
                          } else {
                            setNewForm((prev) => ({ ...prev, instrumentador: "Sin asignar", instrumentadorContactId: undefined }))
                          }
                        }}
                        placeholder="Buscar instrumentador..."
                      />
                    </div>
                  </div>

                  {/* Fila Leyenda y Notas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 items-start pt-2 border-t border-border/40">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1">
                          Leyenda para remito
                          <HelpTip text="Texto impreso en el remito de materiales para chofer o instrumentación." side="top" />
                        </Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="leyenda-destacada"
                            checked={newForm.leyendaDestacada}
                            onCheckedChange={(checked) => setNewForm({ ...newForm, leyendaDestacada: !!checked })}
                          />
                          <Label htmlFor="leyenda-destacada" className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground">
                            Destacada
                          </Label>
                          {newForm.leyendaDestacada && <Badge variant="warning" className="text-[9px] px-1.5 py-0">DESTACADA</Badge>}
                        </div>
                      </div>
                      <Textarea
                        value={newForm.leyenda}
                        onChange={(e) => setNewForm({ ...newForm, leyenda: e.target.value })}
                        placeholder="Observaciones / leyenda impresa en el remito..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Notas internas operativas</Label>
                      <Textarea
                        value={newForm.notes}
                        onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                        placeholder="Comentarios internos del equipo de coordinación..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

            {/* Asistente lateral de IA */}
            {aiRailOpen && (
              <AiLateralRail
                isOpen={aiRailOpen}
                onClose={() => setAiRailOpen(false)}
                companyId={companyId}
                isProcessing={aiExtraction.isProcessing}
                error={aiExtraction.error}
                result={aiExtraction.result}
                uploadedFile={uploadedAiFile}
                saveAuthorizationImage={saveAuthorizationImage}
                onToggleSaveAuthorizationImage={setSaveAuthorizationImage}
                onFileSelected={handleAiFileSelected}
                onApplyAll={handleApplyAiResult}
                onReset={handleResetAiResult}
                hasApplied={aiSuggestionsApplied}
                onReviewData={handleReviewAiFields}
                onApplyField={(field) => applyInlineAiValue(field)}
                patientValue={newForm.patient}
                surgeonValue={newForm.surgeon}
                institutionValue={newForm.institution}
                clientValue={newForm.client}
                dateValue={newForm.date}
              />
            )}
          </div>
        )}

        {/* ═══════════ Paso 1 — Presupuesto (WORKSPACE LAYOUT) ═══════════ */}
        {wizardStep === 1 && !creationDone && (
          <div ref={step1Ref} className="flex flex-col flex-1 min-h-0 bg-background">
            {/* ── Context bar — cotización context ── */}
            <div className="shrink-0 px-4 py-2 bg-muted/25 border-b text-[11px]">
              {/* Row 1: Cliente + datos fiscales/comerciales */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
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

            {/* ── Mode selector bar + Conditions ribbon ── */}
            <div className="shrink-0 px-4 py-1.5 bg-background border-b flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-md border p-0.5 bg-muted/40">
                  <Button
                    type="button"
                    size="sm"
                    variant={createPRNow ? "default" : "ghost"}
                    className={cn(
                      "h-6 text-[10px] px-2.5 font-medium shadow-none",
                      createPRNow ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground"
                    )}
                    onClick={() => setCreatePRNow(true)}
                    data-testid="toggle-create-pr"
                  >
                    Con presupuesto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!createPRNow ? "secondary" : "ghost"}
                    className={cn(
                      "h-6 text-[10px] px-2.5 font-medium shadow-none",
                      !createPRNow ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                    onClick={() => setCreatePRNow(false)}
                    data-testid="toggle-no-pr"
                  >
                    Sin presupuesto
                  </Button>
                </div>
              </div>

              {createPRNow && (
                <div className="flex-1 min-w-[280px] flex justify-end">
                  <CondicionesSection
                    formData={prForm.formData}
                    updateField={prForm.updateField}
                    errors={step1Errors}
                    compact
                  />
                </div>
              )}
            </div>

            {createPRNow ? (
              <>
                {/* ── Commercial identity (Sucursal, Cliente, Lista de precios) ── */}
                <div className="shrink-0 border-b bg-muted/10 px-4 py-2">
                  <PresupuestoCommercialIdentityFields formData={prForm.formData} errors={step1Errors} updateField={prForm.updateField} />
                </div>

                {/* ── Operational Toolbar + live counter ── */}
                <div className="shrink-0 px-4 py-1 border-b border-border/70 flex items-center justify-between gap-2 bg-muted/30">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="default" className="h-6 text-[10px] gap-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => prForm.addItem()} data-testid="add-item-btn">
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
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2 text-muted-foreground" disabled title="Configuración de columnas (próximamente)">
                      <Settings2 className="size-3" /> Columnas
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {prForm.items.length} {prForm.items.length === 1 ? "artículo" : "artículos"}
                    </span>
                    <Badge variant="outline" className="h-5 text-[10px] font-semibold tabular-nums border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                      Total: ${prForm.total.toLocaleString("es-AR")}
                    </Badge>
                  </div>
                </div>

                {/* ── Step 1 validation errors ── */}
                {step1Errors.items && (
                  <div className="shrink-0 px-4 py-1.5 bg-destructive/10 border-b border-destructive/20 text-[11px] text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{step1Errors.items}</span>
                  </div>
                )}

                {/* ── Grid items table ── */}
                <div className="flex-1 min-h-0 flex flex-col px-4 py-2">
                  <PresupuestoItemsTable
                    items={prForm.items}
                    addItem={prForm.addItem}
                    removeItem={prForm.removeItem}
                    updateItem={prForm.updateItem}
                    errors={prForm.errors}
                    workspace
                  />
                </div>

                {/* ── Economic closure footer ── */}
                <div className="shrink-0 border-t-2 border-border bg-muted/20 px-4 py-2 flex items-start gap-4">
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
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-dashed border-border/80 bg-muted/10 p-8">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <FileText className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Cirugía sin presupuesto</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        La cirugía se creará sin presupuesto comercial asociado. Podrás confeccionar, cargar o importar el presupuesto en cualquier momento desde el expediente quirúrgico.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                      onClick={() => setCreatePRNow(true)}
                    >
                      <Plus className="size-3.5 mr-1.5" /> Confeccionar presupuesto ahora
                    </Button>
                  </div>
                </div>
                <div className="shrink-0 border-t bg-muted/20 px-4 py-2">
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
          <div className="flex flex-col flex-1 min-h-0 bg-background overflow-hidden">
            {/* Header del paso de confirmación */}
            <div className="shrink-0 px-6 py-2.5 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Resumen de la cirugía</h3>
                <p className="text-[11px] text-muted-foreground">Lectura final antes de crear el expediente.</p>
              </div>
              <div className="flex items-center gap-2">
                {newForm.urgente && <Badge variant="destructive" className="text-[10px] font-bold tracking-wide">URGENTE</Badge>}
                {createPRNow && prForm.items.length > 0 ? (
                  <Badge variant="outline" className="text-[10px] font-semibold border-emerald-400 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                    Con presupuesto (${prForm.total.toLocaleString("es-AR")})
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Sin presupuesto</Badge>
                )}
              </div>
            </div>

            {/* Tablero ejecutivo de 3 columnas */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ── Columna 1: Ficha del Caso y Clínica ── */}
                <div className="space-y-4">
                  <section className="rounded-lg border border-border/80 bg-card p-3.5 shadow-xs space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
                      <User className="size-3.5 text-emerald-600" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Datos principales</p>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                        <span className="text-muted-foreground">Cliente / Pagador:</span>
                        <span className="font-semibold text-right">{newForm.client || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                        <span className="text-muted-foreground">Paciente:</span>
                        <span className="font-semibold text-right">{newForm.patient || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                        <span className="text-muted-foreground">Médico:</span>
                        <span className="font-semibold text-right">{newForm.surgeon || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                        <span className="text-muted-foreground">Institución:</span>
                        <span className="font-semibold text-right">{newForm.institution || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2 py-0.5">
                        <span className="text-muted-foreground">Clasificación:</span>
                        <span className="font-semibold text-right text-emerald-700 dark:text-emerald-400">{newForm.classification || "—"}</span>
                      </div>
                    </div>
                  </section>

                  {(newForm.date || newForm.probableDate || newForm.fechaEnvioMaterial) && (
                    <section className="rounded-lg border border-border/80 bg-card p-3.5 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
                        <Calendar className="size-3.5 text-blue-600" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fechas</p>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {newForm.date && (
                          <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                            <span className="text-muted-foreground">Fecha CX:</span>
                            <span className="font-medium text-right tabular-nums">{formatDate(newForm.date)} {newForm.time ? `(${newForm.time} hs)` : ""}</span>
                          </div>
                        )}
                        {newForm.probableDate && (
                          <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                            <span className="text-muted-foreground">Fecha probable:</span>
                            <span className="font-medium text-right tabular-nums">{formatDate(newForm.probableDate)}</span>
                          </div>
                        )}
                        {newForm.fechaEnvioMaterial && (
                          <div className="flex justify-between gap-2 py-0.5">
                            <span className="text-muted-foreground">Fecha envío material:</span>
                            <span className="font-medium text-right tabular-nums">{formatDate(newForm.fechaEnvioMaterial)}</span>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  <section className="rounded-lg border border-border/80 bg-card p-3.5 shadow-xs space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1.5">Ubicación</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Provincia:</span>
                        <span className="font-medium">{newForm.provincia || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Localidad:</span>
                        <span className="font-medium">{newForm.localidad || "—"}</span>
                      </div>
                    </div>
                  </section>
                </div>

                {/* ── Columna 2: Aspecto Económico / Presupuesto ── */}
                <div className="space-y-4">
                  {createPRNow && prForm.items.length > 0 ? (
                    <section className="rounded-lg border border-border/80 bg-card p-3.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <Receipt className="size-3.5 text-emerald-600" />
                          <p className="text-xs font-semibold">
                            Presupuesto: {prForm.items.length} artículos — Total: ${prForm.total.toLocaleString("es-AR")}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
                        <div><span className="font-medium block text-foreground">Vigencia:</span> {prForm.formData.vigencia || "Sin seleccionar"}</div>
                        <div><span className="font-medium block text-foreground">Lista:</span> {prForm.formData.listaPrecios || "Sin seleccionar"}</div>
                        <div><span className="font-medium block text-foreground">Cond. pago:</span> {prForm.formData.condicionPago || "Sin seleccionar"}</div>
                      </div>

                      {/* Compact items table */}
                      <div className="border rounded-md overflow-hidden text-xs">
                        <div className="grid grid-cols-[60px_1fr_40px_70px_40px_70px] bg-muted/60 text-[9px] font-semibold text-muted-foreground border-b">
                          <div className="px-1.5 py-1">Código</div>
                          <div className="px-1.5 py-1">Artículo</div>
                          <div className="px-1.5 py-1 text-right">Cant.</div>
                          <div className="px-1.5 py-1 text-right">P.Unit.</div>
                          <div className="px-1.5 py-1 text-right">Dto.%</div>
                          <div className="px-1.5 py-1 text-right">Subtotal</div>
                        </div>
                        <div className="max-h-[260px] overflow-y-auto divide-y divide-border/40">
                          {prForm.items.map((item, idx) => {
                            const lineBruto = item.quantity * item.unitPrice
                            const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
                            const lineNeto = lineBruto * (1 - clampedDiscount / 100)
                            return (
                              <div key={idx} className="grid grid-cols-[60px_1fr_40px_70px_40px_70px] text-[10px] hover:bg-muted/30">
                                <div className="px-1.5 py-1 truncate text-muted-foreground">{item.code || "—"}</div>
                                <div className="px-1.5 py-1 truncate font-medium">{item.name}</div>
                                <div className="px-1.5 py-1 text-right tabular-nums">{item.quantity}</div>
                                <div className="px-1.5 py-1 text-right tabular-nums">${item.unitPrice.toLocaleString("es-AR")}</div>
                                <div className="px-1.5 py-1 text-right tabular-nums">{clampedDiscount > 0 ? `${clampedDiscount}%` : "—"}</div>
                                <div className="px-1.5 py-1 text-right tabular-nums font-semibold">${lineNeto.toLocaleString("es-AR")}</div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 border-t">
                          <span className="text-[10px] text-muted-foreground">{prForm.items.length} artículo{prForm.items.length !== 1 ? "s" : ""}</span>
                          <span className="text-[11px] font-bold text-foreground tabular-nums">Total: ${prForm.total.toLocaleString("es-AR")}</span>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-6 text-center space-y-2">
                      <Badge variant="secondary" className="text-xs">Sin presupuesto</Badge>
                      <p className="text-xs text-muted-foreground">La cirugía se creará sin presupuesto asociado.</p>
                      <p className="text-[11px] text-muted-foreground/70">Podrás confeccionar o importar el presupuesto posteriormente desde el expediente del caso.</p>
                    </section>
                  )}
                </div>

                {/* ── Columna 3: Gestión Operativa, Adjuntos y Observaciones ── */}
                <div className="space-y-4">
                  <section className="rounded-lg border border-border/80 bg-card p-3.5 shadow-xs space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1.5">Ubicación y gestión</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                        <span className="text-muted-foreground">Coordinador CX:</span>
                        <span className="font-medium text-right">{newForm.coordinadorCx || "Sin asignar"}</span>
                      </div>
                      <div className="flex justify-between gap-2 py-0.5 border-b border-border/30">
                        <span className="text-muted-foreground">Vendedor:</span>
                        <span className="font-medium text-right">{newForm.vendedor || "Sin asignar"}</span>
                      </div>
                      <div className="flex justify-between gap-2 py-0.5">
                        <span className="text-muted-foreground">Instrumentador:</span>
                        <span className="font-medium text-right">{newForm.instrumentador || "Sin asignar"}</span>
                      </div>
                    </div>
                  </section>

                  {/* Referencias administrativas */}
                  {cleanRefs(newForm.referenciasAdministrativas).length > 0 && (
                    <section className="rounded-lg border border-border/80 bg-card p-3.5 shadow-xs space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1.5">Referencias administrativas</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cleanRefs(newForm.referenciasAdministrativas).map((ref) => (
                          <Badge key={ref.id} variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/30">
                            {ref.tipo}: <span className="font-semibold ml-1">{ref.valor}</span>{ref.observacion ? ` (${ref.observacion})` : ""}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Comprobante de autorización adjunto */}
                  {uploadedAiFile && saveAuthorizationImage && (
                    <section className="rounded-lg border border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-800/80 dark:bg-emerald-950/20 p-3.5 shadow-xs space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Comprobante de autorización adjunto
                      </p>
                      <p className="text-xs font-medium text-emerald-950 dark:text-emerald-100">
                        {uploadedAiFile.name} (se fijará en Seguimiento al crear)
                      </p>
                    </section>
                  )}

                  {/* Leyenda */}
                  {newForm.leyenda && (
                    <section className={cn("rounded-lg p-3.5 text-xs shadow-xs border", newForm.leyendaDestacada ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700" : "bg-card border-border/80")}>
                      <div className="flex items-center justify-between border-b border-border/40 pb-1 mb-1.5">
                        <p className={cn("text-[11px] font-semibold uppercase tracking-wider", newForm.leyendaDestacada ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>
                          Leyenda {newForm.leyendaDestacada ? "(Destacada)" : ""}
                        </p>
                        {newForm.leyendaDestacada && <Badge variant="warning" className="text-[9px] h-4">DESTACADA</Badge>}
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap">{newForm.leyenda}</p>
                    </section>
                  )}

                  {/* Notas internas */}
                  {newForm.notes && (
                    <section className="rounded-lg bg-muted/40 border border-border/80 p-3.5 text-xs shadow-xs space-y-1">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1">Notas internas</p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{newForm.notes}</p>
                    </section>
                  )}
                </div>
              </div>

              {/* ── Anticipated actions preview banner ── */}
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 mt-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Al confirmar se creará la cirugía
                    {createPRNow ? " con el presupuesto asociado" : " sin presupuesto"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {createPRNow
                      ? "Luego podrá imprimir, enviar por correo o compartir el presupuesto por WhatsApp."
                      : "Podrá crear el presupuesto más tarde desde el expediente de la cirugía."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ Post-creation success panel ═══════════ */}
        {creationDone && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {(budgetStatus === "missing" || budgetStatus === "unverified" || intakeResult?.attachment === "unverified" || intakeResult?.refreshFailed) && (
              <div role="status" className="mb-3 space-y-1 text-xs text-amber-700 dark:text-amber-400">
                {budgetStatus === "missing" && <p>Alta parcial: cirugía guardada; presupuesto pendiente. Los datos se conservan para reintentar.</p>}
                {budgetStatus === "unverified" && <p>Cirugía guardada; resultado del presupuesto sin verificar. Solo se verificará su estado para evitar duplicados.</p>}
                {intakeResult?.attachment === "unverified" && <p>No se pudo confirmar el comprobante. Revise Seguimiento antes de volver a adjuntarlo.</p>}
                {intakeResult?.refreshFailed && <p>La cirugía está guardada, pero la lista no pudo actualizarse. Recargue para verla.</p>}
              </div>
            )}
            {presupuestoRetrying && <p role="status" className="mb-2 text-xs">Verificando presupuesto…</p>}
            <PostCreationPanel
              hasPresupuesto={Boolean(presupuestoCreated)}
              surgeryId={createdSurgeryId || "—"}
              patientName={newForm.patient}
              classification={newForm.classification}
              onGoToExpediente={() => {
                const surgeryId = intakeResult?.surgeryId ?? createdSurgeryId
                const loadedSurgery = store.surgeries.find((item) => item.backendId === surgeryId || item.id === surgeryId)
                if (!loadedSurgery || !onOpenCreatedSurgery) {
                  toast.error("No se pudo abrir el expediente: la cirugía aún no está disponible en la lista. Los datos se conservan en este diálogo.")
                  return
                }
                onOpenCreatedSurgery(loadedSurgery.id)
                handleClose()
              }}
              onCreatePresupuestoLater={() => {
                if (createPRNow && !presupuestoCreated) {
                  if (!presupuestoRetrying) void retryPresupuesto()
                } else handleClose()
              }}
            />
          </div>
        )}

        {/* ═══════════ Footer ═══════════ */}
        <DialogFooter className={cn(
          "shrink-0 border-t px-4 py-2",
          wizardStep === 1 && "bg-muted/20"
        )}>
          {/* NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-04): read-only missing count.
              Informational only — does NOT disable Siguiente. Uses mr-auto so the
              existing right-aligned buttons (Anterior/Siguiente/Cancelar) keep position. */}
          {!creationDone && wizardStep === 0 && (
            <MissingCountText count={Object.keys(step0Errors).length} />
          )}
          {!creationDone && wizardStep > 0 && (
            <Button variant="outline" size="sm" disabled={confirming} onClick={() => setWizardStep(wizardStep - 1)}>
              Anterior
            </Button>
          )}
          {!creationDone && wizardStep < 2 && (
            <Button size="sm" onClick={handleNext} data-testid="wizard-next-btn" className="bg-emerald-600 hover:bg-emerald-700">
              Siguiente
            </Button>
          )}
          {!creationDone && wizardStep === 2 && (
            <Button size="sm" disabled={confirming} onClick={() => { void handleConfirm() }} className="bg-emerald-600 hover:bg-emerald-700" data-testid="wizard-confirm-btn">
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

        <ContactoFormDialog
          key={contactFormKey}
          open={contactCreateOpen}
          onOpenChange={(isOpen) => {
            setContactCreateOpen(isOpen)
            if (!isOpen) {
              setPendingContactCreation(null)
            }
          }}
          onSaved={handleCreatedContactFromIa}
          defaultRoles={pendingContactCreation?.defaultRoles}
          defaultGroups={pendingContactCreation?.defaultGroups}
          initialValues={pendingContactCreation ? {
            tipoPersona: pendingContactCreation.tipoPersona,
            nombre: pendingContactCreation.detectedText,
            dni: pendingContactCreation.field === "patient" ? pendingContactCreation.detectedDni : undefined,
          } : undefined}
        />
      </Dialog>
  )
}

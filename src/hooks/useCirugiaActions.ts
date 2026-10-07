/**
 * useCirugiaActions.ts
 * Hook para manejar las acciones sobre cirugías (autorizar, facturar, suspender, etc.)
 * Extraído del componente monolítico original.
 *
 * CHATZAI-004: Refactorizado para usar usePresupuestoForm en el wizard.
 * CHATZAI-017D: Agregado createdSurgeryId para post-creation actions panel.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { SurgeryClassification } from "@/types"
import { canAutorizarFV, canRemitirNR, canCargarConsumo } from "@/lib/businessRules"
import { toast } from "sonner"
import type { Contacto } from "@/types"
import type { Surgery, SurgeryState, ConsumoState } from "@/types"
import type { NewSurgeryForm, NoteType, NotePriority } from "@/lib/cirugias.types"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import { usePresupuestoForm } from "@/hooks/usePresupuestoForm"
import type { FacturarDialogData } from "@/components/facturacion/FacturarDialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries"
import { updateBackendSurgeryManagement } from "@/lib/api/backend-surgeries"
import { buildReschedulingPatch, encodeReschedulingDate } from "@/lib/surgery/rescheduling"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import { apiFetch, ApiClientError } from "@/lib/api/client"
import { buildEstimativePresupuestoPayload, createPresupuesto, fetchPresupuestos } from "@/lib/api/presupuestos"

export type SurgeryIntakeResult = {
  surgeryId: string
  companyId: string
  // "missing" requires a definitive rejection; an empty read alone is unverified.
  budget: "not-requested" | "confirmed" | "missing" | "unverified"
  attachment: "not-requested" | "confirmed" | "unverified"
  refreshFailed: boolean
}

type CreateSurgeryApiResponse = {
  id: string
  visibleNumber: string | null
}

const CREATE_REFRESH_FAILED_MESSAGE = "La cirugía se creó en backend, pero no se pudo actualizar la lista. Recargá para verla."
const CREATE_UNVERIFIED_MESSAGE = "El resultado del alta está sin verificar. Revise la lista de cirugías antes de iniciar otra alta para evitar duplicados. Los datos del formulario se conservan."

export type SurgeryCreateContactPayload = Pick<
  Contacto,
  | "id"
  | "nombre"
  | "tipoPersona"
  | "razonSocial"
  | "cuit"
  | "dni"
  | "email"
  | "telefonos"
  | "provincia"
  | "localidad"
  | "groups"
>

export function buildSurgeryCreateContactPayload(
  contact: Contacto | undefined,
  fallback: {
    id?: string
    nombre?: string
  }
): SurgeryCreateContactPayload | null {
  const resolvedId = contact?.id ?? fallback.id?.trim()
  const resolvedName = fallback.nombre?.trim() || contact?.nombre?.trim()

  if (!resolvedId && !resolvedName) {
    return null
  }

  return {
    id: resolvedId ?? "",
    nombre: resolvedName || contact?.nombre || "",
    tipoPersona: contact?.tipoPersona ?? "fisica",
    razonSocial: contact?.razonSocial,
    cuit: contact?.cuit,
    dni: contact?.dni,
    email: contact?.email,
    telefonos: contact?.telefonos,
    provincia: contact?.provincia,
    localidad: contact?.localidad,
    groups: contact?.groups ?? [],
  }
}

export function useCirugiaActions() {
  const store = useOrtoTrackStore()
  const { activeCompany } = useAuth()

  // ── Dialog states ──
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [changeStateDialogOpen, setChangeStateDialogOpen] = useState(false)
  const [changeDateDialogOpen, setChangeDateDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [facturarDialogOpen, setFacturarDialogOpen] = useState(false)
  const [presupuestoDialogOpen, setPresupuestoDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // ── Dialog form states ──
  const [dialogSurgery, setDialogSurgery] = useState<Surgery | null>(null)
  const [newState, setNewState] = useState<SurgeryState>("Pendiente")
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [dateType, setDateType] = useState<"surgery" | "shipping">("surgery")
  const [isSubmittingDate, setIsSubmittingDate] = useState(false)
  const [dateChangeError, setDateChangeError] = useState<string | null>(null)
  const isSubmittingDateRef = useRef(false)
  const dateDialogSessionRef = useRef({ generation: 0, companyId: activeCompany?.id, backendId: "", surgeryId: "", isOpen: false })
  const activeCompanyIdRef = useRef(activeCompany?.id)
  if (activeCompanyIdRef.current !== activeCompany?.id) {
    activeCompanyIdRef.current = activeCompany?.id
    dateDialogSessionRef.current.generation += 1; dateDialogSessionRef.current.isOpen = false
  }
  const [reason, setReason] = useState("")
  const [noteText, setNoteText] = useState("")
  const [noteType, setNoteType] = useState<NoteType>("General")
  const [notePriority, setNotePriority] = useState<NotePriority>("Media")
  const [facturaNumber, setFacturaNumber] = useState("")

  // ── New surgery wizard ──
  const [wizardStep, setWizardStep] = useState(0)
  const [newForm, setNewForm] = useState<NewSurgeryForm>({ ...EMPTY_NEW_FORM })
  const [createPRNow, setCreatePRNow] = useState(false)

  // CHATZAI-017D: Track the ID of the just-created surgery for post-creation actions
  const [createdSurgeryId, setCreatedSurgeryId] = useState<string | undefined>(undefined)
  const createInFlightRef = useRef(false)
  const intakeSessionRef = useRef({ companyId: activeCompany?.id, generation: 0 })
  const intakeResultRef = useRef<SurgeryIntakeResult | null>(null)
  const unverifiedCreateRef = useRef<number | null>(null)
  if (intakeSessionRef.current.companyId !== activeCompany?.id) {
    intakeSessionRef.current = { companyId: activeCompany?.id, generation: intakeSessionRef.current.generation + 1 }
    intakeResultRef.current = null
  }
  useEffect(() => { setCreatedSurgeryId(undefined) }, [activeCompany?.id])
  useEffect(() => () => { intakeSessionRef.current.generation += 1 }, [])

  // ── PR form for wizard ──
  const prForm = usePresupuestoForm()

  // Sync wizard data into PR form when createPRNow changes or wizard step changes
  useEffect(() => {
    if (createPRNow && wizardStep === 1) {
      prForm.setFormData(prev => ({
        ...prev,
        client: newForm.client || prev.client,
        patient: newForm.patient || prev.patient,
        institution: newForm.institution || prev.institution,
        vendedor: newForm.vendedor || prev.vendedor,
        concepto: newForm.classification || prev.concepto,
      }))
    }
  }, [createPRNow, wizardStep])

  // ── Editing consumo ──
  const [editingConsumo, setEditingConsumo] = useState<Record<string, { consumed: number; returned: number }>>({})

  // ── Action handlers ──
  const handleNewSurgery = useCallback(async (options?: { authorizationFile?: File | null }): Promise<false | SurgeryIntakeResult> => {
    if (createInFlightRef.current) {
      return false
    }

    createInFlightRef.current = true
    const companyId = activeCompany?.id
    const generation = intakeSessionRef.current.generation
    const isCurrent = () => intakeSessionRef.current.companyId === companyId && intakeSessionRef.current.generation === generation
    let awaitingCreateResponse = false

    try {
      if (!companyId) {
        toast.error("No hay empresa activa disponible para crear la cirugía")
        return false
      }

      if (intakeResultRef.current) return intakeResultRef.current
      if (unverifiedCreateRef.current === generation) throw new Error(CREATE_UNVERIFIED_MESSAGE)

      if (!newForm.patientContactId?.trim()) {
        toast.error("Seleccione un paciente real antes de crear la cirugía")
        return false
      }

      if (createPRNow && !prForm.validate()) {
        toast.error("Complete los campos obligatorios del presupuesto")
        return false
      }
      const budgetPayload = createPRNow ? buildEstimativePresupuestoPayload(prForm.formData, prForm.items) : null

      for (const [label, name, id] of [
        ["médico", newForm.surgeon, newForm.surgeonContactId],
        ["institución", newForm.institution, newForm.institutionContactId],
        ["cliente", newForm.client, newForm.clientContactId],
        ["coordinador", newForm.coordinadorCx, newForm.coordinadorContactId],
        ["vendedor", newForm.vendedor, newForm.vendedorContactId],
        ["instrumentador", newForm.instrumentador, newForm.instrumentadorContactId],
      ]) {
        if (name?.trim() && name !== "Sin asignar" && !id?.trim()) throw new Error(`Seleccione un contacto real para ${label}; el texto solo no se guarda.`)
      }
      if (newForm.leyenda.trim() || newForm.leyendaDestacada) throw new Error("La leyenda y su destacado todavía no se pueden guardar en el alta. Quite esos valores para continuar.")
      if (newForm.referenciasAdministrativas.some(reference => reference.valor.trim())) throw new Error("Las referencias administrativas todavía no se pueden guardar en el alta. Quite esos valores para continuar.")
      const institution = store.getContactoById(newForm.institutionContactId ?? "")
      if ((newForm.provincia.trim() && newForm.provincia.trim() !== institution?.provincia?.trim()) ||
          (newForm.localidad.trim() && newForm.localidad.trim() !== institution?.localidad?.trim()) ||
          (newForm.institutionCity.trim() && newForm.institutionCity !== EMPTY_NEW_FORM.institutionCity && newForm.institutionCity.trim() !== institution?.localidad?.trim())) {
        throw new Error("La ubicación manual todavía no se puede guardar en el alta. Use la ubicación de la institución o quite la ubicación manual.")
      }
      if (newForm.time && !newForm.date) throw new Error("La hora requiere una fecha de cirugía.")
      const surgeryDate = newForm.date ? encodeReschedulingDate(newForm.date, newForm.time) : null
      const probableDate = newForm.probableDate ? encodeReschedulingDate(newForm.probableDate).slice(0, 10) : null
      const materialShippingDate = newForm.fechaEnvioMaterial ? encodeReschedulingDate(newForm.fechaEnvioMaterial).slice(0, 10) : null

      awaitingCreateResponse = true
      const persistedSurgery = await apiFetch<CreateSurgeryApiResponse>(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: newForm.patientContactId,
            doctorId: newForm.surgeonContactId?.trim() || null,
            institutionId: newForm.institutionContactId?.trim() || null,
            payerContactId: newForm.clientContactId?.trim() || null,
            coordinatorContactId: newForm.coordinadorContactId?.trim() || null,
            salespersonContactId: newForm.vendedorContactId?.trim() || null,
            instrumentatorContactId: newForm.instrumentadorContactId?.trim() || null,
            classification: newForm.classification || null,
            priority: newForm.urgente ? "urgent" : null,
            probableDate,
            surgeryDate,
            surgeryTimeSpecified: surgeryDate ? Boolean(newForm.time) : null,
            materialShippingDate,
            source: "cirugias-ui:new-surgery-dialog",
            notes: newForm.notes.trim() || null,
          }),
        }
      )

      if (!persistedSurgery || typeof persistedSurgery.id !== "string" || !persistedSurgery.id.trim()) throw new Error(CREATE_UNVERIFIED_MESSAGE)
      awaitingCreateResponse = false
      const localSurgeryId = persistedSurgery.visibleNumber?.trim() || persistedSurgery.id
      if (!isCurrent()) return false
      setCreatedSurgeryId(persistedSurgery.id)
      const result: SurgeryIntakeResult = {
        surgeryId: persistedSurgery.id, companyId,
        budget: createPRNow ? "unverified" : "not-requested",
        attachment: options?.authorizationFile ? "unverified" : "not-requested",
        refreshFailed: false,
      }
      intakeResultRef.current = result

      // If an authorization file was provided from the OCR step, upload it to Seguimiento
      if (options?.authorizationFile) {
        try {
          const formData = new FormData()
          formData.set("file", options.authorizationFile)
          formData.set("description", "Comprobante de autorización médica cargado en el alta")
          await apiFetch(
            `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(persistedSurgery.id)}/seguimiento/documents`,
            {
              method: "POST",
              body: formData,
            }
          )
          result.attachment = "confirmed"
        } catch {
          if (isCurrent()) toast.warning("Cirugía creada, pero no se pudo confirmar el comprobante en Seguimiento.")
        }
      }
      if (!isCurrent()) return false
      if (budgetPayload) {
        try {
          await createPresupuesto(companyId, { ...budgetPayload, surgeryId: persistedSurgery.id })
          result.budget = "confirmed"
        } catch (cause) {
          if (!isCurrent()) return false
          // An empty read cannot rule out a delayed commit after a lost/5xx response.
          result.budget = cause instanceof ApiClientError && cause.status >= 400 && cause.status < 500 ? "missing" : "unverified"
          try {
            const rows = await fetchPresupuestos(companyId, { surgeryId: persistedSurgery.id, take: 1 })
            if (rows.length) result.budget = "confirmed"
          } catch {
            // Preserve rejection evidence, or remain unverified without it.
          }
          if (isCurrent() && result.budget !== "confirmed") toast.warning("Cirugía creada; el presupuesto requiere verificación o reintento.")
        }
      }
      if (!isCurrent()) return false

      try {
        const backendSurgeries = await fetchBackendActiveSurgeries(
          companyId,
          useOrtoTrackStore.getState().surgeries,
        )
        if (!isCurrent()) return false
        store.replaceSurgeries(backendSurgeries)

        const refreshedSurgery = backendSurgeries.find((surgery) => surgery.id === localSurgeryId)
        if (!refreshedSurgery) {
          throw new Error(CREATE_REFRESH_FAILED_MESSAGE)
        }
      } catch (refreshError) {
        if (!isCurrent()) return false
        result.refreshFailed = true
        const message = refreshError instanceof Error && refreshError.message
          ? refreshError.message
          : CREATE_REFRESH_FAILED_MESSAGE
        toast.error(message)
      }
      if (!result.refreshFailed && result.attachment !== "unverified" && (result.budget === "confirmed" || result.budget === "not-requested")) {
        toast.success(result.budget === "confirmed" ? "Cirugía y presupuesto creados exitosamente" : "Cirugía creada exitosamente")
      }
      return result
    } catch (error) {
      if (isCurrent() && awaitingCreateResponse && !(error instanceof ApiClientError && error.status >= 400 && error.status < 500)) {
        unverifiedCreateRef.current = generation
        toast.error(CREATE_UNVERIFIED_MESSAGE)
        return false
      }
      const message = error instanceof Error ? error.message : "Error al crear cirugía"
      if (isCurrent()) toast.error(message)
      return false
    } finally {
      createInFlightRef.current = false
    }
  }, [activeCompany?.id, store, newForm, createPRNow, prForm])

  // CHATZAI-017D: Reset all wizard state when dialog closes
  const resetWizardState = useCallback(() => {
    intakeSessionRef.current.generation += 1
    intakeResultRef.current = null
    setWizardStep(0)
    setNewForm({ ...EMPTY_NEW_FORM })
    setCreatePRNow(false)
    setCreatedSurgeryId(undefined)
    prForm.resetForm()
  }, [prForm])

  // When dialog closes, reset state
  const handleDialogClose = useCallback((open: boolean) => {
    setNewDialogOpen(open)
    if (!open) {
      resetWizardState()
    }
  }, [resetWizardState])

  const handleAutorizar = useCallback((s: Surgery) => {
    setDialogSurgery(s)
    setNewState("Autorizada")
    setChangeStateDialogOpen(true)
  }, [])

  const handleFacturar = useCallback(() => {
    const s = dialogSurgery
    if (!s || !facturaNumber.trim()) return
    store.authorizeInvoice(s.id, facturaNumber.trim())
    toast.success(`Factura ${facturaNumber} emitida`)
    setFacturarDialogOpen(false)
    setFacturaNumber("")
    setDialogSurgery(null)
  }, [store, dialogSurgery, facturaNumber])

  const handleFacturarConDatos = useCallback((data: FacturarDialogData) => {
    const s = dialogSurgery
    if (!s) return
    store.authorizeInvoice(s.id, data.facturaNumber, {
      baseFacturacion: data.baseFacturacion,
      totalPresupuestado: data.totalPresupuestado,
      totalConsumidoValorizado: data.totalConsumidoValorizado,
      deltaDetectado: data.deltaDetectado,
      diferenciasAceptadas: data.diferenciasAceptadas,
      totalAFacturar: data.totalAFacturar,
      presupuestoBaseId: data.presupuestoBaseId,
      presupuestoVersion: data.presupuestoVersion,
      diferencias: data.diferencias,
    })
    toast.success(`Factura ${data.facturaNumber} emitida — ${data.totalAFacturar > 0 ? '$' + data.totalAFacturar.toLocaleString('es-AR') : 'sin monto'}`)
    setFacturarDialogOpen(false)
    setFacturaNumber("")
    setDialogSurgery(null)
  }, [store, dialogSurgery])

  const handleChangeState = useCallback(async (payload?: { authFile?: File | null; reasonWithoutAuthFile?: string }) => {
    if (!dialogSurgery) return

    const targetSurgeryId = dialogSurgery.id
    const surgeryRecord = store.surgeries.find((s) => s.id === targetSurgeryId || s.backendId === targetSurgeryId)
    const backendId = surgeryRecord?.backendId || targetSurgeryId

    try {
      if (activeCompany?.id && newState === "Autorizada") {
        if (payload?.authFile) {
          const formData = new FormData()
          formData.set("file", payload.authFile)
          formData.set("description", "Comprobante de autorización médica")
          await apiFetch(
            `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(backendId)}/seguimiento/documents`,
            {
              method: "POST",
              body: formData,
            }
          ).catch((err) => {
            console.error("Failed to upload authorization document:", err)
            toast.warning("Se cambió el estado pero ocurrió un problema al adjuntar el comprobante.")
          })
        } else if (payload?.reasonWithoutAuthFile) {
          await apiFetch(
            `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(backendId)}/seguimiento`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entryType: "note",
                content: `Autorizada sin comprobante adjunto. Motivo: ${payload.reasonWithoutAuthFile}`,
              }),
            }
          ).catch((err) => {
            console.error("Failed to post authorization note:", err)
          })
        }
      }

      // Sync status with backend if available
      if (activeCompany?.id) {
        try {
          await apiFetch(
            `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(backendId)}/status`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: newState,
                source: "cirugias-ui:change-state",
              }),
            }
          )
        } catch {
          // Graceful fallback for DEV mock
        }
      }

      store.changeSurgeryStatus(dialogSurgery.id, newState)
      if (newState === "Autorizada") {
        store.authorizeSurgery(dialogSurgery.id)
      }

      toast.success(`Estado cambiado a ${newState}${payload?.authFile ? " (comprobante fijado)" : ""}`)
      setChangeStateDialogOpen(false)
      setDialogSurgery(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar el estado")
    }
  }, [activeCompany?.id, dialogSurgery, newState, store])

  const handleChangeDate = useCallback(async () => {
    if (!dialogSurgery || !newDate) return
    if (isSubmittingDateRef.current) return
    const existing = store.surgeries.find((s) => s.id === dialogSurgery.id || s.backendId === dialogSurgery.id)
    const backendId = (dialogSurgery.backendId || existing?.backendId)?.trim(), companyId = activeCompany?.id
    if (!companyId || !backendId) { const message = !companyId ? "Se requiere una empresa activa para reprogramar la fecha quirúrgica" : "Se requiere el identificador técnico de backend para reprogramar la cirugía"; setDateChangeError(message); toast.error(message); return }
    if (!dateDialogSessionRef.current.isOpen) dateDialogSessionRef.current = { generation: dateDialogSessionRef.current.generation + 1, companyId, backendId, surgeryId: dialogSurgery.id, isOpen: true }
    const session = { ...dateDialogSessionRef.current }
    const isCurrent = () => dateDialogSessionRef.current.isOpen && dateDialogSessionRef.current.generation === session.generation && activeCompanyIdRef.current === companyId
    isSubmittingDateRef.current = true; setIsSubmittingDate(true); setDateChangeError(null)
    try {
      const patch = buildReschedulingPatch({ ...dialogSurgery, time: dialogSurgery.surgeryTimeSpecified === true ? dialogSurgery.time : "" }, dateType === "shipping" ? { fechaEnvioMaterial: newDate } : { date: newDate, time: newTime })
      const saved = Object.keys(patch).length ? await updateBackendSurgeryManagement(companyId, backendId, patch) : null
      if (!isCurrent()) return
      const mapped = saved ? mapApiSurgeryListToSurgeries([saved], existing ? [existing] : [dialogSurgery])[0] : null
      if (mapped) store.updateSurgery(dialogSurgery.id, dateType === "shipping" ? { fechaEnvioMaterial: mapped.fechaEnvioMaterial } : { date: mapped.date, time: mapped.time, surgeryTimeSpecified: mapped.surgeryTimeSpecified })
      toast.success("Fecha actualizada")
      dateDialogSessionRef.current.isOpen = false; dateDialogSessionRef.current.generation += 1
      setChangeDateDialogOpen(false); setNewDate(""); setNewTime(""); setDialogSurgery(null)
    } catch (error) {
      if (isCurrent()) { const message = error instanceof Error ? error.message : "Error al actualizar fecha"; setDateChangeError(message); toast.error(message) }
    } finally { isSubmittingDateRef.current = false; setIsSubmittingDate(false) }
  }, [store, dialogSurgery, newDate, newTime, dateType, activeCompany?.id])

  const handleSuspend = useCallback(() => {
    if (!dialogSurgery) return
    store.suspendSurgery(dialogSurgery.id, reason || undefined)
    toast.success("Cirugía suspendida")
    setSuspendDialogOpen(false)
    setReason("")
    setDialogSurgery(null)
  }, [store, dialogSurgery, reason])

  const handleCancel = useCallback(() => {
    if (!dialogSurgery) return
    store.cancelSurgery(dialogSurgery.id, reason || undefined)
    toast.success("Cirugía cancelada")
    setCancelDialogOpen(false)
    setReason("")
    setDialogSurgery(null)
  }, [store, dialogSurgery, reason])

  const handleAddNote = useCallback((selectedSurgery: Surgery | null) => {
    const s = dialogSurgery || selectedSurgery
    if (!s || !noteText.trim()) return
    store.addSurgeryNote(s.id, noteText, noteType, notePriority, noteType === "Interna")
    toast.success("Nota agregada")
    setNoteDialogOpen(false)
    setNoteText("")
    setDialogSurgery(null)
  }, [store, dialogSurgery, noteText, noteType, notePriority])

  const handleRecover = useCallback((s: Surgery) => {
    store.recoverSurgery(s.id)
    toast.success("Cirugía recuperada")
  }, [store])

  // ── Business rule helpers ──
  const canFacturar = useCallback((s: Surgery) => {
    const docStatus = store.getDocStatus(s.id)
    const consumo = store.getConsumoBySurgeryId(s.id)
    const consumoState = consumo?.state as ConsumoState | undefined
    return canAutorizarFV(s, docStatus, consumoState)
  }, [store])

  const canRemit = useCallback((s: Surgery) => canRemitirNR(s), [])

  const canLoadConsumo = useCallback((s: Surgery) => canCargarConsumo(s), [])

  const openPresupuestoDialog = useCallback((surgery: Surgery) => {
    setDialogSurgery(surgery)
    setPresupuestoDialogOpen(true)
  }, [])

  const openNewSurgeryDialog = useCallback(() => {
    intakeSessionRef.current.generation += 1
    intakeResultRef.current = null
    setWizardStep(0)
    setCreatedSurgeryId(undefined)
    setNewDialogOpen(true)
  }, [])

  const openDeleteSurgeryDialog = useCallback((surgery: Surgery) => {
    setDialogSurgery(surgery)
    setDeleteDialogOpen(true)
  }, [])

  const instrumentadores = store.instrumentadores.map((i) => i.name)
  const openChangeDateDialog = useCallback((surgery: Surgery) => {
    dateDialogSessionRef.current = { generation: dateDialogSessionRef.current.generation + 1, companyId: activeCompany?.id, backendId: surgery.backendId || "", surgeryId: surgery.id, isOpen: true }
    setDialogSurgery(surgery); setDateType("surgery"); setNewDate(surgery.date || ""); setNewTime(surgery.surgeryTimeSpecified === true ? surgery.time || "" : ""); setDateChangeError(null); setChangeDateDialogOpen(true)
  }, [activeCompany?.id])
  const setDateDialogOpen = useCallback((open: boolean) => {
    if (!open) { dateDialogSessionRef.current.generation += 1; dateDialogSessionRef.current.isOpen = false; setDialogSurgery(null); setNewDate(""); setNewTime(""); setDateChangeError(null) }
    setChangeDateDialogOpen(open)
  }, [])

  return {
    // Dialog states
    newDialogOpen, setNewDialogOpen: handleDialogClose,
    changeStateDialogOpen, setChangeStateDialogOpen,
    changeDateDialogOpen, setChangeDateDialogOpen: setDateDialogOpen,
    suspendDialogOpen, setSuspendDialogOpen,
    cancelDialogOpen, setCancelDialogOpen,
    noteDialogOpen, setNoteDialogOpen,
    facturarDialogOpen, setFacturarDialogOpen,
    presupuestoDialogOpen, setPresupuestoDialogOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    // Dialog form states
    dialogSurgery, setDialogSurgery,
    newState, setNewState,
    newDate, setNewDate,
    newTime, setNewTime,
    dateType, setDateType: (value: "surgery" | "shipping") => { setDateType(value); setNewDate(value === "shipping" ? dialogSurgery?.fechaEnvioMaterial || "" : dialogSurgery?.date || ""); setDateChangeError(null) },
    isSubmittingDate, dateChangeError, openChangeDateDialog,
    closeChangeDateDialog: () => { if (!isSubmittingDateRef.current) setDateDialogOpen(false) },
    reason, setReason,
    noteText, setNoteText,
    noteType, setNoteType,
    notePriority, setNotePriority,
    facturaNumber, setFacturaNumber,
    // Wizard
    wizardStep, setWizardStep,
    newForm, setNewForm,
    createPRNow, setCreatePRNow,
    createdSurgeryId,
    // PR form for wizard
    prForm,
    // Editing consumo
    editingConsumo, setEditingConsumo,
    // Action handlers
    handleNewSurgery,
    handleAutorizar,
    handleFacturar,
    handleFacturarConDatos,
    handleChangeState,
    handleChangeDate,
    handleSuspend,
    handleCancel,
    handleAddNote,
    handleRecover,
    // Business rule helpers
    canFacturar,
    canRemit,
    canLoadConsumo,
    openPresupuestoDialog,
    openNewSurgeryDialog,
    openDeleteSurgeryDialog,
    // Data
    instrumentadores,
  }
}

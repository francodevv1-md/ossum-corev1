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
import { apiFetch } from "@/lib/api/client"
import { buildEstimativePresupuestoPayload, createPresupuesto } from "@/lib/api/presupuestos"

type CreateSurgeryApiResponse = {
  id: string
  visibleNumber: string | null
}

const CREATE_REFRESH_FAILED_MESSAGE = "La cirugía se creó en backend, pero no se pudo actualizar la lista. Recargá para verla."

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

  // ── PR form for wizard ──
  const prForm = usePresupuestoForm()

  const createLinkedPresupuesto = useCallback(async (surgeryId: string) => {
    if (!activeCompany?.id) throw new Error("No hay empresa activa")
    return createPresupuesto(activeCompany.id, {
      surgeryId,
      ...buildEstimativePresupuestoPayload(prForm.formData, prForm.items),
    })
  }, [activeCompany, prForm])

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
  const handleNewSurgery = useCallback(async (): Promise<boolean> => {
    if (createInFlightRef.current) {
      return false
    }

    createInFlightRef.current = true

    try {
      if (!activeCompany?.id) {
        toast.error("No hay empresa activa disponible para crear la cirugía")
        return false
      }

      if (!newForm.patientContactId?.trim()) {
        toast.error("Seleccione un paciente real antes de crear la cirugía")
        return false
      }

      if (createPRNow && !prForm.validate()) {
        toast.error("Complete los campos obligatorios del presupuesto")
        return false
      }

      const patientContact = buildSurgeryCreateContactPayload(
        store.getContactoById(newForm.patientContactId ?? ""),
        { id: newForm.patientContactId, nombre: newForm.patient }
      )
      const doctorContact = buildSurgeryCreateContactPayload(
        store.getContactoById(newForm.surgeonContactId ?? ""),
        { id: newForm.surgeonContactId, nombre: newForm.surgeon }
      )
      const institutionContact = buildSurgeryCreateContactPayload(
        store.getContactoById(newForm.institutionContactId ?? ""),
        { id: newForm.institutionContactId, nombre: newForm.institution }
      )
      const payerContact = buildSurgeryCreateContactPayload(
        store.getContactoById(newForm.clientContactId ?? ""),
        { id: newForm.clientContactId, nombre: newForm.client }
      )

      const persistedSurgery = await apiFetch<CreateSurgeryApiResponse>(
        `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: newForm.patientContactId,
            patientContact,
            doctorId: newForm.surgeonContactId ?? null,
            doctorContact,
            institutionId: newForm.institutionContactId ?? null,
            institutionContact,
            payerContactId: newForm.clientContactId ?? null,
            payerContact,
            coordinatorContactId: newForm.coordinadorContactId ?? null,
            classification: newForm.classification || null,
            priority: newForm.urgente ? "urgent" : null,
            probableDate: newForm.probableDate || null,
            surgeryDate: newForm.date || null,
            source: "cirugias-ui:new-surgery-dialog",
            notes: newForm.notes.trim() || null,
          }),
        }
      )

      const localSurgeryId = persistedSurgery.visibleNumber?.trim() || persistedSurgery.id
      setCreatedSurgeryId(persistedSurgery.id)

      if (newForm.coordinadorContactId && newForm.coordinadorCx) {
        try {
          await apiFetch(`/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(persistedSurgery.id)}/notifications/operational`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceEntityId: persistedSurgery.id,
              eventType: "coordinator_assigned",
              coordinatorName: newForm.coordinadorCx,
            }),
          })
        } catch {
          toast.warning("La cirugía se creó y asignó, pero no se pudo notificar al coordinador")
        }
      }

      // CHATZAI-017C: Extract DNI from referenciasAdministrativas if present
      const dniRef = newForm.referenciasAdministrativas.find(r => r.tipo === "DNI" && r.valor.trim())
      const patientDni = dniRef ? dniRef.valor.trim() : ""

      try {
        const backendSurgeries = await fetchBackendActiveSurgeries(
          activeCompany.id,
          useOrtoTrackStore.getState().surgeries,
        )
        store.replaceSurgeries(backendSurgeries)

        const refreshedSurgery = backendSurgeries.find((surgery) => surgery.id === localSurgeryId)
        if (!refreshedSurgery) {
          throw new Error(CREATE_REFRESH_FAILED_MESSAGE)
        }

        // CHATZAI-017D: Store the created surgery ID for post-creation panel
        if (createPRNow) {
          try {
            await createLinkedPresupuesto(persistedSurgery.id)
            toast.success("Cirugía y presupuesto creados exitosamente")
          } catch {
            toast.warning("La cirugía se creó sin presupuesto. Podés reintentar sin duplicar la cirugía.")
          }
        } else {
          toast.success("Cirugía creada exitosamente")
        }
      } catch (refreshError) {
        const message = refreshError instanceof Error && refreshError.message
          ? refreshError.message
          : CREATE_REFRESH_FAILED_MESSAGE
        toast.error(message)
      }

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear cirugía"
      toast.error(message)
      return false
    } finally {
      createInFlightRef.current = false
    }
  }, [activeCompany, store, newForm, createPRNow, prForm, createLinkedPresupuesto])

  // CHATZAI-017D: Reset all wizard state when dialog closes
  const resetWizardState = useCallback(() => {
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
    store.authorizeSurgery(s.id)
    toast.success(`Cirugía ${s.id} autorizada`)
  }, [store])

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

  const handleChangeState = useCallback(() => {
    if (!dialogSurgery) return
    store.changeSurgeryStatus(dialogSurgery.id, newState)
    toast.success(`Estado cambiado a ${newState}`)
    setChangeStateDialogOpen(false)
    setDialogSurgery(null)
  }, [store, dialogSurgery, newState])

  const handleChangeDate = useCallback(() => {
    if (!dialogSurgery || !newDate) return
    store.changeSurgeryDate(dialogSurgery.id, newDate, newTime || undefined)
    toast.success("Fecha actualizada")
    setChangeDateDialogOpen(false)
    setNewDate("")
    setNewTime("")
    setDialogSurgery(null)
  }, [store, dialogSurgery, newDate, newTime])

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
    setWizardStep(0)
    setCreatedSurgeryId(undefined)
    setNewDialogOpen(true)
  }, [])

  const openDeleteSurgeryDialog = useCallback((surgery: Surgery) => {
    setDialogSurgery(surgery)
    setDeleteDialogOpen(true)
  }, [])

  const instrumentadores = store.instrumentadores.map((i) => i.name)

  return {
    // Dialog states
    newDialogOpen, setNewDialogOpen: handleDialogClose,
    changeStateDialogOpen, setChangeStateDialogOpen,
    changeDateDialogOpen, setChangeDateDialogOpen,
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

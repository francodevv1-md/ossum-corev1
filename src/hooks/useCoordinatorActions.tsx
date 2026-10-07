"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { addBackendSurgeryNote } from "@/lib/api/backend-surgeries"
import { isTechnicalId } from "@/lib/api/ids"
import { canCreateSeguimientoEntry } from "@/lib/permissions/seguimiento"
import type { Surgery } from "@/types"
import { toast } from "sonner"
import {
  CoordinatorActionConfirmDialog,
  type CoordinatorActionType,
} from "@/components/coordinadores/modal/CoordinatorActionConfirmDialog"

export function useCoordinatorActions() {
  const { activeCompany, currentAccess } = useAuth()
  const canRequestDate = canCreateSeguimientoEntry(currentAccess?.role)
  // No supported generic operational event exists for this action.
  const canNotify = false
  const [loadingAction, setLoadingAction] = useState<Record<string, "request-date" | "notify" | null>>({})

  // Modal confirmation state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    actionType: CoordinatorActionType
    surgery: Surgery | null
  }>({
    isOpen: false,
    actionType: "request-date",
    surgery: null,
  })

  // Open confirmation modal for requesting date
  const requestDate = useCallback((surgery: Surgery) => {
    if (!canRequestDate) return
    setConfirmState({
      isOpen: true,
      actionType: "request-date",
      surgery,
    })
  }, [canRequestDate])

  // Open confirmation modal for notifying coordinator
  const notifyCoordinator = useCallback((surgery: Surgery) => {
    if (!canNotify) return
    setConfirmState({ isOpen: true, actionType: "notify", surgery })
  }, [canNotify])

  const closeConfirmDialog = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Execute the confirmed action
  const executeConfirmedAction = useCallback(
    async (customNote?: string) => {
      const { surgery, actionType } = confirmState
      if (!surgery) return

      const surgeryKey = surgery.id
      const coordName = surgery.coordinadorCx?.trim() || "el coordinador"
      const backendId = isTechnicalId(surgery.backendId) ? surgery.backendId : null
      if (!activeCompany?.id || !backendId) {
        toast.error("La solicitud requiere una cirugía y empresa sincronizadas con el servidor")
        return
      }

      if (actionType === "request-date") {
        setLoadingAction((prev) => ({ ...prev, [surgeryKey]: "request-date" }))
        try {
          const noteText = customNote?.trim()
            ? `Se solicita a ${coordName} definir fecha definitiva de cirugía. Observación: ${customNote.trim()}`
            : `Se solicita a ${coordName} definir fecha definitiva de cirugía.`

          await addBackendSurgeryNote(activeCompany.id, backendId, { content: noteText, noteType: "Coordinación", priority: "Alta", isUrgent: true })
          window.dispatchEvent(new Event("coordination-updated"))
          toast.success("Solicitud registrada en Seguimiento")
          closeConfirmDialog()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Error al registrar solicitud de fecha")
        } finally {
          setLoadingAction((prev) => ({ ...prev, [surgeryKey]: null }))
        }
      } else if (actionType === "notify") {
        toast.error("No hay un evento operativo válido para notificar al coordinador desde esta vista")
      }
    },
    [confirmState, activeCompany, closeConfirmDialog]
  )

  const shareViaWhatsApp = useCallback((surgery: Surgery) => {
    const text = `*OSSUM COR - Caso CX ${surgery.visibleNumber || surgery.id}*\n` +
      `*Paciente:* ${surgery.patient}\n` +
      `*Médico:* Dr. ${surgery.surgeon || "Sin asignar"}\n` +
      `*Institución:* ${surgery.institution}\n` +
      `*Fecha:* ${surgery.date || "Sin definir"}\n` +
      `*Estado:* ${surgery.state}\n` +
      `*Preparación:* ${surgery.preparationState || "Pendiente"}`

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
    toast.success("Abriendo WhatsApp para compartir caso...")
  }, [])

  const copyCaseSummary = useCallback((surgery: Surgery) => {
    const text = `OSSUM COR - CX ${surgery.visibleNumber || surgery.id} | Paciente: ${surgery.patient} | Médico: Dr. ${surgery.surgeon} | Institución: ${surgery.institution} | Fecha: ${surgery.date || "Sin definir"} | Estado: ${surgery.state}`
    navigator.clipboard.writeText(text)
    toast.success("Resumen copiado al portapapeles")
  }, [])

  // Reusable JSX element ready to render in components
  const confirmDialog = useMemo(() => {
    const isSubmitting = Boolean(
      confirmState.surgery && loadingAction[confirmState.surgery.id]
    )
    return (
      <CoordinatorActionConfirmDialog
        isOpen={confirmState.isOpen}
        actionType={confirmState.actionType}
        surgery={confirmState.surgery}
        isSubmitting={isSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />
    )
  }, [confirmState, loadingAction, closeConfirmDialog, executeConfirmedAction])

  return {
    requestDate,
    notifyCoordinator,
    shareViaWhatsApp,
    copyCaseSummary,
    loadingAction,
    confirmState,
    closeConfirmDialog,
    executeConfirmedAction,
    confirmDialog,
    canNotify,
  }
}

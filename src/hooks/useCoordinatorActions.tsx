"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useOrtoTrackStore } from "@/lib/store"
import { apiFetch } from "@/lib/api/client"
import type { Surgery } from "@/types"
import { toast } from "sonner"
import {
  dispatchDateRequestedAlert,
  sendNtfyNotification,
  getCoordinatorTopic,
} from "@/lib/services/ntfy.service"
import {
  CoordinatorActionConfirmDialog,
  type CoordinatorActionType,
} from "@/components/coordinadores/modal/CoordinatorActionConfirmDialog"

export function useCoordinatorActions() {
  const { activeCompany } = useAuth()
  const store = useOrtoTrackStore()
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
    setConfirmState({
      isOpen: true,
      actionType: "request-date",
      surgery,
    })
  }, [])

  // Open confirmation modal for notifying coordinator
  const notifyCoordinator = useCallback((surgery: Surgery) => {
    setConfirmState({
      isOpen: true,
      actionType: "notify",
      surgery,
    })
  }, [])

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
      const backendId = surgery.backendId || surgery.id

      if (actionType === "request-date") {
        setLoadingAction((prev) => ({ ...prev, [surgeryKey]: "request-date" }))
        try {
          const noteText = customNote?.trim()
            ? `Se solicita a ${coordName} definir fecha definitiva de cirugía. Observación: ${customNote.trim()}`
            : `Se solicita a ${coordName} definir fecha definitiva de cirugía.`

          // Register in store
          store.addSurgeryNote(
            surgery.id,
            noteText,
            "Urgente",
            "Alta",
            false
          )
          store.addAuditEvent(
            surgery.id,
            "Solicitud de fecha",
            `Solicitud de fecha enviada para ${coordName}`
          )

          // Backend API call if available
          if (activeCompany?.id) {
            try {
              await apiFetch(
                `/api/companies/${activeCompany.id}/surgeries/${encodeURIComponent(backendId)}/seguimiento`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    entryType: "note",
                    summary: "Solicitud de fecha de cirugía",
                    content: noteText,
                    evidenceRef: { priority: "alta", highlighted: true, noteType: "coordinacion" },
                  }),
                }
              )
            } catch {
              // Local store fallback already populated
            }
          }

          // Push alert
          dispatchDateRequestedAlert(surgery, undefined, customNote).catch(() => {})

          toast.success(`Solicitud de fecha enviada y notificada a ${coordName}`)
          closeConfirmDialog()
        } catch (err) {
          toast.error("Error al registrar solicitud de fecha")
        } finally {
          setLoadingAction((prev) => ({ ...prev, [surgeryKey]: null }))
        }
      } else if (actionType === "notify") {
        setLoadingAction((prev) => ({ ...prev, [surgeryKey]: "notify" }))
        try {
          const noteText = customNote?.trim()
            ? `Notificación operativa enviada a ${coordName}. Mensaje: ${customNote.trim()}`
            : `Notificación operativa enviada a ${coordName} sobre el estado del caso.`

          // Register in store
          store.addSurgeryNote(
            surgery.id,
            noteText,
            "Logística",
            "Media",
            false
          )
          store.addAuditEvent(
            surgery.id,
            "Notificación a coordinador",
            `Aviso emitido a ${coordName}`
          )

          if (activeCompany?.id) {
            try {
              await apiFetch(
                `/api/companies/${activeCompany.id}/surgeries/${encodeURIComponent(backendId)}/notifications/operational`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sourceEntityId: `notif:${backendId}`,
                    eventType: "surgery_coordination_alert",
                    coordinatorName: coordName,
                    note: customNote?.trim() || undefined,
                  }),
                }
              )
            } catch {
              // fallback
            }
          }

          // Push alert to coordinator topic
          sendNtfyNotification({
            topic: getCoordinatorTopic(surgery.coordinadorCx),
            title: `🔔 Aviso Coordinación: CX ${surgery.visibleNumber || surgery.id}`,
            message: customNote?.trim()
              ? `Seguimiento de ${surgery.patient} (${surgery.institution}). ${customNote.trim()}`
              : `Seguimiento de ${surgery.patient} (${surgery.institution}). Estado: ${surgery.state}`,
            priority: "high",
            tags: ["bell", "hospital"],
          }).catch(() => {})

          toast.success(`Notificación enviada a ${coordName} para CX ${surgery.visibleNumber || surgery.id}`)
          closeConfirmDialog()
        } catch (err) {
          toast.error("Error al notificar al coordinador")
        } finally {
          setLoadingAction((prev) => ({ ...prev, [surgeryKey]: null }))
        }
      }
    },
    [confirmState, activeCompany, store, closeConfirmDialog]
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
  }
}

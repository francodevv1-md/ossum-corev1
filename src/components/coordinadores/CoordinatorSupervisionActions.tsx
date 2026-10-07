"use client"

import { useState } from "react"
import { Bell, CalendarClock, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { isTechnicalId } from "@/lib/api/ids"
import { Button } from "@/components/ui/button"
import type { Surgery } from "@/types"

export function CoordinatorSupervisionActions({ surgery, coordinatorName }: { surgery: Surgery; coordinatorName: string }) {
  const { activeCompany } = useAuth()
  const backendSurgeryId = isTechnicalId(surgery.backendId) ? surgery.backendId : ""
  const [addingNote, setAddingNote] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const requestDate = async () => {
    setMessage(null)
    if (!activeCompany?.id || addingNote) return
    setAddingNote(true)
    try {
      await apiFetch(`/api/companies/${activeCompany.id}/surgeries/${encodeURIComponent(backendSurgeryId)}/seguimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "note",
          summary: "Solicitud de fecha de cirugía",
          content: `Se solicita a ${coordinatorName || "el coordinador"} definir la fecha de cirugía.`,
          evidenceRef: { priority: "alta", highlighted: true, noteType: "coordinacion" },
        }),
      })
      setMessage("Solicitud registrada")
    } catch {
      setMessage("No se pudo registrar la solicitud")
    } finally {
      setAddingNote(false)
    }
  }

  const notifyCoordinator = async () => {
    if (!activeCompany?.id || notifying) return
    setNotifying(true)
    setMessage(null)
    try {
      await apiFetch(`/api/companies/${activeCompany.id}/surgeries/${encodeURIComponent(backendSurgeryId)}/notifications/operational`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntityId: `date-request:${backendSurgeryId}`,
          eventType: "surgery_date_requested",
          coordinatorName,
        }),
      })
      setMessage("Notificación enviada")
    } catch {
      setMessage("No se pudo notificar al coordinador")
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button type="button" size="sm" variant="outline" className="min-h-11 gap-1.5 text-xs" onClick={() => void requestDate()} disabled={addingNote}>
        {addingNote ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarClock className="size-3.5" />}
        {addingNote ? "Registrando…" : "Solicitar fecha"}
      </Button>
      <Button type="button" size="sm" variant="outline" className="min-h-11 gap-1.5 text-xs" onClick={() => void notifyCoordinator()} disabled={notifying || !activeCompany?.id}>
        {notifying ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
        {notifying ? "Notificando…" : "Notificar coordinador"}
      </Button>
      {message ? <span className="text-[10px] text-slate-500" role="status">{message}</span> : null}
    </div>
  )
}

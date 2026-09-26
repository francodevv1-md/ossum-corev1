"use client"

import { useState } from "react"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api/client"
import { getRemitoDestinatarioName, getRemitoVisibleNumber, type RemitoApiRow } from "@/lib/api/remitos"

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function SendRemitoEmailDialog({ remito, open, onOpenChange }: { remito: RemitoApiRow | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { activeCompany, currentUser } = useAuth()
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState(() => remito ? `Remito ${getRemitoVisibleNumber(remito)}` : "")
  const [message, setMessage] = useState(() => remito ? `Adjuntamos el remito ${getRemitoVisibleNumber(remito)} correspondiente a ${getRemitoDestinatarioName(remito)}.\n\nSaludos cordiales.\nEquipo Districorr.` : "")
  const [copyMe, setCopyMe] = useState(false)
  const [idempotencyKey] = useState(newKey)
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!activeCompany?.id || !remito) return
    setSending(true)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(activeCompany.id)}/remitos/${encodeURIComponent(remito.id)}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message, copyMe, idempotencyKey }),
      })
      toast.success("Envío aceptado por Resend")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el remito")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar remito por correo</DialogTitle>
          <DialogDescription>Se adjuntará el PDF del remito emitido. El destinatario no queda guardado en Contactos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label htmlFor="remito-email-to">Destinatario</Label><Input id="remito-email-to" type="email" value={to} onChange={(event) => setTo(event.target.value)} placeholder="destinatario@empresa.com" /></div>
          <div className="space-y-1.5"><Label htmlFor="remito-email-subject">Asunto</Label><Input id="remito-email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} /></div>
          <div className="space-y-1.5"><Label htmlFor="remito-email-message">Mensaje</Label><Textarea id="remito-email-message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-36" maxLength={5000} /></div>
          <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <Checkbox checked={copyMe} onCheckedChange={(value) => setCopyMe(Boolean(value))} disabled={!currentUser?.email} />
            <span><span className="font-medium">Recibir también yo</span><span className="block text-xs text-muted-foreground">{currentUser?.email ? `La copia llegará a ${currentUser.email}.` : "No hay un correo de usuario disponible."}</span></span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={() => void send()} disabled={sending || !to.trim() || !subject.trim() || !message.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

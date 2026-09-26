"use client"

import { useEffect, useState } from "react"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api/client"

type DocumentKind = "presupuesto" | "invoice"
type BackendDocument = {
  id: string
  visibleNumber: number | null
  state: string
  issuedAt: string | null
  title?: string | null
  type?: string
  currency: string
  total: string
}

const CONFIG = {
  presupuesto: {
    title: "Enviar presupuesto existente",
    description: "Seleccioná un presupuesto real del backend. Se adjuntará un PDF comercial no fiscal.",
    listPath: "presupuestos",
    endpointPath: "presupuestos",
    empty: "No hay presupuestos emitidos disponibles.",
  },
  invoice: {
    title: "Enviar factura operativa existente",
    description: "Seleccioná una factura real del backend. El PDF es operativo, no fiscal y no contiene CAE.",
    listPath: "invoices",
    endpointPath: "invoices",
    empty: "No hay facturas operativas emitidas disponibles.",
  },
} as const

function key() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

function deliverable(kind: DocumentKind, document: BackendDocument) {
  if (kind === "presupuesto") return ["Emitido", "Aprobado"].includes(document.state)
  return ["Emitida", "Parcialmente_cobrada", "Cobrada"].includes(document.state) && document.visibleNumber != null && Boolean(document.issuedAt)
}

function number(kind: DocumentKind, document: BackendDocument) {
  if (kind === "presupuesto") return document.visibleNumber == null ? document.id : `P-${String(document.visibleNumber).padStart(4, "0")}`
  return `Factura-${document.visibleNumber}`
}

function defaults(kind: DocumentKind, document: BackendDocument) {
  const documentNumber = number(kind, document)
  return kind === "presupuesto"
    ? { subject: `Presupuesto ${documentNumber}`, message: `Adjuntamos el presupuesto ${documentNumber}.\n\nSaludos cordiales.\nEquipo Districorr.` }
    : { subject: `Factura operativa ${documentNumber}`, message: `Adjuntamos la factura operativa no fiscal ${documentNumber}.\n\nSaludos cordiales.\nEquipo Districorr.` }
}

export function SendExistingFinancialDocumentDialog({ kind, onOpenChange }: { kind: DocumentKind; onOpenChange: (open: boolean) => void }) {
  const { activeCompany, currentUser } = useAuth()
  const config = CONFIG[kind]
  const [documents, setDocuments] = useState<BackendDocument[]>([])
  const [documentId, setDocumentId] = useState("")
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [copyMe, setCopyMe] = useState(false)
  const [idempotencyKey] = useState(key)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!activeCompany?.id) return
    let active = true
    apiFetch<BackendDocument[]>(`/api/companies/${encodeURIComponent(activeCompany.id)}/${config.listPath}?take=100`)
      .then((rows) => {
        if (!active) return
        setDocuments(rows.filter((row) => deliverable(kind, row)))
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los documentos")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeCompany?.id, config.listPath, kind])

  const selectDocument = (id: string) => {
    setDocumentId(id)
    const selected = documents.find((document) => document.id === id)
    if (!selected) return
    const next = defaults(kind, selected)
    setSubject(next.subject)
    setMessage(next.message)
  }

  const send = async () => {
    if (!activeCompany?.id || !documentId) return
    setSending(true)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(activeCompany.id)}/${config.endpointPath}/${encodeURIComponent(documentId)}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message, copyMe, idempotencyKey }),
      })
      toast.success("Envío aceptado por Resend")
      onOpenChange(false)
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "No se pudo enviar el documento")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{config.title}</DialogTitle><DialogDescription>{config.description}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Documento backend</Label>
            {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Cargando…</div> : error ? <p className="text-sm text-destructive">{error}</p> : documents.length === 0 ? <p className="text-sm text-muted-foreground">{config.empty}</p> : (
              <Select value={documentId} onValueChange={selectDocument}><SelectTrigger aria-label="Documento backend"><SelectValue placeholder="Seleccionar documento" /></SelectTrigger><SelectContent>{documents.map((document) => <SelectItem key={document.id} value={document.id}>{number(kind, document)} · {document.state} · {document.currency} {document.total}</SelectItem>)}</SelectContent></Select>
            )}
          </div>
          <div className="space-y-1.5"><Label htmlFor={`${kind}-email-to`}>Destinatario</Label><Input id={`${kind}-email-to`} type="email" value={to} onChange={(event) => setTo(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${kind}-email-subject`}>Asunto</Label><Input id={`${kind}-email-subject`} value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${kind}-email-message`}>Mensaje</Label><Textarea id={`${kind}-email-message`} value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-32" maxLength={5000} /></div>
          <label className="flex items-start gap-2 rounded-md border p-3 text-sm"><Checkbox checked={copyMe} onCheckedChange={(value) => setCopyMe(Boolean(value))} disabled={!currentUser?.email} /><span><span className="font-medium">Recibir también yo</span><span className="block text-xs text-muted-foreground">{currentUser?.email ? `La copia llegará a ${currentUser.email}.` : "No hay un correo de usuario disponible."}</span></span></label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button><Button onClick={() => void send()} disabled={sending || !documentId || !to.trim() || !subject.trim() || !message.trim()}>{sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Enviar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

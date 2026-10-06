"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Paperclip,
  Send,
  X,
  Plus,
  FileText,
  Image as ImageIcon,
  Eye,
  Loader2,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/AuthProvider"
import type { Surgery } from "@/types"
import type { EmailAttachment, SurgeryAuthorizationEmailData } from "@/lib/services/resend.service"
import { generateAuthorizationEmailHtml, generateSurgeryFormalEmailHtml } from "@/lib/services/resend.service"
import { getAccessToken } from "@/lib/auth/client"
import { loadAuthorizationAttachments, loadAuthorizationFeed, readMailFile } from "@/lib/mail/authorization-evidence"
import { mailAddressSchema, normalizeMailAttachments } from "@/lib/validators/mail.validator"
import type { SeguimientoEntryView } from "@/lib/api/seguimiento-adapter"

export interface SendEmailModalProps {
  open: boolean
  onClose: () => void
  surgery: Surgery
  mode?: "authorization" | "surgery_created" | "general"
  initialTo?: string[]
  initialSubject?: string
  initialNotes?: string
  initialAttachments?: Array<{
    filename: string
    content: string
    contentType?: string
    isPdf?: boolean
    isImage?: boolean
    previewUrl?: string
  }>
  authorizationData?: Partial<SurgeryAuthorizationEmailData>
  initialEvidence?: SeguimientoEntryView
  evidenceEntries?: SeguimientoEntryView[]
  onEmailSent?: (res: { id: string; recipients: string[] }) => void | Promise<void>
}

export function SendEmailModal({
  open,
  onClose,
  surgery,
  mode = "general",
  initialTo = [],
  initialSubject,
  initialNotes = "",
  initialAttachments = [],
  authorizationData,
  initialEvidence,
  evidenceEntries = [],
  onEmailSent,
}: SendEmailModalProps) {
  const { activeCompany, currentUser } = useAuth()
  const companyId = activeCompany?.id
  const companyName = activeCompany?.name || ""
  const surgeryId = surgery.backendId || surgery.id
  const contextKey = `${companyId || ""}:${surgeryId}:${currentUser?.id || ""}:${mode}`

  // Recipients
  const [toEmails, setToEmails] = useState<string[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [newToInput, setNewToInput] = useState("")
  const [newCcInput, setNewCcInput] = useState("")
  const [showCc, setShowCc] = useState(false)

  // Subject and Body
  const [subject, setSubject] = useState("")
  const [notes, setNotes] = useState(initialNotes)

  // Attachments
  const [attachments, setAttachments] = useState<EmailAttachment[]>([])

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const [availableEvidence, setAvailableEvidence] = useState<SeguimientoEntryView[]>([])
  const [selectedEvidence, setSelectedEvidence] = useState<SeguimientoEntryView | undefined>()
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState("")
  const [feedHasMore, setFeedHasMore] = useState(false)
  const sessionRef = useRef(0)
  const evidenceOperationRef = useRef(0)
  const sendingRef = useRef(false)
  const currentContextRef = useRef({ open, contextKey })
  currentContextRef.current = { open, contextKey }
  const evidenceSnapshotRef = useRef({ entries: evidenceEntries, additional: initialAttachments })
  const isCurrent = (session: number, key = contextKey) =>
    sessionRef.current === session && currentContextRef.current.open && currentContextRef.current.contextKey === key

  const loadEvidence = async (entry?: SeguimientoEntryView, session = sessionRef.current, key = contextKey) => {
    const operation = ++evidenceOperationRef.current
    const current = () => isCurrent(session, key) && evidenceOperationRef.current === operation
    setEvidenceLoading(true)
    setEvidenceError("")
    setAttachments([])
    try {
      if (!companyId || !currentUser) throw new Error("Esperá la inicialización de usuario y empresa")
      if (entry) {
        const loaded = await loadAuthorizationAttachments(companyId, surgeryId, entry,
          evidenceSnapshotRef.current.entries, evidenceSnapshotRef.current.additional)
        if (current()) setAttachments(loaded)
      } else {
        const feed = await loadAuthorizationFeed(companyId, surgeryId)
        if (current()) {
          setAvailableEvidence(feed.entries)
          setFeedHasMore(feed.meta.hasMore)
        }
      }
    } catch (error) {
      if (current()) setEvidenceError(error instanceof Error ? error.message : "No se pudo cargar la evidencia")
    } finally {
      if (current()) setEvidenceLoading(false)
    }
  }

  // Sample current props only on an open/context transition; keep edits on rerenders.
  useEffect(() => {
    const session = ++sessionRef.current
    ++evidenceOperationRef.current
    sendingRef.current = false
    setIsSending(false)
    if (!open) return
    evidenceSnapshotRef.current = { entries: [...evidenceEntries], additional: [...initialAttachments] }
    setToEmails([...initialTo])
    setCcEmails([])
    setNewToInput("")
    setNewCcInput("")
    setShowCc(false)
    setSubject(initialSubject || [surgery.obraSocial || surgery.client || surgery.financiador, surgery.patient, surgery.surgeon].filter(Boolean).join(" - "))
    setNotes(initialNotes)
    setIsPreviewOpen(mode === "authorization")
    setSelectedEvidence(initialEvidence)
    setAvailableEvidence(evidenceEntries.filter((entry) => entry.entryType === "authorization_evidence"))
    setFeedHasMore(false)
    setEvidenceError("")
    setEvidenceLoading(false)
    setAttachments([])
    try {
      const normalized = normalizeMailAttachments(initialAttachments, mode === "authorization")
      if (mode === "authorization" && initialEvidence && companyId && currentUser) {
        void loadEvidence(initialEvidence, session)
      } else {
        setAttachments(normalized)
        if (mode === "authorization" && !normalized.length && companyId && currentUser) void loadEvidence(undefined, session)
      }
    } catch (error) {
      setEvidenceError(error instanceof Error ? error.message : "Adjuntos inválidos")
    }
    return () => { ++sessionRef.current; ++evidenceOperationRef.current }
    // Input objects intentionally do not reset an existing draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contextKey])

  const handleAddEmail = (type: "to" | "cc", emailToAdd?: string) => {
    if (sendingRef.current) return
    const raw = emailToAdd || (type === "to" ? newToInput : newCcInput)
    const email = raw.trim().toLowerCase()
    if (!email) return

    if (!mailAddressSchema.safeParse(email).success) {
      toast.error("Por favor ingresá una dirección de correo válida")
      return
    }

    if (type === "to") {
      if (!toEmails.includes(email)) setToEmails((prev) => [...prev, email])
      setNewToInput("")
    } else {
      if (!ccEmails.includes(email)) setCcEmails((prev) => [...prev, email])
      setNewCcInput("")
    }
  }

  const handleRemoveEmail = (type: "to" | "cc", emailToRemove: string) => {
    if (sendingRef.current) return
    if (type === "to") {
      setToEmails((prev) => prev.filter((e) => e !== emailToRemove))
    } else {
      setCcEmails((prev) => prev.filter((e) => e !== emailToRemove))
    }
  }

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (sendingRef.current || evidenceLoading) return
    const files = e.target.files
    if (!files || files.length === 0) return
    const selectedFiles = Array.from(files)
    const session = sessionRef.current
    const operation = ++evidenceOperationRef.current
    e.target.value = ""
    setEvidenceLoading(true)
    try {
      const loaded = await Promise.all(selectedFiles.map((file) => readMailFile(file, file.name)))
      if (!isCurrent(session) || operation !== evidenceOperationRef.current || sendingRef.current) return
      setAttachments(normalizeMailAttachments([...attachments, ...loaded], mode === "authorization"))
    } catch (error) {
      if (isCurrent(session) && operation === evidenceOperationRef.current) toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo")
    } finally {
      if (isCurrent(session) && operation === evidenceOperationRef.current) setEvidenceLoading(false)
    }
  }

  const handleRemoveAttachment = (index: number) => {
    if (sendingRef.current || evidenceLoading) return
    setAttachments((prev) => normalizeMailAttachments(prev.filter((_, i) => i !== index), mode === "authorization"))
  }

  // Build Authorization Email Data
  const fullAuthData: SurgeryAuthorizationEmailData = {
    patientName: surgery.patient || "",
    clientOrArt: surgery.obraSocial || surgery.client || surgery.financiador,
    surgeonName: surgery.surgeon,
    institutionName: surgery.institution,
    surgeryDate: surgery.date,
    ...authorizationData,
    notes,
    signature: {
      name: [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") || currentUser?.email || "",
      email: currentUser?.email,
      companyName,
    },
  }

  // Compute HTML Preview
  const previewHtml =
    mode === "authorization"
      ? generateAuthorizationEmailHtml(fullAuthData, attachments, true)
      : generateSurgeryFormalEmailHtml({
          title: subject,
          patientName: surgery.patient || "—",
          surgeonName: surgery.surgeon,
          institutionName: surgery.institution,
          surgeryDate: surgery.date,
          procedure: surgery.procedure,
          companyName,
          bodyText: notes,
          signature: fullAuthData.signature,
        })

  // Dispatch Email
  const handleSendEmail = async () => {
    if (sendingRef.current || evidenceLoading || evidenceError || !companyId || !currentUser || !open || (mode === "authorization" && !attachments.length)) return
    if (toEmails.length === 0) {
      toast.error("Agregá al menos un destinatario")
      return
    }

    if (!subject.trim()) {
      toast.error("El asunto no puede estar vacío")
      return
    }

    if (![...toEmails, ...ccEmails].every((email) => mailAddressSchema.safeParse(email).success)) {
      toast.error("Revisá las direcciones de correo")
      return
    }
    const session = sessionRef.current
    sendingRef.current = true
    setIsSending(true)
    try {
      const normalized = normalizeMailAttachments(attachments, mode === "authorization")
      const token = await getAccessToken()
      if (!isCurrent(session)) return
      const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}/mail/send`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // AUTH-EMAIL-REAL-SEND: the dev backend requires the actor user
          // header as a fallback when no Supabase auth cookie is resolved
          // (see src/lib/api/auth-context.ts DEV_ACTOR_HEADER). The dev
          // proxy normally injects it from the session; if it does not, the
          // modal still works because we forward the in-app currentUser.id.
          ...(currentUser?.id
            ? { "x-ossum-actor-user-id": currentUser.id }
            : {}),
        },
        body: JSON.stringify({
          surgeryId,
          to: toEmails,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          subject,
          templateType: mode === "authorization" ? "authorization" : "surgery_created",
          authorizationData: mode === "authorization" ? fullAuthData : undefined,
          formalSurgeryData: {
            title: subject,
            patientName: surgery.patient || "—",
            surgeonName: surgery.surgeon,
            institutionName: surgery.institution,
            surgeryDate: surgery.date,
            procedure: surgery.procedure,
            companyName,
            bodyText: notes,
          },
          attachments: normalized,
        }),
      })

      const body = await response.json()
      if (!isCurrent(session)) return
      const data = body.data ?? body
      if (!response.ok) {
        throw new Error(body.error?.message || (typeof body.error === "string" ? body.error : undefined) || "No se pudo despachar el correo")
      }
      if (data.success !== true || typeof data.id !== "string" || !data.id.trim()) {
        throw new Error("No se pudo confirmar el despacho del correo")
      }

      toast.success(
        data.devMode
          ? "🧪 Correo simulado; no fue entregado."
          : "📨 Proveedor aceptó el envío (la entrega depende del proveedor)."
      )

      if (data.warning) toast.warning(data.warning)
      try {
        await onEmailSent?.({ id: data.id, recipients: toEmails })
      } catch {
        if (isCurrent(session)) toast.warning("El correo fue procesado, pero no se pudo actualizar la vista. No lo reenvíes.")
      }
      if (isCurrent(session)) onClose()
    } catch (err: any) {
      if (isCurrent(session)) toast.error(err.message || "Error al enviar el correo")
    } finally {
      if (isCurrent(session)) {
        sendingRef.current = false
        setIsSending(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !sendingRef.current && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1D2FC0]/10 dark:bg-[#1D2FC0]/30 flex items-center justify-center text-[#1D2FC0] dark:text-blue-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {mode === "authorization"
                    ? "Compartir evidencia de autorización"
                    : "Envío de Correo Formal"}
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Despacho oficial vía Resend con plantilla estructurada y adjuntos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className="h-8 text-xs gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{isPreviewOpen ? "Ocultar Vista Previa" : "Vista Previa HTML"}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <fieldset disabled={isSending} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 text-xs">
          {(!companyId || !currentUser) && (
            <p role="alert">Esperá la inicialización de usuario y empresa antes de enviar.</p>
          )}
          {mode === "authorization" && (
            <div className="space-y-1.5">
              <Label htmlFor="mail-authorization-evidence" className="text-xs font-bold">Evidencia de autorización</Label>
              <select id="mail-authorization-evidence" value={selectedEvidence?.id || ""}
                disabled={isSending || evidenceLoading || !companyId || !currentUser}
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => {
                  if (sendingRef.current || evidenceLoading) return
                  const entry = availableEvidence.find((item) => item.id === event.target.value)
                  setSelectedEvidence(entry)
                  if (entry) void loadEvidence(entry)
                  else { ++evidenceOperationRef.current; setAttachments([]); setEvidenceError("") }
                }}>
                <option value="">Seleccioná una autorización o adjuntá el archivo real</option>
                {selectedEvidence && !availableEvidence.some((item) => item.id === selectedEvidence.id) && (
                  <option value={selectedEvidence.id}>{selectedEvidence.summary || selectedEvidence.content}</option>
                )}
                {availableEvidence.map((entry) => <option key={entry.id} value={entry.id}>{entry.summary || entry.content}</option>)}
              </select>
              {evidenceLoading && <p>Cargando evidencia...</p>}
              {!evidenceLoading && !availableEvidence.length && !selectedEvidence && !evidenceError && <p>No hay autorizaciones disponibles. Adjuntá el archivo real.</p>}
              {feedHasMore && <p>Se muestran las últimas 100 autorizaciones. Abrí las anteriores desde Novedades.</p>}
            </div>
          )}
          {evidenceError && (
            <div role="alert" className="space-y-2 text-red-700">
              <p>{evidenceError}</p>
              <Button type="button" variant="outline" size="sm" disabled={isSending || evidenceLoading}
                onClick={() => { if (!sendingRef.current) void loadEvidence(selectedEvidence) }}>
                Reintentar carga de evidencia
              </Button>
            </div>
          )}
          {/* Live HTML Preview Pane */}
          {isPreviewOpen && (
            <div className="border border-blue-200 dark:border-blue-900/60 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 animate-in fade-in duration-200 shadow-inner">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 mb-2">
                <span className="font-bold text-[11px] text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Vista Previa del Email (HTML responsive)
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Plantilla Oficial
                </Badge>
              </div>
              <div
                className="bg-white text-slate-900 rounded-lg p-2 max-h-72 overflow-y-auto border shadow-2xs"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}

          {/* Para (To Recipients) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="mail-to" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Destinatarios (Para)
              </Label>
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Agregar CC
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850">
              {toEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-[11px] font-medium border border-blue-200 dark:border-blue-800 shadow-2xs"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail("to", email)}
                    className="text-blue-500 hover:text-blue-800 dark:hover:text-white ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <div className="flex-1 flex items-center gap-1 min-w-[200px]">
                <Input
                  id="mail-to"
                  type="email"
                  placeholder="Escribí un correo y presioná Enter..."
                  value={newToInput}
                  onChange={(e) => setNewToInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      handleAddEmail("to")
                    }
                  }}
                  className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 placeholder:text-slate-400"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddEmail("to")}
                  className="h-6 px-2 text-[10px] text-slate-600 hover:bg-slate-200"
                >
                  <Plus className="w-3 h-3 mr-0.5" /> Agregar
                </Button>
              </div>
            </div>

          </div>

          {/* CC Recipients */}
          {showCc && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <Label htmlFor="mail-cc" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Copia (CC)
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCc(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Ocultar CC
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850">
                {ccEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium border shadow-2xs"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail("cc", email)}
                      className="text-slate-500 hover:text-slate-900 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex-1 flex items-center gap-1 min-w-[200px]">
                  <Input
                    id="mail-cc"
                    type="email"
                    placeholder="Correo en copia..."
                    value={newCcInput}
                    onChange={(e) => setNewCcInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        handleAddEmail("cc")
                      }
                    }}
                    className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddEmail("cc")}
                    className="h-6 px-2 text-[10px]"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Asunto */}
          <div className="space-y-1.5">
            <Label htmlFor="mail-subject" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Asunto del Correo
            </Label>
            <Input
              id="mail-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto formal del caso..."
              className="h-9 text-xs font-semibold bg-white dark:bg-slate-900"
            />
          </div>

          {/* Notas / Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="mail-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Descripción / Observaciones Adicionales
            </Label>
            <Textarea
              id="mail-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribí aquí observaciones sobre la autorización, materiales o coordinación..."
              rows={3}
              className="text-xs resize-none bg-white dark:bg-slate-900"
            />
          </div>

          {/* Adjuntos */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>Documentos y Capturas Adjuntas ({attachments.length})</span>
              </Label>
              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] cursor-pointer transition-colors shadow-2xs">
                <Plus className="w-3 h-3" />
                <span>Subir archivo / captura</span>
                <input
                  type="file"
                  aria-label="Subir archivo / captura"
                  disabled={isSending || evidenceLoading}
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1">
                No hay archivos adjuntos. Podés subir el PDF o la captura del autorizado.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.contentType?.startsWith("image/") ? (
                        <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <p className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                          {att.filename}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {att.contentType === "application/pdf" ? "Documento PDF" : "Captura de pantalla"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSending || evidenceLoading}
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Quitar adjunto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSending}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSendEmail}
            disabled={isSending || evidenceLoading || Boolean(evidenceError) || !companyId || !currentUser || toEmails.length === 0 || (mode === "authorization" && attachments.length === 0)}
            className="h-9 px-4 text-xs font-bold gap-2 bg-[#1D2FC0] hover:bg-[#18269e] text-white shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Despachando vía Resend...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Correo ({toEmails.length} dest.)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

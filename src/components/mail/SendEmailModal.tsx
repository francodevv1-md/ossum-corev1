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
  CheckCircle2,
  Eye,
  Loader2,
  Trash2,
  Building2,
  User,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/AuthProvider"
import type { Surgery } from "@/types"
import type { EmailAttachment, SurgeryAuthorizationEmailData } from "@/lib/services/resend.service"
import { generateAuthorizationEmailHtml, generateSurgeryFormalEmailHtml } from "@/lib/services/resend.service"

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
  onEmailSent?: (res: { id: string; recipients: string[] }) => void
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
  onEmailSent,
}: SendEmailModalProps) {
  const { activeCompany, currentUser } = useAuth()
  const companyId = activeCompany?.id || "districorr"
  const companyName = activeCompany?.name || "DISTRICORR SRL"

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
  const [attachments, setAttachments] = useState<
    Array<{
      filename: string
      content: string
      contentType?: string
      isPdf?: boolean
      isImage?: boolean
      previewUrl?: string
    }>
  >([])

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Initialize data on modal open. AUTH-EMAIL-REAL-SEND: this effect must
  // only run ONCE per open transition, not on every parent re-render.
  // When the modal is mounted at the root of ExpedienteFullView (which
  // re-renders on any state change in the page tree), the previous
  // implementation re-ran on every render, calling setState in a loop
  // and tripping Radix Dialog's `Maximum update depth exceeded` guard.
  // The fix: capture the initial props in refs at the moment the modal
  // transitions to `open`, and key the effect to `open` only. The refs
  // freeze the input values for the lifetime of the open session.
  const initialToRef = useRef(initialTo)
  const initialSubjectRef = useRef(initialSubject)
  const initialNotesRef = useRef(initialNotes)
  const initialAttachmentsRef = useRef(initialAttachments)
  const initialSurgeryRef = useRef(surgery)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    // Only initialize on the open transition (false -> true). Subsequent
    // re-renders while the modal stays open are no-ops for this effect.
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    // Setup recipients
    const defaultRecipients = initialToRef.current.length > 0
      ? initialToRef.current
      : [
          "cirugia@districorr.com.ar",
          "deposito@districorr.com.ar",
          "ingresos@districorr.com.ar",
        ]
    setToEmails(defaultRecipients)
    setCcEmails([])

    // Setup Subject according to format: <Cliente> - <PTE> - DR. <MEDICO>
    // Per AUTH-EMAIL-REAL-SEND: Cliente = obraSocial || client || financiador || "Cliente"
    if (initialSubjectRef.current) {
      setSubject(initialSubjectRef.current)
    } else {
      const s = initialSurgeryRef.current
      const cliente = s.obraSocial || s.client || s.financiador || "Cliente"
      const pte = s.patient || "PTE"
      const medico = s.surgeon ? `DR. ${s.surgeon.toUpperCase()}` : "MEDICO"
      setSubject(`${cliente.toUpperCase()} - ${pte.toUpperCase()} - ${medico}`)
    }

    setNotes(initialNotesRef.current)
    setAttachments(initialAttachmentsRef.current)
  }, [open])

  // Email presets
  const emailPresets = [
    { label: "Cirugía", email: "cirugia@districorr.com.ar" },
    { label: "Depósito", email: "deposito@districorr.com.ar" },
    { label: "Ingresos", email: "ingresos@districorr.com.ar" },
    { label: "Coordinación", email: "coordinacion@districorr.com.ar" },
  ]

  const handleAddEmail = (type: "to" | "cc", emailToAdd?: string) => {
    const raw = emailToAdd || (type === "to" ? newToInput : newCcInput)
    const email = raw.trim().toLowerCase()
    if (!email) return

    // Simple email regex validation
    if (!email.includes("@") || !email.includes(".")) {
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
    if (type === "to") {
      setToEmails((prev) => prev.filter((e) => e !== emailToRemove))
    } else {
      setCcEmails((prev) => prev.filter((e) => e !== emailToRemove))
    }
  }

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const isPdf = file.type === "application/pdf"
        const isImage = file.type.startsWith("image/")

        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: result,
            contentType: file.type,
            isPdf,
            isImage,
            previewUrl: isImage ? result : undefined,
          },
        ])
        toast.success(`Archivo adjuntado: ${file.name}`)
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ""
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Build Authorization Email Data
  const fullAuthData: SurgeryAuthorizationEmailData = {
    patientName: surgery.patient || "—",
    patientDni: (surgery as any).patientDni || (surgery as any).dni || "—",
    patientCuil: (surgery as any).patientCuil || (surgery as any).cuil || "—",
    claimNumber: (surgery as any).claimNumber || (surgery as any).siniestro || (surgery as any).nroSiniestro || "—",
    authorizationNumber: (surgery as any).authorizationNumber || (surgery as any).nroAutorizacion || surgery.id,
    administrator: (surgery as any).administrator || "Cabrera Noemí",
    clientOrArt: surgery.obraSocial || surgery.client || surgery.financiador || "PREVENCIÓN ART",
    surgeonName: surgery.surgeon || "—",
    institutionName: surgery.institution || "—",
    surgeryDate: surgery.date || "—",
    prestadorName: companyName,
    prestadorEmail: "ventas@districorr.com.ar",
    prestadorAddress: "—",
    items: (surgery as any).materialesAutorizados || [
      {
        code: "SHAV",
        description: "Shaver - Nacional",
        observations: "PUNTA DE SHAVER DE 5,5 MM",
        date: surgery.date || new Date().toLocaleDateString("es-AR"),
        quantity: 1,
      },
      {
        code: "SISTI",
        description: "Sistema de Titanio Interferencial para plastia de LCA - Nacional",
        observations: "DOS TORNILLOS DE INTERFERENCIA EN TITANIO ROSCA ROMA",
        date: surgery.date || new Date().toLocaleDateString("es-AR"),
        quantity: 1,
      },
    ],
    notes,
    ...authorizationData,
  }

  // Compute HTML Preview
  const previewHtml =
    mode === "authorization"
      ? generateAuthorizationEmailHtml(fullAuthData)
      : generateSurgeryFormalEmailHtml({
          title: subject,
          patientName: surgery.patient || "—",
          surgeonName: surgery.surgeon,
          institutionName: surgery.institution,
          surgeryDate: surgery.date,
          procedure: surgery.procedure,
          companyName,
          bodyText: notes,
        })

  // Dispatch Email
  const handleSendEmail = async () => {
    if (toEmails.length === 0) {
      toast.error("Agregá al menos un destinatario")
      return
    }

    if (!subject.trim()) {
      toast.error("El asunto no puede estar vacío")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/mail/send`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
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
          surgeryId: surgery.id,
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
          attachments: attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "No se pudo despachar el correo")
      }

      toast.success(
        data.devMode
          ? "🧪 Correo simulado; no fue entregado."
          : "📨 Proveedor aceptó el envío (la entrega depende del proveedor)."
      )

      if (onEmailSent) {
        onEmailSent({ id: data.id, recipients: toEmails })
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Error al enviar el correo")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
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
                    ? "Emitir Correo de Autorización"
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
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
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
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

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Sugeridos:
              </span>
              {emailPresets.map((preset) => (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => handleAddEmail("to", preset.email)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* CC Recipients */}
          {showCc && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Asunto del Correo
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto formal del caso..."
              className="h-9 text-xs font-semibold bg-white dark:bg-slate-900"
            />
          </div>

          {/* Notas / Descripción */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Descripción / Observaciones Adicionales
            </Label>
            <Textarea
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
                      {att.isImage ? (
                        <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <p className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                          {att.filename}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {att.isPdf ? "Documento PDF" : "Captura de pantalla"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
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
        </div>

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
            disabled={isSending || toEmails.length === 0}
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

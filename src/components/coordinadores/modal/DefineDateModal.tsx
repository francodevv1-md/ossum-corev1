"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Surgery } from "@/types"
import type { ReschedulingSaveResult } from "@/lib/surgery/rescheduling"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MentionComposer } from "@/components/shared/mentions/MentionComposer"
import type { MentionComposerValue } from "@/lib/mentions/types"
import {
  CalendarClock,
  Calendar,
  Building2,
  Stethoscope,
  MessageSquarePlus,
  SlidersHorizontal,
  Mic,
  MicOff,
  Paperclip,
  Clipboard,
  Check,
  X,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type DefineDateNoteType = "General" | "Urgente" | "Facturación" | "Logística" | "Coordinación"
export type DefineDateNotePriority = "Alta" | "Media" | "Baja"

export type AttachedFileItem = {
  id: string
  name: string
  sizeBytes: number
  previewUrl?: string
  isImage: boolean
  file?: File
}

export interface DefineDateNotePayload {
  content: string
  noteType: DefineDateNoteType
  priority: DefineDateNotePriority
  urgente: boolean
  mentions?: any[]
  attachments?: AttachedFileItem[]
}

interface DefineDateModalProps {
  surgery: Surgery | null
  isOpen: boolean
  onClose: () => void
  onSave: (
    surgeryId: string,
    updates: Partial<Surgery>,
    notePayload?: DefineDateNotePayload
  ) => Promise<void | ReschedulingSaveResult>
}

const NOTE_TYPES: Array<{ value: DefineDateNoteType; label: string }> = [
  { value: "General", label: "General" },
  { value: "Urgente", label: "Urgente" },
  { value: "Coordinación", label: "Coordinación" },
  { value: "Logística", label: "Logística" },
  { value: "Facturación", label: "Facturación" },
]

const NOTE_PRIORITIES: Array<{ value: DefineDateNotePriority; label: string }> = [
  { value: "Alta", label: "Alta" },
  { value: "Media", label: "Media" },
  { value: "Baja", label: "Baja" },
]

type DictationResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type DictationRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: DictationResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type DictationWindow = Window & {
  SpeechRecognition?: new () => DictationRecognition
  webkitSpeechRecognition?: new () => DictationRecognition
}

export function DefineDateModal({
  surgery,
  isOpen,
  onClose,
  onSave,
}: DefineDateModalProps) {
  let companyId: string | undefined
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth()
    companyId = auth.activeCompany?.id
  } catch {
    companyId = undefined
  }

  // Date and Logistics Fields
  const [date, setDate] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saving = useRef(false), session = useRef(0)
  useEffect(() => {
    session.current += 1; saving.current = false; setIsSaving(false); setSaveError(null)
    return () => { session.current += 1 }
  }, [surgery?.id, isOpen, companyId])
  const [time, setTime] = useState("")
  const [fechaEnvioMaterial, setFechaEnvioMaterial] = useState("")
  const [horaEnvio, setHoraEnvio] = useState("")
  const [materialAvailabilityDate, setMaterialAvailabilityDate] = useState("")

  // Tracking Note Composer State
  const [noteDraft, setNoteDraft] = useState<MentionComposerValue>({
    content: "",
    mentions: [],
  })
  const [noteType, setNoteType] = useState<DefineDateNoteType>("Coordinación")
  const [notePriority, setNotePriority] = useState<DefineDateNotePriority>("Media")
  const [urgente, setUrgente] = useState(false)
  const [showClassifyOptions, setShowClassifyOptions] = useState(false)

  // Attachments State
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice Dictation
  const [isDictating, setIsDictating] = useState(false)
  const dictationRef = useRef<DictationRecognition | null>(null)

  // Sync formData when surgery changes or modal opens
  useEffect(() => {
    if (surgery && isOpen) {
      setDate(surgery.date || "")
      setTime(surgery.time || "")
      setFechaEnvioMaterial(surgery.fechaEnvioMaterial || "")
      setHoraEnvio(surgery.horaEnvio || "")
      setMaterialAvailabilityDate(surgery.materialAvailabilityDate || "")
      setUrgente(Boolean(surgery.urgente))
      setNoteDraft({ content: surgery.notes || "", mentions: [] })
      setNoteType("Coordinación")
      setNotePriority("Media")
      setShowClassifyOptions(false)
      setIsDictating(false)
      setAttachedFiles([])
    }
  }, [surgery, isOpen])

  // Stop dictation when closing modal
  useEffect(() => {
    if (!isOpen && dictationRef.current) {
      dictationRef.current.stop()
      dictationRef.current = null
      setIsDictating(false)
    }
  }, [isOpen])

  if (!surgery) return null

  // File Picker change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newItems: AttachedFileItem[] = Array.from(files).map((f) => {
      const isImage = f.type.startsWith("image/")
      const previewUrl = isImage ? URL.createObjectURL(f) : undefined
      return {
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        sizeBytes: f.size,
        previewUrl,
        isImage,
        file: f,
      }
    })

    setAttachedFiles((prev) => [...prev, ...newItems])
    toast.success(newItems.length === 1 ? "Archivo adjuntado" : `${newItems.length} archivos adjuntados`)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Paste image from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        toast.error("El navegador no permite acceder al portapapeles")
        return
      }
      const items = await navigator.clipboard.read()
      const imageItem = items.find((item) =>
        item.types.includes("image/png") || item.types.includes("image/jpeg")
      )
      if (!imageItem) {
        toast.error("No hay imagen en el portapapeles")
        return
      }
      const mimeType = imageItem.types.includes("image/png") ? "image/png" : "image/jpeg"
      const blob = await imageItem.getType(mimeType)
      const file = new File([blob], `captura-${Date.now()}.png`, { type: mimeType })
      const previewUrl = URL.createObjectURL(file)
      const newItem: AttachedFileItem = {
        id: `clip-${Date.now()}`,
        name: file.name,
        sizeBytes: file.size,
        previewUrl,
        isImage: true,
        file,
      }
      setAttachedFiles((prev) => [...prev, newItem])
      toast.success("Imagen pegada desde el portapapeles")
    } catch {
      toast.error("No se pudo pegar la imagen desde el portapapeles")
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachedFiles((prev) => {
      const item = prev.find((f) => f.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }

  const toggleDictation = () => {
    if (isDictating) {
      dictationRef.current?.stop()
      dictationRef.current = null
      setIsDictating(false)
      return
    }

    const recognitionConstructor =
      (window as DictationWindow).SpeechRecognition ||
      (window as DictationWindow).webkitSpeechRecognition

    if (!recognitionConstructor) {
      toast.error("El dictado de voz no está disponible en este navegador")
      return
    }

    const recognition = new recognitionConstructor()
    const baseText = noteDraft.content.trim()
    recognition.lang = "es-AR"
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index]?.[0]?.transcript || ""
      )
        .join(" ")
        .trim()
      if (transcript) {
        setNoteDraft({
          content: [baseText, transcript].filter(Boolean).join(" "),
          mentions: [],
        })
      }
    }

    recognition.onerror = () => {
      setIsDictating(false)
      toast.error("No se pudo reconocer la voz")
    }

    recognition.onend = () => {
      dictationRef.current = null
      setIsDictating(false)
    }

    dictationRef.current = recognition
    setIsDictating(true)
    recognition.start()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!surgery || saving.current) return
    const generation = session.current
    saving.current = true; setIsSaving(true); setSaveError(null)

    const trimmedContent = noteDraft.content.trim()
    const hasAttachments = attachedFiles.length > 0
    const notePayload: DefineDateNotePayload | undefined =
      trimmedContent || hasAttachments
        ? {
            content: trimmedContent,
            noteType,
            priority: notePriority,
            urgente: urgente || noteType === "Urgente" || notePriority === "Alta",
            mentions: noteDraft.mentions,
            attachments: attachedFiles,
          }
        : undefined

    try {
    const result = await onSave(
      surgery.id,
      {
        date,
        time,
        fechaEnvioMaterial,
        horaEnvio,
        materialAvailabilityDate,
        notes: trimmedContent || surgery.notes || "",
        urgente: urgente || noteType === "Urgente",
      },
      notePayload
    )

    if (generation === session.current) {
      if (result?.partialError) { setSaveError(result.partialError); if (result.noteSaved) setNoteDraft({ content: "", mentions: [] }) }
      else { toast.success("Fecha y seguimiento guardados"); onClose() }
    }
    } catch (error) {
      if (generation === session.current) setSaveError(error instanceof Error ? error.message : "No se pudo guardar")
    } finally {
      if (generation === session.current) { saving.current = false; setIsSaving(false) }
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--ossum-action)] focus:border-transparent transition-all"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept="image/*,application/pdf"
            className="hidden"
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <CalendarClock className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {surgery.visibleNumber || surgery.id}
                  </span>
                  <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {surgery.patient}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-1 flex-wrap">
                  {surgery.surgeon ? (
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="size-3 text-slate-400" />
                      {surgery.surgeon}
                    </span>
                  ) : null}
                  {surgery.institution ? (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3 text-slate-400" />
                      {surgery.institution}
                    </span>
                  ) : null}
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Form Body */}
          <fieldset disabled={isSaving} className="flex-1 overflow-y-auto p-5 space-y-4">
            {saveError && <p role="alert">{saveError}</p>}
            {/* Section 1: Fechas y Horarios */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Calendar className="size-4 text-[var(--ossum-action)]" />
                <span>Cronograma Quirúrgico y Logística</span>
              </div>

              {/* Cirugía */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="define-date-surgery-date"
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Fecha de Cirugía (CX) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="define-date-surgery-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="define-date-surgery-time"
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Hora de Cirugía
                  </label>
                  <input
                    id="define-date-surgery-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Logística y Envío */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <div>
                  <label
                    htmlFor="define-date-shipping-date"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Fecha de Envío de Material
                  </label>
                  <input
                    id="define-date-shipping-date"
                    type="date"
                    value={fechaEnvioMaterial}
                    onChange={(e) => setFechaEnvioMaterial(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="define-date-shipping-time"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Hora Límite de Envío
                  </label>
                  <input
                    id="define-date-shipping-time"
                    type="time"
                    value={horaEnvio}
                    onChange={(e) => setHoraEnvio(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Disponibilidad en Depósito */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <label
                  htmlFor="define-date-availability-date"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Fecha de Disponibilidad de Material en Depósito
                </label>
                <input
                  id="define-date-availability-date"
                  type="date"
                  value={materialAvailabilityDate}
                  onChange={(e) => setMaterialAvailabilityDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Section 2: Canonical Seguimiento Note Generation Composer */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              {/* Composer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-3.5 py-2 bg-slate-50/70 dark:bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="size-4 text-[var(--ossum-action)]" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Nota de Seguimiento y Coordinación
                  </span>

                  {isDictating && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"
                    >
                      <span className="size-1.5 rounded-full bg-red-600 animate-ping" />
                      Escuchando voz...
                    </motion.div>
                  )}
                </div>

                {/* Urgente Quick Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={urgente}
                    onChange={(e) => setUrgente(e.target.checked)}
                    className="size-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300 dark:border-slate-700"
                  />
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      urgente
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Marcar urgente
                  </span>
                </label>
              </div>

              {/* Mention Composer Textarea */}
              <div className="p-3">
                <MentionComposer
                  companyId={companyId}
                  value={noteDraft}
                  onChange={setNoteDraft}
                  placeholder="Escribí aquí observaciones sobre la coordinación, logística o equipo médico... (usá @ para mencionar)"
                  textareaClassName="min-h-[84px] resize-none border-0 bg-transparent p-0 text-xs leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  className="w-full"
                />

                {/* Attached Files Preview Grid */}
                {attachedFiles.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {attachedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-1.5 pr-2 text-xs shadow-2xs"
                      >
                        {item.isImage && item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="size-8 rounded object-cover border border-slate-200 dark:border-slate-800"
                          />
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                            <FileText className="size-4" />
                          </div>
                        )}
                        <div className="min-w-0 max-w-[140px]">
                          <p className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(item.sizeBytes / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(item.id)}
                          className="size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 ml-1"
                          aria-label={`Quitar ${item.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Classification Panel (Collapsible) */}
                <AnimatePresence>
                  {showClassifyOptions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3"
                    >
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                          Tipo de Novedad
                        </Label>
                        <Select
                          value={noteType}
                          onValueChange={(val) => setNoteType(val as DefineDateNoteType)}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                          Prioridad
                        </Label>
                        <Select
                          value={notePriority}
                          onValueChange={(val) =>
                            setNotePriority(val as DefineDateNotePriority)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Prioridad" />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTE_PRIORITIES.map((p) => (
                              <SelectItem key={p.value} value={p.value} className="text-xs">
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Composer Toolbar Footer */}
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Attach File / Image Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 rounded-lg px-2 text-[11px] font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs"
                    >
                      <Paperclip className="mr-1 size-3.5 text-sky-600" />
                      Adjuntar
                    </Button>

                    {/* Paste Image Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePasteFromClipboard}
                      className="h-7 rounded-lg px-2 text-[11px] font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs"
                    >
                      <Clipboard className="mr-1 size-3.5 text-slate-500" />
                      Pegar
                    </Button>

                    {/* Voice Dictation Button */}
                    <Button
                      type="button"
                      variant={isDictating ? "destructive" : "outline"}
                      size="sm"
                      onClick={toggleDictation}
                      className={cn(
                        "h-7 rounded-lg px-2 text-[11px] font-medium shadow-2xs transition-all",
                        isDictating
                          ? "bg-red-600 text-white animate-pulse font-semibold"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      )}
                    >
                      {isDictating ? (
                        <MicOff className="mr-1 size-3.5" />
                      ) : (
                        <Mic className="mr-1 size-3.5 text-rose-500" />
                      )}
                      {isDictating ? "Detener dictado" : "Dictar voz"}
                    </Button>

                    {/* Classify Note Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClassifyOptions((prev) => !prev)}
                      className={cn(
                        "h-7 rounded-lg px-2 text-[11px] font-medium shadow-2xs transition-all",
                        showClassifyOptions
                          ? "border-[var(--ossum-action)] bg-[var(--ossum-surface)] text-[var(--ossum-action)] font-semibold dark:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      )}
                    >
                      <SlidersHorizontal className="mr-1 size-3.5 text-violet-500" />
                      {showClassifyOptions ? "Ocultar tipo" : "Clasificar"}
                    </Button>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    PDF, JPG o PNG · máx 4 MB
                  </span>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Dialog Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              size="sm"
              className="text-xs h-9 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm"
            >
              <Check className="size-3.5 mr-1.5" />
              Guardar y Programar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

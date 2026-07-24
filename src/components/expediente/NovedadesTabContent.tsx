"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import type { Surgery } from "@/types"
import { useAuth } from "@/components/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ImportEvidenceFromMailModal } from "@/components/expediente/correo/ImportEvidenceFromMailModal"
import { MailTextViewer } from "@/components/expediente/correo/MailTextViewer"
import { MentionComposer } from "@/components/shared/mentions/MentionComposer"
import { cn } from "@/lib/utils"
import { ApiClientError } from "@/lib/api/client"
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  Flame,
  Info,
  ImagePlus,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import type { SeguimientoEventEditInput, SeguimientoPhotoEvidenceFileInput } from "@/hooks/useSeguimientoFeed"
import type { SeguimientoEntryView, SeguimientoNoteType, SeguimientoNotePriority } from "@/lib/api/seguimiento-adapter"
import type { MentionComposerValue } from "@/lib/mentions/types"
import { toast } from "sonner"

interface NovedadesTabContentProps {
  surgery: Surgery
  initialFilter?: "todo" | "notas" | "archivos" | "fotos" | "autorizado" | "correo"
  initialFocusEntryId?: string
  initialAddAction?: "note" | "mail" | "image" | "auth"
  initialAddActionKey?: number
  availableAddActions?: AddAction[]
  showHeaderAddButton?: boolean
  openAddSheetKey?: number
}

type FeedFilter = "todo" | "notas" | "archivos" | "fotos" | "autorizado" | "correo"

type AddAction = "note" | "mail" | "image" | "auth"

const NOTE_TYPES: Array<{ value: SeguimientoNoteType; label: string }> = [
  { value: "general", label: "General" },
  { value: "urgente", label: "Urgente" },
  { value: "facturacion", label: "Facturación" },
  { value: "logistica", label: "Logística" },
  { value: "coordinacion", label: "Coordinación" },
]

const NOTE_PRIORITIES: Array<{ value: SeguimientoNotePriority; label: string }> = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
]

const NOTE_TYPE_BADGES: Record<SeguimientoNoteType, { label: string; className: string }> = {
  general: { label: "General", className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300" },
  urgente: { label: "Urgente", className: "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" },
  facturacion: { label: "Facturación", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" },
  logistica: { label: "Logística", className: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200" },
  coordinacion: { label: "Coordinación", className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200" },
}

const PRIORITY_BADGES: Record<SeguimientoNotePriority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" },
  media: { label: "Media", className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300" },
  baja: { label: "Baja", className: "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400" },
}

const ENTRY_TYPE_MAP: Record<string, { label: string; tone: "slate" | "emerald" | "sky" | "amber" | "violet" | "red"; Icon: React.ComponentType<{ className?: string }> }> = {
  note: { label: "Actualización", tone: "slate", Icon: MessageSquare },
  authorization_evidence: { label: "Autorizado", tone: "emerald", Icon: ShieldCheck },
  file_photo_evidence: { label: "Archivo / Foto", tone: "sky", Icon: Paperclip },
  mail_evidence: { label: "Correo", tone: "amber", Icon: Mail },
}

const TONE_STYLES = {
  slate:   { rail: "bg-slate-300 dark:bg-slate-600",   badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300" },
  emerald: { rail: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" },
  sky:     { rail: "bg-sky-500",     badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200" },
  amber:   { rail: "bg-amber-500",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" },
  violet:  { rail: "bg-violet-500",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200" },
  red:     { rail: "bg-red-500",     badge: "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" },
}

const PHOTO_UPLOAD_MAX_FILES = 4
const PHOTO_UPLOAD_MAX_ORIGINAL_BYTES = 6 * 1024 * 1024
const PHOTO_UPLOAD_MAX_DIMENSION = 1400
const PHOTO_UPLOAD_MAX_PREVIEW_BYTES = 260 * 1024
const PHOTO_UPLOAD_TOTAL_PREVIEW_BYTES = 900 * 1024
const FEED_LOAD_MORE_STEP = 50

const EMPTY_MENTION_COMPOSER: MentionComposerValue = {
  content: "",
  mentions: [],
}

function estimateDataUrlBytes(dataUrl: string) {
  const [, base64 = ""] = dataUrl.split(",", 2)
  return Math.floor((base64.length * 3) / 4)
}

function loadImageFromObjectUrl(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada"))
    image.src = objectUrl
  })
}

function canvasToDataUrl(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return canvas.toDataURL(mimeType, quality)
}

function getMimeTypeFromDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl)
  return match?.[1] ?? "image/jpeg"
}

function openImageDataUrlInNewTab(dataUrl: string) {
  try {
    const parts = dataUrl.split(",", 2)
    const header = parts[0] ?? ""
    const base64 = parts[1] ?? ""
    const mimeType = getMimeTypeFromDataUrl(dataUrl)

    if (!header.startsWith("data:image/") || !base64) {
      window.open(dataUrl, "_blank", "noopener,noreferrer")
      return
    }

    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    const blob = new Blob([bytes], { type: mimeType })
    const objectUrl = URL.createObjectURL(blob)
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer")

    if (!opened) {
      const link = document.createElement("a")
      link.href = objectUrl
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.click()
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 60_000)
  } catch {
    window.open(dataUrl, "_blank", "noopener,noreferrer")
  }
}

function dataUrlToBlob(dataUrl: string) {
  const [, base64 = ""] = dataUrl.split(",", 2)
  const mimeType = getMimeTypeFromDataUrl(dataUrl)
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

function downloadImageDataUrl(dataUrl: string, fileName?: string) {
  const blob = dataUrlToBlob(dataUrl)
  const objectUrl = URL.createObjectURL(blob)
  const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg"
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = fileName || `evidencia.${extension}`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

async function shareImageDataUrl(dataUrl: string, fileName?: string) {
  const blob = dataUrlToBlob(dataUrl)
  const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg"
  const file = new File([blob], fileName || `evidencia.${extension}`, { type: blob.type })

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], title: file.name })
    return true
  }

  return false
}

async function compressImageFile(file: File): Promise<SeguimientoPhotoEvidenceFileInput> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImageFromObjectUrl(objectUrl)
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
    const scale = longestSide > PHOTO_UPLOAD_MAX_DIMENSION ? PHOTO_UPLOAD_MAX_DIMENSION / longestSide : 1
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("No se pudo preparar la previsualización de la imagen")
    }

    context.drawImage(image, 0, 0, width, height)

    const attempts: Array<{ mimeType: string; quality?: number }> = [
      { mimeType: "image/webp", quality: 0.82 },
      { mimeType: "image/jpeg", quality: 0.78 },
      { mimeType: "image/jpeg", quality: 0.64 },
    ]

    let bestDataUrl = ""
    let bestMimeType = "image/jpeg"

    for (const attempt of attempts) {
      const dataUrl = canvasToDataUrl(canvas, attempt.mimeType, attempt.quality)
      bestDataUrl = dataUrl
      bestMimeType = getMimeTypeFromDataUrl(dataUrl)

      if (estimateDataUrlBytes(dataUrl) <= PHOTO_UPLOAD_MAX_PREVIEW_BYTES) {
        break
      }
    }

    if (estimateDataUrlBytes(bestDataUrl) > PHOTO_UPLOAD_MAX_PREVIEW_BYTES) {
      throw new Error(`La imagen ${file.name} supera el límite luego de comprimirla`)
    }

    return {
      name: file.name || undefined,
      mimeType: bestMimeType,
      sizeBytes: estimateDataUrlBytes(bestDataUrl),
      previewDataUrl: bestDataUrl,
      width,
      height,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function filesToPhotoEvidence(files: FileList | null) {
  if (!files || files.length === 0) {
    throw new Error("Seleccioná al menos una imagen")
  }

  if (files.length > PHOTO_UPLOAD_MAX_FILES) {
    throw new Error(`Podés subir hasta ${PHOTO_UPLOAD_MAX_FILES} imágenes por vez`)
  }

  const selectedFiles = Array.from(files)

  selectedFiles.forEach((file) => {
    if (!file.type.startsWith("image/")) {
      throw new Error(`El archivo ${file.name} no es una imagen válida`)
    }

    if (file.size > PHOTO_UPLOAD_MAX_ORIGINAL_BYTES) {
      throw new Error(`La imagen ${file.name} supera el máximo de 6 MB originales`)
    }
  })

  const evidenceFiles = await Promise.all(selectedFiles.map((file) => compressImageFile(file)))
  const totalPreviewBytes = evidenceFiles.reduce((sum, file) => sum + file.sizeBytes, 0)

  if (totalPreviewBytes > PHOTO_UPLOAD_TOTAL_PREVIEW_BYTES) {
    throw new Error("Las imágenes seleccionadas generan un payload demasiado grande")
  }

  return evidenceFiles
}

function formatFeedDay(date: string) {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return date

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function entryMatchesFilter(entry: SeguimientoEntryView, filter: FeedFilter): boolean {
  if (filter === "todo") return true
  if (filter === "notas") return entry.entryType === "note"
  if (filter === "archivos" || filter === "fotos") return entry.entryType === "file_photo_evidence"
  if (filter === "autorizado") return entry.entryType === "authorization_evidence"
  if (filter === "correo") return entry.entryType === "mail_evidence"
  return true
}

function TimelineCard({
  entry,
  companyId,
  isDeepLinked = false,
  onEditEntry,
  editingEntryId,
  canModify,
}: {
  entry: SeguimientoEntryView;
  companyId?: string;
  isDeepLinked?: boolean;
  onEditEntry?: (entryId: string, edits: SeguimientoEventEditInput) => Promise<void>;
  editingEntryId?: string | null;
  canModify: boolean;
}) {
  const meta = ENTRY_TYPE_MAP[entry.entryType] ?? ENTRY_TYPE_MAP.note
  const isUrgente = entry.noteType === "urgente"
  const tone = isUrgente ? TONE_STYLES.red : TONE_STYLES[meta.tone]
  const noteTypeBadge = entry.noteType ? NOTE_TYPE_BADGES[entry.noteType] : null
  const priorityBadge = entry.notePriority ? PRIORITY_BADGES[entry.notePriority] : null
  const createdAtDate = entry.createdAt ? new Date(entry.createdAt) : new Date()
  const timeStr = createdAtDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })

  const [mailTextViewerOpen, setMailTextViewerOpen] = useState(false)
  const [textViewerOpen, setTextViewerOpen] = useState(false)
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<MentionComposerValue>(EMPTY_MENTION_COMPOSER)
  const [editNoteType, setEditNoteType] = useState<SeguimientoNoteType>("general")
  const [editPriority, setEditPriority] = useState<SeguimientoNotePriority>("media")
  const [editHighlighted, setEditHighlighted] = useState(false)
  const [editImageMode, setEditImageMode] = useState<"preserve" | "replace" | "remove">("preserve")
  const [editImageFiles, setEditImageFiles] = useState<SeguimientoPhotoEvidenceFileInput[]>([])
  const editImageInputRef = useRef<HTMLInputElement>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)

  const photoFiles = entry.photoMeta?.files ?? entry.imageEvidenceMeta?.files ?? []
  const photoViewerFile = photoViewerIndex !== null ? photoFiles[photoViewerIndex] : null

  const canEdit = Boolean(onEditEntry) && canModify && entry.entryType === "note"
  const isThisEditing = editingEntryId === entry.id

  const handleStartEdit = () => {
    setEditDraft({
      content: entry.content,
      mentions: entry.mentions,
    })
    setEditNoteType(entry.noteType ?? "general")
    setEditPriority(entry.notePriority ?? "media")
    setEditHighlighted(entry.isHighlighted)
    setEditImageMode("preserve")
    setEditImageFiles([])
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditDraft(EMPTY_MENTION_COMPOSER)
    setEditImageMode("preserve")
    setEditImageFiles([])
  }

  const handleSaveEdit = async () => {
    if (!onEditEntry || !editDraft.content.trim()) return
    setSavingEdit(true)
    try {
      await onEditEntry(entry.id, {
        content: editDraft.content.trim(),
        noteType: editNoteType,
        priority: editPriority,
        highlighted: editHighlighted,
        mentions: editDraft.mentions,
        ...(editImageMode === "replace" ? { imageEvidence: { files: editImageFiles } } : {}),
        ...(editImageMode === "remove" ? { imageEvidence: { files: [] } } : {}),
      })
      setIsEditing(false)
      setEditDraft(EMPTY_MENTION_COMPOSER)
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.status === 403 ? "No tenés permiso para modificar esta novedad" : "No se pudo guardar la novedad")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleEditImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files
      if (!files?.length) return
      setEditImageFiles(await filesToPhotoEvidence(files))
      setEditImageMode("replace")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las imágenes")
    } finally {
      event.target.value = ""
    }
  }

  const editCount = entry.editHistory?.length ?? 0
  const hasEditHistory = editCount > 0
  const editHistoryLabel =
    editCount === 1 ? "Editado 1 vez" : `Editado ${editCount} veces`

  function formatEditHistoryDate(isoString: string) {
    const parsed = new Date(isoString)
    if (Number.isNaN(parsed.getTime())) return isoString
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed)
  }

  // Mail-import authorization evidence metadata
  const ref = entry.evidenceRef as Record<string, unknown> | null
  const refSubject = typeof ref?.subject === "string" ? ref.subject : undefined
  const refParticipants = typeof ref?.participantsSummary === "string" ? ref.participantsSummary : undefined
  const importedAttachments = Array.isArray(ref?.importedAttachments) ? ref.importedAttachments : []
  const firstImportedFile = importedAttachments[0] as Record<string, unknown> | undefined
  const firstImportedFileName =
    typeof firstImportedFile?.fileName === "string"
      ? firstImportedFile.fileName
      : typeof firstImportedFile?.name === "string"
        ? firstImportedFile.name
        : undefined
  const contentExceedsLimit = (entry.content?.length ?? 0) > 280
  const displayContent = contentExceedsLimit
    ? `${entry.content.slice(0, 280)}…`
    : entry.content
  const hasMentions = entry.mentions.length > 0

  const handleOpenCorreo = () => {
    if (!openCorreoTab()) {
      toast.error("No se pudo abrir la pestaña Correo")
    }
  }

  return (
    <article
      data-seguimiento-entry-id={entry.id}
      className={cn(
      "relative overflow-hidden rounded-lg border px-3 py-2.5 dark:ring-offset-slate-950",
      isDeepLinked && "ring-2 ring-primary/30 ring-offset-2",
      isUrgente ? "border-red-300 bg-red-50/30 dark:border-red-500/30 dark:bg-red-500/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90",
    )}>
      <div className={cn("absolute inset-y-0 left-0 w-0.5", tone.rail)} />
      <div className="pl-2">
        {/* Header line */}
        <div className="flex items-center justify-between gap-2">
          {/* Izquierda: autor + tipo */}
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{entry.authorName}</span>
            <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", tone.badge)}>
              {meta.label}
            </Badge>
            {noteTypeBadge && (
              <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", noteTypeBadge.className)}>
                {noteTypeBadge.label}
              </Badge>
            )}
            {priorityBadge && (
              <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", priorityBadge.className)}>
                {priorityBadge.label}
              </Badge>
            )}
            {entry.isHighlighted && (
              <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                Fijado
              </Badge>
            )}
          </div>
          {/* Derecha: hora + editar */}
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeStr}</span>
            {canEdit && !isEditing && !isThisEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="text-slate-300 transition-colors hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300"
                title="Editar novedad"
              >
                <Pencil className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-1">
          {entry.entryType === "mail_evidence" && entry.mailMeta ? (
            <div className="space-y-0.5">
              <p className="text-[13px] text-slate-700 dark:text-slate-200">
                {entry.authorName} destacó un correo en el seguimiento.
              </p>
              {entry.mailMeta.subject ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{entry.mailMeta.subject}</p>
              ) : null}
              {entry.mailMeta.participantsSummary ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">De: {entry.mailMeta.participantsSummary}</p>
              ) : null}
              {entry.content ? (
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{entry.content}</p>
              ) : null}
              <div className="mt-1.5">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={handleOpenCorreo}>
                  <ExternalLink className="mr-1 size-3" />
                  Ver correo
                </Button>
              </div>
            </div>
          ) : entry.entryType === "file_photo_evidence" && entry.photoMeta ? (
            <div className="space-y-1">
              <p className="text-[13px] text-slate-700 dark:text-slate-200">{entry.content}</p>
              {entry.photoMeta.files.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {entry.photoMeta.files.slice(0, 4).map((file, index) => (
                    <button
                      key={`${entry.id}-${file.name ?? index}`}
                      type="button"
                      onClick={() => setPhotoViewerIndex(index)}
                      className="overflow-hidden rounded-md border border-slate-200 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-950/60"
                    >
                      {file.previewDataUrl ? (
                        <img
                          src={file.previewDataUrl}
                          alt={file.name || `Imagen ${index + 1}`}
                          className="size-16 cursor-pointer object-cover"
                        />
                      ) : (
                        <div className="flex size-16 items-center justify-center bg-slate-50 text-slate-300 dark:bg-slate-900 dark:text-slate-500">
                          <Paperclip className="size-3.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Photo viewer modal */}
              {photoViewerFile && (
                <Dialog open={photoViewerIndex !== null} onOpenChange={(open) => { if (!open) setPhotoViewerIndex(null) }}>
                  <DialogContent className="max-h-[90vh] overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-950 sm:max-w-2xl">
                    <DialogTitle className="sr-only">Ver imagen</DialogTitle>
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                      <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                        {photoViewerFile.name || `Imagen ${(photoViewerIndex ?? 0) + 1}`}
                      </p>
                      <div className="flex items-center gap-2">
                        {photoFiles.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={(photoViewerIndex ?? 0) === 0}
                              onClick={() => setPhotoViewerIndex((prev) => (prev !== null ? Math.max(0, prev - 1) : null))}
                            >
                              <ChevronLeft className="size-4" />
                            </Button>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {(photoViewerIndex ?? 0) + 1} / {photoFiles.length}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={(photoViewerIndex ?? 0) >= photoFiles.length - 1}
                              onClick={() => setPhotoViewerIndex((prev) => (prev !== null ? Math.min(photoFiles.length - 1, prev + 1) : null))}
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-slate-50 p-4 dark:bg-slate-900/70">
                      {photoViewerFile.previewDataUrl ? (
                        <img
                          src={photoViewerFile.previewDataUrl}
                          alt={photoViewerFile.name || "Evidencia"}
                          className="max-h-full max-w-full rounded-md object-contain"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center text-slate-400 dark:text-slate-500">
                          <Paperclip className="size-8" />
                        </div>
                      )}
                    </div>
                    {photoViewerFile.previewDataUrl ? (
                      <div className="flex flex-wrap justify-center gap-2 border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px]"
                          onClick={() => photoViewerFile.previewDataUrl && openImageDataUrlInNewTab(photoViewerFile.previewDataUrl)}
                        >
                          <ExternalLink className="mr-1 size-3" />
                          Abrir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px]"
                          onClick={() => photoViewerFile.previewDataUrl && downloadImageDataUrl(photoViewerFile.previewDataUrl, photoViewerFile.name || undefined)}
                        >
                          <Download className="mr-1 size-3" />
                          Descargar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px]"
                          onClick={async () => {
                            if (!photoViewerFile.previewDataUrl) return
                            const shared = await shareImageDataUrl(photoViewerFile.previewDataUrl, photoViewerFile.name || undefined)
                            if (!shared) {
                              toast.error("Compartir no está disponible en este dispositivo")
                            }
                          }}
                        >
                          <Upload className="mr-1 size-3" />
                          Compartir
                        </Button>
                      </div>
                    ) : null}
                  </DialogContent>
                </Dialog>
              )}
            </div>
          ) : entry.entryType === "authorization_evidence" && entry.evidenceRef?.source === "mail_import" ? (
            <div className="space-y-0.5">
              <p className="text-[13px] text-slate-700 dark:text-slate-200">
                {entry.authorName} importó evidencia desde correo.
              </p>
              {refSubject ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Archivo: {firstImportedFileName || refSubject}
                </p>
              ) : null}
              {refParticipants ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Origen: {refParticipants}
                </p>
              ) : null}
              {entry.content && !contentExceedsLimit ? (
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{entry.content}</p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap gap-2">
                {contentExceedsLimit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setMailTextViewerOpen(true)}
                  >
                    Ver texto completo
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={handleOpenCorreo}>
                  <ExternalLink className="mr-1 size-3" />
                  Ver correo original
                </Button>
              </div>
              <MailTextViewer
                open={mailTextViewerOpen}
                onOpenChange={setMailTextViewerOpen}
                subject={refSubject}
                sender={refParticipants}
                content={entry.content}
              />
            </div>
          ) : isEditing ? (
            <div className="space-y-2">
              <MentionComposer
                companyId={companyId}
                value={editDraft}
                onChange={setEditDraft}
                placeholder="Editar contenido..."
                className="w-full"
                textareaClassName="min-h-[80px] resize-none border border-slate-200 bg-slate-50 text-[13px] leading-relaxed dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
              />
              <div className="grid gap-2 sm:grid-cols-[minmax(0,140px)_minmax(0,140px)_auto] sm:items-center">
                <Select value={editNoteType} onValueChange={(value) => setEditNoteType(value as SeguimientoNoteType)}>
                  <SelectTrigger className="h-8 text-[12px]" aria-label="Tipo de la novedad"><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editPriority} onValueChange={(value) => setEditPriority(value as SeguimientoNotePriority)}>
                  <SelectTrigger className="h-8 text-[12px]" aria-label="Prioridad de la novedad"><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTE_PRIORITIES.map((priority) => <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>)}</SelectContent>
                </Select>
                <label className="flex h-8 items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300"><Checkbox checked={editHighlighted} onCheckedChange={(checked) => setEditHighlighted(Boolean(checked))} />Destacar</label>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <input ref={editImageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleEditImageChange(event)} />
                <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => editImageInputRef.current?.click()}><ImagePlus className="mr-1 size-3" />{photoFiles.length > 0 ? "Reemplazar imágenes" : "Adjuntar imágenes"}</Button>
                {photoFiles.length > 0 ? <Button type="button" variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => { setEditImageFiles([]); setEditImageMode("remove") }}>Quitar imágenes</Button> : null}
                {editImageMode === "replace" ? <span className="text-slate-500">{editImageFiles.length} imagen{editImageFiles.length === 1 ? "" : "es"} para reemplazar</span> : null}
                {editImageMode === "remove" ? <span className="text-slate-500">Las imágenes se quitarán al guardar</span> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editDraft.content.trim()}
                  className="h-7 rounded-md text-[11px]"
                >
                  {savingEdit ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <Check className="mr-1 size-3" />
                  )}
                  Guardar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={savingEdit}
                  className="h-7 rounded-md text-[11px]"
                >
                  <X className="mr-1 size-3" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {entry.summary ? (
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{entry.summary}</p>
              ) : null}
              {contentExceedsLimit ? (
                <>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{displayContent}</p>
                  <button
                    type="button"
                    onClick={() => setTextViewerOpen(true)}
                    className="mt-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Ver completo
                  </button>
                  <MailTextViewer
                    open={textViewerOpen}
                    onOpenChange={setTextViewerOpen}
                    content={entry.content}
                  />
                </>
              ) : (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{entry.content}</p>
              )}
            </div>
          )}
        </div>

        {!isEditing && entry.entryType !== "file_photo_evidence" && photoFiles.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {photoFiles.slice(0, 4).map((file, index) => (
              <button key={`${entry.id}-evidence-${file.name ?? index}`} type="button" onClick={() => setPhotoViewerIndex(index)} className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                {file.previewDataUrl ? <img src={file.previewDataUrl} alt={file.name || `Imagen ${index + 1}`} className="size-16 object-cover" /> : <div className="flex size-16 items-center justify-center text-slate-400"><Paperclip className="size-3.5" /></div>}
              </button>
            ))}
          </div>
        ) : null}

        {hasMentions ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.mentions.map((mention) => (
              <Badge
                key={`${entry.id}-${mention.userId}`}
                variant="outline"
                className="border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200"
              >
                @{mention.displayName}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Edit history */}
        {hasEditHistory && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowEditHistory(!showEditHistory)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
                showEditHistory
                  ? "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
              )}
            >
              <Clock3 className="size-3" />
              {editHistoryLabel}
            </button>

            {showEditHistory && (
              <div className="mt-1.5 rounded-md border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                <ul className="space-y-1">
                  {entry.editHistory!.map((edit, index) => (
                    <li key={index} className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {formatEditHistoryDate(edit.editedAt)}
                      </span>
                      {" — por "}
                      <span className="font-medium text-slate-700 dark:text-slate-200">{edit.editedBy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function FijadoBlock({ entries }: { entries: SeguimientoEntryView[] }) {
  if (entries.length === 0) return null

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center gap-1.5">
        <Pin className="size-3 text-slate-400 dark:text-slate-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fijado en el caso</span>
      </div>
      <div className="mt-1.5 space-y-1">
        {entries.map((entry) => (
          <FijadoItem key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  )
}

function FijadoItem({ entry }: { entry: SeguimientoEntryView }) {
  const [expanded, setExpanded] = useState(false)
  const meta = ENTRY_TYPE_MAP[entry.entryType] ?? ENTRY_TYPE_MAP.note
  const preview = entry.summary || entry.content.slice(0, 60)
  const isLong = entry.content.length > 60
  const noteTypeBadge = entry.noteType ? NOTE_TYPE_BADGES[entry.noteType] : null

  return (
    <div className={cn(
      "flex items-start justify-between gap-2 rounded-md px-2.5 py-1.5",
      entry.noteType === "urgente" ? "bg-red-50/50 dark:bg-red-500/10" : "bg-white dark:bg-slate-900/90",
    )}>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[12px] text-slate-700 dark:text-slate-200", !expanded && isLong && "truncate")}>
          {expanded ? entry.content : preview}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <span>{entry.authorName}</span>
          {isLong && (
            <button type="button" onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {noteTypeBadge && (
          <Badge variant="outline" className={cn("px-1 py-0 text-[9px]", noteTypeBadge.className)}>
            {noteTypeBadge.label}
          </Badge>
        )}
        <Badge variant="outline" className={cn("px-1 py-0 text-[9px]", entry.noteType === "urgente" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : "")}>
          {meta.label}
        </Badge>
      </div>
    </div>
  )
}

function EmptyFeed({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <MessageSquare className="size-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Sin seguimiento cargado</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Todavía no hay novedades visibles para leer el caso como conversación operativa.
      </p>
      <Button size="sm" className="mt-4" onClick={onCompose}>
        <Plus className="mr-1 size-4" />
        Agregar novedad
      </Button>
    </div>
  )
}

function surgeryLabel(surgery: Surgery) {
  return surgery.expedienteNumber || surgery.prNumber || surgery.id
}

function openCorreoTab() {
  if (typeof document === "undefined") return false

  const trigger = document.querySelector<HTMLButtonElement>('button[role="tab"][value="correo"]')

  if (!trigger) return false

  trigger.click()
  trigger.focus()
  return true
}

const ADD_ACTIONS: Array<{
  id: AddAction
  label: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
}> = [
  { id: "mail", label: "Importar desde correo", description: "Traer texto o archivos útiles", Icon: Download },
  { id: "auth", label: "Marcar autorizado", description: "Registrar una autorización formal", Icon: ShieldCheck },
]

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(min-width: 640px)")
    const handler = () => setIsDesktop(mq.matches)
    handler()
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return isDesktop
}

function AddToSeguimientoSheet({
  open,
  onOpenChange,
  onAction,
  actionOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: AddAction) => void
  actionOptions: Array<{
    id: AddAction
    label: string
    description: string
    Icon: React.ComponentType<{ className?: string }>
  }>
}) {
  const isDesktop = useIsDesktop()

  const actionList = (
    <div className="space-y-1.5">
      {actionOptions.map((option) => {
        const Icon = option.Icon
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              onAction(option.id)
              onOpenChange(false)
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-900"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
              <Icon className="size-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{option.description}</div>
            </div>
          </button>
        )
      })}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden dark:border-slate-800 dark:bg-slate-950 sm:block sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Otras acciones de seguimiento</DialogTitle>
            <DialogDescription>Importá un correo o registrá una autorización.</DialogDescription>
          </DialogHeader>
          {actionList}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:hidden">
        <SheetHeader className="px-4 pb-1 pt-3">
          <SheetTitle className="text-sm">Otras acciones de seguimiento</SheetTitle>
          <SheetDescription>Importá un correo o registrá una autorización.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1">{actionList}</div>
      </SheetContent>
    </Sheet>
  )
}

export function NovedadesTabContent({ surgery, initialFilter = "todo", initialFocusEntryId, initialAddAction, initialAddActionKey = 0, availableAddActions, showHeaderAddButton = true, openAddSheetKey = 0 }: NovedadesTabContentProps) {
  const {
    entries,
    loading,
    error,
    addNote,
    addPhotoEvidence,
    createAuthorizationEvidence,
    addingNote,
    addingPhotoEvidence,
    addingAuthorizationEvidence,
    highlightedEntries,
    editEntry,
    editingEntryId,
    take,
    total,
    canLoadMore,
    loadMore,
    loadingMore,
    refetch,
  } = useSeguimientoFeed(surgery.id)

  const { activeCompany, currentAccess } = useAuth()
  const companyId = activeCompany?.id
  const canModifySeguimiento = currentAccess?.role === "admin"

  const [search, setSearch] = useState("")
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("todo")
  const [noteDraft, setNoteDraft] = useState<MentionComposerValue>(EMPTY_MENTION_COMPOSER)
  const [notePriority, setNotePriority] = useState<SeguimientoNotePriority>("media")
  const [noteType, setNoteType] = useState<SeguimientoNoteType>("general")
  const [noteHighlighted, setNoteHighlighted] = useState(false)
  const [noteIsAuth, setNoteIsAuth] = useState(false)
  const [authorizationSourceEntryId, setAuthorizationSourceEntryId] = useState("")
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [importMailOpen, setImportMailOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<SeguimientoPhotoEvidenceFileInput[]>([])
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null)
  const [openImagePickerOnCompose, setOpenImagePickerOnCompose] = useState(false)
  // The legacy media composer remains unreachable while its JSX is retained for a later isolated cleanup.
  const showMediaComposer = false
  const [mediaContent, setMediaContent] = useState("")
  const [mediaType, setMediaType] = useState<SeguimientoNoteType>("general")
  const [mediaPriority, setMediaPriority] = useState<SeguimientoNotePriority>("media")
  const [mediaHighlighted, setMediaHighlighted] = useState(false)
  const mediaTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null)
  const authorizationSources = useMemo(
    () => entries.filter((entry) => entry.entryType !== "authorization_evidence"),
    [entries]
  )

  const allowedAddOptions = useMemo(() => {
    if (!availableAddActions || availableAddActions.length === 0) return ADD_ACTIONS
    const allowed = new Set(availableAddActions)
    return ADD_ACTIONS.filter((option) => allowed.has(option.id))
  }, [availableAddActions])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaPhotoInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textareas
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [noteDraft.content])

  useEffect(() => {
    if (!showComposer || !openImagePickerOnCompose) return
    mediaPhotoInputRef.current?.click()
    setOpenImagePickerOnCompose(false)
  }, [openImagePickerOnCompose, showComposer])

  useEffect(() => {
    setFeedFilter(initialFilter)
  }, [initialFilter, surgery.id])

  useEffect(() => {
    if (!initialAddAction) return

    handleAddAction(initialAddAction)
  }, [initialAddAction, initialAddActionKey, surgery.id])

  useEffect(() => {
    if (!openAddSheetKey) return
    setAddSheetOpen(true)
  }, [openAddSheetKey])

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()

    return entries.filter((entry) => {
      if (!entryMatchesFilter(entry, feedFilter)) return false
      if (!query) return true
      return (
        entry.content.toLowerCase().includes(query) ||
        entry.authorName.toLowerCase().includes(query) ||
        (entry.summary ?? "").toLowerCase().includes(query) ||
        (entry.mailMeta?.subject ?? "").toLowerCase().includes(query) ||
        (entry.mailMeta?.participantsSummary ?? "").toLowerCase().includes(query) ||
        (entry.photoMeta?.files.some((file) => (file.name ?? "").toLowerCase().includes(query)) ?? false)
      )
    })
  }, [entries, feedFilter, search])

  const groupedTimeline = useMemo(() => {
    const groups: Array<{ day: string; items: SeguimientoEntryView[] }> = []

    filteredEntries.forEach((entry) => {
      const day = entry.createdAt ? entry.createdAt.split("T")[0] : ""
      const lastGroup = groups[groups.length - 1]

      if (!lastGroup || lastGroup.day !== day) {
        groups.push({ day, items: [entry] })
        return
      }

      lastGroup.items.push(entry)
    })

    return groups
  }, [filteredEntries])

  const remainingEntries = Math.max(total - entries.length, 0)

  useEffect(() => {
    if (!initialFocusEntryId || loading) return

    const target = filteredEntries.find((entry) => entry.id === initialFocusEntryId)
    if (!target) return

    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-seguimiento-entry-id="${target.id}"]`)
      if (!element) return

      setFocusedEntryId(target.id)
      element.scrollIntoView({ block: "center", behavior: "smooth" })

      window.setTimeout(() => {
        setFocusedEntryId((current) => (current === target.id ? null : current))
      }, 2200)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [filteredEntries, initialFocusEntryId, loading])

  const handlePublishComposer = async () => {
    const content = noteDraft.content.trim()
    if (mediaFiles.length === 0 && !content) return
    const isAuth = noteIsAuth
    try {
      if (isAuth) {
        if (!authorizationSourceEntryId) {
          toast.error("Seleccioná la novedad que respalda la autorización")
          return
        }
        await createAuthorizationEvidence(authorizationSourceEntryId, {
          content,
          summary: content.slice(0, 80),
          ...(mediaFiles.length > 0 ? { imageEvidence: { files: mediaFiles } } : {}),
        })
        toast.success("Autorización registrada")
      } else if (mediaFiles.length > 0) {
        const firstName = mediaFiles[0]?.name || "Imagen"
        const summary = mediaFiles.length === 1
          ? firstName
          : `${firstName} + ${mediaFiles.length - 1} archivo${mediaFiles.length - 1 === 1 ? "" : "s"}`

        await addPhotoEvidence({
          content: content || `Se carg${mediaFiles.length === 1 ? "ó" : "aron"} ${mediaFiles.length} imagen${mediaFiles.length === 1 ? "" : "es"}.`,
          summary,
          files: mediaFiles,
          noteType,
          priority: notePriority,
          highlighted: noteHighlighted,
        })
        toast.success(mediaFiles.length === 1 ? "Imagen cargada en Seguimiento" : "Imágenes cargadas en Seguimiento")
      } else {
        await addNote({
          content,
          priority: notePriority,
          highlighted: noteHighlighted,
          noteType,
          mentions: noteDraft.mentions,
        })
        toast.success("Nota publicada")
      }
      resetComposer()
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.status === 403
        ? "No tenés permiso para realizar esta acción"
        : isAuth ? "No se pudo registrar la autorización" : "No se pudo publicar la nota")
    }
  }

  function resetComposer() {
    setNoteDraft(EMPTY_MENTION_COMPOSER)
    setNotePriority("media")
    setNoteType("general")
    setNoteHighlighted(false)
    setNoteIsAuth(false)
    setAuthorizationSourceEntryId("")
    setShowMoreOptions(false)
    setShowComposer(false)
    setMediaFiles([])
    setMediaViewerIndex(null)
    setOpenImagePickerOnCompose(false)
  }

  function handleAddAction(action: AddAction) {
    switch (action) {
      case "note":
        setNoteIsAuth(false)
        setShowComposer(true)
        break
      case "mail":
        setImportMailOpen(true)
        break
      case "image":
        setNoteIsAuth(false)
        setShowComposer(true)
        setOpenImagePickerOnCompose(true)
        break
      case "auth":
        setNoteIsAuth(true)
        setAuthorizationSourceEntryId("")
        setShowComposer(true)
        break
    }
  }

  async function handlePasteToMediaComposer() {
    try {
      if (!navigator.clipboard?.read) {
        toast.error("El navegador no permite acceder al portapapeles")
        return
      }
      if (mediaFiles.length >= PHOTO_UPLOAD_MAX_FILES) {
        toast.error(`Máximo ${PHOTO_UPLOAD_MAX_FILES} imágenes por entrada`)
        return
      }
      const items = await navigator.clipboard.read()
      const imageItem = items.find(
        (item) => item.types.includes("image/png") || item.types.includes("image/jpeg")
      )
      if (!imageItem) {
        toast.error("No hay imagen en el portapapeles")
        return
      }
      const mimeType = imageItem.types.includes("image/png") ? "image/png" : "image/jpeg"
      const blob = await imageItem.getType(mimeType)
      const file = new File([blob], `captura-${Date.now()}.png`, { type: mimeType })

      const compressed = await compressImageFile(file)
      const newTotal = mediaFiles.length + 1
      if (newTotal > PHOTO_UPLOAD_MAX_FILES) {
        toast.error(`Máximo ${PHOTO_UPLOAD_MAX_FILES} imágenes por entrada`)
        return
      }
      const totalPreviewBytes = mediaFiles.reduce((s, f) => s + f.sizeBytes, 0) + compressed.sizeBytes
      if (totalPreviewBytes > PHOTO_UPLOAD_TOTAL_PREVIEW_BYTES) {
        toast.error("Las imágenes superan el límite de tamaño total")
        return
      }
      setMediaFiles([...mediaFiles, compressed])
      toast.success("Imagen pegada")
    } catch {
      toast.error("No se pudo acceder al portapapeles")
    }
  }

  const handleMediaPhotoPickerChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files
      if (!files || files.length === 0) return

      const remaining = PHOTO_UPLOAD_MAX_FILES - mediaFiles.length
      if (remaining <= 0) {
        toast.error(`Máximo ${PHOTO_UPLOAD_MAX_FILES} imágenes por entrada`)
        return
      }
      const toProcess = Array.from(files).slice(0, remaining)

      // Validate
      for (const file of toProcess) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`El archivo ${file.name} no es una imagen válida`)
        }
        if (file.size > PHOTO_UPLOAD_MAX_ORIGINAL_BYTES) {
          throw new Error(`La imagen ${file.name} supera el máximo de 6 MB originales`)
        }
      }

      const compressed = await Promise.all(toProcess.map((file) => compressImageFile(file)))
      const totalPreviewBytes = mediaFiles.reduce((s, f) => s + f.sizeBytes, 0) + compressed.reduce((s, f) => s + f.sizeBytes, 0)
      if (totalPreviewBytes > PHOTO_UPLOAD_TOTAL_PREVIEW_BYTES) {
        throw new Error("Las imágenes superan el límite de tamaño total")
      }
      setMediaFiles([...mediaFiles, ...compressed])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las imágenes")
    } finally {
      event.target.value = ""
    }
  }

  function removeMediaFile(index: number) {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index))
    if (mediaViewerIndex !== null && mediaViewerIndex >= mediaFiles.length - 1) {
      setMediaViewerIndex(null)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 1. Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Seguimiento del expediente</h2>
          {surgery.urgente ? (
            <Badge className="shrink-0 rounded-full bg-red-600 px-2 text-[10px] text-white">Urgente</Badge>
          ) : null}
        </div>
        {showHeaderAddButton ? (
          <Button size="sm" onClick={() => handleAddAction("note")} className="shrink-0">
            <Plus className="mr-1 size-4" />
            <span className="hidden sm:inline">Nueva novedad</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        ) : null}
      </header>

      {surgery.leyendaDestacada && surgery.leyenda ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          <span className="font-semibold">Atención:</span> {surgery.leyenda}
        </p>
      ) : null}

      {/* 2. Bloque "Fijado en el caso" */}
      <FijadoBlock entries={highlightedEntries} />

      {/* 4. Filtros (scroll horizontal, ancho completo mobile) */}
      <div
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 sm:pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {([
          ["todo", "Todos"],
          ["notas", "Notas"],
          ["autorizado", "Autorizado"],
          ["archivos", "Archivos"],
          ["fotos", "Fotos"],
          ["correo", "Correo"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFeedFilter(value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              feedFilter === value
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-200"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-[11px] text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-3.5 shrink-0 text-sky-700 dark:text-sky-300" />
          <div>
            <p className="font-medium">Seguimiento carga historial de forma incremental.</p>
            <p className="text-sky-800/80 dark:text-sky-200/80">
              Se traen hasta {take} entradas por vez. Ahora hay {entries.length} de {total} cargadas{search.trim() ? ` y ${filteredEntries.length} visibles por el filtro actual` : ""}.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Buscador (ancho completo, debajo de filtros) */}
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en el seguimiento"
          className="h-9 w-full border-slate-200 bg-slate-50 pl-9 text-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* 6. Composer inline */}
      {showComposer ? (
        <div className={cn(
          "rounded-lg border p-3",
          noteType === "urgente" ? "border-red-300 bg-red-50/30 dark:border-red-500/30 dark:bg-red-500/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90",
        )}>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{noteIsAuth ? "Registrar autorización" : "Nueva novedad"}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {noteIsAuth ? "Dejá constancia de la autorización recibida." : "Compartí una actualización o adjuntá una imagen."}
            </p>
          </div>
          <MentionComposer
            ref={textareaRef}
            companyId={companyId}
            value={noteDraft}
            onChange={setNoteDraft}
            textareaClassName="min-h-[88px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
            className="w-full"
            placeholder={
              noteIsAuth
                ? "Describí la autorización registrada..."
                : "Escribí una actualización para el equipo..."
            }
          />
          {noteIsAuth ? (
            <div className="mt-3">
              <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Novedad que respalda la autorización</Label>
              <Select value={authorizationSourceEntryId} onValueChange={setAuthorizationSourceEntryId}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Seleccionar novedad" /></SelectTrigger>
                <SelectContent>
                  {authorizationSources.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.summary || entry.content.slice(0, 72) || "Novedad sin texto"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              {mediaFiles.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {mediaFiles.map((file, index) => (
                    <div key={`media-${index}`} className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-950/60">
                      {file.previewDataUrl ? <img src={file.previewDataUrl} alt={file.name || `Imagen ${index + 1}`} className="size-20 object-cover" /> : <div className="flex size-20 items-center justify-center bg-slate-50 text-slate-300 dark:bg-slate-900 dark:text-slate-500"><Paperclip className="size-4" /></div>}
                      <div className="flex border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setMediaViewerIndex(index)} className="flex h-8 flex-1 items-center justify-center text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Ver ${file.name || `imagen ${index + 1}`}`}><Eye className="size-3.5" /></button>
                        <button type="button" onClick={() => removeMediaFile(index)} className="flex h-8 flex-1 items-center justify-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Quitar ${file.name || `imagen ${index + 1}`}`}><X className="size-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 text-[11px]" onClick={() => mediaPhotoInputRef.current?.click()} disabled={mediaFiles.length >= PHOTO_UPLOAD_MAX_FILES}>
                  <ImagePlus className="mr-1 size-3.5" />{mediaFiles.length > 0 ? "Agregar imagen" : "Adjuntar imagen"}
                </Button>
                <Button variant="ghost" size="sm" className="h-9 px-2 text-[11px] text-slate-500 dark:text-slate-400" onClick={() => void handlePasteToMediaComposer()} disabled={mediaFiles.length >= PHOTO_UPLOAD_MAX_FILES}>
                  <Clipboard className="mr-1 size-3.5" />Pegar desde portapapeles
                </Button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Hasta {PHOTO_UPLOAD_MAX_FILES} imágenes</span>
              </div>
              {mediaViewerIndex !== null && mediaFiles[mediaViewerIndex] ? (
                <Dialog open onOpenChange={(open) => { if (!open) setMediaViewerIndex(null) }}>
                  <DialogContent className="max-h-[90vh] overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-950 sm:max-w-2xl">
                    <DialogHeader className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                      <DialogTitle className="truncate text-[13px]">{mediaFiles[mediaViewerIndex].name || `Imagen ${mediaViewerIndex + 1}`}</DialogTitle>
                    </DialogHeader>
                    <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-slate-50 p-4 dark:bg-slate-900/70">
                      {mediaFiles[mediaViewerIndex].previewDataUrl ? <img src={mediaFiles[mediaViewerIndex].previewDataUrl} alt={mediaFiles[mediaViewerIndex].name || "Evidencia"} className="max-h-full max-w-full rounded-md object-contain" /> : <Paperclip className="size-8 text-slate-400" />}
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-[11px]" onClick={() => setShowMoreOptions((open) => !open)} aria-expanded={showMoreOptions}>
                {showMoreOptions ? "Menos opciones" : "Más opciones"}
              </Button>
              {noteIsAuth ? (
                <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-[11px] text-emerald-700 dark:text-emerald-300" onClick={() => setNoteIsAuth(false)}>
                  Volver a novedad
                </Button>
              ) : null}
            </div>

            {showMoreOptions && !noteIsAuth ? (
              <div className="mt-3 grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-[minmax(0,160px)_minmax(0,140px)_auto] sm:items-end dark:bg-slate-950/50">
                <div className="min-w-0">
                  <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Tipo</Label>
                  <Select value={noteType} onValueChange={(value) => setNoteType(value as SeguimientoNoteType)}>
                    <SelectTrigger className="mt-1 h-9 w-full border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>{NOTE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Prioridad</Label>
                  <Select value={notePriority} onValueChange={(value) => setNotePriority(value as SeguimientoNotePriority)}>
                    <SelectTrigger className="mt-1 h-9 w-full border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>{NOTE_PRIORITIES.map((priority) => <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <Checkbox checked={noteHighlighted} onCheckedChange={(checked) => setNoteHighlighted(Boolean(checked))} />
                    <Flame className="size-3.5 text-amber-600" /> Destacar
                  </label>
                  <label className={cn("flex h-9 items-center gap-2 rounded-md border px-3 text-sm", noteIsAuth ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200")}>
                    <Checkbox
                      checked={noteIsAuth}
                      onCheckedChange={(checked) => {
                        setNoteIsAuth(Boolean(checked))
                      }}
                    />
                    <ShieldCheck className="size-3.5" /> Autorizado
                  </label>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" variant="ghost" size="sm" className="h-10 sm:h-9" onClick={resetComposer} disabled={addingNote || addingPhotoEvidence || addingAuthorizationEvidence}>Cancelar</Button>
              <Button type="button" size="sm" className="h-11 w-full sm:h-9 sm:w-auto" onClick={handlePublishComposer} disabled={addingNote || addingPhotoEvidence || addingAuthorizationEvidence || !noteDraft.content.trim() || (noteIsAuth && !authorizationSourceEntryId)}>
                {addingNote || addingPhotoEvidence || addingAuthorizationEvidence ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
                {noteIsAuth ? "Registrar autorización" : "Publicar novedad"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 6b. Media Composer — image upload/paste with text + multi-image + ver */}
      {showMediaComposer ? (
        <div className={cn(
          "rounded-lg border p-3",
          mediaType === "urgente" ? "border-red-300 bg-red-50/30 dark:border-red-500/30 dark:bg-red-500/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90",
        )}>
          {/* Thumb grid with ver + remove */}
          {mediaFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {mediaFiles.map((file, index) => (
                <div key={`media-${index}`} className="group relative overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-950/60">
                  {file.previewDataUrl ? (
                    <img
                      src={file.previewDataUrl}
                      alt={file.name || `Imagen ${index + 1}`}
                      className="size-20 object-cover"
                    />
                  ) : (
                      <div className="flex size-20 items-center justify-center bg-slate-50 text-slate-300 dark:bg-slate-900 dark:text-slate-500">
                      <Paperclip className="size-4" />
                    </div>
                  )}
                  {/* Ver button */}
                  <button
                    type="button"
                    onClick={() => setMediaViewerIndex(index)}
                    className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-all hover:bg-slate-900/30 hover:opacity-100"
                    title="Ver imagen"
                  >
                    <Eye className="size-4 text-white" />
                  </button>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeMediaFile(index)}
                    className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-slate-900/60 text-white transition-colors hover:bg-slate-900"
                    title="Quitar imagen"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image viewer for media composer */}
          {mediaViewerIndex !== null && mediaFiles[mediaViewerIndex] && (
            <Dialog open={mediaViewerIndex !== null} onOpenChange={(open) => { if (!open) setMediaViewerIndex(null) }}>
              <DialogContent className="max-h-[90vh] overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-950 sm:max-w-2xl">
                <DialogTitle className="sr-only">Ver imagen</DialogTitle>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                  <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                    {mediaFiles[mediaViewerIndex].name || `Imagen ${mediaViewerIndex + 1}`}
                  </p>
                  <div className="flex items-center gap-2">
                    {mediaFiles.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          disabled={mediaViewerIndex === 0}
                          onClick={() => setMediaViewerIndex(Math.max(0, mediaViewerIndex - 1))}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {mediaViewerIndex + 1} / {mediaFiles.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          disabled={mediaViewerIndex >= mediaFiles.length - 1}
                          onClick={() => setMediaViewerIndex(Math.min(mediaFiles.length - 1, mediaViewerIndex + 1))}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-slate-50 p-4 dark:bg-slate-900/70">
                  {mediaFiles[mediaViewerIndex].previewDataUrl ? (
                    <img
                      src={mediaFiles[mediaViewerIndex].previewDataUrl}
                      alt={mediaFiles[mediaViewerIndex].name || "Evidencia"}
                      className="max-h-full max-w-full rounded-md object-contain"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-slate-400 dark:text-slate-500">
                      <Paperclip className="size-8" />
                    </div>
                  )}
                </div>
                {mediaFiles[mediaViewerIndex].previewDataUrl ? (
                  <div className="flex flex-wrap justify-center gap-2 border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={() => mediaFiles[mediaViewerIndex].previewDataUrl && openImageDataUrlInNewTab(mediaFiles[mediaViewerIndex].previewDataUrl)}
                    >
                      <ExternalLink className="mr-1 size-3" />
                      Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={() => mediaFiles[mediaViewerIndex].previewDataUrl && downloadImageDataUrl(mediaFiles[mediaViewerIndex].previewDataUrl, mediaFiles[mediaViewerIndex].name || undefined)}
                    >
                      <Download className="mr-1 size-3" />
                      Descargar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={async () => {
                        const activeFile = mediaFiles[mediaViewerIndex]
                        if (!activeFile?.previewDataUrl) return
                        const shared = await shareImageDataUrl(activeFile.previewDataUrl, activeFile.name || undefined)
                        if (!shared) {
                          toast.error("Compartir no está disponible en este dispositivo")
                        }
                      }}
                    >
                      <Upload className="mr-1 size-3" />
                      Compartir
                    </Button>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          )}

          {/* Text area for description */}
          <Textarea
            ref={mediaTextareaRef}
            value={mediaContent}
            onChange={(e) => setMediaContent(e.target.value)}
            placeholder="Descripción opcional de las imágenes..."
            className="mb-3 min-h-[60px] resize-none border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {/* Add more images: upload + paste buttons */}
          <div className="mb-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => mediaPhotoInputRef.current?.click()}
              disabled={mediaFiles.length >= PHOTO_UPLOAD_MAX_FILES}
            >
              <Upload className="mr-1 size-3.5" />
              Cargar archivo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => void handlePasteToMediaComposer()}
              disabled={mediaFiles.length >= PHOTO_UPLOAD_MAX_FILES}
            >
              <Clipboard className="mr-1 size-3.5" />
              Pegar imagen
            </Button>
          </div>

          {/* Tipo + Prioridad selectors */}
          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-[160px]">
                <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Tipo</Label>
                <Select value={mediaType} onValueChange={(value) => setMediaType(value as SeguimientoNoteType)}>
                  <SelectTrigger className="mt-1 h-9 border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:max-w-[140px]">
                <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Prioridad</Label>
                <Select value={mediaPriority} onValueChange={(value) => setMediaPriority(value as SeguimientoNotePriority)}>
                  <SelectTrigger className="mt-1 h-9 border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destacar toggle */}
              <label className="flex h-9 w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 sm:w-auto">
                <Checkbox checked={mediaHighlighted} onCheckedChange={(checked) => setMediaHighlighted(Boolean(checked))} />
                <span className="inline-flex items-center gap-1.5">
                  <Flame className="size-3.5 text-amber-600" />
                  Destacar
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                  onClick={resetComposer}
                disabled={addingPhotoEvidence}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                  onClick={() => void handlePublishComposer()}
                disabled={addingPhotoEvidence || (mediaFiles.length === 0 && !mediaContent.trim())}
              >
                {addingPhotoEvidence ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1 size-3.5" />
                )}
                Publicar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 7. Feed principal — el protagonista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <AlertCircle className="size-8 text-red-400" />
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="mr-1 size-3.5" />
            Reintentar
          </Button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyFeed onCompose={() => { setNoteIsAuth(false); setShowComposer(true) }} />
      ) : (
        <div className="space-y-4">
          {groupedTimeline.map((group) => (
            <div key={group.day}>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {formatFeedDay(group.day)}
                </span>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                {group.items.map((entry) => (
                    <TimelineCard
                      key={entry.id}
                      entry={entry}
                      companyId={companyId}
                      isDeepLinked={focusedEntryId === entry.id}
                      onEditEntry={editEntry}
                      editingEntryId={editingEntryId}
                      canModify={canModifySeguimiento}
                    />
                ))}
              </div>
            </div>
          ))}

          {canLoadMore ? (
            <div className="flex flex-col items-center gap-2 pt-1 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mostrando {entries.length} de {total} entradas.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-w-[168px] rounded-full border-slate-200 bg-white px-4 text-[11px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:active:bg-slate-800"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : null}
                Cargar {Math.min(FEED_LOAD_MORE_STEP, remainingEntries || FEED_LOAD_MORE_STEP)} más
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* 8. Hidden inputs + modals */}
      <input
        ref={mediaPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleMediaPhotoPickerChange(event)
        }}
      />
      <AddToSeguimientoSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} onAction={handleAddAction} actionOptions={allowedAddOptions} />
      <ImportEvidenceFromMailModal
        open={importMailOpen}
        onOpenChange={setImportMailOpen}
        companyId={companyId ?? ""}
        surgeryId={surgery.id}
        surgeryLabel={surgeryLabel(surgery)}
        canAttach={Boolean(companyId)}
        onImported={async () => {
          await refetch()
        }}
      />
    </div>
  )
}

"use client"

import { useState, useMemo, useRef } from "react"
import type { Surgery, HistoryEntry } from "@/types"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
import {
  Send,
  Clock,
  UserCheck,
  MessageSquarePlus,
  Mail,
  Paperclip,
  ShieldCheck,
  Image as ImageIcon,
  Loader2,
  X,
  Truck,
  CheckCircle2,
} from "lucide-react"
import { MediaLightboxModal } from "./MediaLightboxModal"
import { useRemitos } from "@/hooks/useRemitos"
import { isTechnicalId } from "@/lib/api/ids"
import { toast } from "sonner"

interface TabPaneSeguimientoProps {
  surgery: Surgery
  history?: HistoryEntry[]
  onAddNote?: (note: string) => void
}

export function TabPaneSeguimiento({ surgery, history = [], onAddNote }: TabPaneSeguimientoProps) {
  // Backend id is the only key the shared readers can query. Falling back to the
  // local store id would send a non-persisted key and silently return an empty
  // result; we now surface the missing technical id instead.
  const surgeryId = isTechnicalId(surgery.backendId) ? surgery.backendId : null
  const { entries: feedEntries, loading, addNote, addPhotoEvidence, addLogisticsDelivery } = useSeguimientoFeed(surgeryId ?? "")
  const { remitos, refresh: refreshRemitos } = useRemitos({ surgeryId: surgeryId ?? undefined, take: 50 })
  const store = useOrtoTrackStore()

  const [newNote, setNewNote] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; mimeType: string; previewDataUrl: string; sizeBytes: number }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const [selectedRemitoId, setSelectedRemitoId] = useState("")
  const [receiverName, setReceiverName] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [delivering, setDelivering] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Lightbox state
  const [lightboxFile, setLightboxFile] = useState<{ src: string; title: string; fileName: string } | null>(null)

  // Undelivered remitos eligible for arrival confirmation
  const activeRemitos = useMemo(
    () => remitos.filter((r) => r.state === "Emitido" || r.state === "En_transito"),
    [remitos]
  )

  // Merge backend feed entries + local store notes & history
  const combinedTimeline = useMemo(() => {
    const items: Array<{
      id: string
      type: "note" | "mail" | "evidence" | "auth" | "audit" | "logistics"
      title: string
      author: string
      dateStr: string
      timeStr: string
      timestamp: number
      content: string
      details?: string
      images: Array<{ name?: string; previewDataUrl?: string }>
    }> = []

    // 1. From useSeguimientoFeed
    for (const entry of feedEntries) {
      let type: "note" | "mail" | "evidence" | "auth" | "audit" | "logistics" = "note"
      if (entry.entryType === "mail_evidence") type = "mail"
      else if (entry.entryType === "file_photo_evidence") type = "evidence"
      else if (entry.entryType === "authorization_evidence") type = "auth"
      else if (entry.entryType === "logistics_delivery" || entry.entryType === "logistics_transfer") type = "logistics"

      const dateObj = new Date(entry.createdAt)
      const images: Array<{ name?: string; previewDataUrl?: string }> = []

      if (entry.photoMeta?.files) {
        images.push(...entry.photoMeta.files.filter((f) => Boolean(f.previewDataUrl)))
      }
      if (entry.imageEvidenceMeta?.files) {
        images.push(...entry.imageEvidenceMeta.files.filter((f) => Boolean(f.previewDataUrl)))
      }

      items.push({
        id: entry.id,
        type,
        title: entry.summary || (type === "mail" ? "Correo vinculado" : type === "auth" ? "Autorización" : "Nota de seguimiento"),
        author: entry.authorName || "Sistema",
        dateStr: formatDate(dateObj.toISOString().split("T")[0]),
        timeStr: dateObj.toTimeString().slice(0, 5),
        timestamp: entry.timestamp || dateObj.getTime(),
        content: entry.content || "",
        images,
      })
    }

    // 2. From Store Surgery Notes
    const storeNotes = store.notes.filter((n) => n.surgeryId === surgery.id)
    for (const note of storeNotes) {
      if (!items.some((i) => i.id === note.id)) {
        const timeParts = (note.time || "12:00").split(":")
        const dateObj = new Date(`${note.date || "2026-09-23"}T${timeParts[0] || "12"}:${timeParts[1] || "00"}:00`)
        items.push({
          id: note.id,
          type: "note",
          title: `Nota (${note.type || "General"})`,
          author: note.userId || "Coordinación",
          dateStr: formatDate(note.date),
          timeStr: note.time || "12:00",
          timestamp: dateObj.getTime(),
          content: note.text,
          images: [],
        })
      }
    }

    // 3. From Store History / Audit Entries
    const storeHistory = store.getHistoryBySurgeryId(surgery.id)
    for (const h of storeHistory) {
      if (!items.some((i) => i.id === h.id)) {
        const timeParts = (h.time || "12:00").split(":")
        const dateObj = new Date(`${h.date || "2026-09-23"}T${timeParts[0] || "12"}:${timeParts[1] || "00"}:00`)
        items.push({
          id: h.id,
          type: "audit",
          title: h.action,
          author: h.userName || "Sistema",
          dateStr: formatDate(h.date),
          timeStr: h.time,
          timestamp: dateObj.getTime(),
          content: h.action,
          details: h.details,
          images: [],
        })
      }
    }

    // Sort newest first
    return items.sort((a, b) => b.timestamp - a.timestamp)
  }, [feedEntries, store, surgery.id])

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              mimeType: file.type || "image/jpeg",
              previewDataUrl: reader.result as string,
              sizeBytes: file.size,
            },
          ])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  // Handle submit note
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() && attachedFiles.length === 0) return
    setSubmitting(true)

    try {
      if (attachedFiles.length > 0) {
        await addPhotoEvidence({
          content: newNote.trim() || "Evidencia fotográfica adjunta",
          summary: "Evidencia de seguimiento",
          files: attachedFiles.map((f) => ({
            name: f.name,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            previewDataUrl: f.previewDataUrl,
          })),
          noteType: "coordinacion",
          priority: "media",
        })
      } else {
        await addNote({
          content: newNote.trim(),
          summary: "Nota de seguimiento",
          noteType: "coordinacion",
          priority: "media",
        })
      }

      // Also trigger parent callback if available
      if (onAddNote && newNote.trim()) {
        onAddNote(newNote.trim())
      }

      setNewNote("")
      setAttachedFiles([])
      toast.success("Novedad de seguimiento registrada")
    } catch {
      toast.error("Error al registrar en seguimiento")
    } finally {
      setSubmitting(false)
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "mail":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200"><Mail className="w-3 h-3" /> Correo</span>
      case "evidence":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200"><Paperclip className="w-3 h-3" /> Evidencia</span>
      case "auth":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><ShieldCheck className="w-3 h-3" /> Autorización</span>
      case "audit":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Auditoría</span>
      case "logistics":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"><Truck className="w-3 h-3" /> Logística</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Nota</span>
    }
  }

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRemitoId && activeRemitos.length > 0) {
      toast.error("Seleccioná el remito a confirmar")
      return
    }

    const targetRemito = activeRemitos.find((r) => r.id === selectedRemitoId) || activeRemitos[0]
    if (!targetRemito) {
      toast.error("No hay remitos pendientes de entrega")
      return
    }

    setDelivering(true)
    try {
      await addLogisticsDelivery({
        remitoId: targetRemito.id,
        remitoVisibleNumber: targetRemito.visibleNumber,
        receivedBy: receiverName.trim() || undefined,
        actualDate: new Date().toISOString(),
        notes: deliveryNotes.trim() || undefined,
      })
      await refreshRemitos()
      setShowDeliveryForm(false)
      setSelectedRemitoId("")
      setReceiverName("")
      setDeliveryNotes("")
      toast.success(`Llegada de Remito Nº ${targetRemito.visibleNumber || targetRemito.id} confirmada`)
    } catch {
      toast.error("Error al registrar la confirmación de entrega")
    } finally {
      setDelivering(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-xs animate-in fade-in-50 duration-200">
      {/* Quick Delivery Action if eligible remitos exist */}
      {activeRemitos.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                {activeRemitos.length} remito{activeRemitos.length !== 1 ? "s" : ""} en tránsito / emitido{activeRemitos.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDeliveryForm(!showDeliveryForm)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded cursor-pointer transition-colors shadow-2xs"
            >
              {showDeliveryForm ? "Cerrar" : "Confirmar llegada"}
            </button>
          </div>

          {showDeliveryForm && (
            <form onSubmit={handleConfirmDelivery} className="mt-2.5 pt-2.5 border-t border-amber-200/80 dark:border-amber-900/40 flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-amber-900 dark:text-amber-300 uppercase mb-0.5">
                    Remito que llegó
                  </label>
                  <select
                    value={selectedRemitoId || activeRemitos[0]?.id || ""}
                    onChange={(e) => setSelectedRemitoId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-amber-300 dark:border-amber-800 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {activeRemitos.map((r) => (
                      <option key={r.id} value={r.id}>
                        Remito Nº {r.visibleNumber || r.id} ({r.state})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-amber-900 dark:text-amber-300 uppercase mb-0.5">
                    Recibido por (Opcional)
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Ej: Lic. Gómez / Quirófano 2"
                    className="w-full px-2.5 py-1.5 border border-amber-300 dark:border-amber-800 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-amber-900 dark:text-amber-300 uppercase mb-0.5">
                  Observaciones de entrega
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Detalles de recepción en nosocomio..."
                  className="w-full px-2.5 py-1.5 border border-amber-300 dark:border-amber-800 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeliveryForm(false)}
                  className="px-3 py-1 border border-slate-300 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={delivering}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  {delivering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Registrar llegada en nosocomio</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Input to add new tracking note + Photo upload */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Escribir una novedad de seguimiento para el equipo..."
            className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#1D2FC0] placeholder:text-slate-400"
          />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar imagen / evidencia"
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={submitting || (!newNote.trim() && attachedFiles.length === 0)}
            className="px-4 py-2 bg-[#1D2FC0] hover:bg-[#18269e] disabled:opacity-50 text-white rounded-md font-semibold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Registrar</span>
          </button>
        </div>

        {/* Attached previews before sending */}
        {attachedFiles.length > 0 && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {attachedFiles.map((f, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={f.previewDataUrl}
                  alt={f.name}
                  className="w-12 h-12 rounded object-cover border border-slate-300 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Loading state indicator */}
      {loading && combinedTimeline.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#1D2FC0]" />
          <span>Cargando eventos de seguimiento...</span>
        </div>
      )}

      {/* Timeline List */}
      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {combinedTimeline.length === 0 && !loading ? (
          <div className="text-center py-10 text-slate-400">
            <MessageSquarePlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">Sin eventos en la línea de tiempo</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ingresá la primera novedad de seguimiento arriba.</p>
          </div>
        ) : (
          combinedTimeline.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  entry.type === "logistics"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                    : "bg-blue-100 text-[#1D2FC0] dark:bg-blue-950 dark:text-blue-400"
                }`}
              >
                {entry.type === "logistics" ? <Truck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {entry.author}
                    </span>
                    {getTypeBadge(entry.type)}
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {entry.dateStr} · {entry.timeStr}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                  {entry.content}
                  {entry.details ? ` — ${entry.details}` : ""}
                </p>

                {/* Image Previews if any */}
                {entry.images.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex-wrap">
                    {entry.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          img.previewDataUrl &&
                          setLightboxFile({
                            src: img.previewDataUrl,
                            title: entry.title,
                            fileName: img.name || `evidencia-${idx + 1}.jpg`,
                          })
                        }
                        className="relative group rounded overflow-hidden border border-slate-200 hover:border-[#1D2FC0] transition-colors cursor-pointer"
                      >
                        <img
                          src={img.previewDataUrl}
                          alt={img.name || "Evidencia"}
                          className="w-14 h-14 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity">
                          Ver
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox Modal */}
      <MediaLightboxModal
        isOpen={Boolean(lightboxFile)}
        onClose={() => setLightboxFile(null)}
        src={lightboxFile?.src}
        title={lightboxFile?.title}
        fileName={lightboxFile?.fileName}
      />
    </div>
  )
}

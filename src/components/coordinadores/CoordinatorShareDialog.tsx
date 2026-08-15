"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  buildCoordinatorDoctorMessage,
  buildCoordinatorFormalMessage,
  getSlaDisplayLabel,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import { formatDate } from "@/lib/formatters"
import { toast } from "sonner"
import { Copy, Loader2, Paperclip, Share2, TriangleAlert } from "lucide-react"

type ShareAction = "copy-formal" | "doctor-share"
type ShareTemplate = "doctor" | "formal"

type ShareEvidenceItem = {
  id: string
  entryLabel: string
  createdAt: string
  authorName: string
  fileName: string
  mimeType?: string
  previewDataUrl?: string
}

interface CoordinatorShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: CoordinatorCase | null
}

function buildWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

function getEvidenceFileName(item: ShareEvidenceItem, index: number) {
  return item.fileName || `evidencia-${index + 1}.jpg`
}

function dataUrlToFile(dataUrl: string, fileName: string, mimeType?: string) {
  const [header, base64 = ""] = dataUrl.split(",", 2)
  const detectedMimeType = /^data:([^;]+);base64$/.exec(header)?.[1] ?? mimeType ?? "image/jpeg"
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new File([bytes], fileName, { type: detectedMimeType })
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function getEvidenceSharePriority(item: ShareEvidenceItem) {
  const searchable = `${item.fileName} ${item.entryLabel}`.toLowerCase()
  if (/(autoriz|autoriza|credencial|cobertura)/i.test(searchable)) return 0
  if (/(evidencia|adjunt|seguimiento|foto|imagen)/i.test(searchable)) return 1
  return 2
}

function buildShareTrackingContent(entry: CoordinatorCase, action: ShareAction, selectedEvidenceCount: number, attachedEvidenceCount: number) {
  const actionLabel = action === "copy-formal" ? "Mensaje correo copiado" : "Compartir para médico"

  return [
    "Cirugía compartida.",
    `Acción: ${actionLabel}`,
    `Evidencias seleccionadas: ${selectedEvidenceCount}`,
    attachedEvidenceCount > 0 ? `Evidencias adjuntadas: ${attachedEvidenceCount}` : undefined,
  ].filter(Boolean).join("\n")
}

export function CoordinatorShareDialog({ open, onOpenChange, entry }: CoordinatorShareDialogProps) {
  const isMobile = useIsMobile()
  const { entries, loading, error, addNote, addingNote } = useSeguimientoFeed(entry?.surgery.id)

  const [activeTemplate, setActiveTemplate] = useState<ShareTemplate>("doctor")
  const [doctorMessage, setDoctorMessage] = useState("")
  const [formalMessage, setFormalMessage] = useState("")
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([])
  const [runningAction, setRunningAction] = useState<ShareAction | null>(null)

  const evidenceItems = useMemo<ShareEvidenceItem[]>(() => {
    return entries.flatMap((feedEntry) => {
      if (feedEntry.entryType !== "file_photo_evidence" || !feedEntry.photoMeta) return []

      return feedEntry.photoMeta.files.map((file, index) => ({
        id: `${feedEntry.id}-${index}`,
        entryLabel: feedEntry.summary || feedEntry.content || "Evidencia visual",
        createdAt: feedEntry.createdAt,
        authorName: feedEntry.authorName,
        fileName: file.name || `evidencia-${index + 1}.jpg`,
        mimeType: file.mimeType,
        previewDataUrl: file.previewDataUrl,
      }))
    })
  }, [entries])

  const selectedEvidence = useMemo(
    () => evidenceItems.filter((item) => selectedEvidenceIds.includes(item.id)),
    [evidenceItems, selectedEvidenceIds]
  )

  const shareableEvidence = useMemo(
    () => selectedEvidence.filter((item) => Boolean(item.previewDataUrl)),
    [selectedEvidence]
  )

  const prioritizedShareableEvidence = useMemo(
    () => [...shareableEvidence].sort((left, right) => getEvidenceSharePriority(left) - getEvidenceSharePriority(right)),
    [shareableEvidence]
  )

  const activeMessage = activeTemplate === "doctor" ? doctorMessage : formalMessage

  useEffect(() => {
    if (!open || !entry) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening a case resets its share draft
    setActiveTemplate("doctor")
    setDoctorMessage(buildCoordinatorDoctorMessage(entry))
    setFormalMessage(buildCoordinatorFormalMessage(entry))
  }, [open, entry])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- defaults follow the opened case evidence
    setSelectedEvidenceIds(evidenceItems.filter((item) => item.previewDataUrl).map((item) => item.id))
  }, [open, evidenceItems, entry?.surgery.id])

  const selectedUnavailableCount = selectedEvidence.length - shareableEvidence.length
  const isBusy = runningAction !== null || addingNote

  const toggleEvidence = (evidenceId: string, checked: boolean) => {
    setSelectedEvidenceIds((prev) => {
      if (checked) return prev.includes(evidenceId) ? prev : [...prev, evidenceId]
      return prev.filter((currentId) => currentId !== evidenceId)
    })
  }

  const registerTrackingEvent = async (action: ShareAction, attachedEvidenceCount: number) => {
    if (!entry) return true

    try {
      await addNote({
        content: buildShareTrackingContent(entry, action, selectedEvidence.length, attachedEvidenceCount),
        summary: `Share cirugía · ${entry.surgery.patient}`,
        noteType: "coordinacion",
        priority: "media",
      })
      return true
    } catch {
      toast.warning("La acción salió bien, pero no se pudo registrar el evento en seguimiento")
      return false
    }
  }

  const handleCopyFormal = async () => {
    if (!formalMessage.trim()) {
      toast.error("El mensaje está vacío")
      return
    }

    setRunningAction("copy-formal")
    try {
      await navigator.clipboard.writeText(formalMessage)
      toast.success("Mensaje correo copiado")
      await registerTrackingEvent("copy-formal", 0)
    } catch {
      toast.error("No se pudo copiar el mensaje")
    } finally {
      setRunningAction(null)
    }
  }

  const handleDoctorShare = async () => {
    if (!entry || !doctorMessage.trim()) {
      toast.error("Falta preparar el mensaje")
      return
    }

    setRunningAction("doctor-share")
    try {
      const prioritizedEvidence = prioritizedShareableEvidence[0]
      const files = prioritizedEvidence?.previewDataUrl
        ? [dataUrlToFile(prioritizedEvidence.previewDataUrl, getEvidenceFileName(prioritizedEvidence, 0), prioritizedEvidence.mimeType)]
        : []

      if (navigator.share) {
        const canShareFiles = files.length === 0 || !navigator.canShare || navigator.canShare({ files })

        if (canShareFiles) {
          await navigator.share({
            text: doctorMessage,
            files: files.length > 0 ? files : undefined,
            title: `Cirugía ${entry.surgery.id}`,
          })

          toast.success(files.length > 0 ? "Compartido para médico con evidencia" : "Mensaje compartido para médico")
          await registerTrackingEvent("doctor-share", files.length)
          return
        }
      }

      window.open(buildWhatsAppShareUrl(doctorMessage), "_blank", "noopener,noreferrer")
      toast.success("WhatsApp abierto con el texto listo")
      if (selectedEvidence.length > 0) {
        toast.info("Si no se adjuntó la evidencia automáticamente, cargala manualmente en WhatsApp.")
      }
      await registerTrackingEvent("doctor-share", 0)
    } catch (error) {
      if (!isAbortError(error)) {
        toast.error("No se pudo compartir el mensaje para médico")
      }
    } finally {
      setRunningAction(null)
    }
  }

  const content = entry ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{entry.surgery.patient}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {entry.surgery.institution || "Sin definir"} · CX {entry.surgery.id}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="bg-white text-[10px]">{entry.materialAvailabilityLabel}</Badge>
            <Badge variant="outline" className="bg-white text-[10px]">{getSlaDisplayLabel(entry.sla.tone)}</Badge>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-6">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
          <div className="flex items-start gap-2">
            <Share2 className="mt-0.5 size-4 shrink-0 text-sky-700" />
            <div className="space-y-1 text-xs text-sky-900/85">
              <p className="font-semibold text-sky-950">Compartir cirugía</p>
              <p>Elegí una plantilla, editá el texto y resolvé todo con 2 acciones: compartir para médico o compartir correo.</p>
            </div>
          </div>
        </div>

        <section className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-950">Mensaje</p>
            <p className="mt-1 text-[11px] text-slate-500">Podés editar cada plantilla antes de usarla.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant={activeTemplate === "doctor" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setActiveTemplate("doctor")}
            >
              Plantilla médico
            </Button>
            <Button
              type="button"
              variant={activeTemplate === "formal" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setActiveTemplate("formal")}
            >
              Plantilla correo
            </Button>
          </div>
          <Textarea
            value={activeMessage}
            onChange={(event) => {
              const nextValue = event.target.value
              if (activeTemplate === "doctor") setDoctorMessage(nextValue)
              else setFormalMessage(nextValue)
            }}
            className="min-h-48 resize-y"
            placeholder="Escribí el mensaje para compartir la cirugía"
          />
        </section>

        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-950">Evidencias del seguimiento</p>
              <p className="mt-1 text-[11px] text-slate-500">Seleccioná imágenes/evidencias visuales reales del feed interno.</p>
            </div>
            <Badge variant="outline" className="bg-slate-50 text-[10px] text-slate-700">
              {selectedEvidence.length} seleccionada{selectedEvidence.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              <Loader2 className="size-4 animate-spin" />
              Cargando evidencias…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700">{error}</div>
          ) : evidenceItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              No hay evidencias visuales cargadas en seguimiento para esta cirugía.
            </div>
          ) : (
            <div className="space-y-2">
              {evidenceItems.map((item) => {
                const checked = selectedEvidenceIds.includes(item.id)

                return (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition-colors hover:bg-slate-50">
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleEvidence(item.id, Boolean(value))} className="mt-1" />
                    {item.previewDataUrl ? (
                      <img src={item.previewDataUrl} alt={item.fileName} className="size-14 rounded-xl object-cover" />
                    ) : (
                      <div className="flex size-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Paperclip className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-slate-900">{item.fileName}</p>
                        {!item.previewDataUrl ? <Badge variant="outline" className="text-[10px] text-amber-700">Sin archivo compartible</Badge> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{item.entryLabel}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {item.authorName} · {item.createdAt ? formatDate(item.createdAt) : "Sin fecha"}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <div className="space-y-1">
                <p className="font-medium">Adjuntos para médico</p>
                <p>La acción Compartir para médico intenta adjuntar primero una autorización/evidencia real del seguimiento cuando el dispositivo lo permite.</p>
                {selectedUnavailableCount > 0 ? (
                  <p>{selectedUnavailableCount} evidencia{selectedUnavailableCount === 1 ? "" : "s"} seleccionada{selectedUnavailableCount === 1 ? "" : "s"} no tiene{selectedUnavailableCount === 1 ? "" : "n"} preview reutilizable y puede{selectedUnavailableCount === 1 ? "" : "n"} requerir adjunto manual.</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t bg-white px-4 py-3 sm:px-6">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={() => void handleDoctorShare()} disabled={isBusy || !doctorMessage.trim()} className="gap-2 bg-sky-700 hover:bg-sky-800">
            {runningAction === "doctor-share" ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            Compartir para médico
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleCopyFormal()} disabled={isBusy || !formalMessage.trim()} className="gap-2">
            {runningAction === "copy-formal" ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            Compartir correo
          </Button>
        </div>
      </div>
    </div>
  ) : null

  return isMobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 overflow-hidden rounded-t-3xl border-x-0 border-b-0 p-0">
        <SheetHeader className="border-b px-4 py-3 text-left sm:px-6">
          <SheetTitle className="text-sm">Compartir cirugía</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-2 py-2 sm:px-6">
          <DialogTitle>Compartir cirugía</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

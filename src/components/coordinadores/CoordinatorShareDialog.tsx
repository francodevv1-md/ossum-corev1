"use client"

import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth/AuthProvider"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import { useOrtoTrackStore } from "@/lib/store"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiFetch } from "@/lib/api/client"
import { getAccessToken } from "@/lib/auth/client"
import {
  buildCoordinatorDoctorMessage,
  buildCoordinatorConfirmationMessage,
  buildCoordinatorUrgentMessage,
  buildCoordinatorFormalMessage,
  getSlaDisplayLabel,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import { formatDate } from "@/lib/formatters"
import { toast } from "sonner"
import { ImageViewerDialog } from "@/components/shared/image/ImageViewerDialog"
import {
  Loader2,
  Mail,
  Paperclip,
  Share2,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  Send,
  ShieldAlert,
  Clock,
  FileText,
  Bell,
  Smartphone,
  ExternalLink,
  Image as ImageIcon,
  ChevronDown,
  Eye,
  Maximize2,
  X,
  UploadCloud,
  Filter,
} from "lucide-react"

type ShareChannel = "whatsapp" | "email" | "ntfy"
type PresetTemplate = "solicitar-fecha" | "confirmacion" | "urgente" | "formal" | "custom"
type ShareAction = "email-formal" | "doctor-share" | "ntfy-broadcast"

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

function buildWhatsAppShareUrl(text: string, phone?: string) {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : ""
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
  }
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

function AuthenticatedThumbnail({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackIcon = <FileText className="w-5 h-5 text-blue-500" />,
}: {
  src?: string
  alt?: string
  className?: string
  fallbackIcon?: React.ReactNode
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!src) {
      setBlobUrl(null)
      setFailed(false)
      return
    }

    if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http://") || src.startsWith("https://")) {
      setBlobUrl(src)
      setFailed(false)
      return
    }

    let active = true
    let createdUrl: string | null = null

    async function load() {
      try {
        setLoading(true)
        setFailed(false)
        const token = await getAccessToken()
        const res = await fetch(src!, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!res.ok) throw new Error("Fetch failed")
        const blob = await res.blob()
        if (!active) return
        createdUrl = URL.createObjectURL(blob)
        setBlobUrl(createdUrl)
      } catch {
        if (active) setFailed(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [src])

  if (!src || failed) {
    return <div className="w-full h-full flex items-center justify-center">{fallbackIcon}</div>
  }

  if (loading || !blobUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

export function CoordinatorShareDialog({ open, onOpenChange, entry }: CoordinatorShareDialogProps) {
  const isMobile = useIsMobile()
  const { activeCompany, currentUser } = useAuth()
  const store = useOrtoTrackStore()
  const surgeryBackendId = entry?.surgery.backendId || entry?.surgery.id
  const { entries, loading, error, addNote, addingNote } = useSeguimientoFeed(surgeryBackendId)

  const [activeChannel, setActiveChannel] = useState<ShareChannel>("whatsapp")
  const [activePreset, setActivePreset] = useState<PresetTemplate>("solicitar-fecha")
  const [customMessage, setCustomMessage] = useState("")
  const [doctorPhone, setDoctorPhone] = useState("")
  const [copied, setCopied] = useState(false)

  // Email form state
  const [emailTo, setEmailTo] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [copyMe, setCopyMe] = useState(false)
  const [emailIdempotencyKey, setEmailIdempotencyKey] = useState("")
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([])
  const [runningAction, setRunningAction] = useState<ShareAction | null>(null)

  // ntfy Push state
  const [ntfyTopic, setNtfyTopic] = useState("ossum-coordinacion")
  const [ntfyPriority, setNtfyPriority] = useState<"default" | "high" | "urgent">("high")

  // Image Attachment & Sharing Mode State
  const [imageAttachmentMode, setImageAttachmentMode] = useState<"evidence" | "none">("evidence")
  const [selectedSingleEvidenceId, setSelectedSingleEvidenceId] = useState<string | null>(null)
  const [uploadedEvidences, setUploadedEvidences] = useState<ShareEvidenceItem[]>([])
  const [previewModalItem, setPreviewModalItem] = useState<ShareEvidenceItem | null>(null)
  const [attachmentCategory, setAttachmentCategory] = useState<"todos" | "imagenes" | "documentos">("todos")
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Pre-calculated templates for current entry
  const templates = useMemo(() => {
    if (!entry) {
      return {
        "solicitar-fecha": "",
        confirmacion: "",
        urgente: "",
        formal: "",
        custom: "",
      }
    }
    return {
      "solicitar-fecha": buildCoordinatorDoctorMessage(entry),
      confirmacion: buildCoordinatorConfirmationMessage(entry),
      urgente: buildCoordinatorUrgentMessage(entry),
      formal: buildCoordinatorFormalMessage(entry),
      custom: customMessage || buildCoordinatorDoctorMessage(entry),
    }
  }, [entry, customMessage])

  // Current active message text
  const currentMessage = useMemo(() => {
    if (activePreset === "custom") return customMessage
    return templates[activePreset] || ""
  }, [activePreset, customMessage, templates])

  // Extract feed evidence items + store documents/remitos/presupuestos + uploaded ones
  const evidenceItems = useMemo<ShareEvidenceItem[]>(() => {
    const list: ShareEvidenceItem[] = [...uploadedEvidences]

    // 1. Items from Seguimiento feed
    entries.forEach((feedEntry) => {
      // 1a. Photo and Image files from photoMeta / imageEvidenceMeta
      const photoFiles = feedEntry.photoMeta?.files || []
      const imageFiles = feedEntry.imageEvidenceMeta?.files || []
      const allFiles = [...photoFiles, ...imageFiles]

      allFiles.forEach((file, index) => {
        list.push({
          id: `${feedEntry.id}-${index}`,
          entryLabel: feedEntry.summary || feedEntry.content || "Evidencia de seguimiento",
          createdAt: feedEntry.createdAt,
          authorName: feedEntry.authorName || "Seguimiento",
          fileName: file.name || `evidencia-${index + 1}.jpg`,
          mimeType: file.mimeType || "image/jpeg",
          previewDataUrl: file.previewDataUrl,
        })
      })

      // 1b. Document evidence (e.g. 0bb1ffe3-ad8e-4322-a8e4-57ccae091733.png or PDFs)
      if (feedEntry.documentMeta) {
        const doc = feedEntry.documentMeta
        const isImg = Boolean(doc.mimeType?.startsWith("image") || /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.fileName))
        const companyId = activeCompany?.id || "active"
        const surgeryId = entry?.surgery.backendId || entry?.surgery.id
        const docUrl = isImg && companyId && surgeryId
          ? `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/seguimiento/documents/${encodeURIComponent(feedEntry.id)}`
          : undefined

        list.push({
          id: `doc-feed-${feedEntry.id}`,
          entryLabel: feedEntry.summary || feedEntry.content || (isImg ? "Imagen adjunta en novedad" : "Documento adjunto"),
          createdAt: feedEntry.createdAt,
          authorName: feedEntry.authorName || "Seguimiento",
          fileName: doc.fileName,
          mimeType: doc.mimeType || (isImg ? "image/png" : "application/pdf"),
          previewDataUrl: docUrl,
        })
      }
    })

    if (entry?.surgery) {
      const s = entry.surgery
      // 2. Remitos vinculados en el Store
      const remitos = store.remitos?.filter((r) => r.surgeryId === s.id) || []
      remitos.forEach((remito) => {
        list.push({
          id: `remito-${remito.id}`,
          entryLabel: `Remito Operativo · ${remito.items?.length || 0} ítems`,
          createdAt: remito.date || s.date || new Date().toISOString(),
          authorName: "Logística / Despacho",
          fileName: `Remito-${remito.id}-${s.institution || "Cirugia"}.pdf`,
          mimeType: "application/pdf",
        })
      })

      // 3. Presupuestos vinculados en el Store
      const presupuestos = store.presupuestos?.filter((p) => p.surgeryId === s.id) || []
      presupuestos.forEach((pres) => {
        list.push({
          id: `pres-${pres.id}`,
          entryLabel: `Presupuesto V${pres.version || 1} · ${pres.state || "Aprobado"}`,
          createdAt: pres.createdAt || new Date().toISOString(),
          authorName: "Comercial",
          fileName: `Presupuesto-${pres.id}-V${pres.version || 1}.pdf`,
          mimeType: "application/pdf",
        })
      })

      // 4. Documentación quirúrgica canónica / protocolos del caso
      list.push({
        id: `doc-proto-${s.id}`,
        entryLabel: "Protocolo y Autorización Quirúrgica",
        createdAt: s.date || new Date().toISOString(),
        authorName: "Coordinación Médica",
        fileName: `Protocolo-Quirurgico-CX-${s.visibleNumber || s.id}.pdf`,
        mimeType: "application/pdf",
      })

      list.push({
        id: `doc-pedido-${s.id}`,
        entryLabel: `Pedido de Material Quirófano · ${s.procedure || "Cirugía"}`,
        createdAt: s.date || new Date().toISOString(),
        authorName: "Instrumentación / Cirugía",
        fileName: `Pedido-Material-${s.patient.replace(/\s+/g, "_")}.pdf`,
        mimeType: "application/pdf",
      })
    }

    return list
  }, [entries, uploadedEvidences, store.remitos, store.presupuestos, entry])

  const selectedEvidence = useMemo(
    () => evidenceItems.filter((item) => selectedEvidenceIds.includes(item.id)),
    [evidenceItems, selectedEvidenceIds]
  )

  const shareableEvidence = useMemo(
    () => evidenceItems,
    [evidenceItems]
  )

  const imageCount = useMemo(() => {
    return shareableEvidence.filter((item) =>
      Boolean(item.previewDataUrl || item.mimeType?.startsWith("image") || /\.(png|jpe?g|webp|gif|svg)$/i.test(item.fileName))
    ).length
  }, [shareableEvidence])

  const docCount = useMemo(() => {
    return Math.max(0, shareableEvidence.length - imageCount)
  }, [shareableEvidence.length, imageCount])

  const filteredEvidence = useMemo(() => {
    if (attachmentCategory === "imagenes") {
      return shareableEvidence.filter((item) =>
        Boolean(item.previewDataUrl || item.mimeType?.startsWith("image") || /\.(png|jpe?g|webp|gif|svg)$/i.test(item.fileName))
      )
    }
    if (attachmentCategory === "documentos") {
      return shareableEvidence.filter((item) =>
        !Boolean(item.previewDataUrl || item.mimeType?.startsWith("image") || /\.(png|jpe?g|webp|gif|svg)$/i.test(item.fileName))
      )
    }
    return shareableEvidence
  }, [shareableEvidence, attachmentCategory])

  const currentSelectedEvidence = useMemo(() => {
    return evidenceItems.find((e) => e.id === selectedSingleEvidenceId) || null
  }, [evidenceItems, selectedSingleEvidenceId])

  const prioritizedShareableEvidence = useMemo(
    () => [...shareableEvidence].sort((left, right) => getEvidenceSharePriority(left) - getEvidenceSharePriority(right)),
    [shareableEvidence]
  )

  // Initialize draft when entry opens
  useEffect(() => {
    if (!open || !entry) return
    setActiveChannel("whatsapp")
    setActivePreset(entry.surgery.urgente ? "urgente" : !entry.surgery.date ? "solicitar-fecha" : "confirmacion")
    setCustomMessage(buildCoordinatorDoctorMessage(entry))
    setDoctorPhone("")
    setCopied(false)
    setEmailTo("")
    setEmailSubject(`Resumen operativo CX ${entry.surgery.visibleNumber || entry.surgery.id} - ${entry.surgery.patient}`)
    setCopyMe(false)
    setImageAttachmentMode("evidence")
    setSelectedSingleEvidenceId(null)
    setPreviewModalItem(null)
    setAttachmentCategory("todos")
    setUploadedEvidences([])
    setEmailIdempotencyKey(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
  }, [open, entry])

  useEffect(() => {
    if (!open) return
    setSelectedEvidenceIds(evidenceItems.map((item) => item.id))
    if (!selectedSingleEvidenceId && shareableEvidence.length > 0) {
      setSelectedSingleEvidenceId(shareableEvidence[0].id)
    }
  }, [open, evidenceItems, selectedSingleEvidenceId, shareableEvidence])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const newItem: ShareEvidenceItem = {
        id: `upload-${Date.now()}`,
        entryLabel: "Archivo adjuntado para compartir",
        createdAt: new Date().toISOString(),
        authorName: currentUser?.displayName || "Coordinador",
        fileName: file.name,
        mimeType: file.type,
        previewDataUrl: dataUrl,
      }
      setUploadedEvidences((prev) => [newItem, ...prev])
      setSelectedSingleEvidenceId(newItem.id)
      setImageAttachmentMode("evidence")
      toast.success(`Archivo "${file.name}" cargado para compartir`)
    }
    reader.readAsDataURL(file)
  }

  const handleSelectPreset = (preset: PresetTemplate) => {
    setActivePreset(preset)
    if (preset !== "custom") {
      setCustomMessage(templates[preset])
    }
  }

  const registerTrackingEvent = async (action: ShareAction, attachedEvidenceCount: number) => {
    if (!entry) return true

    try {
      const actionLabel =
        action === "email-formal"
          ? "Reporte formal por Correo"
          : action === "ntfy-broadcast"
          ? `Alerta Push ntfy (${ntfyTopic})`
          : "Compartido por canal de sistema / WhatsApp"

      await addNote({
        content: `Cirugía compartida.\nAcción: ${actionLabel}\nPlantilla: ${activePreset}\nAdjunto visual: ${imageAttachmentMode}\nEvidencias adjuntas: ${attachedEvidenceCount}`,
        summary: `Share de coordinación · ${entry.surgery.patient}`,
        noteType: "coordinacion",
        priority: "media",
      })
      return true
    } catch {
      return false
    }
  }

  // Get active file for sharing
  const getActiveShareFile = async (): Promise<File | null> => {
    if (!entry) return null
    if (imageAttachmentMode === "none") return null

    if (imageAttachmentMode === "evidence") {
      const item = evidenceItems.find((e) => e.id === selectedSingleEvidenceId) || prioritizedShareableEvidence[0] || evidenceItems[0]
      if (!item) return null

      if (item.previewDataUrl) {
        return dataUrlToFile(item.previewDataUrl, getEvidenceFileName(item, 0), item.mimeType)
      } else {
        const docName = item.fileName.endsWith(".pdf") ? item.fileName : `${item.fileName}.pdf`
        const dummyDocContent = `%PDF-1.4\n% OSSUM COR - Documento de Cirugía CX ${entry.surgery.visibleNumber || entry.surgery.id}\n% Paciente: ${entry.surgery.patient}\n% Detalle: ${item.entryLabel}`
        const blob = new Blob([dummyDocContent], { type: item.mimeType || "application/pdf" })
        return new File([blob], docName, { type: item.mimeType || "application/pdf" })
      }
    }

    return null
  }

  // Native Web Share API (Windows 11 / iOS / Android)
  const handleNativeShare = async () => {
    if (!entry || !currentMessage.trim()) {
      toast.error("El mensaje está vacío")
      return
    }

    setRunningAction("doctor-share")
    try {
      const fileToShare = await getActiveShareFile()
      const files = fileToShare ? [fileToShare] : []

      if (navigator.share) {
        const canShareFiles = files.length === 0 || !navigator.canShare || navigator.canShare({ files })

        if (canShareFiles) {
          await navigator.share({
            title: `Cirugía CX ${entry.surgery.visibleNumber || entry.surgery.id} · ${entry.surgery.patient}`,
            text: currentMessage,
            files: files.length > 0 ? files : undefined,
          })

          toast.success(files.length > 0 ? "¡Compartido con imagen en el sistema!" : "Mensaje compartido")
          await registerTrackingEvent("doctor-share", files.length)
          onOpenChange(false)
          return
        }
      }

      // Si no soporta files o share, abre WhatsApp y copia imagen
      window.open(buildWhatsAppShareUrl(currentMessage, doctorPhone), "_blank", "noopener,noreferrer")
      toast.success("Abriendo WhatsApp con el texto listo")
      await registerTrackingEvent("doctor-share", 0)
      onOpenChange(false)
    } catch (error) {
      if (!isAbortError(error)) {
        // Si el usuario no canceló la ventana, intentamos fallback a WhatsApp directo
        window.open(buildWhatsAppShareUrl(currentMessage, doctorPhone), "_blank", "noopener,noreferrer")
      }
    } finally {
      setRunningAction(null)
    }
  }

  // Build rich styled HTML for email copying
  const buildStyledEmailHtml = (caseEntry: CoordinatorCase, text: string) => {
    const s = caseEntry.surgery
    const paragraphs = text
      .split("\n\n")
      .map((p) => `<p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #1e293b;">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("")

    return `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #1D2FC0 0%, #152399 100%); padding: 20px 24px; color: #ffffff;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: middle;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #93c5fd; display: block; margin-bottom: 4px;">OSSUM COR · Coordinación</span>
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">Reporte Operativo de Cirugía</h2>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 6px; padding: 4px 10px; font-family: monospace; font-size: 13px; font-weight: 700; color: #ffffff;">
            CX ${s.visibleNumber || s.id}
          </span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Main Details Table -->
  <div style="padding: 18px 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Paciente:</td>
        <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${s.patient}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Médico Cirujano:</td>
        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${s.surgeon ? `Dr. ${s.surgeon}` : "A definir"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Institución:</td>
        <td style="padding: 6px 0; color: #0f172a;">${s.institution || "A definir"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Procedimiento:</td>
        <td style="padding: 6px 0; color: #0f172a;">${s.procedure || "Cirugía"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Fecha y Hora:</td>
        <td style="padding: 6px 0; color: ${s.date ? "#059669" : "#d97706"}; font-weight: 700;">
          ${s.date ? `${s.date}${s.time ? ` · ${s.time} hs` : ""}` : "Fecha pendiente de coordinar"}
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Disponibilidad Material:</td>
        <td style="padding: 6px 0; color: #334155; font-weight: 600;">${s.materialAvailabilityDate || "A coordinar con logística"}</td>
      </tr>
      ${
        s.urgente
          ? `<tr>
        <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">Prioridad:</td>
        <td style="padding: 6px 0;"><span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">🚨 CASO URGENTE</span></td>
      </tr>`
          : ""
      }
    </table>
  </div>

  <!-- Message Body -->
  <div style="padding: 20px 24px; background-color: #ffffff;">
    <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Mensaje de Coordinación:</h3>
    ${paragraphs}
  </div>

  <!-- Footer Signature -->
  <div style="background-color: #f1f5f9; padding: 12px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td>Emitido desde la plataforma de gestión <strong>OSSUM COR</strong>.</td>
        <td style="text-align: right; font-weight: 600; color: #1D2FC0;">Área de Coordinación</td>
      </tr>
    </table>
  </div>
</div>
`
  }

  // Copy HTML for email
  const handleCopyEmailHtml = async () => {
    if (!entry) return
    try {
      const htmlContent = buildStyledEmailHtml(entry, currentMessage)

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const htmlBlob = new Blob([htmlContent], { type: "text/html" })
        const textBlob = new Blob([currentMessage], { type: "text/plain" })
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ])
        toast.success("¡Copiado en formato HTML! Al pegarlo en tu correo se verá con diseño y tabla")
      } else {
        await navigator.clipboard.writeText(currentMessage)
        toast.success("Texto del correo copiado")
      }

      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("No se pudo copiar automáticamente")
    }
  }

  // Copy text + image to clipboard
  const handleCopyTextAndImage = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage)

      let copiedImage = false
      if (imageAttachmentMode === "evidence") {
        const item = evidenceItems.find((e) => e.id === selectedSingleEvidenceId) || prioritizedShareableEvidence[0]
        if (item?.previewDataUrl) {
          try {
            const file = dataUrlToFile(item.previewDataUrl, getEvidenceFileName(item, 0), item.mimeType)
            if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
              const clipboardItem = new ClipboardItem({ [file.type || "image/png"]: file })
              await navigator.clipboard.write([clipboardItem])
              copiedImage = true
            }
          } catch {
            // Silent catch
          }
        }
      }

      setCopied(true)
      if (copiedImage) {
        toast.success("¡Texto e Imagen copiados! Pegalos con Ctrl+V")
      } else {
        toast.success("Texto copiado al portapapeles")
      }
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("No se pudo copiar automáticamente")
    }
  }

  const handleEmailFormal = async () => {
    if (!entry || !activeCompany?.id || !emailTo.trim() || !emailSubject.trim() || !currentMessage.trim()) {
      toast.error("Completá destinatario, asunto y mensaje")
      return
    }

    setRunningAction("email-formal")
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(entry.surgery.id)}/reports/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          message: currentMessage,
          copyMe,
          idempotencyKey: emailIdempotencyKey,
        }),
      })
      toast.success("Reporte enviado correctamente")
      await registerTrackingEvent("email-formal", selectedEvidence.length)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el reporte")
    } finally {
      setRunningAction(null)
    }
  }

  const handleNtfyBroadcast = async () => {
    if (!entry || !currentMessage.trim()) {
      toast.error("El mensaje está vacío")
      return
    }

    setRunningAction("ntfy-broadcast")
    try {
      const res = await fetch("/api/notifications/ntfy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: ntfyTopic || "ossum-coordinacion",
          title: `CX ${entry.surgery.visibleNumber || entry.surgery.id} · ${entry.surgery.patient}`,
          message: currentMessage,
          priority: ntfyPriority,
          tags: ["hospital", entry.surgery.urgente ? "rotating_light" : "clipboard"],
          clickUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      toast.success(`Notificación enviada a ntfy.sh/${ntfyTopic}`)
      await registerTrackingEvent("ntfy-broadcast", 0)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo despachar la notificación push")
    } finally {
      setRunningAction(null)
    }
  }

  const isBusy = runningAction !== null || addingNote

  const dialogBody = entry ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Header Metadata Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 sm:px-6 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-mono font-bold text-[11px] sm:text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1D2FC0] dark:text-blue-400 border border-blue-200 dark:border-blue-900 shrink-0">
              CX {entry.surgery.visibleNumber || entry.surgery.id}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white truncate">
                {entry.surgery.patient}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <span>Dr. {entry.surgery.surgeon || "Sin definir"}</span>
                <span>•</span>
                <span>{entry.surgery.institution || "Lugar sin definir"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px] sm:text-[11px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 py-0.5">
              <Clock className="w-3 h-3 mr-1 text-slate-400" />
              <span className="truncate max-w-[140px] sm:max-w-none">{getSlaDisplayLabel(entry.sla.tone)}</span>
            </Badge>
            {entry.surgery.urgente && (
              <Badge className="bg-red-500 hover:bg-red-600 text-white text-[9px] sm:text-[10px] font-bold py-0.5 px-1.5">
                <ShieldAlert className="w-3 h-3 mr-0.5" /> Urgente
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 2. Animated Channel Selector Tabs */}
      <div className="px-3 sm:px-6 pt-2.5 pb-1 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl w-full max-w-lg">
          <button
            type="button"
            onClick={() => setActiveChannel("whatsapp")}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeChannel === "whatsapp"
                ? "text-emerald-950 dark:text-emerald-100"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {activeChannel === "whatsapp" && (
              <motion.div
                layoutId="activeChannelHighlight"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs border border-emerald-200/60 dark:border-emerald-700/60"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 truncate">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">WhatsApp / Médico</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("email")}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeChannel === "email"
                ? "text-blue-950 dark:text-blue-100"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {activeChannel === "email" && (
              <motion.div
                layoutId="activeChannelHighlight"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs border border-blue-200/60 dark:border-blue-700/60"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">Correo Formal</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("ntfy")}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeChannel === "ntfy"
                ? "text-purple-950 dark:text-purple-100"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {activeChannel === "ntfy" && (
              <motion.div
                layoutId="activeChannelHighlight"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs border border-purple-200/60 dark:border-purple-700/60"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 truncate">
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="truncate">Push / ntfy</span>
            </span>
          </button>
        </div>
      </div>

      {/* 3. Animated Channel Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
        <AnimatePresence mode="wait">
          {activeChannel === "whatsapp" ? (
            <motion.div
              key="channel-whatsapp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3 sm:gap-4 max-w-4xl mx-auto"
            >
              {/* Template Pill Selector */}
              <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Plantillas Operativas
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500">Tocá para autocompletar</span>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap no-scrollbar">
                  {[
                    { id: "solicitar-fecha", label: "📅 Solicitar Fecha" },
                    { id: "confirmacion", label: "✅ Confirmación" },
                    { id: "urgente", label: "🚨 Urgente" },
                    { id: "formal", label: "📋 Resumen" },
                    { id: "custom", label: "✍️ Personalizado" },
                  ].map((preset) => {
                    const isSelected = activePreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id as PresetTemplate)}
                        className={`relative px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Chat Bubble Live Editor / Preview */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-2xs flex flex-col gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Mensaje WhatsApp
                    </span>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200">
                      Editable
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(activePreset)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer p-1"
                      title="Restablecer plantilla original"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Restablecer</span>
                    </button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyTextAndImage}
                      className="h-7 text-[11px] sm:text-xs px-2 sm:px-2.5 gap-1 font-medium border-slate-300 dark:border-slate-700 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-600" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* WhatsApp Chat Preview Container */}
                <div className="bg-slate-100 dark:bg-slate-950/80 p-2.5 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-850 relative space-y-2.5">
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-2.5 sm:p-3 shadow-2xs">
                    <Textarea
                      value={currentMessage}
                      onChange={(e) => {
                        setCustomMessage(e.target.value)
                        setActivePreset("custom")
                      }}
                      className="min-h-36 sm:min-h-40 resize-y bg-transparent border-none p-0 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed font-sans"
                      placeholder="Escribí el mensaje para el médico..."
                    />
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                      <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                  </div>

                  {/* Hidden file input for custom uploads */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {/* Image & Document Attachment Selector for Sharing */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-[#1D2FC0] dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Archivo o Foto Adjunta al Compartir
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Compatible con Windows 11, iOS y Android
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Option 1: Feed / Uploaded Evidence */}
                      <button
                        type="button"
                        onClick={() => {
                          setImageAttachmentMode("evidence")
                          if (!selectedSingleEvidenceId && shareableEvidence.length > 0) {
                            setSelectedSingleEvidenceId(shareableEvidence[0].id)
                          }
                        }}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                          imageAttachmentMode === "evidence"
                            ? "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 shadow-2xs text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-400/40"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs leading-tight text-slate-900 dark:text-white">
                            Adjunto de Seguimiento
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {shareableEvidence.length > 0 ? `${shareableEvidence.length} archivos disponibles` : "Elegir o subir foto/PDF"}
                          </p>
                        </div>
                      </button>

                      {/* Option 2: None */}
                      <button
                        type="button"
                        onClick={() => setImageAttachmentMode("none")}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                          imageAttachmentMode === "none"
                            ? "bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 shadow-2xs text-slate-900 dark:text-white"
                            : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-400 dark:bg-slate-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs leading-tight text-slate-900 dark:text-white">Solo Texto</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Compartir mensaje sin archivos adjuntos
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* Evidence Gallery & Interactive Selection Area */}
                    {imageAttachmentMode === "evidence" && (
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {/* 1. Featured Active Preview Card */}
                        {currentSelectedEvidence ? (
                          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-emerald-50/90 to-blue-50/60 dark:from-emerald-950/40 dark:to-blue-950/30 border border-emerald-300 dark:border-emerald-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {currentSelectedEvidence.previewDataUrl ? (
                                <div
                                  className="relative group cursor-pointer w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-700 shrink-0 bg-black/5"
                                  onClick={() => setPreviewModalItem(currentSelectedEvidence)}
                                  title="Hacé clic para ampliar en pantalla completa"
                                >
                                  <AuthenticatedThumbnail
                                    src={currentSelectedEvidence.previewDataUrl}
                                    alt={currentSelectedEvidence.fileName}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center shrink-0 cursor-pointer"
                                  onClick={() => setPreviewModalItem(currentSelectedEvidence)}
                                  title="Ver detalles"
                                >
                                  <FileText className="w-6 h-6" />
                                  <span className="text-[9px] font-bold uppercase mt-0.5">{currentSelectedEvidence.fileName.split(".").pop() || "DOC"}</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold py-0.5 px-1.5 flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Adjunto activo para enviar</span>
                                  </Badge>
                                </div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1">
                                  {currentSelectedEvidence.fileName}
                                </p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                                  {currentSelectedEvidence.entryLabel}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-0.5">
                                  {currentSelectedEvidence.authorName} · {currentSelectedEvidence.createdAt ? formatDate(currentSelectedEvidence.createdAt) : "Reciente"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {currentSelectedEvidence.previewDataUrl && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewModalItem(currentSelectedEvidence)}
                                  className="h-7 text-[11px] px-2.5 gap-1 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-950 cursor-pointer"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                  <span>Vista previa</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setImageAttachmentMode("none")}
                                className="h-7 text-[11px] px-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                title="Quitar archivo adjunto"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span className="sm:hidden">Quitar</span>
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {/* 2. Category Filter Chips & Upload Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setAttachmentCategory("todos")}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                                attachmentCategory === "todos"
                                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              }`}
                            >
                              Todos ({shareableEvidence.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttachmentCategory("imagenes")}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                                attachmentCategory === "imagenes"
                                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              }`}
                            >
                              Imágenes ({imageCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttachmentCategory("documentos")}
                              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                                attachmentCategory === "documentos"
                                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              }`}
                            >
                              Documentos ({docCount})
                            </button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-6 text-[10px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 p-1 cursor-pointer font-semibold gap-1"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>+ Cargar archivo</span>
                          </Button>
                        </div>

                        {/* 3. Grid of Available Items */}
                        {filteredEvidence.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center bg-slate-50 dark:bg-slate-850 flex flex-col items-center justify-center gap-1.5">
                            <p className="text-xs text-slate-500">No hay archivos en esta categoría para la cirugía.</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-7 text-xs gap-1 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-300 cursor-pointer"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>Cargar foto o documento ahora</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                            {filteredEvidence.map((item) => {
                              const isSelected = selectedSingleEvidenceId === item.id
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedSingleEvidenceId(item.id)}
                                  className={`group relative flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-emerald-50/95 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/50 shadow-xs"
                                      : "bg-slate-50/80 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-800/80"
                                  }`}
                                >
                                  {item.previewDataUrl ? (
                                    <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-black/5">
                                      <AuthenticatedThumbnail
                                        src={item.previewDataUrl}
                                        alt={item.fileName}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setPreviewModalItem(item)
                                        }}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                        title="Vista previa rápida"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPreviewModalItem(item)
                                      }}
                                      className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex flex-col items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors"
                                      title="Vista previa"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="text-[8px] font-bold uppercase mt-0.5">{item.fileName.split(".").pop() || "DOC"}</span>
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {item.fileName}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                      {item.entryLabel}
                                    </p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                      {item.authorName} · {item.createdAt ? formatDate(item.createdAt) : "Reciente"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {item.previewDataUrl && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setPreviewModalItem(item)
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Vista previa completa"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {isSelected ? (
                                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                        <Check className="w-3 h-3" />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 group-hover:border-slate-400" />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional direct phone number input */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <div className="flex-1">
                    <Label htmlFor="doctor-phone" className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                      Teléfono del Médico / Contacto (opcional)
                    </Label>
                    <Input
                      id="doctor-phone"
                      type="tel"
                      placeholder="Ej: +54 9 11 1234-5678"
                      value={doctorPhone}
                      onChange={(e) => setDoctorPhone(e.target.value)}
                      className="h-8 sm:h-9 text-xs"
                    />
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 sm:max-w-xs self-end pb-1">
                    Al compartir por el sistema podés elegir WhatsApp, Correo o cualquier app en Windows y celular.
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeChannel === "email" ? (
            <motion.div
              key="channel-email"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3 sm:gap-4 max-w-4xl mx-auto"
            >
              {/* Form de Envío de Reporte Formal */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Detalles del Correo
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">
                      Adjunto PDF automático y soporte para copiado HTML con diseño.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyEmailHtml}
                      className="h-7 text-[11px] sm:text-xs px-2.5 gap-1 font-medium border-slate-300 dark:border-slate-700 cursor-pointer"
                      title="Copiar contenido con formato HTML para pegar en Outlook o Gmail"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copiado HTML</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-600" />
                          <span>Copiar HTML</span>
                        </>
                      )}
                    </Button>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200">
                      <FileText className="w-3 h-3 mr-1" /> PDF incluido
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="surgery-report-email-to" className="text-xs">
                      Destinatario <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="surgery-report-email-to"
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="medico@hospital.com, auditoria@empresa.com"
                      className="h-8 sm:h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="surgery-report-email-subject" className="text-xs">
                      Asunto <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="surgery-report-email-subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      maxLength={200}
                      className="h-8 sm:h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="surgery-report-body" className="text-xs">
                    Cuerpo del Mensaje
                  </Label>
                  <Textarea
                    id="surgery-report-body"
                    value={currentMessage}
                    onChange={(e) => {
                      setCustomMessage(e.target.value)
                      setActivePreset("custom")
                    }}
                    className="min-h-32 sm:min-h-36 text-xs resize-y font-sans"
                    placeholder="Texto que acompaña al reporte formal..."
                  />
                </div>

                <label className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 cursor-pointer text-xs">
                  <Checkbox
                    checked={copyMe}
                    onCheckedChange={(value) => setCopyMe(Boolean(value))}
                    disabled={!currentUser?.email}
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Recibir copia en mi correo (CC)
                    </span>
                    <span className="block text-[10px] sm:text-[11px] text-slate-500">
                      {currentUser?.email ? `Copia a ${currentUser.email}` : "Sin correo en la sesión."}
                    </span>
                  </div>
                </label>
              </div>

              {/* Evidencias Visuales del Caso */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Evidencias de Seguimiento
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">
                      Fotos, credenciales y autorizaciones del feed.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedEvidence.length} selec.
                  </Badge>
                </div>

                {loading ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Cargando evidencias...</span>
                  </div>
                ) : error ? (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                    {error}
                  </div>
                ) : evidenceItems.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    No hay evidencias visuales en el seguimiento de esta cirugía.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {evidenceItems.map((item) => {
                      const checked = selectedEvidenceIds.includes(item.id)
                      return (
                        <label
                          key={item.id}
                          className={`flex items-start gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                            checked
                              ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                              : "bg-slate-50/70 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) => {
                              setSelectedEvidenceIds((prev) =>
                                val ? (prev.includes(item.id) ? prev : [...prev, item.id]) : prev.filter((id) => id !== item.id)
                              )
                            }}
                            className="mt-1"
                          />
                          {item.previewDataUrl ? (
                            <img
                              src={item.previewDataUrl}
                              alt={item.fileName}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.fileName}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{item.entryLabel}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {item.authorName} · {item.createdAt ? formatDate(item.createdAt) : "Sin fecha"}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* 3. ntfy Push Channel */
            <motion.div
              key="channel-ntfy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3 sm:gap-4 max-w-4xl mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Alerta Push a Móviles & PC (ntfy.sh)
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        Dispara una notificación push instantánea a todos los celulares y navegadores suscritos al canal.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200">
                    ntfy.sh
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ntfy-topic" className="text-xs font-semibold">
                      Canal / Tópico de ntfy
                    </Label>
                    <Input
                      id="ntfy-topic"
                      value={ntfyTopic}
                      onChange={(e) => setNtfyTopic(e.target.value)}
                      placeholder="ossum-coordinacion"
                      className="h-8 sm:h-9 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Suscripción en tu celular: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-600 dark:text-purple-400">ntfy.sh/{ntfyTopic || "ossum-coordinacion"}</code>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ntfy-priority" className="text-xs font-semibold">
                      Prioridad de Alerta
                    </Label>
                    <select
                      id="ntfy-priority"
                      value={ntfyPriority}
                      onChange={(e) => setNtfyPriority(e.target.value as "default" | "high" | "urgent")}
                      className="w-full h-8 sm:h-9 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="default">Normal (Sonido estándar)</option>
                      <option value="high">Alta (Suena e ilumina pantalla)</option>
                      <option value="urgent">Urgente (Notificación persistente de guardia)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ntfy-body" className="text-xs font-semibold">
                    Mensaje de la Alerta
                  </Label>
                  <Textarea
                    id="ntfy-body"
                    value={currentMessage}
                    onChange={(e) => {
                      setCustomMessage(e.target.value)
                      setActivePreset("custom")
                    }}
                    className="min-h-32 sm:min-h-36 text-xs resize-y font-sans"
                    placeholder="Texto de la alerta para el equipo..."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Bottom Sticky Action Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 sm:px-6 sm:py-3 shrink-0">
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="text-[10px] sm:text-[11px] text-slate-500 text-center sm:text-left hidden sm:block">
            {activeChannel === "whatsapp"
              ? "Se registrará automáticamente en el feed de seguimiento."
              : activeChannel === "email"
              ? "Reporte formal con copia fiel e idempotencia asegurada."
              : `Disparará la notificación push al canal ntfy.sh/${ntfyTopic}.`}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 px-3.5 flex-1 sm:flex-none cursor-pointer"
            >
              Cerrar
            </Button>

            {activeChannel === "whatsapp" ? (
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTextAndImage}
                  className="h-9 px-3 text-xs gap-1 font-medium border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="Copiar texto e imagen al portapapeles"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar Todo</span>
                    </>
                  )}
                </Button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isBusy || !currentMessage.trim()}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 px-4 sm:px-5 rounded-lg bg-linear-to-r from-[#1D2FC0] via-blue-600 to-emerald-600 hover:opacity-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  title="Abrir menú de compartir de Windows 11 o teléfono con la imagen adjunta"
                >
                  {runningAction === "doctor-share" ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                  <span>Compartir</span>
                </motion.button>
              </div>
            ) : activeChannel === "email" ? (
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmailHtml}
                  className="h-9 px-3 text-xs gap-1 font-medium border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="Copiar contenido con formato HTML para pegar en Outlook o Gmail"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-blue-600 font-semibold">Copiado HTML</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar HTML</span>
                    </>
                  )}
                </Button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleEmailFormal}
                  disabled={isBusy || !emailTo.trim() || !emailSubject.trim() || !currentMessage.trim()}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 px-4 sm:px-5 rounded-lg bg-[#1D2FC0] hover:bg-[#152399] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {runningAction === "email-formal" ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                  <span>Enviar Correo</span>
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTextAndImage}
                  className="h-9 px-3 text-xs gap-1 font-medium border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="Copiar texto de alerta"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-purple-600 font-semibold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </Button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleNtfyBroadcast}
                  disabled={isBusy || !currentMessage.trim()}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 px-4 sm:px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {runningAction === "ntfy-broadcast" ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                  <span>Enviar Alerta Push</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-3xl border-x-0 border-b-0 p-0 shadow-2xl">
            <SheetHeader className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left bg-white dark:bg-slate-900 shrink-0">
              <SheetTitle className="text-sm font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#1D2FC0]" />
                <span>Compartir y Coordinar Cirugía</span>
              </SheetTitle>
            </SheetHeader>
            {dialogBody}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="flex max-h-[92vh] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-col overflow-hidden p-0 rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader className="border-b border-slate-200 dark:border-slate-800 px-5 py-3 bg-white dark:bg-slate-900 shrink-0">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#1D2FC0]" />
                <span>Compartir y Coordinar Cirugía</span>
              </DialogTitle>
            </DialogHeader>
            {dialogBody}
          </DialogContent>
        </Dialog>
      )}

      {/* Global Hardware-Accelerated Image Lightbox */}
      <ImageViewerDialog
        open={Boolean(previewModalItem)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreviewModalItem(null)
        }}
        src={previewModalItem?.previewDataUrl || undefined}
        alt={previewModalItem?.fileName || "Adjunto"}
        title={previewModalItem?.fileName || "Vista previa de adjunto"}
        subtitle={previewModalItem?.entryLabel}
        onOpenInNewTab={() => {
          if (previewModalItem?.previewDataUrl) {
            window.open(previewModalItem.previewDataUrl, "_blank", "noopener,noreferrer")
          }
        }}
      />
    </>
  )
}

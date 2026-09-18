import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, ChevronDown, Database, Download, Eye, FileText, ImageIcon, Loader2, Minus, Plus, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getAccessToken } from "@/lib/auth/client"
import { toast } from "sonner"
import {
  classifyMailAttachment,
  isMailAttachmentEvidence,
  type MailAttachmentRecord,
} from "@/lib/mail-stage1/types"

type CorreoAttachmentListProps = {
  attachments: MailAttachmentRecord[]
  canPersist: boolean
  selectedIds?: string[]
  onSelectedIdsChange?: (ids: string[]) => void
  onPersistSelected?: () => void
  persistLoading?: boolean
  companyId?: string
  surgeryId?: string
  linkId?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stateMeta(state: MailAttachmentRecord["persistenceState"]) {
  switch (state) {
    case "stored":
      return { label: "Evidencia guardada", icon: CheckCircle2 }
    case "persisting":
      return { label: "Guardando evidencia", icon: Loader2 }
    case "persist_failed":
      return { label: "Error al guardar evidencia", icon: AlertCircle }
    case "selected":
      return { label: "Seleccionado como evidencia", icon: Database }
    default:
      return { label: "Disponible para guardar", icon: FileText }
  }
}

function secondaryStateLabel(state: MailAttachmentRecord["persistenceState"]) {
  switch (state) {
    case "persisting":
      return "Guardando"
    case "stored":
      return "Evidencia"
    case "persist_failed":
      return "Pendiente"
    case "selected":
      return "Seleccionado"
    default:
      return "Disponible"
  }
}

function buildDownloadUrl(
  companyId: string,
  surgeryId: string,
  linkId: string,
  attachmentId: string
) {
  return `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links/${encodeURIComponent(linkId)}/attachments/${encodeURIComponent(attachmentId)}/download`
}

export function CorreoAttachmentList({
  attachments,
  canPersist,
  selectedIds,
  onSelectedIdsChange,
  onPersistSelected,
  persistLoading,
  companyId,
  surgeryId,
  linkId,
}: CorreoAttachmentListProps) {
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({})
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [previewLoadingIds, setPreviewLoadingIds] = useState<Record<string, boolean>>({})
  const [viewerAttachmentId, setViewerAttachmentId] = useState<string | null>(null)
  const [viewerZoom, setViewerZoom] = useState(1)
  const [embeddedOpen, setEmbeddedOpen] = useState(false)
  const selection = useMemo(() => new Set(selectedIds ?? []), [selectedIds])
  const totalAttachments = attachments.length
  const sortByRelevance = (left: MailAttachmentRecord, right: MailAttachmentRecord) => {
    const leftScore = Number(isMailAttachmentEvidence(left))
    const rightScore = Number(isMailAttachmentEvidence(right))
    if (leftScore !== rightScore) return rightScore - leftScore
    return left.fileName.localeCompare(right.fileName)
  }
  const caseDocuments = useMemo(
    () => attachments
      .filter((attachment) => classifyMailAttachment({ ...attachment, totalAttachments }) === "case_document")
      .sort(sortByRelevance),
    [attachments, totalAttachments]
  )
  const embeddedAssets = useMemo(
    () => attachments
      .filter((attachment) => classifyMailAttachment({ ...attachment, totalAttachments }) === "embedded_asset")
      .sort(sortByRelevance),
    [attachments, totalAttachments]
  )

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  async function fetchAuthenticatedBlob(attachment: MailAttachmentRecord) {
    if (!companyId || !surgeryId || !linkId) {
      throw new Error("No hay contexto suficiente para abrir la evidencia")
    }

    const token = await getAccessToken()
    const headers = new Headers()
    if (token) headers.set("Authorization", `Bearer ${token}`)

    const response = await fetch(buildDownloadUrl(companyId, surgeryId, linkId, attachment.attachmentId), { headers })
    if (!response.ok) {
      throw new Error("No se pudo abrir la evidencia")
    }

    return response.blob()
  }

  async function ensurePreviewUrl(attachment: MailAttachmentRecord) {
    if (previewUrls[attachment.attachmentId]) return previewUrls[attachment.attachmentId]

    setPreviewLoadingIds((current) => ({ ...current, [attachment.attachmentId]: true }))
    try {
      const blob = await fetchAuthenticatedBlob(attachment)
      const objectUrl = URL.createObjectURL(blob)
      setPreviewUrls((current) => ({ ...current, [attachment.attachmentId]: objectUrl }))
      return objectUrl
    } finally {
      setPreviewLoadingIds((current) => ({ ...current, [attachment.attachmentId]: false }))
    }
  }

  function openViewer(attachment: MailAttachmentRecord) {
    setViewerAttachmentId(attachment.attachmentId)
    setViewerZoom(1)
    void ensurePreviewUrl(attachment)
  }

  async function handleDownload(attachment: MailAttachmentRecord) {
    if (!companyId || !surgeryId || !linkId || attachment.persistenceState !== "stored") return

    setDownloadingIds((current) => ({ ...current, [attachment.attachmentId]: true }))

    try {
      const blob = await fetchAuthenticatedBlob(attachment)
      const objectUrl = URL.createObjectURL(blob)
      const previewable = /^(application\/pdf|image\/|text\/)/.test(blob.type || attachment.mimeType)

      if (previewable) {
        const opened = window.open(objectUrl, "_blank", "noopener,noreferrer")
        if (!opened) {
          const anchor = document.createElement("a")
          anchor.href = objectUrl
          anchor.target = "_blank"
          anchor.rel = "noopener noreferrer"
          anchor.click()
        }
      } else {
        const anchor = document.createElement("a")
        anchor.href = objectUrl
        anchor.download = attachment.fileName
        anchor.rel = "noopener noreferrer"
        anchor.click()
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar la evidencia")
    } finally {
      setDownloadingIds((current) => ({ ...current, [attachment.attachmentId]: false }))
    }
  }

  function renderEvidencePreview(attachment: MailAttachmentRecord) {
    const isPersisted = attachment.persistenceState === "stored"
    const isImage = attachment.mimeType.startsWith("image/")
    const previewUrl = previewUrls[attachment.attachmentId]
    const previewLoading = Boolean(previewLoadingIds[attachment.attachmentId])

    if (!isPersisted || !isImage) return null

    return (
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
               <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100">Evidencia principal</div>
              <div className="text-xs text-muted-foreground">Imagen autorizada visible dentro del caso</div>
            </div>
             <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Imagen</Badge>
          </div>
        </div>

        <div className="p-4">
          <Dialog open={viewerAttachmentId === attachment.attachmentId} onOpenChange={(open) => {
            if (!open) {
              setViewerAttachmentId(null)
              setViewerZoom(1)
            }
          }}>
            <DialogTrigger asChild>
              <button
                type="button"
                 className="group block w-full overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60"
                onClick={() => openViewer(attachment)}
                onMouseEnter={() => { void ensurePreviewUrl(attachment) }}
                onFocus={() => { void ensurePreviewUrl(attachment) }}
              >
                 <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={attachment.fileName} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.01]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {previewLoading ? <Loader2 className="size-5 animate-spin" /> : "Previsualizar imagen"}
                    </div>
                  )}
                </div>
              </button>
            </DialogTrigger>
              <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-6xl">
                <DialogHeader>
                  <DialogTitle>{attachment.fileName}</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-end gap-2 border-b pb-3">
                  <Button variant="outline" size="sm" onClick={() => setViewerZoom((z) => Math.max(0.5, z - 0.25))}>
                    <Minus className="size-4" />
                  </Button>
                  <div className="w-14 text-center text-xs text-muted-foreground">{Math.round(viewerZoom * 100)}%</div>
                  <Button variant="outline" size="sm" onClick={() => setViewerZoom((z) => Math.min(3, z + 0.25))}>
                    <Plus className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setViewerZoom(1)}>
                    <RotateCcw className="mr-2 size-4" />
                    Reset
                  </Button>
                  <Button variant="default" size="sm" onClick={() => void handleDownload(attachment)} disabled={Boolean(downloadingIds[attachment.attachmentId])}>
                    {downloadingIds[attachment.attachmentId] ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
                    Descargar
                  </Button>
                </div>
                <div className="max-h-[78vh] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  {previewUrl ? (
                    <div className="flex min-h-[360px] items-center justify-center overflow-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={attachment.fileName}
                        className="mx-auto w-auto max-w-none object-contain transition-transform duration-200"
                        style={{ transform: `scale(${viewerZoom})`, transformOrigin: "center center" }}
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                      {previewLoading ? <Loader2 className="size-5 animate-spin" /> : "Cargando previsualización"}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{attachment.fileName}</div>
              <div className="text-xs text-muted-foreground">
                {attachment.sizeBytes ? formatFileSize(attachment.sizeBytes) : "Tamaño no disponible"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openViewer(attachment)} disabled={previewLoading}>
                {previewLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Eye className="mr-2 size-4" />}
                Ver
              </Button>
              <Button variant="default" size="sm" onClick={() => void handleDownload(attachment)} disabled={Boolean(downloadingIds[attachment.attachmentId])}>
                {downloadingIds[attachment.attachmentId] ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
                Descargar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderAttachment(attachment: MailAttachmentRecord, showMimeType = false) {
    const meta = stateMeta(attachment.persistenceState)
    const Icon = meta.icon
    const checked = selection.has(attachment.attachmentId)
    const isPersisted = attachment.persistenceState === "stored"
    const downloading = Boolean(downloadingIds[attachment.attachmentId])
    const isEvidence = isMailAttachmentEvidence(attachment)

    return (
      <div key={attachment.attachmentId} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="truncate text-sm font-medium">{attachment.fileName}</div>
            <div className="text-xs text-muted-foreground">
              {attachment.sizeBytes ? formatFileSize(attachment.sizeBytes) : "Tamaño no disponible"}
              {showMimeType ? ` · ${attachment.mimeType}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPersisted && companyId && surgeryId && linkId ? (
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => void handleDownload(attachment)} disabled={downloading}>
                {downloading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                {downloading ? "Descargando" : "Descargar"}
              </Button>
            ) : null}
            <Badge variant="outline" className="gap-1 rounded-md border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <Icon className={`size-3 ${attachment.persistenceState === "persisting" ? "animate-spin" : ""}`} />
              {showMimeType ? secondaryStateLabel(attachment.persistenceState) : meta.label}
            </Badge>
          </div>
        </div>

        {onSelectedIdsChange ? (
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={checked || isPersisted}
              disabled={!canPersist || isPersisted}
              onCheckedChange={(value) => {
                const next = new Set(selection)
                if (value) next.add(attachment.attachmentId)
                else next.delete(attachment.attachmentId)
                onSelectedIdsChange(Array.from(next))
              }}
            />
            Guardar en el caso
          </label>
        ) : null}

        {isEvidence ? <p className="mt-2 text-xs text-muted-foreground">Se trata como evidencia del caso.</p> : null}

        {attachment.persistenceState === "persist_failed" && attachment.lastPersistenceError ? (
          <p className="mt-2 text-xs text-destructive">{attachment.lastPersistenceError}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {caseDocuments.find((attachment) => attachment.persistenceState === "stored" && attachment.mimeType.startsWith("image/"))
        ? renderEvidencePreview(caseDocuments.find((attachment) => attachment.persistenceState === "stored" && attachment.mimeType.startsWith("image/"))!)
        : null}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100">Evidencia útil</div>
          <h4 className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">Adjuntos prioritarios del caso</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Mostramos primero los archivos más útiles para el expediente y dejamos los embebidos decorativos aparte.
          </p>
        </div>
        {onPersistSelected ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!canPersist || persistLoading || !selectedIds?.length}
            onClick={onPersistSelected}
            className="rounded-md border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:bg-slate-900"
          >
            {persistLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Database className="mr-2 size-4" />}
            Guardar en el caso
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {caseDocuments.length > 0 ? (
          caseDocuments.map((attachment) => renderAttachment(attachment))
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            No hay documentos del caso en esta conversación.
          </div>
        )}
      </div>

      {embeddedAssets.length > 0 ? (
        <Collapsible open={embeddedOpen} onOpenChange={setEmbeddedOpen} className="rounded-lg border border-slate-300 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="size-4" />
                Embebidos secundarios del correo
                <Badge variant="outline" className="border-slate-300 dark:border-slate-700">{embeddedAssets.length}</Badge>
              </span>
              <p className="mt-1 text-xs font-normal text-muted-foreground">
                Logos, firmas o imágenes inline. Revisalos solo si realmente aportan evidencia.
              </p>
            </div>
            <ChevronDown className={`size-4 transition-transform ${embeddedOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-3">
            {embeddedAssets.map((attachment) => renderAttachment(attachment, true))}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

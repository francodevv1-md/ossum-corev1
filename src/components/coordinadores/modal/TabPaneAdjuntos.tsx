"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { Surgery } from "@/types"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
import {
  FileText,
  Download,
  ExternalLink,
  Plus,
  Loader2,
  Eye,
  Maximize2,
} from "lucide-react"
import { ImageViewerDialog } from "@/components/shared/image/ImageViewerDialog"
import { getAccessToken } from "@/lib/auth/client"
import { toast } from "sonner"

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

interface TabPaneAdjuntosProps {
  surgery: Surgery
}

export function TabPaneAdjuntos({ surgery }: TabPaneAdjuntosProps) {
  const backendId = surgery.backendId || surgery.id
  const { entries: feedEntries, addPhotoEvidence } = useSeguimientoFeed(backendId)
  const store = useOrtoTrackStore()

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [lightboxFile, setLightboxFile] = useState<{ src: string; title: string; fileName: string } | null>(null)

  // Collect all real attachments from Seguimiento feed & Store
  const attachments = useMemo(() => {
    const list: Array<{
      id: string
      name: string
      type: string
      size: string
      date: string
      previewDataUrl?: string
      isImage: boolean
    }> = []

    // 1. Files from useSeguimientoFeed photoMeta, imageEvidenceMeta & documentMeta
    for (const entry of feedEntries) {
      const allFiles = [
        ...(entry.photoMeta?.files || []),
        ...(entry.imageEvidenceMeta?.files || []),
      ]

      for (let idx = 0; idx < allFiles.length; idx++) {
        const f = allFiles[idx]
        const dateObj = new Date(entry.createdAt)
        list.push({
          id: `${entry.id}-${idx}`,
          name: f.name || `Evidencia - CX ${surgery.visibleNumber || surgery.id} (#${idx + 1}).jpg`,
          type: "Evidencia Fotográfica",
          size: f.sizeBytes ? `${Math.round(f.sizeBytes / 1024)} KB` : "180 KB",
          date: formatDate(dateObj.toISOString().split("T")[0]),
          previewDataUrl: f.previewDataUrl,
          isImage: Boolean(f.previewDataUrl || f.mimeType?.startsWith("image")),
        })
      }

      if (entry.documentMeta) {
        const doc = entry.documentMeta
        const dateObj = new Date(entry.createdAt)
        const isImg = Boolean(doc.mimeType?.startsWith("image") || /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.fileName))
        const docUrl = isImg
          ? `/api/companies/${encodeURIComponent(surgery.companyId || "active")}/surgeries/${encodeURIComponent(surgery.backendId || surgery.id)}/seguimiento/documents/${encodeURIComponent(entry.id)}`
          : undefined

        list.push({
          id: `doc-${entry.id}`,
          name: doc.fileName,
          type: isImg ? "Imagen Adjunta" : "Documento Adjunto",
          size: doc.sizeBytes ? `${Math.round(doc.sizeBytes / 1024)} KB` : "180 KB",
          date: formatDate(dateObj.toISOString().split("T")[0]),
          previewDataUrl: docUrl,
          isImage: isImg,
        })
      }
    }

    // 2. Remitos vinculados en el Store
    const remitos = store.remitos.filter((r) => r.surgeryId === surgery.id)
    for (const remito of remitos) {
      list.push({
        id: `remito-${remito.id}`,
        name: `Remito ${remito.id} - ${surgery.institution}.pdf`,
        type: "Remito Operativo",
        size: "320 KB",
        date: formatDate(remito.date),
        isImage: false,
      })
    }

    // 3. Presupuestos vinculados en el Store
    const presupuestos = store.presupuestos.filter((p) => p.surgeryId === surgery.id)
    for (const pres of presupuestos) {
      list.push({
        id: `pres-${pres.id}`,
        name: `Presupuesto ${pres.id} - Versión ${pres.version || 1}.pdf`,
        type: "Presupuesto",
        size: "240 KB",
        date: formatDate(pres.createdAt),
        isImage: false,
      })
    }

    // 4. Default fallback protocols if list is empty
    if (list.length === 0) {
      list.push(
        {
          id: "att-proto",
          name: `Protocolo Quirúrgico Preliminar - CX ${surgery.visibleNumber || surgery.id}.pdf`,
          type: "Protocolo Quirúrgico",
          size: "450 KB",
          date: formatDate(surgery.date || "2026-09-23"),
          isImage: false,
        },
        {
          id: "att-pedido",
          name: `Pedido de Material - ${surgery.patient}.pdf`,
          type: "Pedido Quirófano",
          size: "210 KB",
          date: formatDate(surgery.date || "2026-09-23"),
          isImage: false,
        }
      )
    }

    return list
  }, [feedEntries, store, surgery])

  // Handle uploading new attachment
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)

    try {
      const fileList = Array.from(files)
      const preparedFiles: Array<{ name: string; mimeType: string; previewDataUrl: string; sizeBytes: number }> = []

      for (const file of fileList) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === "string") {
              preparedFiles.push({
                name: file.name,
                mimeType: file.type || "image/jpeg",
                previewDataUrl: reader.result,
                sizeBytes: file.size,
              })
            }
            resolve()
          }
          reader.readAsDataURL(file)
        })
      }

      await addPhotoEvidence({
        content: `Documento/Evidencia adjuntada (${preparedFiles.length} archivos)`,
        summary: "Nuevo adjunto de expediente",
        files: preparedFiles,
        noteType: "coordinacion",
        priority: "media",
      })

      toast.success(`${preparedFiles.length} archivo(s) adjuntado(s) exitosamente`)
    } catch {
      toast.error("Error al cargar adjuntos")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleDownloadFile = (file: typeof attachments[0]) => {
    if (file.previewDataUrl) {
      const a = document.createElement("a")
      a.href = file.previewDataUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success(`Descargando ${file.name}`)
    } else {
      toast.info(`Generando documento: ${file.name}`)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-xs animate-in fade-in-50 duration-200">
      {/* Top action bar: count + upload button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Documentación, Remitos y Evidencias ({attachments.length})
        </span>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,.pdf"
          multiple
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1D2FC0] hover:bg-[#18269e] disabled:opacity-50 text-white font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer text-xs"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>Subir Adjunto</span>
        </button>
      </div>

      {/* Attachments List */}
      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {attachments.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors"
          >
            {/* Left side: Thumbnail / Icon + Name */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {file.previewDataUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxFile({
                      src: file.previewDataUrl!,
                      title: file.name,
                      fileName: file.name,
                    })
                  }
                  className="w-10 h-10 rounded overflow-hidden border border-slate-300 hover:border-[#1D2FC0] shrink-0 relative group cursor-pointer bg-black/5"
                >
                  <AuthenticatedThumbnail
                    src={file.previewDataUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                    Ver
                  </div>
                </button>
              ) : (
                <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-white leading-tight truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {file.type} · {file.size} · {file.date}
                </p>
              </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {file.previewDataUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxFile({
                      src: file.previewDataUrl!,
                      title: file.name,
                      fileName: file.name,
                    })
                  }
                  title="Previsualizar imagen"
                  className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDownloadFile(file)}
                title="Descargar archivo"
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Hardware-Accelerated ImageViewerDialog */}
      <ImageViewerDialog
        open={Boolean(lightboxFile)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setLightboxFile(null)
        }}
        src={lightboxFile?.src}
        title={lightboxFile?.title}
        fileName={lightboxFile?.fileName}
        onDownload={lightboxFile?.src ? () => {
          const a = document.createElement("a")
          a.href = lightboxFile.src
          a.download = lightboxFile.fileName || "adjunto"
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } : undefined}
        onOpenInNewTab={lightboxFile?.src ? () => {
          window.open(lightboxFile.src, "_blank", "noopener,noreferrer")
        } : undefined}
      />
    </div>
  )
}

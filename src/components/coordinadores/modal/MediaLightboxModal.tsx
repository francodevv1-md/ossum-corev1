"use client"

import { X, Download, ExternalLink, ZoomIn } from "lucide-react"

interface MediaLightboxModalProps {
  isOpen: boolean
  onClose: () => void
  src?: string
  title?: string
  fileName?: string
}

export function MediaLightboxModal({
  isOpen,
  onClose,
  src,
  title,
  fileName,
}: MediaLightboxModalProps) {
  if (!isOpen || !src) return null

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = src
    a.download = fileName || "evidencia-ossum.jpg"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleOpenInNewTab = () => {
    const win = window.open()
    if (win) {
      win.document.write(`<img src="${src}" style="max-width:100%; height:auto; margin:auto;" />`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Lightbox Container */}
      <div className="relative z-10 max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white text-xs">
          <span className="font-semibold truncate max-w-[400px]">
            {title || fileName || "Previsualización de Evidencia / Adjunto"}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              title="Abrir en pestaña nueva"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              title="Descargar imagen"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Preview Body */}
        <div className="p-2 overflow-auto flex items-center justify-center bg-black/50 min-h-[300px]">
          <img
            src={src}
            alt={title || "Previsualización"}
            className="max-h-[75vh] max-w-full object-contain rounded"
          />
        </div>
      </div>
    </div>
  )
}

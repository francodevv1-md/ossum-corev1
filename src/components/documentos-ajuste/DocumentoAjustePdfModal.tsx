"use client"

import { useState, useRef } from "react"
import {
  Download,
  Printer,
  X,
  ZoomIn,
  ZoomOut,
  Receipt,
  Scale,
  FileCheck,
} from "lucide-react"

import type { DocumentoAjuste } from "@/types/documentos-ajuste"
import { DocumentoAjustePDF } from "@/components/pdf/documents/DocumentoAjustePDF"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DocumentoAjustePdfModalProps {
  documento: DocumentoAjuste | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentoAjustePdfModal({
  documento,
  open,
  onOpenChange,
}: DocumentoAjustePdfModalProps) {
  const [zoom, setZoom] = useState(100)
  const printRef = useRef<HTMLDivElement>(null)

  if (!documento) return null

  const isCredit = documento.tipo === "CREDITO"
  const meta = documento.metadata && typeof documento.metadata === "object"
    ? documento.metadata as Record<string, unknown>
    : null
  const hasCae = !!meta?.cae && documento.state === "Emitida"

  const docTitle = isCredit ? "Nota de crédito" : "Nota de débito"
  const docNum = documento.visibleNumber
    ? `${isCredit ? "NC" : "ND"} 0001-${String(documento.visibleNumber).padStart(8, "0")}`
    : `Borrador · ${documento.id.slice(0, 8)}`

  const handlePrint = () => {
    window.print()
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 150))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] p-0 flex flex-col gap-0 overflow-hidden bg-slate-900 border-slate-800 text-slate-100">
        {/* Header Toolbar */}
        <DialogHeader className="p-3 border-b border-slate-800 bg-slate-950 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            <DialogTitle className="text-xs font-semibold text-slate-200">
              Vista previa: {docTitle} ({docNum})
            </DialogTitle>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                hasCae
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-400 bg-amber-500/10"
              }`}
            >
              {hasCae ? "Comprobante Fiscal CAE" : "Documento Operativo"}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 mr-6">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-900 rounded border border-slate-800 px-1 py-0.5 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Reducir zoom"
              >
                <ZoomOut className="size-3" />
              </Button>
              <span className="text-[10px] font-mono text-slate-400 px-1.5 min-w-[40px] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Aumentar zoom"
              >
                <ZoomIn className="size-3" />
              </Button>
            </div>

            {/* Print / Download Button */}
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              title="Descargar o imprimir documento PDF"
            >
              <Printer className="size-3.5" />
              Descargar / Imprimir
            </Button>
          </div>
        </DialogHeader>

        {/* PDF Canvas Container */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-950/80">
          <div
            ref={printRef}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease",
            }}
            className="shadow-2xl rounded-sm bg-white text-slate-900 max-w-[210mm] w-full min-h-[297mm]"
          >
            <DocumentoAjustePDF documento={documento} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

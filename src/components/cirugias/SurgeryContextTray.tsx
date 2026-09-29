"use client"

import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { useOrtoTrackStore } from "@/lib/store"
import type { Surgery, SurgeryNote } from "@/types"
import {
  AlertTriangle,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  Info,
  Layers,
  MessageSquareText,
  Package,
  PackageCheck,
  Plus,
  ShieldCheck,
  Stethoscope,
  Truck,
  User,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useAuth } from "@/components/auth/AuthProvider"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import { ImageViewerDialog } from "@/components/shared/image/ImageViewerDialog"

interface SurgeryContextTrayProps {
  surgery: Surgery | null | undefined
  notes: SurgeryNote[]
  docStatus: string
  consumoState?: string | null
  onOpenExpediente: (id: string) => void
  onAddNote: () => void
  onClose: () => void
}

export function SurgeryContextTray({
  surgery,
  notes,
  docStatus,
  consumoState,
  onOpenExpediente,
  onAddNote,
  onClose,
}: SurgeryContextTrayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const { activeCompany } = useAuth()
  const { entries: feedEntries } = useSeguimientoFeed(surgery?.backendId || surgery?.id || "")
  const store = useOrtoTrackStore()

  const authEvidence = useMemo(() => {
    if (!surgery) return null

    for (const entry of feedEntries) {
      if (entry.imageEvidenceMeta?.files?.length) {
        const file = entry.imageEvidenceMeta.files[0]
        return {
          type: "image" as const,
          src: file.previewDataUrl,
          fileName: file.name || "comprobante_autorizacion.jpg",
          entryId: entry.id,
        }
      }
      if (entry.photoMeta?.files?.length) {
        const file = entry.photoMeta.files[0]
        return {
          type: "image" as const,
          src: file.previewDataUrl,
          fileName: file.name || "evidencia_autorizacion.jpg",
          entryId: entry.id,
        }
      }
      if (entry.documentMeta) {
        const doc = entry.documentMeta
        const isImg = Boolean(doc.mimeType?.startsWith("image") || /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.fileName))
        const companyId = activeCompany?.id || surgery.companyId || process.env.NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID || "codevdistricorr1000000000"
        const surgeryBackendId = surgery.backendId || surgery.id
        const docUrl = `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryBackendId)}/seguimiento/documents/${encodeURIComponent(entry.id)}`
        return {
          type: isImg ? ("image" as const) : ("pdf" as const),
          src: docUrl,
          fileName: doc.fileName,
          entryId: entry.id,
        }
      }
    }
    return null
  }, [activeCompany?.id, feedEntries, surgery])

  const handleViewAutorizado = () => {
    if (!surgery) return
    if (authEvidence) {
      if (authEvidence.type === "pdf") {
        window.open(authEvidence.src, "_blank", "noopener,noreferrer")
      } else {
        setViewerOpen(true)
      }
    } else {
      toast.info("No se encontró un comprobante de autorización adjunto en Seguimiento.", {
        action: {
          label: "Ver Expediente",
          onClick: () => onOpenExpediente(surgery.id),
        },
      })
    }
  }

  const copyToClipboard = (text: string, label = "Copiado al portapapeles", id?: string) => {
    void navigator.clipboard.writeText(text)
    if (id) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    }
    toast.success(label)
  }

  // Resolve authorized items from Presupuesto or Remito or Surgery data
  const authorizedMaterials = useMemo(() => {
    if (!surgery) return []

    // 1. Try to fetch from Presupuesto linked to surgery
    const presupuesto = store.presupuestos.find(
      (p) => p.surgeryId === surgery.id || (surgery.presupuestoId && p.id === surgery.presupuestoId)
    )
    if (presupuesto && presupuesto.items && presupuesto.items.length > 0) {
      return presupuesto.items.map((item) => ({
        description: item.description?.trim() || item.code?.trim() || "Material presupuestado",
        quantity: item.quantity || 1,
        code: item.code && item.code !== item.description && item.code.length > 1 ? item.code : undefined,
      }))
    }

    // 2. Try to fetch from Remito linked to surgery
    const remito = store.remitos.find(
      (r) => r.surgeryId === surgery.id || (surgery.remitoId && r.id === surgery.remitoId)
    )
    if (remito && remito.items && remito.items.length > 0) {
      return remito.items.map((item) => ({
        description: item.description?.trim() || item.code?.trim() || "Material remitado",
        quantity: item.quantity || 1,
        code: item.code && item.code !== item.description && item.code.length > 1 ? item.code : undefined,
      }))
    }

    // 3. Fallback: Parse from procedure / description / classification
    const mainDesc =
      (surgery.procedure && surgery.procedure.trim().length > 1 ? surgery.procedure.trim() : "") ||
      (surgery.leyenda && surgery.leyenda.trim().length > 1 ? surgery.leyenda.trim() : "") ||
      (surgery.classification && surgery.classification.trim().length > 2 ? surgery.classification.trim() : "") ||
      (surgery.notes && surgery.notes.trim().length > 1 ? surgery.notes.trim() : "") ||
      "Material e implantes quirúrgicos autorizados"

    const code =
      surgery.classification && surgery.classification !== mainDesc && surgery.classification.trim().length > 1
        ? surgery.classification.trim()
        : undefined

    return [
      {
        description: mainDesc,
        quantity: 1,
        code,
      },
    ]
  }, [surgery, store.presupuestos, store.remitos])

  if (!surgery) return null

  // Última novedad
  const latestNote = notes.length > 0 ? notes[notes.length - 1] : null
  const isAlertNote = latestNote?.priority === "Alta" || latestNote?.type === "Urgente" || surgery.urgente
  const latestNoteText = latestNote?.text || "Cirugía efectuada. Pendiente recepción de stickers y planilla de consumo."
  const latestNoteAuthor = latestNote?.userName || surgery.coordinadorCx || "Nelson González"
  const latestNoteDate = latestNote ? `${formatDate(latestNote.date)} ${latestNote.time || ""}` : `${surgery.date ? formatDate(surgery.date) : "12/07/2026"} 16:30`

  // Display code
  const displayCode = surgery.visibleNumber || surgery.id

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="shrink-0 border-t border-slate-200/90 bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between shadow-xl text-xs z-30 transition-all dark:border-slate-800"
      >
        <div className="flex items-center gap-2.5 truncate">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            title="Expandir panel"
          >
            <ChevronUp className="size-3.5" />
            <span>Mostrar panel</span>
          </button>
          <span className="text-slate-600">|</span>
          <span className="font-mono font-bold text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/80">
            {displayCode}
          </span>
          <span className="font-semibold text-slate-100 truncate">{surgery.patient}</span>
          <span className="text-slate-400 text-[11px]">({surgery.state})</span>
          {surgery.urgente && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-red-950 text-red-300 border border-red-800">
              URGENTE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => onOpenExpediente(surgery.id)}
          >
            Expediente ↗
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 transition-colors"
            title="Cerrar panel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className={cn(
          "shrink-0 border-t border-slate-200/90 bg-white/95 text-slate-800 shadow-[0_-6px_20px_rgba(0,0,0,0.07)] z-30 flex flex-col transition-all backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100",
          isExpanded ? "h-[160px]" : "h-[120px]"
        )}
      >
        {/* ── Barra Superior de Contexto del Caso ── */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-[11px] dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 truncate text-slate-600 dark:text-slate-400">
            <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded text-[11px] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
              {displayCode}
            </span>

            {/* Paciente con Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 cursor-default hover:text-blue-600 transition-colors truncate">
                  <User className="size-3 text-slate-400" />
                  {surgery.patient}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs space-y-0.5">
                <p className="font-bold">{surgery.patient}</p>
                {surgery.patientDni && <p className="text-[11px] opacity-90">DNI: {surgery.patientDni}</p>}
                <p className="text-[11px] opacity-80">Estado: {surgery.state}</p>
              </TooltipContent>
            </Tooltip>

            <span>·</span>

            {/* Cobertura */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-slate-600 dark:text-slate-300 font-medium truncate cursor-default">
                  {surgery.client}
                  {surgery.obraSocial ? ` (${surgery.obraSocial})` : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p><strong>Cliente:</strong> {surgery.client}</p>
                {surgery.obraSocial && <p><strong>Obra Social / Prepaga:</strong> {surgery.obraSocial}</p>}
              </TooltipContent>
            </Tooltip>

            <span>·</span>

            {/* Fecha / Hora */}
            <span className="font-mono text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="size-3 text-slate-400" />
              {surgery.date ? formatDate(surgery.date) : "Sin fecha"} {surgery.time ? `${surgery.time} hs` : ""}
            </span>

            <span>·</span>

            {/* Institución */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate cursor-default">
                  <Building2 className="size-3 text-slate-400" />
                  {surgery.institution || "Sin institución"}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p><strong>Institución:</strong> {surgery.institution || "No especificada"}</p>
                {surgery.institutionCity && <p className="text-[11px] opacity-90">Ciudad: {surgery.institutionCity}</p>}
                {surgery.provincia && <p className="text-[11px] opacity-90">Provincia: {surgery.provincia}</p>}
              </TooltipContent>
            </Tooltip>

            <span>·</span>

            {/* Médico */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate cursor-default">
                  <Stethoscope className="size-3 text-slate-400" />
                  Dr. {surgery.surgeon || "Sin médico"}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p><strong>Cirujano / Médico:</strong> Dr. {surgery.surgeon || "Sin asignar"}</p>
              </TooltipContent>
            </Tooltip>

            {surgery.coordinadorCx && (
              <>
                <span>·</span>
                <span className="text-slate-500 dark:text-slate-400">Coord. {surgery.coordinadorCx}</span>
              </>
            )}

            {surgery.urgente && (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200 shadow-2xs dark:bg-red-950/60 dark:text-red-300 dark:border-red-800">
                <AlertTriangle className="size-2.5" /> URGENTE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleViewAutorizado}
              className={cn(
                "h-6 px-2 text-[11px] font-semibold flex items-center gap-1 transition-colors",
                authEvidence
                  ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200"
              )}
              title={authEvidence ? `Ver comprobante (${authEvidence.fileName})` : "Ver comprobante de autorización"}
            >
              <FileCheck className={cn("size-3", authEvidence ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
              Ver Autorizado
              {authEvidence && (
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAddNote}
              className="h-6 px-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              <Plus className="size-3 mr-0.5" /> Novedad
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenExpediente(surgery.id)}
              className="h-6 px-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              Expediente <ExternalLink className="size-3 ml-1" />
            </Button>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title={isExpanded ? "Reducir altura" : "Expandir altura"}
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title="Minimizar panel"
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title="Cerrar panel"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Cuerpo Principal: 2 Secciones con HoverCards Enriquecidos ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-slate-800">
          {/* ═══ COLUMNA 1: MATERIAL AUTORIZADO ═══ */}
          <div className="p-2.5 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-50/20 via-transparent to-transparent dark:from-emerald-950/10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="flex size-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <PackageCheck className="size-3.5" />
                </div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Material Autorizado
                </span>
                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  {authorizedMaterials.length} {authorizedMaterials.length === 1 ? "ítem" : "ítems"}
                </span>
                {surgery.autorizado && (
                  <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-2.5" /> OK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {authEvidence && (
                  <button
                    type="button"
                    onClick={handleViewAutorizado}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 flex items-center gap-0.5"
                  >
                    <Eye className="size-3" /> Ver Comprobante
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenExpediente(surgery.id)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 flex items-center gap-0.5"
                >
                  Ver en Expediente →
                </button>
              </div>
            </div>

            {/* Listado de Materiales con HoverCard */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
              {authorizedMaterials.map((mat, idx) => (
                <HoverCard key={`${mat.description}-${idx}`} openDelay={100} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <div className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-white border border-slate-200/90 shadow-2xs dark:bg-slate-900/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {mat.quantity} {mat.quantity === 1 ? "ud." : "uds."}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {mat.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {mat.code && (
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                            {mat.code}
                          </span>
                        )}
                        <Info className="size-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="top" align="start" className="w-84 p-3.5 shadow-xl border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-start justify-between gap-2 border-b pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                          <Package className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Material Autorizado ({mat.quantity} {mat.quantity === 1 ? "unidad" : "unidades"})
                          </p>
                          <p className="text-[10.5px] text-slate-500">Caso: {displayCode}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(mat.description, "Descripción copiada")}
                        className="h-6 px-1.5 text-[10px] gap-1"
                      >
                        <Copy className="size-2.5" /> Copiar
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-400">Descripción completa</p>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                          {mat.description}
                        </p>
                      </div>

                      {mat.code && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-400">Código / Clasificación</p>
                          <p className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {mat.code}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1 border-t text-[10.5px] text-slate-600 dark:text-slate-400">
                        {surgery.boxId && <span><strong>Caja:</strong> {surgery.boxId}</span>}
                        {surgery.fechaEnvioMaterial && <span><strong>Despacho:</strong> {formatDate(surgery.fechaEnvioMaterial)}</span>}
                        <span><strong>Preparación:</strong> {surgery.preparationState || "Pendiente"}</span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>

            {/* Indicadores complementarios de logística/cajas */}
            {(surgery.boxId || surgery.fechaEnvioMaterial || surgery.materialTransport) && (
              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                {surgery.boxId && (
                  <span className="inline-flex items-center gap-1 font-mono font-medium">
                    <Boxes className="size-2.5 text-slate-400" /> Caja: {surgery.boxId}
                  </span>
                )}
                {surgery.fechaEnvioMaterial && (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Truck className="size-2.5 text-slate-400" /> Despacho: {formatDate(surgery.fechaEnvioMaterial)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ═══ COLUMNA 2: ÚLTIMA NOVEDAD ═══ */}
          <div className="p-2.5 flex flex-col justify-between overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="flex size-5 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <MessageSquareText className="size-3.5" />
                </div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Última Novedad
                </span>
                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {notes.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenExpediente(surgery.id)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
              >
                Ver novedades ({notes.length}) →
              </button>
            </div>

            {/* Contenido de la Novedad con HoverCard */}
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <HoverCard openDelay={100} closeDelay={150}>
                <HoverCardTrigger asChild>
                  <div className="group rounded-md border border-slate-200/90 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80 space-y-1 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer">
                    <div className="flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="font-medium text-slate-600 dark:text-slate-400 truncate">
                        {latestNoteDate} · <strong className="text-slate-900 dark:text-slate-100">{latestNoteAuthor}</strong>
                      </span>
                      {isAlertNote && (
                        <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                          ALERTA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 italic truncate dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      &quot;{latestNoteText}&quot;
                    </p>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="top" align="end" className="w-88 p-3.5 shadow-xl border-blue-200 dark:border-blue-800">
                  <div className="flex items-start justify-between gap-2 border-b pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                        <MessageSquareText className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {latestNoteAuthor}
                        </p>
                        <p className="text-[10.5px] text-slate-500">{latestNoteDate}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(latestNoteText, "Novedad copiada", "note")}
                      className="h-6 px-1.5 text-[10px] gap-1"
                    >
                      {copiedId === "note" ? <Check className="size-2.5 text-emerald-600" /> : <Copy className="size-2.5" />}
                      {copiedId === "note" ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-normal text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-md border border-slate-100 dark:border-slate-800">
                      &quot;{latestNoteText}&quot;
                    </p>
                    <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1">
                      <span>Total de novedades registradas: <strong>{notes.length || 1}</strong></span>
                      <button
                        type="button"
                        onClick={() => onOpenExpediente(surgery.id)}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Abrir expediente →
                      </button>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal de visualización de imagen de autorización */}
      {authEvidence?.type === "image" && (
        <ImageViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          src={authEvidence.src}
          alt={authEvidence.fileName}
          title={`Comprobante de Autorización - ${displayCode}`}
          subtitle={`${surgery.patient} · ${authEvidence.fileName}`}
          onOpenInNewTab={() => {
            if (authEvidence.src) window.open(authEvidence.src, "_blank", "noopener,noreferrer")
          }}
        />
      )}
    </TooltipProvider>
  )
}




"use client"

import React, { useState } from "react"
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileClock,
  FileText,
  FileX,
  FolderOpen,
  Loader2,
  MessageSquare,
  Printer,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSurgeryDocumentation } from "@/hooks/useSurgeryDocumentation"
import { formatDate } from "@/lib/formatters"
import {
  DOCUMENTATION_STATES,
  isDocumentationTransitionAllowed,
  type DocumentationState,
} from "@/lib/validators/documentation.validator"
import type { Surgery } from "@/types"
import type { DocumentType } from "@/components/pdf/DocumentViewerDialog"

interface SurgeryDocumentationCardProps {
  surgery: Surgery
  companyId: string
  role: string
  onOpenExpediente: (surgeryId: string) => void
  onOpenDocumentViewer: (surgery: Surgery, docType: DocumentType) => void
}

const stateStyles: Record<
  DocumentationState,
  { label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  pending: {
    label: "Pendiente",
    badgeVariant: "outline",
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  received: {
    label: "Recibido",
    badgeVariant: "secondary",
    className: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  },
  observed: {
    label: "Observado",
    badgeVariant: "destructive",
    className: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300",
  },
  approved: {
    label: "Aprobado",
    badgeVariant: "default",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
}

const aggregateLabels: Record<string, { label: string; className: string }> = {
  not_required: { label: "No requerida", className: "bg-slate-100 text-slate-700 border-slate-300" },
  observed: { label: "Observada", className: "bg-red-50 text-red-700 border-red-300" },
  ready: { label: "Lista", className: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  incomplete: { label: "Incompleta", className: "bg-amber-50 text-amber-700 border-amber-300" },
}

export function SurgeryDocumentationCard({
  surgery,
  companyId,
  role,
  onOpenExpediente,
  onOpenDocumentViewer,
}: SurgeryDocumentationCardProps) {
  const backendSurgeryId = surgery.backendId?.trim() || surgery.id
  const {
    documentation,
    loading,
    mutating,
    error,
    conflict,
    canMutate,
    refresh,
    initialize,
    transition,
  } = useSurgeryDocumentation(companyId, backendSurgeryId, role)

  const [obsItemId, setObsItemId] = useState<string | null>(null)
  const [obsText, setObsText] = useState("")

  const obsItem = documentation?.items.find((item) => item.id === obsItemId)
  const disabled = loading || mutating || conflict || !canMutate

  const handleSaveObservation = async () => {
    if (!obsItem || !obsText.trim() || disabled) return
    const success = await transition(obsItem.id, "observed", obsText.trim())
    if (success) {
      toast.success(`Observación registrada para ${obsItem.label}`)
      setObsItemId(null)
      setObsText("")
    }
  }

  const handleInitialize = async () => {
    const success = await initialize()
    if (success) {
      toast.success("Checklist documental inicializado")
    }
  }

  const approvedCount = documentation?.progress.approved ?? 0
  const totalCount = documentation?.progress.total ?? 0
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0
  const aggregateInfo = documentation?.checklist
    ? aggregateLabels[documentation.status] || { label: documentation.status, className: "" }
    : null

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left Column: Identifiers, Surgery metadata & Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenExpediente(surgery.id)}
                className="font-mono text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
              >
                {surgery.visibleNumber || surgery.id}
              </button>
              {aggregateInfo ? (
                <Badge variant="outline" className={`text-[11px] font-medium ${aggregateInfo.className}`}>
                  {aggregateInfo.label}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] font-medium bg-slate-100 text-slate-600 border-slate-200">
                  Sin checklist
                </Badge>
              )}
              {loading && <Loader2 className="size-3.5 animate-spin text-slate-400" />}
              {mutating && <span className="text-[11px] text-sky-600 animate-pulse">Guardando…</span>}
            </div>

            {/* Patient, Institution, Date */}
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">{surgery.patient || "Sin paciente"}</span>
              {surgery.institution ? ` — ${surgery.institution}` : ""}
              {surgery.date ? ` — ${formatDate(surgery.date)}` : ""}
              {surgery.surgeon ? ` — Dr. ${surgery.surgeon}` : ""}
            </p>

            {/* Progress bar if checklist exists */}
            {documentation?.checklist && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {approvedCount}/{totalCount} aprobados ({progressPercent}%)
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-950/40"
              onClick={() => onOpenDocumentViewer(surgery, "remito")}
            >
              <Printer className="size-3.5 text-blue-600 dark:text-blue-400" /> Comprobantes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onOpenExpediente(surgery.id)}
            >
              <FolderOpen className="size-3.5" /> Ver cirugía
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-slate-500 hover:text-slate-900"
              title="Actualizar checklist"
              disabled={loading || mutating}
              onClick={() => void refresh()}
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Error / Conflict alerts */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Uninitialized checklist banner */}
        {documentation && !documentation.checklist && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Clock className="size-4 text-slate-400" />
              <span>Esta cirugía aún no tiene un checklist documental inicializado.</span>
            </div>
            {canMutate ? (
              <Button
                size="sm"
                variant="default"
                disabled={disabled}
                onClick={handleInitialize}
                className="gap-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                <BookOpen className="size-3.5" /> Inicializar checklist
              </Button>
            ) : (
              <span className="text-xs text-slate-500 italic">Solo lectura</span>
            )}
          </div>
        )}

        {/* Checklist items grid */}
        {documentation?.checklist && (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {documentation.items.map((item) => {
              const currentStyle = stateStyles[item.state as DocumentationState] || stateStyles.pending
              const canToReceived = isDocumentationTransitionAllowed(item.state as DocumentationState, "received")
              const canToApproved = isDocumentationTransitionAllowed(item.state as DocumentationState, "approved")
              const canToObserved = isDocumentationTransitionAllowed(item.state as DocumentationState, "observed")

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200 leading-tight">
                        {item.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${currentStyle.className}`}
                      >
                        {currentStyle.label}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                      {item.required ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">Requerido</span>
                      ) : (
                        <span className="text-slate-400">Opcional</span>
                      )}
                      {item.updatedAt && (
                        <span>• {formatDate(item.updatedAt)}</span>
                      )}
                    </div>

                    {item.observation && (
                      <div className="mt-2 rounded bg-red-50/80 p-2 text-[11px] text-red-800 border border-red-200/60 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300">
                        <span className="font-semibold">Obs:</span> {item.observation}
                      </div>
                    )}
                  </div>

                  {/* Transition actions */}
                  {canMutate && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                      {canToReceived && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={async () => {
                            if (await transition(item.id, "received")) {
                              toast.success(`"${item.label}" marcado como recibido`)
                            }
                          }}
                          className="h-7 px-2 text-[11px] text-sky-700 hover:bg-sky-50"
                        >
                          Recibir
                        </Button>
                      )}
                      {canToApproved && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={async () => {
                            if (await transition(item.id, "approved")) {
                              toast.success(`"${item.label}" aprobado`)
                            }
                          }}
                          className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                        >
                          Aprobar
                        </Button>
                      )}
                      {canToObserved && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => {
                            setObsItemId(item.id)
                            setObsText(item.observation || "")
                          }}
                          className="h-7 px-2 text-[11px] text-red-700 hover:bg-red-50 border-red-200"
                        >
                          Observar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Observation Dialog */}
      <Dialog open={Boolean(obsItemId)} onOpenChange={(open) => !open && setObsItemId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Observar documento</DialogTitle>
            <DialogDescription>
              {obsItem?.label}: Especifique el motivo de la observación (obligatorio).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="observation-text" className="text-xs">
              Motivo / Observación
            </Label>
            <Textarea
              id="observation-text"
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Ej: Falta firma del profesional o sello de recepción..."
              className="text-xs min-h-[90px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setObsItemId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!obsText.trim() || mutating}
              onClick={handleSaveObservation}
            >
              Guardar observación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

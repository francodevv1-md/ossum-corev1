"use client"

import React, { useMemo, useCallback, useState } from "react"
import {
  BookOpen, Check, Circle, AlertTriangle, Upload, Eye,
  MoreHorizontal, FileText, Send, MessageSquare, X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { DOC_STATUS_COLORS } from "@/lib/cirugias.constants"
import { computeDocProgress } from "@/lib/cirugias.utils"
import { useOrtoTrackStore } from "@/lib/store"
import { toast } from "sonner"
import type {
  Surgery, SurgeryDocumentChecklist, DocumentChecklistItem,
  DocumentChecklistType,
} from "@/types"

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface DocumentacionPanelProps {
  surgery: Surgery
  docChecklist?: SurgeryDocumentChecklist
  docStatus: string
}

// ═══════════════════════════════════════════════════════════════
// ITEM STATUS HELPERS
// ═══════════════════════════════════════════════════════════════

type ItemStatus = "completado" | "pendiente" | "observado"

function getItemStatus(item: DocumentChecklistItem): ItemStatus {
  if (item.completed) return "completado"
  if (item.observations && item.observations.trim().length > 0) return "observado"
  return "pendiente"
}

const STATUS_ICON_MAP: Record<ItemStatus, React.ElementType> = {
  completado: Check,
  pendiente: Circle,
  observado: AlertTriangle,
}

const STATUS_COLOR_MAP: Record<ItemStatus, string> = {
  completado: "text-emerald-600",
  pendiente: "text-amber-500",
  observado: "text-red-500",
}

const STATUS_BG_MAP: Record<ItemStatus, string> = {
  completado: "bg-emerald-50 border-emerald-200",
  pendiente: "bg-amber-50/50 border-amber-200",
  observado: "bg-red-50 border-red-200",
}

const STATUS_LABEL_MAP: Record<ItemStatus, string> = {
  completado: "Completado",
  pendiente: "Pendiente",
  observado: "Observado",
}

const STATUS_BADGE_MAP: Record<ItemStatus, string> = {
  completado: "bg-emerald-100 text-emerald-800 border-emerald-300",
  pendiente: "bg-amber-100 text-amber-800 border-amber-300",
  observado: "bg-red-100 text-red-800 border-red-300",
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS BAR COLOR HELPER
// ═══════════════════════════════════════════════════════════════

function getProgressColor(percent: number): string {
  if (percent === 100) return "[&>div]:bg-emerald-600"
  if (percent >= 60) return "[&>div]:bg-sky-500"
  if (percent >= 30) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-red-500"
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DocumentacionPanel({
  surgery,
  docChecklist,
  docStatus,
}: DocumentacionPanelProps) {
  const updateDocumentationChecklist = useOrtoTrackStore(
    (s) => s.updateDocumentationChecklist
  )

  // ── State for observation dialog ──
  const [obsDialogOpen, setObsDialogOpen] = useState(false)
  const [obsItemType, setObsItemType] = useState<string>("")
  const [obsText, setObsText] = useState("")

  // ── State for request doc dialog ──
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestItemType, setRequestItemType] = useState<string>("")
  const [requestNote, setRequestNote] = useState("")

  // ── Computed values ──
  const progress = useMemo(
    () => computeDocProgress(docChecklist),
    [docChecklist]
  )

  const items = docChecklist?.items ?? []

  const completedCount = useMemo(
    () => items.filter((i) => getItemStatus(i) === "completado").length,
    [items]
  )
  const pendingCount = useMemo(
    () => items.filter((i) => getItemStatus(i) === "pendiente").length,
    [items]
  )
  const observedCount = useMemo(
    () => items.filter((i) => getItemStatus(i) === "observado").length,
    [items]
  )

  // ── Handlers ──
  const handleToggleComplete = useCallback(
    (itemType: string, currentCompleted: boolean) => {
      updateDocumentationChecklist(surgery.id, itemType, !currentCompleted)
      toast.success(
        !currentCompleted
          ? `"${itemType}" marcado como completo`
          : `"${itemType}" marcado como pendiente`
      )
    },
    [surgery.id, updateDocumentationChecklist]
  )

  const handleOpenObserve = useCallback((itemType: string) => {
    setObsItemType(itemType)
    setObsText("")
    setObsDialogOpen(true)
  }, [])

  const handleSubmitObservation = useCallback(() => {
    if (!obsText.trim()) {
      toast.error("Ingrese una observación")
      return
    }
    // Mark as incomplete and record the observation
    updateDocumentationChecklist(surgery.id, obsItemType, false)
    toast.success(`Observación registrada para "${obsItemType}"`)
    setObsDialogOpen(false)
    setObsText("")
  }, [surgery.id, obsItemType, obsText, updateDocumentationChecklist])

  const handleOpenRequest = useCallback((itemType: string) => {
    setRequestItemType(itemType)
    setRequestNote("")
    setRequestDialogOpen(true)
  }, [])

  const handleSubmitRequest = useCallback(() => {
    toast.success(`Solicitud de documentación enviada para "${requestItemType}"`)
    setRequestDialogOpen(false)
    setRequestNote("")
  }, [requestItemType])

  const docStatusColorClass =
    DOC_STATUS_COLORS[docStatus] || "bg-gray-400 text-white"

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="size-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Documentación</h2>
          <span
            className={cn(
              "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold leading-none",
              docStatusColorClass
            )}
          >
            {docStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {completedCount}/{items.length} completados
          </Badge>
        </div>
      </div>

      {/* ── Progress section ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progreso de documentación</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <Progress
          value={progress}
          className={cn("h-2", getProgressColor(progress))}
        />
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            {completedCount} completado{completedCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-amber-400" />
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </span>
          {observedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-red-500" />
              {observedCount} observado{observedCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Checklist ── */}
      {items.length > 0 ? (
        <ScrollArea className="max-h-[420px]">
          <div className="space-y-2 pr-2">
            {items.map((item) => {
              const status = getItemStatus(item)
              const StatusIcon = STATUS_ICON_MAP[status]
              const statusColor = STATUS_COLOR_MAP[status]
              const statusBg = STATUS_BG_MAP[status]
              const statusLabel = STATUS_LABEL_MAP[status]
              const statusBadge = STATUS_BADGE_MAP[status]

              return (
                <div
                  key={item.type}
                  className={cn(
                    "rounded-lg border px-4 py-3 transition-colors",
                    statusBg
                  )}
                >
                  {/* ── Item row ── */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: icon + info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                          status === "completado" && "bg-emerald-100",
                          status === "pendiente" && "bg-amber-100",
                          status === "observado" && "bg-red-100"
                        )}
                      >
                        <StatusIcon
                          className={cn("size-3.5", statusColor)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium leading-tight">
                            {item.type}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border leading-none",
                              statusBadge
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        {/* Meta info */}
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                          {item.uploadedAt && (
                            <span>
                              Subido: {formatDate(item.uploadedAt)}
                            </span>
                          )}
                          {item.uploadedBy && (
                            <span>Por: {item.uploadedBy}</span>
                          )}
                        </div>

                        {/* Observation text */}
                        {item.observations && (
                          <div className="mt-1.5 rounded bg-red-50 border border-red-200 px-2 py-1">
                            <p className="text-[11px] text-red-700 font-medium">
                              Obs: {item.observations}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Quick toggle complete */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 w-7 p-0",
                              status === "completado"
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() =>
                              handleToggleComplete(item.type, item.completed)
                            }
                          >
                            <Check className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {status === "completado"
                            ? "Desmarcar como completo"
                            : "Marcar como completo"}
                        </TooltipContent>
                      </Tooltip>

                      {/* More actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() =>
                              toast.info(
                                `Adjuntar archivo para "${item.type}" — funcionalidad de carga en próxima etapa`
                              )
                            }
                          >
                            <Upload className="size-4 mr-2" />
                            Adjuntar archivo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!item.completed || !item.uploadedAt}
                            onClick={() =>
                              toast.info(
                                `Ver archivo de "${item.type}" — visor en próxima etapa`
                              )
                            }
                          >
                            <Eye className="size-4 mr-2" />
                            Ver archivo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleComplete(item.type, item.completed)
                            }
                          >
                            <Check className="size-4 mr-2" />
                            {item.completed
                              ? "Desmarcar completo"
                              : "Marcar como completo"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenObserve(item.type)}
                          >
                            <AlertTriangle className="size-4 mr-2" />
                            Observar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenRequest(item.type)}
                          >
                            <Send className="size-4 mr-2" />
                            Solicitar documentación
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Sin checklist de documentación
          </p>
          <p className="text-xs text-muted-foreground">
            No hay ítems de documentación configurados para esta cirugía
          </p>
        </div>
      )}

      {/* ── Observation dialog ── */}
      <Dialog open={obsDialogOpen} onOpenChange={setObsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Observar documentación
            </DialogTitle>
            <DialogDescription>
              Registre una observación para &quot;{obsItemType}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Tipo de documento</Label>
              <p className="text-sm font-medium mt-0.5">{obsItemType}</p>
            </div>
            <div>
              <Label htmlFor="obs-text" className="text-xs">
                Observación
              </Label>
              <Textarea
                id="obs-text"
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                placeholder="Describa la observación o el motivo del rechazo..."
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setObsDialogOpen(false)}
            >
              <X className="size-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleSubmitObservation}
              disabled={!obsText.trim()}
            >
              <AlertTriangle className="size-4 mr-1.5" />
              Registrar observación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Request documentation dialog ── */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-sky-500" />
              Solicitar documentación
            </DialogTitle>
            <DialogDescription>
              Enviar solicitud de &quot;{requestItemType}&quot; para la cirugía{" "}
              {surgery.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Documento solicitado</Label>
              <p className="text-sm font-medium mt-0.5">{requestItemType}</p>
            </div>
            <div>
              <Label className="text-xs">Cirugía / Paciente</Label>
              <p className="text-sm mt-0.5">
                {surgery.id} — {surgery.patient}
              </p>
            </div>
            <div>
              <Label htmlFor="request-note" className="text-xs">
                Nota adicional (opcional)
              </Label>
              <Textarea
                id="request-note"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Información adicional para la solicitud..."
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestDialogOpen(false)}
            >
              <X className="size-4 mr-1.5" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSubmitRequest}>
              <Send className="size-4 mr-1.5" />
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NovedadesTabContent } from "@/components/expediente/NovedadesTabContent"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import type { SeguimientoNotePriority } from "@/hooks/useSeguimientoFeed"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/components/auth/AuthProvider"
import { emitOperationalNotification } from "@/lib/api/operational-notifications"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
import { toast } from "sonner"
import { CalendarDays, Clock3, ClipboardPenLine, Loader2, MessageSquare, Paperclip, ShieldCheck, Truck } from "lucide-react"
import type { Surgery } from "@/types"

type ManagementFormState = {
  surgeryDate: string
  surgeryTime: string
  shippingDate: string
  transport: string
  observation: string
  internalNote: string
  materialAvailabilityDate: string
  notePriority: SeguimientoNotePriority
  markCaseUrgent: boolean
}

type CoordinatorDialogView = "gestion" | "seguimiento"
type CoordinatorTrackingFilter = "todo" | "notas" | "archivos" | "fotos" | "autorizado" | "correo"
type CoordinatorTrackingAction = "note" | "mail" | "image" | "auth"

interface CoordinatorManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery: Surgery | null
  materialAvailabilityDate?: string
  materialAvailabilityLabel?: string
  initialView?: CoordinatorDialogView
  initialManagementFocus?: "urgency"
  initialTrackingFilter?: CoordinatorTrackingFilter
  initialTrackingAction?: CoordinatorTrackingAction
}

function buildStructuredSummary(form: ManagementFormState) {
  const changes: string[] = []

  if (form.surgeryDate) {
    changes.push(`Fecha CX ${formatDate(form.surgeryDate)}${form.surgeryTime ? ` · ${form.surgeryTime}` : ""}`)
  }

  if (form.shippingDate) {
    changes.push(`Envío ${formatDate(form.shippingDate)}`)
  }

  if (form.materialAvailabilityDate) {
    changes.push(`Disponibilidad ${formatDate(form.materialAvailabilityDate)}`)
  }

  if (form.transport.trim()) {
    changes.push(`Transporte ${form.transport.trim()}`)
  }

  const lines = [
    form.markCaseUrgent ? "CX coordinada · marcada como urgente." : "CX coordinada.",
    changes.length > 0 ? `Actualizado: ${changes.join(" · ")}` : undefined,
  ].filter(Boolean) as string[]

  if (form.observation.trim()) {
    lines.push(`Observación operativa: ${form.observation.trim()}`)
  }

  if (form.internalNote.trim()) {
    lines.push(`Nota interna: ${form.internalNote.trim()}`)
  }

  return lines.join("\n")
}

export function CoordinatorManagementDialog({
  open,
  onOpenChange,
  surgery,
  materialAvailabilityDate,
  materialAvailabilityLabel,
  initialView = "gestion",
  initialManagementFocus,
  initialTrackingFilter = "todo",
  initialTrackingAction,
}: CoordinatorManagementDialogProps) {
  const isMobile = useIsMobile()
  const { activeCompany } = useAuth()
  const changeSurgeryDate = useOrtoTrackStore((state) => state.changeSurgeryDate)
  const updateSurgery = useOrtoTrackStore((state) => state.updateSurgery)
  const addAuditEvent = useOrtoTrackStore((state) => state.addAuditEvent)
  const { addNote, addingNote } = useSeguimientoFeed(surgery?.id)

  const [form, setForm] = useState<ManagementFormState>({
    surgeryDate: "",
    surgeryTime: "",
    shippingDate: "",
      transport: "",
      observation: "",
      internalNote: "",
      materialAvailabilityDate: "",
      notePriority: "media",
      markCaseUrgent: false,
    })
  const [activeView, setActiveView] = useState<CoordinatorDialogView>(initialView)
  const [trackingFilter, setTrackingFilter] = useState<CoordinatorTrackingFilter>(initialTrackingFilter)
  const [trackingAction, setTrackingAction] = useState<CoordinatorTrackingAction | undefined>(initialTrackingAction)
  const [trackingActionKey, setTrackingActionKey] = useState(initialTrackingAction ? 1 : 0)
  const [trackingAddSheetKey, setTrackingAddSheetKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const urgencyButtonRef = useCallback((node: HTMLButtonElement | null) => {
    if (node && open && initialManagementFocus === "urgency") node.focus()
  }, [initialManagementFocus, open])

  useEffect(() => {
    if (!open || !surgery) return

    // The dialog intentionally resets its draft whenever a different case opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      surgeryDate: surgery.date || "",
      surgeryTime: surgery.time || "",
      shippingDate: surgery.fechaEnvioMaterial || "",
      transport: "",
      observation: "",
      internalNote: "",
      materialAvailabilityDate: materialAvailabilityDate || "",
      notePriority: "media",
      markCaseUrgent: Boolean(surgery.urgente),
    })
    setActiveView(initialView)
    setTrackingFilter(initialTrackingFilter)
    setTrackingAction(initialTrackingAction)
    setTrackingActionKey(initialTrackingAction ? 1 : 0)
    setTrackingAddSheetKey(0)
  }, [open, surgery, materialAvailabilityDate, initialView, initialTrackingAction, initialTrackingFilter])

  const isBusy = saving || addingNote
  const scheduledDateLabel = form.surgeryDate ? `${formatDate(form.surgeryDate)}${form.surgeryTime ? ` · ${form.surgeryTime}` : ""}` : "Sin definir"
  const shippingDateLabel = form.shippingDate ? formatDate(form.shippingDate) : "Sin definir"
  const availabilityDateLabel = form.materialAvailabilityDate ? formatDate(form.materialAvailabilityDate) : materialAvailabilityLabel || "Sin definir"

  const updateField = <K extends keyof ManagementFormState>(field: K, value: ManagementFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!surgery) return

    setSaving(true)

    try {
      const summary = buildStructuredSummary(form)

      const createdEntry = await addNote({
        content: summary,
        summary: `Gestión operativa · ${surgery.patient}`,
        noteType: form.markCaseUrgent ? "urgente" : "coordinacion",
        priority: form.notePriority,
        highlighted: form.markCaseUrgent,
      })

      const surgeryDateChanged = form.surgeryDate !== (surgery.date || "") || form.surgeryTime !== (surgery.time || "")
      const sourceEntityId = createdEntry?.id ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : `${surgery.id}-${Date.now()}`)
      if (surgeryDateChanged && form.surgeryDate) {
        changeSurgeryDate(surgery.id, form.surgeryDate, form.surgeryTime || undefined)

        if (activeCompany?.id) {
          await emitOperationalNotification(activeCompany.id, surgery.id, {
            sourceEntityId,
            eventType: surgery.date ? "surgery_rescheduled" : "surgery_date_assigned",
            scheduledDate: form.surgeryDate,
            scheduledTime: form.surgeryTime || undefined,
            previousScheduledDate: surgery.date || undefined,
            previousScheduledTime: surgery.time || undefined,
          })
        }
      }

      if (form.shippingDate !== (surgery.fechaEnvioMaterial || "")) {
        updateSurgery(surgery.id, { fechaEnvioMaterial: form.shippingDate || undefined })
      }

      if (form.markCaseUrgent !== Boolean(surgery.urgente)) {
        updateSurgery(surgery.id, { urgente: form.markCaseUrgent })

        if (form.markCaseUrgent && activeCompany?.id) {
          await emitOperationalNotification(activeCompany.id, surgery.id, {
            sourceEntityId,
            eventType: "surgery_marked_urgent",
          })
        }
      }

      addAuditEvent(surgery.id, "Gestión coordinador", "Gestión operativa registrada en seguimiento")
      toast.success("Gestión operativa guardada")
      setTrackingFilter("notas")
      setTrackingAction("note")
      setTrackingActionKey((prev) => prev + 1)
      setActiveView("seguimiento")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la gestión")
    } finally {
      setSaving(false)
    }
  }

  const content = surgery ? (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b bg-slate-50/90 px-4 py-2.5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{surgery.patient}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="truncate">{surgery.surgeon || "Médico sin definir"}</span>
                <span className="text-slate-300">•</span>
                <span className="truncate">{surgery.institution || "Institución sin definir"}</span>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 border-sky-200 bg-white text-[10px] font-semibold text-sky-800">
              {surgery.id}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
            <span>{scheduledDateLabel}</span>
            <span className="text-slate-300">•</span>
            <span>Envío: {shippingDateLabel}</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-sky-700">Disponibilidad: {availabilityDateLabel}</span>
          </div>
        </div>

        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as CoordinatorDialogView)} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b bg-white px-4 py-2.5 sm:px-6">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
              <TabsTrigger value="gestion" className="gap-1.5 rounded-lg py-2 text-xs sm:text-sm">
                <CalendarDays className="size-3.5" />
                Gestión
              </TabsTrigger>
              <TabsTrigger value="seguimiento" className="gap-1.5 rounded-lg py-2 text-xs sm:text-sm">
                <MessageSquare className="size-3.5" />
                Seguimiento
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="gestion" className="mt-0 min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50/85 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-950">
                      <ClipboardPenLine className="size-4" />
                      Gestión simple, mismo seguimiento
                    </div>
                    <p className="text-xs leading-relaxed text-sky-900/80">
                      En seguimiento podes ver notas, imagenes y novedades.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setActiveView("seguimiento")}>
                    <MessageSquare className="mr-1 size-4" />
                    Ver seguimiento
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                  <Label htmlFor="coord-surgery-date">Fecha CX</Label>
                  <Input id="coord-surgery-date" type="date" value={form.surgeryDate} onChange={(event) => updateField("surgeryDate", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="coord-surgery-time">Hora CX</Label>
                  <Input id="coord-surgery-time" type="time" value={form.surgeryTime} onChange={(event) => updateField("surgeryTime", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="coord-shipping-date">Fecha de envío</Label>
                  <Input id="coord-shipping-date" type="date" value={form.shippingDate} onChange={(event) => updateField("shippingDate", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="coord-availability-date">Disponibilidad del material</Label>
                  <Input id="coord-availability-date" type="date" value={form.materialAvailabilityDate} onChange={(event) => updateField("materialAvailabilityDate", event.target.value)} />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="coord-transport">Transporte</Label>
                  <Input id="coord-transport" value={form.transport} onChange={(event) => updateField("transport", event.target.value)} placeholder="Ej: motomensajería, retiro por clínica, Andreani" />
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="coord-observation">Observación operativa</Label>
                  <Textarea id="coord-observation" value={form.observation} onChange={(event) => updateField("observation", event.target.value)} placeholder="Detalles para la coordinación, envío o disponibilidad" className="min-h-24 resize-y" />
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="coord-internal-note">Nota interna</Label>
                  <Textarea id="coord-internal-note" value={form.internalNote} onChange={(event) => updateField("internalNote", event.target.value)} placeholder="Se guarda dentro del seguimiento interno, no en un sistema paralelo" className="min-h-24 resize-y" />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prioridad del registro</Label>
                    <Select value={form.notePriority} onValueChange={(value) => updateField("notePriority", value as SeguimientoNotePriority)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Urgencia del caso</Label>
                    <Button
                      ref={urgencyButtonRef}
                      type="button"
                      variant={form.markCaseUrgent ? "destructive" : "outline"}
                      className="h-10 w-full justify-start"
                      onClick={() => updateField("markCaseUrgent", !form.markCaseUrgent)}
                    >
                      {form.markCaseUrgent ? "Cirugía marcada como urgente" : "Marcar cirugía como urgente"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Truck className="size-4 text-sky-700" />
                      Adjuntos y evidencias
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    </p>
                    <Button type="button" variant="outline" size="sm" className="mt-3 w-full sm:w-auto" onClick={() => setActiveView("seguimiento")}>
                      <Paperclip className="mr-1 size-4" />
                      Abrir seguimiento
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={!surgery || isBusy} className="gap-2 bg-sky-700 hover:bg-sky-800">
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                    Guardar gestión
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seguimiento" className="mt-0 min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-6">
            <div className="mx-auto flex min-h-0 max-w-4xl flex-col gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                        Seguimiento
                      </Badge>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-slate-950">Registrar novedades del expediente</p>
                        <p className="max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                          Unificá notas, imágenes y evidencias en un solo timeline operativo para que el equipo vea el contexto completo.
                        </p>
                      </div>
                    </div>

                    <Button type="button" variant="ghost" size="sm" className="h-8 justify-start px-2 text-slate-500 hover:text-slate-700 sm:w-auto" onClick={() => setActiveView("gestion")}>
                      Volver a gestión
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      size="sm"
                      className="h-11 w-full justify-between rounded-2xl bg-sky-700 px-4 text-left text-white shadow-sm hover:bg-sky-800 sm:w-auto sm:min-w-[220px]"
                      onClick={() => setTrackingAddSheetKey((prev) => prev + 1)}
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="size-4" />
                        <span className="flex flex-col items-start leading-none">
                          <span className="text-sm font-semibold">Agregar</span>
                          <span className="mt-1 text-[11px] font-normal text-sky-100">Nota, correo o imagen</span>
                        </span>
                      </span>
                    </Button>

                    <div className="grid gap-2 sm:grid-cols-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 justify-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => {
                          setTrackingFilter("todo")
                        }}
                      >
                        <Clock3 className="size-4" />
                        Historial de eventos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 justify-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => {
                          setTrackingFilter("archivos")
                        }}
                      >
                        <Paperclip className="size-4" />
                        Evidencias y adjuntos
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <NovedadesTabContent surgery={surgery} initialFilter={activeView === "seguimiento" ? trackingFilter : "todo"} initialAddAction={activeView === "seguimiento" ? trackingAction : undefined} initialAddActionKey={activeView === "seguimiento" ? trackingActionKey : 0} availableAddActions={["note", "mail", "image"]} showHeaderAddButton={false} openAddSheetKey={trackingAddSheetKey} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  ) : null

  return isMobile ? (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 overflow-hidden rounded-t-3xl border-x-0 border-b-0 p-0">
          <SheetHeader className="border-b px-4 py-3 text-left sm:px-6">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-sky-700" />
              Gestionar coordinación
            </SheetTitle>
            <SheetDescription className="text-[11px] leading-relaxed">
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    ) : (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[94vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-sky-700" />
              Gestionar coordinación
            </DialogTitle>
            <DialogDescription>
              Coordiná el caso y comparti notas, imágenes y evidencias em el seguimiento.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
}

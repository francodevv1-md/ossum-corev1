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
import { canMutateSeguimientoEvents } from "@/lib/permissions/seguimiento"
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
  const { activeCompany, currentAccess } = useAuth()
  const canModifySeguimiento = canMutateSeguimientoEvents(currentAccess?.role)
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
  const caseReference = surgery?.visibleNumber?.trim() || surgery?.id

  const updateField = <K extends keyof ManagementFormState>(field: K, value: ManagementFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!surgery) return
    if (!canModifySeguimiento) {
      toast.error("No tenés permiso para guardar gestiones")
      return
    }

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ossum-surface)]">
      <section aria-label="Contexto del expediente" className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="truncate text-sm font-semibold text-[var(--ossum-navy)]">{surgery.patient}</p>
              <span className="text-[11px] text-slate-500">{caseReference}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{surgery.surgeon || "Médico sin definir"} · {surgery.institution || "Institución sin definir"}</p>
          </div>
          {form.markCaseUrgent ? <Badge className="shrink-0 rounded bg-[var(--ossum-danger)] text-[10px] text-white hover:bg-[var(--ossum-danger)]">Urgente</Badge> : null}
        </div>

        <dl className="mt-3 grid border border-[var(--ossum-line)] bg-[var(--ossum-surface)] sm:grid-cols-3">
          {[
            ["Cirugía", scheduledDateLabel],
            ["Disponibilidad", availabilityDateLabel],
            ["Envío", shippingDateLabel],
          ].map(([label, value], index) => (
            <div key={label} className={`min-w-0 px-3 py-2 ${index < 2 ? "border-b border-[var(--ossum-line)] sm:border-b-0 sm:border-r" : ""}`}>
              <dt className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
              <dd className="mt-0.5 truncate text-[11px] font-medium text-slate-800" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Tabs value={canModifySeguimiento ? activeView : "seguimiento"} onValueChange={(value) => setActiveView(value as CoordinatorDialogView)} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 sm:px-6">
          <TabsList className="h-10 w-auto justify-start gap-5 rounded-none bg-transparent p-0">
            {canModifySeguimiento ? <TabsTrigger value="gestion" className="h-10 gap-1.5 rounded-none border-b border-transparent px-0 text-xs text-slate-500 shadow-none data-[state=active]:border-[var(--ossum-action)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--ossum-action)] data-[state=active]:shadow-none">
              <CalendarDays className="size-3.5" />
              Gestión
            </TabsTrigger> : null}
            <TabsTrigger value="seguimiento" className="h-10 gap-1.5 rounded-none border-b border-transparent px-0 text-xs text-slate-500 shadow-none data-[state=active]:border-[var(--ossum-action)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--ossum-action)] data-[state=active]:shadow-none">
              <MessageSquare className="size-3.5" />
              Seguimiento
            </TabsTrigger>
          </TabsList>
        </div>

        {canModifySeguimiento ? <TabsContent value="gestion" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto max-w-4xl border border-[var(--ossum-line-strong)] bg-white">
            <div className="grid lg:grid-cols-2">
              <fieldset className="border-b border-[var(--ossum-line)] p-4 lg:border-r">
                <legend className="sr-only">Cirugía</legend>
                <div className="mb-3 flex items-center gap-2 border-b border-[var(--ossum-line)] pb-2">
                  <CalendarDays className="size-3.5 text-[var(--ossum-action)]" aria-hidden="true" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Cirugía</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-surgery-date" className="text-xs">Fecha CX</Label>
                    <Input id="coord-surgery-date" type="date" value={form.surgeryDate} onChange={(event) => updateField("surgeryDate", event.target.value)} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-surgery-time" className="text-xs">Hora CX</Label>
                    <Input id="coord-surgery-time" type="time" value={form.surgeryTime} onChange={(event) => updateField("surgeryTime", event.target.value)} className="h-9 text-xs" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border-b border-[var(--ossum-line)] p-4">
                <legend className="sr-only">Disponibilidad y envío</legend>
                <div className="mb-3 flex items-center gap-2 border-b border-[var(--ossum-line)] pb-2">
                  <Truck className="size-3.5 text-[var(--ossum-action)]" aria-hidden="true" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Disponibilidad y envío</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-availability-date" className="text-xs">Material disponible</Label>
                    <Input id="coord-availability-date" type="date" value={form.materialAvailabilityDate} onChange={(event) => updateField("materialAvailabilityDate", event.target.value)} className="h-9 text-xs" />
                    <p className="text-[10px] text-slate-500">Se registra en la novedad de Seguimiento.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-shipping-date" className="text-xs">Fecha de envío</Label>
                    <Input id="coord-shipping-date" type="date" value={form.shippingDate} onChange={(event) => updateField("shippingDate", event.target.value)} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="coord-transport" className="text-xs">Transporte</Label>
                    <Input id="coord-transport" value={form.transport} onChange={(event) => updateField("transport", event.target.value)} placeholder="Mensajería, retiro por clínica, correo…" className="h-9 text-xs" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border-b border-[var(--ossum-line)] p-4 lg:border-b-0 lg:border-r">
                <legend className="sr-only">Coordinación</legend>
                <div className="mb-3 flex items-center gap-2 border-b border-[var(--ossum-line)] pb-2">
                  <ShieldCheck className="size-3.5 text-[var(--ossum-action)]" aria-hidden="true" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Coordinación</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-priority" className="text-xs">Prioridad del registro</Label>
                    <Select value={form.notePriority} onValueChange={(value) => updateField("notePriority", value as SeguimientoNotePriority)}>
                      <SelectTrigger id="coord-priority" className="h-9 text-xs"><SelectValue placeholder="Seleccionar prioridad" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-urgency" className="text-xs">Urgencia del caso</Label>
                    <Button id="coord-urgency" ref={urgencyButtonRef} type="button" variant={form.markCaseUrgent ? "destructive" : "outline"} className="h-9 w-full justify-start px-3 text-xs" onClick={() => updateField("markCaseUrgent", !form.markCaseUrgent)} aria-pressed={form.markCaseUrgent}>
                      {form.markCaseUrgent ? "Caso urgente" : "Marcar como urgente"}
                    </Button>
                  </div>
                </div>
              </fieldset>

              <fieldset className="p-4">
                <legend className="sr-only">Novedad</legend>
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--ossum-line)] pb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardPenLine className="size-3.5 text-[var(--ossum-action)]" aria-hidden="true" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Novedad</h3>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-[var(--ossum-action)]" onClick={() => setActiveView("seguimiento")}>
                    <Paperclip className="size-3.5" /> Adjuntos
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-observation" className="text-xs">Observación operativa</Label>
                    <Textarea id="coord-observation" value={form.observation} onChange={(event) => updateField("observation", event.target.value)} placeholder="Detalles de coordinación, envío o disponibilidad" className="min-h-20 resize-y text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="coord-internal-note" className="text-xs">Nota interna</Label>
                    <Textarea id="coord-internal-note" value={form.internalNote} onChange={(event) => updateField("internalNote", event.target.value)} placeholder="Contexto para el equipo" className="min-h-20 resize-y text-xs" />
                  </div>
                </div>
              </fieldset>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[var(--ossum-line-strong)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
              {!canModifySeguimiento ? <p className="mr-auto text-[11px] text-slate-500">Tu rol tiene acceso de consulta.</p> : null}
              <Button type="button" variant="ghost" size="sm" className="min-h-11 text-xs sm:min-h-8" onClick={() => onOpenChange(false)} disabled={isBusy}>Cancelar</Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={isBusy || !canModifySeguimiento} className="min-h-11 gap-2 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action-hover)] sm:min-h-8">
                {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                Guardar gestión
              </Button>
            </div>
          </div>
        </TabsContent> : null}

          <TabsContent value="seguimiento" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
            <div className="mx-auto flex min-h-0 max-w-4xl flex-col gap-3">
              <div className="flex flex-col gap-2 border border-[var(--ossum-line-strong)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--ossum-navy)]">Seguimiento del expediente</p>
                  <p className="text-[10px] text-slate-500">Notas, correos, imágenes y evidencias en un único historial.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-1.5 text-xs sm:min-h-8" onClick={() => setTrackingFilter("todo")}><Clock3 className="size-3.5" />Historial</Button>
                  <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-1.5 text-xs sm:min-h-8" onClick={() => setTrackingFilter("archivos")}><Paperclip className="size-3.5" />Adjuntos</Button>
                  {canModifySeguimiento ? <Button type="button" size="sm" className="min-h-11 gap-1.5 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action-hover)] sm:min-h-8" onClick={() => setTrackingAddSheetKey((prev) => prev + 1)}><MessageSquare className="size-3.5" />Nueva novedad</Button> : null}
                </div>
              </div>
              <div className="border border-[var(--ossum-line-strong)] bg-white p-2 sm:p-3">
               <NovedadesTabContent surgery={surgery} initialFilter={!canModifySeguimiento || activeView === "seguimiento" ? trackingFilter : "todo"} initialAddAction={canModifySeguimiento && activeView === "seguimiento" ? trackingAction : undefined} initialAddActionKey={canModifySeguimiento && activeView === "seguimiento" ? trackingActionKey : 0} availableAddActions={["note", "mail", "image"]} showHeaderAddButton={false} openAddSheetKey={trackingAddSheetKey} />
              </div>
            </div>
          </TabsContent>
      </Tabs>
    </div>
  ) : null

  return isMobile ? (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 overflow-hidden rounded-none border-0 p-0">
          <SheetHeader className="border-b border-[var(--ossum-line)] bg-white px-4 py-3 text-left sm:px-6">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--ossum-navy)]">
              <ShieldCheck className="size-4 text-[var(--ossum-action)]" />
              Gestión de coordinación
            </SheetTitle>
            <SheetDescription className="text-[11px]">Actualizá el caso y registrá la novedad operativa.</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    ) : (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[94vh] flex-col gap-0 overflow-hidden border-[var(--ossum-line-strong)] p-0 shadow-md sm:max-w-5xl">
          <DialogHeader className="border-b border-[var(--ossum-line)] bg-white px-4 py-3 sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-base text-[var(--ossum-navy)]">
              <ShieldCheck className="size-4 text-[var(--ossum-action)]" />
              Gestión de coordinación
            </DialogTitle>
            <DialogDescription className="text-xs">Actualizá el caso y registrá la novedad operativa.</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
}

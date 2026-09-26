"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/AuthProvider"
import { ReferenciasAdministrativasEditor } from "@/components/cirugias/ReferenciasAdministrativasEditor"
import { apiFetch } from "@/lib/api/client"
import { useOrtoTrackStore } from "@/lib/store"
import { CLASSIFICATIONS, COORDINADOR_CX_OPTIONS } from "@/lib/cirugias.constants"
import { VENDEDORES_OPTIONS } from "@/lib/shared-constants"
import { PROVINCIAS_ARGENTINA, LOCALIDADES_POR_PROVINCIA } from "@/data/argentina-geography"
import { formatDate } from "@/lib/formatters"
import { toast } from "sonner"
import { CalendarDays, ClipboardList, FilePenLine, MapPin, Trash2, UserRound } from "lucide-react"
import type { ReferenciaAdministrativa, Surgery } from "@/types"

interface EditFichaDrawerProps {
  surgery: Surgery
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Section({ title, description, icon: Icon, children }: { title: string; description?: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="rounded-lg bg-sky-50 p-2 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLS = "bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
const SELECT_TRIGGER_CLS = "bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
const SELECT_CONTENT_CLS = "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"

export function EditFichaDrawer({ surgery, open, onOpenChange }: EditFichaDrawerProps) {
  const store = useOrtoTrackStore()
  const { activeCompany } = useAuth()
  const instrumentadorOptions = useMemo(() => ["Sin asignar", ...store.instrumentadores.map((item) => item.name)], [store.instrumentadores])
  const coordinatorOptions = useMemo(() => {
    const contacts = store.getContactosByGroup("coordinadores")
    return [
      { value: "Sin asignar", contactId: undefined },
      ...COORDINADOR_CX_OPTIONS.filter((option) => option !== "Sin asignar").map((option) => ({
        value: option,
        contactId: contacts.find((contact) => contact.nombre.toLowerCase().includes(option.toLowerCase()))?.id,
      })),
    ]
  }, [store])
  const [form, setForm] = useState<Partial<Surgery>>({})

  const hydrateForm = useCallback(() => {
    const latestSurgery = store.getSurgeryById(surgery.id) || surgery
    setForm({
      patient: latestSurgery.patient,
      patientDni: latestSurgery.patientDni,
      surgeon: latestSurgery.surgeon,
      institution: latestSurgery.institution,
      institutionCity: latestSurgery.institutionCity,
      procedure: latestSurgery.procedure,
      date: latestSurgery.date,
      time: latestSurgery.time,
      probableDate: latestSurgery.probableDate,
      client: latestSurgery.client,
      obraSocial: latestSurgery.obraSocial,
      financiador: latestSurgery.financiador,
      classification: latestSurgery.classification,
      provincia: latestSurgery.provincia,
      localidad: latestSurgery.localidad,
      instrumentador: latestSurgery.instrumentador,
      coordinadorCx: latestSurgery.coordinadorCx,
      coordinadorContactId: latestSurgery.coordinadorContactId,
      vendedor: latestSurgery.vendedor,
      titular: latestSurgery.titular,
      tipoGestion: latestSurgery.tipoGestion,
      aQuienRemitir: latestSurgery.aQuienRemitir,
      aQuienFacturar: latestSurgery.aQuienFacturar,
      leyenda: latestSurgery.leyenda,
      leyendaDestacada: latestSurgery.leyendaDestacada,
      urgente: latestSurgery.urgente,
      fechaEnvioMaterial: latestSurgery.fechaEnvioMaterial,
      referenciasAdministrativas: latestSurgery.referenciasAdministrativas,
    })
  }, [store, surgery])

  useEffect(() => {
    // The drawer hydrates its draft only when opened; this is intentionally a UI boundary sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) hydrateForm()
  }, [open, hydrateForm])

  const updateField = <K extends keyof Surgery>(field: K, value: Surgery[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const currentProvincia = String(form.provincia ?? surgery.provincia ?? "")
  const localidadOptions = currentProvincia && LOCALIDADES_POR_PROVINCIA[currentProvincia] ? LOCALIDADES_POR_PROVINCIA[currentProvincia] : []

  const handleSave = async () => {
    try {
      store.updateSurgery(surgery.id, form)

      const nextCoordinator = typeof form.coordinadorCx === "string" ? form.coordinadorCx : surgery.coordinadorCx
      const coordinatorChanged =
        form.coordinadorCx !== undefined &&
        nextCoordinator !== surgery.coordinadorCx

      if (coordinatorChanged && activeCompany?.id) {
        await apiFetch(`/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(surgery.backendId ?? surgery.id)}/coordinator`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: form.coordinadorContactId ?? coordinatorOptions.find((option) => option.value === nextCoordinator)?.contactId ?? null,
            coordinatorName: nextCoordinator === "Sin asignar" ? null : nextCoordinator,
          }),
        })
      }

      toast.success("Ficha actualizada correctamente")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la ficha")
    }
  }

  const handleDeleteRequest = () => {
    onOpenChange(false)
    window.dispatchEvent(new CustomEvent("ossum:open-delete-surgery-dialog", { detail: { surgery } }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-none gap-0 border-l border-slate-200 bg-slate-50 p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-[640px] xl:max-w-[720px]">
        <SheetHeader className="gap-3 border-b border-slate-200 bg-white px-5 py-4 text-left dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <Badge className="rounded-md bg-sky-700 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:bg-sky-700">{surgery.id}</Badge>
            {surgery.expedienteNumber && <Badge variant="outline" className="rounded-md border-slate-300 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Exp. {surgery.expedienteNumber}</Badge>}
          </div>
          <div>
            <SheetTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">Editar ficha quirúrgica</SheetTitle>
            <SheetDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ajustá los datos operativos del caso sin salir del expediente.</SheetDescription>
          </div>
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 sm:grid-cols-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Paciente</p><p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{surgery.patient}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Fecha CX</p><p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatDate(surgery.date)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Institución</p><p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{surgery.institution || "Sin definir"}</p></div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
            <Section title="Identificación y paciente" description="Datos principales visibles en el encabezado" icon={UserRound}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Paciente"><Input value={String(form.patient ?? "")} onChange={(e) => updateField("patient", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="DNI"><Input value={String(form.patientDni ?? "")} onChange={(e) => updateField("patientDni", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Obra social"><Input value={String(form.obraSocial ?? "")} onChange={(e) => updateField("obraSocial", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Cliente / financiador"><Input value={String(form.client ?? "")} onChange={(e) => updateField("client", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Financiador"><Input value={String(form.financiador ?? "")} onChange={(e) => updateField("financiador", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Clasificación"><Select value={String(form.classification ?? "Otro")} onValueChange={(value) => updateField("classification", value as Surgery["classification"])}><SelectTrigger className={"h-9 w-full " + SELECT_TRIGGER_CLS}><SelectValue /></SelectTrigger><SelectContent className={SELECT_CONTENT_CLS}>{CLASSIFICATIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></Field>
              </div>
            </Section>

            <Section title="Programación quirúrgica" description="Fechas, médico y sede" icon={CalendarDays}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Fecha cirugía"><Input type="date" value={String(form.date ?? "")} onChange={(e) => updateField("date", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Hora cirugía"><Input type="time" value={String(form.time ?? "")} onChange={(e) => updateField("time", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Fecha probable"><Input type="date" value={String(form.probableDate ?? "")} onChange={(e) => updateField("probableDate", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Fecha envío material"><Input type="date" value={String(form.fechaEnvioMaterial ?? "")} onChange={(e) => updateField("fechaEnvioMaterial", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Cirujano"><Input value={String(form.surgeon ?? "")} onChange={(e) => updateField("surgeon", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Procedimiento"><Input value={String(form.procedure ?? "")} onChange={(e) => updateField("procedure", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Institución"><Input value={String(form.institution ?? "")} onChange={(e) => updateField("institution", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Ciudad institución"><Input value={String(form.institutionCity ?? "")} onChange={(e) => updateField("institutionCity", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Provincia"><Select value={currentProvincia || undefined} onValueChange={(value) => { updateField("provincia", value); updateField("localidad", "") }}><SelectTrigger className={"h-9 w-full " + SELECT_TRIGGER_CLS}><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger><SelectContent className={SELECT_CONTENT_CLS}>{PROVINCIAS_ARGENTINA.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Localidad"><Select value={String(form.localidad ?? "") || undefined} onValueChange={(value) => updateField("localidad", value)}><SelectTrigger className={"h-9 w-full " + SELECT_TRIGGER_CLS}><SelectValue placeholder="Seleccionar localidad" /></SelectTrigger><SelectContent className={SELECT_CONTENT_CLS}>{localidadOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></Field>
              </div>
            </Section>

            <Section title="Gestión operativa" description="Asignaciones y destino administrativo" icon={ClipboardList}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Coordinador CX"><Select value={String(form.coordinadorCx ?? "Sin asignar")} onValueChange={(value) => { const option = coordinatorOptions.find((candidate) => candidate.value === value); updateField("coordinadorCx", value); updateField("coordinadorContactId", option?.contactId) }}><SelectTrigger className={"h-9 w-full " + SELECT_TRIGGER_CLS}><SelectValue /></SelectTrigger><SelectContent className={SELECT_CONTENT_CLS}>{coordinatorOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.value}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Vendedor"><Select value={String(form.vendedor ?? "Sin asignar")} onValueChange={(value) => updateField("vendedor", value)}><SelectTrigger className={"h-9 w-full " + SELECT_TRIGGER_CLS}><SelectValue /></SelectTrigger><SelectContent className={SELECT_CONTENT_CLS}>{VENDEDORES_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Instrumentador"><Select value={String(form.instrumentador ?? "Sin asignar")} onValueChange={(value) => updateField("instrumentador", value)}><SelectTrigger className={"h-9 w-full " + SELECT_TRIGGER_CLS}><SelectValue /></SelectTrigger><SelectContent className={SELECT_CONTENT_CLS}>{instrumentadorOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Tipo de gestión"><Input value={String(form.tipoGestion ?? "")} onChange={(e) => updateField("tipoGestion", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Titular"><Input value={String(form.titular ?? "")} onChange={(e) => updateField("titular", e.target.value)} className={"h-9 " + INPUT_CLS} /></Field>
                <Field label="Urgente" className="flex items-end"><label className="flex h-9 w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><Checkbox checked={Boolean(form.urgente)} onCheckedChange={(checked) => updateField("urgente", Boolean(checked))} />Marcar como cirugía urgente</label></Field>
              </div>
            </Section>

            <Section title="Destino y observaciones" description="Datos comerciales visibles en la ficha" icon={MapPin}>
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="A quién remitir"><Textarea value={String(form.aQuienRemitir ?? "")} onChange={(e) => updateField("aQuienRemitir", e.target.value)} className={"min-h-24 resize-y " + INPUT_CLS} /></Field>
                <Field label="A quién facturar"><Textarea value={String(form.aQuienFacturar ?? "")} onChange={(e) => updateField("aQuienFacturar", e.target.value)} className={"min-h-24 resize-y " + INPUT_CLS} /></Field>
                <Field label="Leyenda / observaciones" className="lg:col-span-2"><Textarea value={String(form.leyenda ?? "")} onChange={(e) => updateField("leyenda", e.target.value)} className={"min-h-28 resize-y " + INPUT_CLS} /></Field>
                <Field label="Leyenda destacada" className="lg:col-span-2"><label className="flex min-h-12 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><Checkbox checked={Boolean(form.leyendaDestacada)} onCheckedChange={(checked) => updateField("leyendaDestacada", Boolean(checked))} />Mostrar esta leyenda como destacada dentro de la ficha.</label></Field>
              </div>
            </Section>

            <Section title="Referencias administrativas" description="Autorizaciones, expediente, siniestro y otros IDs" icon={FilePenLine}>
              <ReferenciasAdministrativasEditor value={(form.referenciasAdministrativas ?? []) as ReferenciaAdministrativa[]} onChange={(refs) => updateField("referenciasAdministrativas", refs)} />
            </Section>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/50" onClick={handleDeleteRequest}>
              <Trash2 className="mr-2 size-4" />
              Eliminar cirugía
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">No se editan notas internas desde este drawer.</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="bg-sky-700 hover:bg-sky-800" onClick={() => void handleSave()}>Guardar cambios</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

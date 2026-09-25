"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/AuthProvider"
import { emitOperationalNotification } from "@/lib/api/operational-notifications"
import { useOrtoTrackStore } from "@/lib/store"
import { CLASSIFICATIONS, COORDINADOR_CX_OPTIONS } from "@/lib/cirugias.constants"
import { VENDEDORES_OPTIONS, TIPO_REFERENCIA_OPTIONS } from "@/lib/shared-constants"
import { PROVINCIAS_ARGENTINA, LOCALIDADES_POR_PROVINCIA } from "@/data/argentina-geography"
import { formatDate } from "@/lib/formatters"
import { toast } from "sonner"
import {
  AlertOctagon,
  Building2,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  FileKey,
  FileText,
  Loader2,
  MapPin,
  Plus,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Trash2,
  User,
  UserRound,
  UserRoundCog,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReferenciaAdministrativa, Surgery, TipoReferencia } from "@/types"

interface EditFichaDrawerProps {
  surgery: Surgery
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DrawerTab = "operativa" | "destino" | "referencias"

// ─── Input & Select Styles ─────────────────────────────────────────
const INPUT_CLS =
  "h-9 rounded-md border-slate-200/90 bg-white text-xs font-medium text-slate-900 shadow-2xs transition-colors focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
const SELECT_TRIGGER_CLS =
  "h-9 w-full rounded-md border-slate-200/90 bg-white text-xs font-medium text-slate-900 shadow-2xs transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
const SELECT_CONTENT_CLS =
  "border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"

// ─── Form Section Container ────────────────────────────────────────
function FormSection({
  title,
  description,
  icon: Icon,
  badge,
  children,
}: {
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200/90 bg-[#F9FBFD] p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Icon className="size-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {title}
            </h4>
            {description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  )
}

// ─── Form Field with Semantic Accent & Contrast ───────────────────
function FormField({
  label,
  children,
  className = "",
  prominent = false,
  icon: Icon,
}: {
  label: string
  children: React.ReactNode
  className?: string
  prominent?: boolean
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3 text-slate-400 dark:text-slate-500" />}
        <label
          className={cn(
            "text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400",
            prominent && "text-slate-800 dark:text-slate-200"
          )}
        >
          {label}
        </label>
      </div>
      <div className={cn(prominent && "rounded-md ring-1 ring-slate-300/80 dark:ring-slate-700/80")}>
        {children}
      </div>
    </div>
  )
}

export function EditFichaDrawer({ surgery, open, onOpenChange }: EditFichaDrawerProps) {
  const store = useOrtoTrackStore()
  const { activeCompany } = useAuth()
  const [activeTab, setActiveTab] = useState<DrawerTab>("operativa")
  const [isSaving, setIsSaving] = useState(false)
  const instrumentadorOptions = useMemo(
    () => ["Sin asignar", ...store.instrumentadores.map((item) => item.name)],
    [store.instrumentadores]
  )
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
      vendedor: latestSurgery.vendedor,
      titular: latestSurgery.titular,
      tipoGestion: latestSurgery.tipoGestion,
      aQuienRemitir: latestSurgery.aQuienRemitir,
      aQuienFacturar: latestSurgery.aQuienFacturar,
      leyenda: latestSurgery.leyenda,
      leyendaDestacada: latestSurgery.leyendaDestacada,
      urgente: latestSurgery.urgente,
      fechaEnvioMaterial: latestSurgery.fechaEnvioMaterial,
      referenciasAdministrativas: latestSurgery.referenciasAdministrativas ? [...latestSurgery.referenciasAdministrativas] : [],
    })
  }, [store, surgery])

  useEffect(() => {
    if (open) {
      hydrateForm()
      setActiveTab("operativa")
    }
  }, [open, hydrateForm])

  const updateField = <K extends keyof Surgery>(field: K, value: Surgery[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const currentProvincia = String(form.provincia ?? surgery.provincia ?? "")
  const localidadOptions =
    currentProvincia && LOCALIDADES_POR_PROVINCIA[currentProvincia]
      ? LOCALIDADES_POR_PROVINCIA[currentProvincia]
      : []

  const handleSave = async () => {
    setIsSaving(true)
    try {
      store.updateSurgery(surgery.id, form)

      const nextCoordinator =
        typeof form.coordinadorCx === "string" ? form.coordinadorCx : surgery.coordinadorCx
      const coordinatorChanged =
        form.coordinadorCx !== undefined && nextCoordinator !== surgery.coordinadorCx

      if (coordinatorChanged && activeCompany?.id && nextCoordinator) {
        await emitOperationalNotification(activeCompany.id, surgery.id, {
          sourceEntityId:
            typeof crypto !== "undefined" ? crypto.randomUUID() : `${surgery.id}-${Date.now()}`,
          eventType: "coordinator_assigned",
          coordinatorName: nextCoordinator,
        })
      }

      toast.success("Ficha actualizada correctamente")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la ficha")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRequest = () => {
    onOpenChange(false)
    window.dispatchEvent(
      new CustomEvent("ossum:open-delete-surgery-dialog", { detail: { surgery } })
    )
  }

  // ─── Dynamic References Handlers ─────────────────────────────────
  const refList = (form.referenciasAdministrativas ?? []) as ReferenciaAdministrativa[]

  const handleAddReference = () => {
    const newRef: ReferenciaAdministrativa = {
      id: `ref-${Date.now()}-${refList.length}`,
      tipo: "Autorización",
      valor: "",
      observacion: "",
    }
    updateField("referenciasAdministrativas", [...refList, newRef])
  }

  const handleRemoveReference = (id: string) => {
    updateField(
      "referenciasAdministrativas",
      refList.filter((r) => r.id !== id)
    )
  }

  const handleReferenceChange = (id: string, patch: Partial<ReferenciaAdministrativa>) => {
    updateField(
      "referenciasAdministrativas",
      refList.map((r) => (r.id === id ? { ...r, ...patch } : r))
    )
  }

  const DRAWER_TABS: { id: DrawerTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: "operativa", label: "Operativa", icon: SlidersHorizontal },
    { id: "destino", label: "Destino y Facturación", icon: MapPin },
    { id: "referencias", label: "Referencias", icon: FileKey, count: refList.length },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-none border-l border-slate-200 bg-[#F3F6FA] p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-[640px] xl:max-w-[720px]"
      >
        {/* ── Header Compacto de Edición ── */}
        <div className="border-b border-slate-200/90 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <SheetHeader className="gap-2 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950">
                  {surgery.id}
                </Badge>
                {surgery.expedienteNumber && (
                  <Badge
                    variant="outline"
                    className="rounded-md border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Exp. {surgery.expedienteNumber}
                  </Badge>
                )}
                <span className="text-xs text-slate-400">·</span>
                <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                  {surgery.patient}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <div>
                <SheetTitle className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Editar ficha quirúrgica
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {surgery.institution || "Sin institución"} · {formatDate(surgery.date)}
                </SheetDescription>
              </div>
            </div>

            {/* ── Animated UI Tabs Bar ── */}
            <div className="mt-2 flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-900">
              {DRAWER_TABS.map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "group relative flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "text-slate-950 dark:text-slate-50"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="edit-drawer-tab-pill"
                        className="absolute inset-0 rounded-md bg-white shadow-2xs dark:bg-slate-800"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon
                        className={cn(
                          "size-3.5 transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                        )}
                      />
                      <span>{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {tab.count}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </SheetHeader>
        </div>

        {/* ── Scrollable Form Body with AnimatePresence Transitions ── */}
        <ScrollArea className="h-[calc(100vh-185px)]">
          <div className="p-4 sm:p-5">
            <AnimatePresence mode="wait">
              {activeTab === "operativa" && (
                <motion.div
                  key="tab-operativa"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-3.5"
                >
                  {/* Subsección 1: Equipo y Asignaciones Clave (Alta prioridad) */}
                  <FormSection
                    title="Equipo y Asignaciones"
                    description="Coordinación, equipo quirúrgico y urgencia"
                    icon={UserRoundCog}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <FormField label="Coordinador CX" prominent icon={UserRoundCog}>
                        <Select
                          value={String(form.coordinadorCx ?? "Sin asignar")}
                          onValueChange={(value) => updateField("coordinadorCx", value)}
                        >
                          <SelectTrigger className={SELECT_TRIGGER_CLS}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={SELECT_CONTENT_CLS}>
                            {COORDINADOR_CX_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Instrumentador" prominent icon={UserRound}>
                        <Select
                          value={String(form.instrumentador ?? "Sin asignar")}
                          onValueChange={(value) => updateField("instrumentador", value)}
                        >
                          <SelectTrigger className={SELECT_TRIGGER_CLS}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={SELECT_CONTENT_CLS}>
                            {instrumentadorOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Vendedor" icon={User}>
                        <Select
                          value={String(form.vendedor ?? "Sin asignar")}
                          onValueChange={(value) => updateField("vendedor", value)}
                        >
                          <SelectTrigger className={SELECT_TRIGGER_CLS}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={SELECT_CONTENT_CLS}>
                            {VENDEDORES_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Tipo de gestión">
                        <Input
                          value={String(form.tipoGestion ?? "")}
                          onChange={(e) => updateField("tipoGestion", e.target.value)}
                          placeholder="Ej. Directa, Tercerizada..."
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Titular">
                        <Input
                          value={String(form.titular ?? "")}
                          onChange={(e) => updateField("titular", e.target.value)}
                          placeholder="Titular del caso..."
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Urgencia operativa" className="flex flex-col justify-end">
                        <label
                          className={cn(
                            "flex h-9 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-xs font-bold transition-colors",
                            form.urgente
                              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          )}
                        >
                          <Checkbox
                            checked={Boolean(form.urgente)}
                            onCheckedChange={(checked) => updateField("urgente", Boolean(checked))}
                          />
                          <span className="flex items-center gap-1">
                            {form.urgente && <AlertOctagon className="size-3.5 text-red-600" />}
                            Cirugía Urgente
                          </span>
                        </label>
                      </FormField>
                    </div>
                  </FormSection>

                  {/* Subsección 2: Identificación y Paciente */}
                  <FormSection
                    title="Identificación y Paciente"
                    description="Datos del paciente y cobertura"
                    icon={User}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <FormField label="Paciente *">
                        <Input
                          value={String(form.patient ?? "")}
                          onChange={(e) => updateField("patient", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="DNI">
                        <Input
                          value={String(form.patientDni ?? "")}
                          onChange={(e) => updateField("patientDni", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Clasificación">
                        <Select
                          value={String(form.classification ?? "Otro")}
                          onValueChange={(value) =>
                            updateField("classification", value as Surgery["classification"])
                          }
                        >
                          <SelectTrigger className={SELECT_TRIGGER_CLS}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={SELECT_CONTENT_CLS}>
                            {CLASSIFICATIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Obra social">
                        <Input
                          value={String(form.obraSocial ?? "")}
                          onChange={(e) => updateField("obraSocial", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Cliente / Financiador">
                        <Input
                          value={String(form.client ?? "")}
                          onChange={(e) => updateField("client", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Financiador secundario">
                        <Input
                          value={String(form.financiador ?? "")}
                          onChange={(e) => updateField("financiador", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>
                    </div>
                  </FormSection>

                  {/* Subsección 3: Programación y Sede Quirúrgica */}
                  <FormSection
                    title="Programación y Sede"
                    description="Fechas, profesional e institución"
                    icon={Calendar}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <FormField label="Fecha cirugía *" icon={Calendar}>
                        <Input
                          type="date"
                          value={String(form.date ?? "")}
                          onChange={(e) => updateField("date", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Hora cirugía" icon={Clock}>
                        <Input
                          type="time"
                          value={String(form.time ?? "")}
                          onChange={(e) => updateField("time", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Fecha probable">
                        <Input
                          type="date"
                          value={String(form.probableDate ?? "")}
                          onChange={(e) => updateField("probableDate", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Fecha envío material">
                        <Input
                          type="date"
                          value={String(form.fechaEnvioMaterial ?? "")}
                          onChange={(e) => updateField("fechaEnvioMaterial", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Médico / Cirujano" icon={Stethoscope}>
                        <Input
                          value={String(form.surgeon ?? "")}
                          onChange={(e) => updateField("surgeon", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Procedimiento">
                        <Input
                          value={String(form.procedure ?? "")}
                          onChange={(e) => updateField("procedure", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Institución" icon={Building2}>
                        <Input
                          value={String(form.institution ?? "")}
                          onChange={(e) => updateField("institution", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Ciudad">
                        <Input
                          value={String(form.institutionCity ?? "")}
                          onChange={(e) => updateField("institutionCity", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </FormField>

                      <FormField label="Provincia">
                        <Select
                          value={currentProvincia || undefined}
                          onValueChange={(value) => {
                            updateField("provincia", value)
                            updateField("localidad", "")
                          }}
                        >
                          <SelectTrigger className={SELECT_TRIGGER_CLS}>
                            <SelectValue placeholder="Provincia..." />
                          </SelectTrigger>
                          <SelectContent className={SELECT_CONTENT_CLS}>
                            {PROVINCIAS_ARGENTINA.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Localidad" className="sm:col-span-2 md:col-span-3">
                        <Select
                          value={String(form.localidad ?? "") || undefined}
                          onValueChange={(value) => updateField("localidad", value)}
                        >
                          <SelectTrigger className={SELECT_TRIGGER_CLS}>
                            <SelectValue placeholder="Localidad..." />
                          </SelectTrigger>
                          <SelectContent className={SELECT_CONTENT_CLS}>
                            {localidadOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>
                  </FormSection>
                </motion.div>
              )}

              {activeTab === "destino" && (
                <motion.div
                  key="tab-destino"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-3.5"
                >
                  <FormSection
                    title="Destino y Facturación"
                    description="Instrucciones comerciales y de remisión"
                    icon={MapPin}
                  >
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <FormField
                        label="A quién remitir"
                        prominent
                        icon={MapPin}
                        className="sm:col-span-2"
                      >
                        <Textarea
                          value={String(form.aQuienRemitir ?? "")}
                          onChange={(e) => updateField("aQuienRemitir", e.target.value)}
                          placeholder="Institución o sede de entrega del material..."
                          className={cn("min-h-20 resize-y", INPUT_CLS)}
                        />
                      </FormField>

                      <FormField
                        label="A quién facturar"
                        prominent
                        icon={ReceiptText}
                        className="sm:col-span-2"
                      >
                        <Textarea
                          value={String(form.aQuienFacturar ?? "")}
                          onChange={(e) => updateField("aQuienFacturar", e.target.value)}
                          placeholder="Entidad responsable del pago / Facturación..."
                          className={cn("min-h-20 resize-y", INPUT_CLS)}
                        />
                      </FormField>

                      <FormField
                        label="Leyenda / Observaciones internas"
                        icon={FileText}
                        className="sm:col-span-2"
                      >
                        <Textarea
                          value={String(form.leyenda ?? "")}
                          onChange={(e) => updateField("leyenda", e.target.value)}
                          placeholder="Notas operativas para preparación o logística..."
                          className={cn("min-h-24 resize-y", INPUT_CLS)}
                        />
                      </FormField>

                      <div className="sm:col-span-2">
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          <Checkbox
                            checked={Boolean(form.leyendaDestacada)}
                            onCheckedChange={(checked) =>
                              updateField("leyendaDestacada", Boolean(checked))
                            }
                          />
                          <span>Mostrar esta leyenda como destacada en el expediente</span>
                        </label>
                      </div>
                    </div>
                  </FormSection>
                </motion.div>
              )}

              {activeTab === "referencias" && (
                <motion.div
                  key="tab-referencias"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-3.5"
                >
                  <FormSection
                    title="Referencias Administrativas"
                    description="Autorizaciones, expedientes, siniestros e identificadores vinculados"
                    icon={FileKey}
                    badge={
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddReference}
                          className="h-7 gap-1 rounded-md border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Plus className="size-3" />
                          <span>Agregar referencia</span>
                        </Button>
                      </motion.div>
                    }
                  >
                    {refList.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-white/60 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
                        <FileKey className="mx-auto mb-2 size-5 text-slate-400" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          Sin referencias administrativas cargadas
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Hacé clic en &quot;Agregar referencia&quot; para cargar autorizaciones o números de siniestro.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AnimatePresence initial={false}>
                          {refList.map((ref) => (
                            <motion.div
                              key={ref.id}
                              initial={{ opacity: 0, height: 0, scale: 0.97 }}
                              animate={{ opacity: 1, height: "auto", scale: 1 }}
                              exit={{ opacity: 0, height: 0, scale: 0.96 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="grid items-end gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900 sm:grid-cols-[130px_1fr_1fr_auto]">
                                <div className="space-y-1">
                                  <label className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Tipo
                                  </label>
                                  <Select
                                    value={ref.tipo}
                                    onValueChange={(v) =>
                                      handleReferenceChange(ref.id, { tipo: v as TipoReferencia })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs font-semibold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={SELECT_CONTENT_CLS}>
                                      {TIPO_REFERENCIA_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Número / Valor *
                                  </label>
                                  <Input
                                    value={ref.valor}
                                    onChange={(e) =>
                                      handleReferenceChange(ref.id, { valor: e.target.value })
                                    }
                                    placeholder="Nº de autorización, exp..."
                                    className="h-8 text-xs font-semibold text-slate-950 dark:text-slate-50"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Observación (opcional)
                                  </label>
                                  <Input
                                    value={ref.observacion || ""}
                                    onChange={(e) =>
                                      handleReferenceChange(ref.id, { observacion: e.target.value })
                                    }
                                    placeholder="Detalle..."
                                    className="h-8 text-xs font-medium"
                                  />
                                </div>

                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveReference(ref.id)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                                    title="Eliminar referencia"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </FormSection>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* ── Footer Sticky con Acciones y Feedback Animado ── */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8.5 border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/50"
            onClick={handleDeleteRequest}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Eliminar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8.5 border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                size="sm"
                className="h-8.5 gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Guardando…</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Guardar cambios</span>
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

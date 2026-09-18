"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { ArrowRight, CalendarClock, CheckCircle2, FileWarning, Info, ShieldAlert, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/formatters"
import type { HistoryEntry, Surgery, SurgeryDocumentChecklist, SurgeryNote } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

interface CirugiaContextInspectorProps {
  surgery: Surgery | null
  notes: SurgeryNote[]
  history: HistoryEntry[]
  docStatus: string
  docChecklist?: SurgeryDocumentChecklist
  consumoState?: string | null
  facturacionStatus: string
  resumenCobranza: ResumenCobranzaSurgery
  onOpenExpediente: (id: string) => void
  onAddNote: () => void
  onFacturar: () => void
}

type InspectorTab = "resumen" | "autorizacion" | "notas" | "novedades" | "proximo"

type AlertTone = "blocked" | "pending" | "ready" | "info"

const TAB_LABELS: Array<{ value: InspectorTab; label: string }> = [
  { value: "resumen", label: "Resumen" },
  { value: "autorizacion", label: "Autorización" },
  { value: "notas", label: "Notas" },
  { value: "novedades", label: "Novedades" },
  { value: "proximo", label: "Próximo paso" },
]

function extractAuthorizationRef(surgery: Surgery): string | null {
  const authRef = surgery.referenciasAdministrativas.find((ref) => ref.tipo === "Autorización")
  return authRef?.valor || null
}

function getNextStep(args: {
  surgery: Surgery
  docStatus: string
  consumoState?: string | null
  facturacionStatus: string
  noteCount: number
}) {
  const { surgery, docStatus, consumoState, facturacionStatus, noteCount } = args

  if (!surgery.autorizado) {
    return {
      label: "Confirmar autorización",
      detail: "Falta respaldo o número de autorización para liberar el caso.",
      tone: "amber" as const,
    }
  }

  if (!surgery.date) {
    return {
      label: "Definir fecha quirúrgica",
      detail: "El expediente está activo pero todavía no tiene fecha CX confirmada.",
      tone: "amber" as const,
    }
  }

  if (docStatus === "Incompleta" || docStatus === "Observada") {
    return {
      label: "Cerrar documentación crítica",
      detail: "El tablero muestra pendientes documentales antes de continuar el circuito.",
      tone: "red" as const,
    }
  }

  if (!consumoState || consumoState === "Pendiente") {
    return {
      label: "Validar consumo",
      detail: "Todavía no hay consumo validado para consolidar el postoperatorio.",
      tone: "amber" as const,
    }
  }

  if (facturacionStatus !== "Facturada" && facturacionStatus !== "Pendiente de cobro") {
    return {
      label: "Preparar facturación",
      detail: "La cirugía ya puede pasar al frente comercial si la documentación está cerrada.",
      tone: "sky" as const,
    }
  }

  if (noteCount === 0) {
    return {
      label: "Registrar seguimiento",
      detail: "Conviene dejar una nota operativa corta para no perder contexto del cierre.",
      tone: "slate" as const,
    }
  }

  return {
    label: "Monitorear cobro",
    detail: "El caso ya está avanzado; revisar saldo y próximas gestiones comerciales.",
    tone: "emerald" as const,
  }
}

function getAlertToneClasses(tone: AlertTone) {
  switch (tone) {
    case "blocked":
      return "border-red-200 bg-red-50 text-red-800"
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800"
    default:
      return "border-slate-200 bg-slate-100 text-slate-700"
  }
}

function getNextStepToneClasses(tone: ReturnType<typeof getNextStep>["tone"]) {
  switch (tone) {
    case "red":
      return "border-red-200 bg-red-50/80"
    case "amber":
      return "border-amber-200 bg-amber-50/80"
    case "sky":
      return "border-sky-200 bg-sky-50/80"
    case "emerald":
      return "border-emerald-200 bg-emerald-50/80"
    default:
      return "border-slate-200 bg-slate-50"
  }
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-slate-300 bg-white px-2.5 py-2 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">{hint}</p> : null}
    </div>
  )
}

function SectionCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-sm border border-slate-300 bg-white p-2.5 shadow-sm", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-1.5">{children}</div>
    </section>
  )
}

function EmptyInspectorState() {
  return (
    <div className="flex h-full min-h-[18rem] items-center rounded-sm border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500 shadow-sm">
      <div className="max-w-xl">
        Seleccioná una cirugía para ver el inspector operativo, autorizaciones, últimas notas y próximo paso.
      </div>
    </div>
  )
}

export function CirugiaContextInspector(props: CirugiaContextInspectorProps) {
  const { surgery, notes, history, docStatus, docChecklist, consumoState, facturacionStatus, resumenCobranza } = props
  const [tab, setTab] = useState<InspectorTab>("resumen")

  useEffect(() => {
    setTab("resumen")
  }, [surgery?.id])

  const latestNotes = useMemo(
    () => [...notes].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, 3),
    [notes]
  )

  const latestHistory = useMemo(
    () => [...history].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, 4),
    [history]
  )

  if (!surgery) return <EmptyInspectorState />

  const authorizationRef = extractAuthorizationRef(surgery)
  const latestAuthorizationEvent = latestHistory.find((entry) => /autoriz/i.test(entry.action) || /autoriz/i.test(entry.details))
  const completedDocs = docChecklist?.items.filter((item) => item.completed).length ?? 0
  const totalDocs = docChecklist?.items.length ?? 0
  const nextStep = getNextStep({
    surgery,
    docStatus,
    consumoState,
    facturacionStatus,
    noteCount: notes.length,
  })
  const coordinator = surgery.coordinadorCx || "Sin asignar"
  const latestNote = latestNotes[0]
  const latestEvent = latestHistory[0]
  const missingItems = [
    !surgery.autorizado ? "Autorización" : null,
    !surgery.date ? "Fecha CX" : null,
    docStatus === "Incompleta" || docStatus === "Observada" ? `Documentación ${docStatus.toLowerCase()}` : null,
    !consumoState || consumoState === "Pendiente" ? "Consumo validado" : null,
    facturacionStatus !== "Facturada" && facturacionStatus !== "Pendiente de cobro" ? "Paso a facturación" : null,
  ].filter(Boolean) as string[]
  const alerts = [
    !surgery.autorizado
      ? { tone: "blocked" as const, label: "Bloqueada", detail: "Sin autorización confirmada." }
      : { tone: "ready" as const, label: "Autorización", detail: authorizationRef || "Autorización confirmada." },
    docStatus === "Observada"
      ? { tone: "blocked" as const, label: "Documentación observada", detail: "Hay observaciones activas por resolver." }
      : docStatus === "Incompleta"
        ? { tone: "pending" as const, label: "Documentación incompleta", detail: `Checklist ${completedDocs}/${totalDocs || 0}.` }
        : { tone: "ready" as const, label: "Documentación", detail: totalDocs > 0 ? `Checklist ${completedDocs}/${totalDocs}.` : docStatus },
    !consumoState || consumoState === "Pendiente"
      ? { tone: "pending" as const, label: "Consumo pendiente", detail: "Todavía no está validado." }
      : { tone: "ready" as const, label: "Consumo", detail: consumoState },
    resumenCobranza.saldoPendiente > 0
      ? { tone: "info" as const, label: "Saldo pendiente", detail: formatCurrency(resumenCobranza.saldoPendiente ?? 0) }
      : { tone: "ready" as const, label: "Cobranza", detail: "Sin saldo pendiente." },
    surgery.urgente
      ? { tone: "info" as const, label: "Urgente", detail: "Caso marcado con prioridad alta." }
      : null,
  ].filter(Boolean) as Array<{ tone: AlertTone; label: string; detail: string }>
  const primaryAlert = alerts.find((item) => item.tone === "blocked") || alerts.find((item) => item.tone === "pending") || alerts[0]

  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-100/90">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/95">
        <div className="shrink-0 border-b border-slate-300 bg-white px-4 py-3.5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-sm border-slate-300 bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  Centro operativo
                </Badge>
                <Badge variant="outline" className={cn("rounded-sm text-[10px] font-semibold", getAlertToneClasses(primaryAlert?.tone ?? "info"))}>
                  {primaryAlert?.label || surgery.state}
                </Badge>
                {surgery.urgente ? (
                  <Badge variant="outline" className="rounded-sm border-red-200 bg-red-50 text-[10px] font-semibold text-red-700">
                    Urgente
                  </Badge>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard label="CX" value={surgery.id} hint={surgery.expedienteNumber ? `Exp. ${surgery.expedienteNumber}` : undefined} />
                <MetricCard label="Paciente" value={surgery.patient} hint={surgery.procedure} />
                <MetricCard label="DNI" value={surgery.patientDni || "Sin dato"} hint={surgery.classification} />
                <MetricCard label="Cliente" value={surgery.client} hint={surgery.obraSocial || surgery.financiador || "Sin cobertura"} />
                <MetricCard label="Estado" value={surgery.state} hint={`${surgery.preparationState} · ${consumoState || "Sin consumo"}`} />
                <MetricCard label="Fecha" value={surgery.date ? formatDate(surgery.date) : "Sin fecha"} hint={surgery.time || (surgery.probableDate ? `Prob. ${formatDate(surgery.probableDate)}` : undefined)} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => props.onAddNote()} className="h-8 text-xs">
              Agregar nota
            </Button>
            <Button size="sm" variant="outline" onClick={() => props.onFacturar()} className="h-8 text-xs">
              Facturar
            </Button>
            <Button size="sm" onClick={() => props.onOpenExpediente(surgery.id)} className="h-8 text-xs">
              Abrir expediente
            </Button>
          </div>
        </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as InspectorTab)} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="shrink-0 border-b border-slate-300 bg-slate-100/80 px-4 py-2">
            <TabsList className="h-auto gap-1 rounded-sm border border-slate-300 bg-white p-1 shadow-sm">
              {TAB_LABELS.map((tabItem) => (
                <TabsTrigger key={tabItem.value} value={tabItem.value} className="h-8 rounded-sm px-3 text-[11px] font-semibold text-slate-700 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  {tabItem.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/90 px-4 pb-4 pt-3">
          <TabsContent value="resumen" className="mt-0 px-0 py-0 data-[state=inactive]:hidden">
            <div className="grid gap-2.5 xl:grid-cols-12">
              <SectionCard title="Estado operativo" className="xl:col-span-4">
                <div className="space-y-1.5 text-sm text-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-slate-500" />
                    <span className="font-semibold text-slate-950">{surgery.state}</span>
                  </div>
                  <p>Preparación: <span className="font-medium text-slate-950">{surgery.preparationState}</span></p>
                  <p>Documentación: <span className="font-medium text-slate-950">{docStatus}</span></p>
                  <p>Consumo: <span className="font-medium text-slate-950">{consumoState || "Sin registrar"}</span></p>
                  <p>Facturación: <span className="font-medium text-slate-950">{facturacionStatus}</span></p>
                </div>
              </SectionCard>

              <SectionCard title="Responsable / faltantes" className="xl:col-span-4">
                <div className="space-y-2 text-sm text-slate-800">
                  <p className="flex items-start gap-1.5"><UserRound className="mt-0.5 size-3.5 text-slate-500" />Responsable: <span className="font-medium text-slate-950">{coordinator}</span></p>
                  <div className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <p className="text-[11px] text-slate-500">Faltantes críticos</p>
                    <p className="mt-1 text-sm font-medium text-slate-950">{missingItems.length > 0 ? missingItems.join(" · ") : "Sin faltantes críticos"}</p>
                  </div>
                  <p className="text-xs text-slate-600">Checklist documental: <span className="font-semibold text-slate-900">{totalDocs > 0 ? `${completedDocs}/${totalDocs}` : "Sin checklist"}</span></p>
                </div>
              </SectionCard>

              <SectionCard title="Próximo paso" className="xl:col-span-4">
                <div className={cn("rounded-sm border px-3 py-2.5", getNextStepToneClasses(nextStep.tone))}>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 size-4 text-slate-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{nextStep.label}</p>
                      <p className="mt-1 text-xs text-slate-700">{nextStep.detail}</p>
                      <div className="mt-2 space-y-1 text-xs text-slate-700">
                        <p>Responsable sugerido: <span className="font-semibold text-slate-950">{coordinator}</span></p>
                        <p>Frente actual: <span className="font-semibold text-slate-950">{facturacionStatus}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Caso" className="xl:col-span-5">
                <div className="space-y-1.5 text-sm text-slate-800">
                  <div>
                    <p className="text-[11px] text-slate-500">Paciente / DNI</p>
                    <p className="font-semibold text-slate-950">{surgery.patient} · {surgery.patientDni || "Sin dato"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Cliente / cobertura</p>
                    <p className="font-medium">{surgery.client}{surgery.obraSocial ? ` · ${surgery.obraSocial}` : ""}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Institución / cirujano</p>
                    <p className="font-medium">{surgery.institution} · {surgery.surgeon}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Alertas / bloqueos" className="xl:col-span-4">
                <div className="space-y-1.5">
                  {alerts.map((alert, index) => (
                    <div key={`${alert.label}-${index}`} className={cn("rounded-sm border px-2.5 py-1.5", getAlertToneClasses(alert.tone))}>
                      <div className="flex items-start gap-2">
                        {alert.tone === "blocked" ? <ShieldAlert className="mt-0.5 size-3.5" /> : null}
                        {alert.tone === "pending" ? <FileWarning className="mt-0.5 size-3.5" /> : null}
                        {alert.tone === "ready" ? <CheckCircle2 className="mt-0.5 size-3.5" /> : null}
                        {alert.tone === "info" ? <Info className="mt-0.5 size-3.5" /> : null}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{alert.label}</p>
                          <p className="text-xs opacity-90">{alert.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Últimas novedades" className="xl:col-span-3">
                <div className="space-y-1.5">
                  {latestEvent ? (
                    <div className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <CalendarClock className="size-3.5" />
                        <span>{formatDate(latestEvent.date)} {latestEvent.time}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-900">{latestEvent.action}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-slate-700">{latestEvent.details}</p>
                    </div>
                  ) : null}
                  {latestNote ? (
                    <div className="rounded-sm border border-slate-200 bg-white px-2.5 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{latestNote.type}</span>
                        <span>{latestNote.userName}</span>
                      </div>
                      <p className="mt-1 line-clamp-3 text-xs text-slate-700">{latestNote.text}</p>
                    </div>
                  ) : null}
                  {!latestEvent && !latestNote ? (
                    <p className="rounded-sm border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">Sin novedades recientes.</p>
                  ) : null}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="autorizacion" className="mt-0 px-0 py-0 data-[state=inactive]:hidden">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-sm border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Estado</p>
                <div className="mt-2 space-y-2 text-sm text-slate-900">
                  <p><span className="text-muted-foreground">Autorizado:</span> {surgery.autorizado ? "Sí" : "No"}</p>
                  <p><span className="text-muted-foreground">Nº autorización:</span> {authorizationRef || "Sin dato"}</p>
                  <p><span className="text-muted-foreground">Fecha:</span> {surgery.fechaAutorizacion ? formatDate(surgery.fechaAutorizacion) : "Sin dato"}</p>
                  <p><span className="text-muted-foreground">Usuario:</span> {surgery.usuarioAutorizacion || "Sin dato"}</p>
                </div>
              </div>
              <div className="rounded-sm border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Último movimiento</p>
                {latestAuthorizationEvent ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-900">
                    <p className="font-medium">{latestAuthorizationEvent.action}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(latestAuthorizationEvent.date)} · {latestAuthorizationEvent.time} · {latestAuthorizationEvent.userName}</p>
                    <p className="text-sm text-slate-700">{latestAuthorizationEvent.details}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Sin eventos de autorización en historial.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notas" className="mt-0 px-0 py-0 data-[state=inactive]:hidden">
            <div className="space-y-2">
              {latestNotes.length > 0 ? latestNotes.map((note) => (
                 <div key={note.id} className="rounded-sm border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-slate-700">{note.type}</span>
                    <span>{formatDate(note.date)} {note.time}</span>
                    <span>{note.userName}</span>
                    <Badge variant="outline" className="h-5 text-[10px]">{note.priority}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-900">{note.text}</p>
                </div>
              )) : (
                 <p className="rounded-sm border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-muted-foreground">Sin notas registradas para esta cirugía.</p>
               )}
             </div>
           </TabsContent>

          <TabsContent value="novedades" className="mt-0 px-0 py-0 data-[state=inactive]:hidden">
            <div className="space-y-2">
              {latestHistory.length > 0 ? latestHistory.map((entry) => (
                 <div key={entry.id} className="flex gap-3 rounded-sm border border-slate-200 bg-white px-3 py-2">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-slate-800">{entry.action}</span>
                      <span>{formatDate(entry.date)} {entry.time}</span>
                      <span>{entry.userName}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-900">{entry.details}</p>
                  </div>
                </div>
              )) : (
                 <p className="rounded-sm border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-muted-foreground">Sin novedades registradas.</p>
               )}
             </div>
           </TabsContent>

           <TabsContent value="proximo" className="mt-0 px-0 py-0 data-[state=inactive]:hidden">
             <div className={cn("rounded-sm border px-4 py-4", getNextStepToneClasses(nextStep.tone))}>
               <div className="flex items-start gap-3">
                 <div className="rounded-sm bg-white/80 p-2">
                   <ArrowRight className="size-4 text-slate-700" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Acción sugerida</p>
                   <p className="mt-1 text-base font-semibold text-slate-950">{nextStep.label}</p>
                   <p className="mt-1 text-sm text-slate-700">{nextStep.detail}</p>
                   <div className="mt-3 grid gap-2 md:grid-cols-2">
                     <div className="rounded-sm border border-white/70 bg-white/80 px-3 py-2 text-xs text-slate-700">
                       <p className="font-semibold text-slate-950">Qué falta</p>
                       <p className="mt-1">{missingItems.length > 0 ? missingItems.join(" · ") : "Nada crítico pendiente."}</p>
                     </div>
                     <div className="rounded-sm border border-white/70 bg-white/80 px-3 py-2 text-xs text-slate-700">
                       <p className="font-semibold text-slate-950">Responsable</p>
                       <p className="mt-1">{coordinator}</p>
                     </div>
                   </div>
                   <div className="mt-3 flex flex-wrap gap-2">
                     <Button size="sm" onClick={() => props.onOpenExpediente(surgery.id)} className="h-8 text-xs">
                       Ir al expediente
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => props.onAddNote()} className="h-8 text-xs">
                      Registrar nota
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  )
}

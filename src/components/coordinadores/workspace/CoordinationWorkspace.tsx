"use client"

import React, { useMemo, useState } from "react"
import { Building2, CalendarDays, ClipboardPenLine, FilterX, MapPin, Search, Share2, Stethoscope, Truck, X } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/components/auth/AuthProvider"
import { canMutateSeguimientoEvents } from "@/lib/permissions/seguimiento"
import {
  deriveCoordinatorCaseAdvisory,
} from "@/lib/cx-operations-derived"
import {
  getCoordinatorCardMetadata,
  hasScheduledDate,
  parseDateSafe,
} from "@/components/coordinadores/coordinator-queue.helpers"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"
import type { ResolvedCoordinatorCase, MetricKey, AdvancedFilters, FilterIdentity, CoordinationBaseSnapshot } from "@/components/coordinadores/coordination-filtering"
import { CaseDetail } from "./CaseDetail"

const SEGMENTS: ReadonlyArray<{ key: MetricKey; label: string }> = [
  { key: "put-date", label: "Poner fecha" },
  { key: "overdue", label: "Fuera de plazo" },
  { key: "coordinated", label: "Coordinadas" },
  { key: "in-transit", label: "En tránsito" },
]

type Handlers = {
  onManage: (entry: CoordinatorCase, initialView: "gestion" | "seguimiento", focus?: "urgency") => void
  onUrgent: (entry: CoordinatorCase) => void
  onShare: (entry: CoordinatorCase) => void
  onOpenLogistics: (surgeryId: string) => void
  onOpenExpediente: (surgeryId: string) => void
}

type Props = {
  subjectLabel: string
  snapshot: CoordinationBaseSnapshot | null
  visibleCases: readonly ResolvedCoordinatorCase[]
  selectedMetrics: ReadonlySet<MetricKey>
  onToggleMetric: (m: MetricKey) => void
  appliedAdvanced: AdvancedFilters
  onApplyAdvanced: (f: AdvancedFilters) => void
  onClearAdvanced: () => void
  institutionOptions: readonly FilterIdentity[]
  clientOptions: readonly FilterIdentity[]
  stateOptions: readonly string[]
  globalLink?: React.ReactNode
  handlers: Handlers
}

function situationTone(situation: string): "danger" | "warning" | "success" | "neutral" {
  if (situation === "Fuera de plazo" || situation === "Hay un problema") return "danger"
  if (situation === "Falta información" || situation === "Necesita definición") return "warning"
  if (situation === "Avanzando normalmente") return "success"
  return "neutral"
}

function surgeryStateClass(state: string): string {
  if (state === "En tránsito") return "bg-violet-50 text-violet-700 border-violet-200"
  if (state === "Autorizada") return "bg-sky-50 text-sky-700 border-sky-200"
  if (["Realizada", "Finalizada"].includes(state)) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (["Suspendida", "Cancelada"].includes(state)) return "bg-red-50 text-red-700 border-red-200"
  return "bg-slate-50 text-slate-600 border-slate-200"
}

function buildEntryIso(entry: { date: string; time?: string }): string | undefined {
  if (!entry.date?.trim()) return undefined
  return entry.date.includes("T") ? entry.date : `${entry.date}T${entry.time || "00:00"}`
}

function formatRelative(iso: string | undefined): string {
  const parsed = parseDateSafe(iso)
  if (!parsed) return ""
  const diffMs = Date.now() - parsed.getTime()
  if (diffMs < 0) return "próximamente"
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "recién"
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  return formatDate(iso!.split("T")[0])
}

// ── Segments (pills compactos, no KPI cards) ──

function CoordinationSegments({
  counts,
  selected,
  onToggle,
}: {
  counts: Record<MetricKey, number>
  selected: ReadonlySet<MetricKey>
  onToggle: (m: MetricKey) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1.5 sm:overflow-x-auto" role="group" aria-label="Segmentos de coordinación">
      {SEGMENTS.map((seg) => {
        const pressed = selected.has(seg.key)
        const count = counts[seg.key] ?? 0
        return (
          <button
            key={seg.key}
            type="button"
            aria-pressed={pressed}
            aria-label={`${seg.label}, ${count} ${count === 1 ? "caso" : "casos"}`}
            onClick={() => onToggle(seg.key)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center justify-between gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition-colors sm:h-8 sm:min-h-0 sm:justify-start sm:rounded-full",
              pressed ? "op-seg-active" : "op-seg-idle",
              seg.key === "overdue" && !pressed && count > 0 && "text-[var(--op-danger)]",
            )}
          >
            <span>{seg.label}</span>
            <strong className="tabular-nums">{count}</strong>
          </button>
        )
      })}
    </div>
  )
}

// ── Date strip (mobile) ──

function buildDayList(cases: readonly CoordinatorCase[]): string[] {
  const set = new Set<string>()
  const today = new Date()
  for (let index = 0; index < 7; index += 1) {
    const day = new Date(today)
    day.setDate(today.getDate() + index)
    set.add(day.toISOString().slice(0, 10))
  }
  for (const entry of cases) {
    if (!hasScheduledDate(entry.surgery)) continue
    const day = entry.surgery.date.split("T")[0].split(" ")[0]
    if (day) set.add(day)
  }
  return [...set].sort((a, b) => (a < b ? -1 : 1))
}

const DOW_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]

function CoordinationDateStrip({
  days,
  selectedDay,
  onSelect,
}: {
  days: string[]
  selectedDay: string | null
  onSelect: (day: string | null) => void
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto px-1 py-1" role="group" aria-label="Filtrar por día">
      <button
        type="button"
        aria-pressed={selectedDay === null}
        onClick={() => onSelect(null)}
        className={cn(
          "inline-flex h-11 shrink-0 flex-col items-center justify-center rounded-xl border px-3 text-[10px] font-medium",
          selectedDay === null ? "op-seg-active" : "op-seg-idle",
        )}
      >
        <span>Todos</span>
      </button>
      {days.map((day) => {
        const date = new Date(`${day}T00:00:00`)
        if (Number.isNaN(date.getTime())) return null
        const pressed = selectedDay === day
        const dow = DOW_LABELS[date.getDay()]
        const dom = String(date.getDate()).padStart(2, "0")
        return (
          <button
            key={day}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(pressed ? null : day)}
            className={cn(
              "inline-flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-[10px] font-medium",
              pressed ? "op-seg-active" : "op-seg-idle",
            )}
          >
            <span className="opacity-70">{dow}</span>
            <strong className="text-[13px] tabular-nums">{dom}</strong>
          </button>
        )
      })}
    </div>
  )
}

// ── Advanced filters trigger (compact) ──

function AdvancedFiltersTrigger({
  applied,
  institutionOptions,
  clientOptions,
  stateOptions,
  onApply,
  onClearAdvanced,
  cxSuggestions,
}: {
  applied: AdvancedFilters
  institutionOptions: readonly FilterIdentity[]
  clientOptions: readonly FilterIdentity[]
  stateOptions: readonly string[]
  onApply: (f: AdvancedFilters) => void
  onClearAdvanced: () => void
  cxSuggestions: readonly string[]
}) {
  const cloneApplied = (src: AdvancedFilters): AdvancedFilters => ({ ...src, surgeryDate: { ...src.surgeryDate }, availabilityDate: { ...src.availabilityDate } })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AdvancedFilters>(() => cloneApplied(applied))
  const controlClass = "op-input min-h-10 w-full px-3 text-[13px]"
  const activeCount = [Boolean(applied.cx), Boolean(applied.surgeryDate.from || applied.surgeryDate.to), Boolean(applied.institution), Boolean(applied.client), Boolean(applied.availabilityDate.from || applied.availabilityDate.to), Boolean(applied.cxState)].filter(Boolean).length

  const openDialog = () => {
    setDraft(cloneApplied(applied))
    setOpen(true)
  }

  const activeChips = [
    applied.cx ? { key: "cx", label: `CX: ${applied.cx}` } : null,
    applied.surgeryDate.from || applied.surgeryDate.to ? { key: "surgeryDate", label: `CX: ${applied.surgeryDate.from || "…"} → ${applied.surgeryDate.to || "…"}` } : null,
    applied.availabilityDate.from || applied.availabilityDate.to ? { key: "availabilityDate", label: `Disponibilidad: ${applied.availabilityDate.from || "…"} → ${applied.availabilityDate.to || "…"}` } : null,
    applied.institution ? { key: "institution", label: `Institución: ${applied.institution.label}` } : null,
    applied.client ? { key: "client", label: `Cliente: ${applied.client.label}` } : null,
    applied.cxState ? { key: "cxState", label: `Estado: ${applied.cxState}` } : null,
  ].filter((chip): chip is { key: string; label: string } => Boolean(chip))

  const removeChip = (key: string) => {
    const next = { ...applied, surgeryDate: { ...applied.surgeryDate }, availabilityDate: { ...applied.availabilityDate } }
    if (key === "cx") next.cx = ""
    if (key === "surgeryDate") next.surgeryDate = { from: "", to: "" }
    if (key === "availabilityDate") next.availabilityDate = { from: "", to: "" }
    if (key === "institution") next.institution = null
    if (key === "client") next.client = null
    if (key === "cxState") next.cxState = ""
    onApply(next)
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="op-btn-ghost inline-flex h-9 items-center gap-1.5 px-3 text-xs"
        aria-label={activeCount ? `Más filtros, ${activeCount} activos` : "Más filtros"}
       >
         Filtros{activeCount ? ` · ${activeCount}` : ""}
       </button>
       {activeChips.length ? <div className="flex min-w-0 flex-wrap gap-1.5" aria-label="Filtros activos">
         {activeChips.map((chip) => <span key={chip.key} className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--op-primary)]/25 bg-[var(--op-primary)]/8 px-2 py-1 text-[10px] font-medium text-[var(--op-primary)]"><span className="truncate">{chip.label}</span><button type="button" className="rounded-full p-0.5 hover:bg-[var(--op-primary)]/15" onClick={() => removeChip(chip.key)} aria-label={`Quitar ${chip.label}`}><X className="size-3" /></button></span>)}
       </div> : null}
       {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal="true" aria-label="Más filtros" onClick={() => setOpen(false)}>
          <div className="op-card flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-start justify-between gap-3 border-b border-[var(--op-border-subtle)] px-4 py-3">
               <div><h3 className="op-text-primary text-sm font-semibold">Más filtros</h3><p className="op-text-muted mt-0.5 text-[11px]">Combiná criterios para encontrar casos concretos.</p></div>
               <button type="button" className="op-btn-ghost h-8 px-2 text-xs" onClick={() => setOpen(false)}>Cerrar</button>
             </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <label className="block space-y-1 text-[12px]">
                <span className="op-text-secondary">CX</span>
                 <input list="coordination-cx-suggestions" className={controlClass} value={draft.cx} placeholder="Ej.: CX-0009 o paciente" onChange={(e) => setDraft((d) => ({ ...d, cx: e.target.value }))} />
                 <datalist id="coordination-cx-suggestions">{cxSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
                 <span className="op-text-muted block text-[10px]">Sugerencias: código visible o nombre del paciente.</span>
              </label>
               <fieldset className="space-y-1.5">
                 <legend className="op-text-secondary text-[12px] font-semibold">Fecha de cirugía</legend>
                <div className="grid grid-cols-2 gap-2">
                   <label className="space-y-1 text-[12px]"><span className="op-text-muted">Desde</span><input type="date" className={controlClass} value={draft.surgeryDate.from} aria-label="Fecha de cirugía desde" onChange={(e) => setDraft((d) => ({ ...d, surgeryDate: { ...d.surgeryDate, from: e.target.value } }))} /><span className="op-text-muted block text-[10px]">Inicio del período</span></label>
                   <label className="space-y-1 text-[12px]"><span className="op-text-muted">Hasta</span><input type="date" className={controlClass} value={draft.surgeryDate.to} aria-label="Fecha de cirugía hasta" onChange={(e) => setDraft((d) => ({ ...d, surgeryDate: { ...d.surgeryDate, to: e.target.value } }))} /><span className="op-text-muted block text-[10px]">Fin del período</span></label>
                </div>
               </fieldset>
               <fieldset className="space-y-1.5">
                 <legend className="op-text-secondary text-[12px] font-semibold">Disponibilidad del material</legend>
                 <div className="grid grid-cols-2 gap-2">
                   <label className="space-y-1 text-[12px]"><span className="op-text-muted">Desde</span><input type="date" className={controlClass} value={draft.availabilityDate.from} aria-label="Disponibilidad desde" onChange={(e) => setDraft((d) => ({ ...d, availabilityDate: { ...d.availabilityDate, from: e.target.value } }))} /><span className="op-text-muted block text-[10px]">Material disponible desde</span></label>
                   <label className="space-y-1 text-[12px]"><span className="op-text-muted">Hasta</span><input type="date" className={controlClass} value={draft.availabilityDate.to} aria-label="Disponibilidad hasta" onChange={(e) => setDraft((d) => ({ ...d, availabilityDate: { ...d.availabilityDate, to: e.target.value } }))} /><span className="op-text-muted block text-[10px]">Material disponible hasta</span></label>
                 </div>
               </fieldset>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[12px]"><span className="op-text-secondary">Institución</span>
                  <select className={controlClass} value={draft.institution ? `${draft.institution.kind}:${draft.institution.value}` : ""} onChange={(e) => { const opt = institutionOptions.find((o) => `${o.kind}:${o.value}` === e.target.value) ?? null; setDraft((d) => ({ ...d, institution: opt })) }}>
                    <option value="">Todas</option>
                    {institutionOptions.map((o) => <option key={`${o.kind}:${o.value}`} value={`${o.kind}:${o.value}`}>{o.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-[12px]"><span className="op-text-secondary">Cliente</span>
                  <select className={controlClass} value={draft.client ? `${draft.client.kind}:${draft.client.value}` : ""} onChange={(e) => { const opt = clientOptions.find((o) => `${o.kind}:${o.value}` === e.target.value) ?? null; setDraft((d) => ({ ...d, client: opt })) }}>
                    <option value="">Todos</option>
                    {clientOptions.map((o) => <option key={`${o.kind}:${o.value}`} value={`${o.kind}:${o.value}`}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block space-y-1 text-[12px]"><span className="op-text-secondary">Estado</span>
                <select className={controlClass} value={draft.cxState} onChange={(e) => setDraft((d) => ({ ...d, cxState: e.target.value }))}>
                  <option value="">Todos</option>
                  {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--op-border-subtle)] px-4 py-3">
              <button type="button" className="op-btn-ghost h-9 px-3 text-xs" onClick={() => { onClearAdvanced(); setOpen(false) }}>Limpiar</button>
              <button type="button" className="op-btn-primary h-9 px-3 text-xs" onClick={() => { onApply(draft); setOpen(false) }}>Aplicar</button>
             </div>
           </div>
         </div>
      ) : null}
    </>
  )
}

// ── Surgery list card (compact, data-aware) ──

function SurgeryListCard({
  entry,
  selected,
  onSelect,
  onQuickTracking,
  onManage,
  onShare,
  canMutate,
}: {
  entry: ResolvedCoordinatorCase
  selected: boolean
  onSelect: () => void
  onQuickTracking: () => void
  onManage: () => void
  onShare: () => void
  canMutate: boolean
}) {
  const surgery = entry.surgery
  const advisory = deriveCoordinatorCaseAdvisory(entry)
  const sitTone = situationTone(advisory.situation)
  const caseRef = surgery.visibleNumber?.trim() || `CX ${surgery.id}`
  const metadata = getCoordinatorCardMetadata(surgery)
  const latestHistory = entry.history[entry.history.length - 1]
  const latestIso = latestHistory ? buildEntryIso(latestHistory) : undefined

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect() } }}
      aria-pressed={selected}
      aria-label={`Abrir caso ${caseRef} de ${surgery.patient}`}
      className={cn(
        "mx-3 my-2 block w-[calc(100%-1.5rem)] cursor-pointer rounded-2xl border bg-[var(--op-surface)] p-3 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-primary-highlight)]",
        selected ? "border-[var(--op-primary)] ring-2 ring-[var(--op-primary)]/15" : "border-[var(--op-border-default)] hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <p className="op-text-primary truncate text-[13px] font-semibold">{surgery.patient}</p>
          <span className="op-text-muted shrink-0 text-[11px] tabular-nums">{caseRef}</span>
        </div>
        {hasScheduledDate(surgery) ? (
          <time className="op-text-muted shrink-0 text-[11px] tabular-nums">
            {formatDate(surgery.date)}{surgery.time ? ` · ${surgery.time}` : ""}
          </time>
        ) : (
          <span className="op-text-muted shrink-0 text-[11px]">Sin fecha</span>
        )}
      </div>
      {(surgery.surgeon || surgery.institution) && (
        <p className="op-text-muted mt-0.5 truncate text-[11px]">
          {[surgery.surgeon && `Dr. ${surgery.surgeon}`, surgery.institution].filter(Boolean).join(" · ")}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-y border-[var(--op-border-subtle)] py-2 sm:grid-cols-4">
        {[
          [CalendarDays, "Fecha probable", metadata.date],
          [Stethoscope, "Médico", metadata.doctor],
          [MapPin, "Lugar", metadata.place],
          [Building2, "Cliente", metadata.client],
        ].map(([Icon, label, value]) => <div key={label as string} className="min-w-0"><dt className="op-text-muted flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide"><Icon className="size-3" aria-hidden="true" />{label as string}</dt><dd className="op-text-primary mt-0.5 truncate text-[11px] font-medium" title={value as string}>{value as string}</dd></div>)}
      </dl>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium", `op-sit-${sitTone === "success" ? "success" : sitTone}`)}>
          <span className={cn("size-1.5 rounded-full", `op-dot-${sitTone === "neutral" ? "muted" : sitTone}`)} aria-hidden="true" />
          {advisory.situation}
        </span>
        <span className="rounded-full bg-[var(--op-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--op-primary)]">Resolver</span>
        {surgery.urgente ? <span className="op-sit-danger rounded-md px-1.5 py-0.5 text-[10px] font-semibold">Urgente</span> : null}
      </div>
      <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold", surgeryStateClass(surgery.state))}>{surgery.state} · {surgery.preparationState}</span>
      {latestHistory ? <p className="op-text-muted mt-2 text-[10px]">Última actividad · {formatRelative(latestIso)}</p> : null}
      <div className="mt-3 flex items-center justify-end gap-1 border-t border-[var(--op-border-subtle)] pt-2" onClick={(e) => e.stopPropagation()}>
        {canMutate ? <button type="button" title="Nueva novedad" aria-label="Novedad" className="op-btn-ghost inline-flex min-h-10 items-center gap-1.5 px-2.5 text-[11px]" onClick={onQuickTracking}><ClipboardPenLine className="size-3.5" />Novedad</button> : null}
        <button type="button" title="Compartir caso" aria-label="Compartir caso" className="op-btn-ghost inline-flex min-h-10 items-center gap-1.5 px-2.5 text-[11px]" onClick={onShare}><Share2 className="size-3.5" />Compartir</button>
        {canMutate ? <button type="button" title="Gestionar caso" aria-label="Gestionar caso" className="op-btn-primary inline-flex min-h-10 items-center gap-1.5 px-3 text-[11px]" onClick={onManage}><Truck className="size-3.5" />Gestionar</button> : null}
      </div>
    </div>
  )
}

// ── Empty states ──

function EmptyList({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="op-text-secondary text-[13px] font-medium">
        {hasFilters ? "No encontramos casos con estos filtros." : "No hay cirugías en este segmento."}
      </p>
      {hasFilters ? (
        <button type="button" className="op-btn-ghost h-8 px-3 text-xs" onClick={onClear}>Limpiar filtros</button>
      ) : null}
    </div>
  )
}

function CaseListPagination({ shown, total, onLoadMore }: { shown: number; total: number; onLoadMore: () => void }) {
  return (
    <footer className="border-t border-[var(--op-border-subtle)] px-3 py-3 text-center">
      <p className="op-text-muted text-[10px]">Mostrando {shown} de {total} cirugías</p>
      {shown < total ? (
        <button type="button" onClick={onLoadMore} className="op-btn-ghost mt-2 px-3 py-1.5 text-[11px]">
          Cargar más cirugías
        </button>
      ) : null}
    </footer>
  )
}

function EmptyDetail() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="op-text-secondary text-[13px] font-medium">Seleccioná un caso para ver el detalle.</p>
      <p className="op-text-muted text-[11px]">El listado se mantiene mientras navegás entre cirugías.</p>
    </div>
  )
}

// ── Workspace orquestador ──

export function CoordinationWorkspace({
  subjectLabel,
  snapshot,
  visibleCases,
  selectedMetrics,
  onToggleMetric,
  appliedAdvanced,
  onApplyAdvanced,
  onClearAdvanced,
  institutionOptions,
  clientOptions,
  stateOptions,
  globalLink,
  handlers,
}: Props) {
  const isMobile = useIsMobile()
  const { currentAccess } = useAuth()
  const canMutate = canMutateSeguimientoEvents(currentAccess?.role)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [caseLimit, setCaseLimit] = useState(25)

  // Días con cirugías (para date strip) — derivados del snapshot pre-filtro para no vaciarse al seleccionar
  const dayList = useMemo(() => (snapshot ? buildDayList(snapshot.cases) : []), [snapshot])
  // Día seleccionado derivado del filtro avanzado de fecha (from === to === día) — sin state extra
  const selectedDay = appliedAdvanced.surgeryDate.from && appliedAdvanced.surgeryDate.from === appliedAdvanced.surgeryDate.to
    ? appliedAdvanced.surgeryDate.from
    : null
  const selectDay = (day: string | null) => {
    onApplyAdvanced({ ...appliedAdvanced, surgeryDate: day ? { from: day, to: day } : { from: "", to: "" } })
  }

  // Filtrado local por búsqueda textual (post-pipeline)
  const listCases = useMemo(() => {
    if (!search.trim()) return visibleCases
    const q = search.toLowerCase()
    return visibleCases.filter((entry) => {
      const s = entry.surgery
      return (
        s.patient.toLowerCase().includes(q) ||
        s.surgeon.toLowerCase().includes(q) ||
        s.institution.toLowerCase().includes(q) ||
        (s.visibleNumber ?? "").toLowerCase().includes(q)
      )
    })
  }, [visibleCases, search])

  const paginatedCases = useMemo(() => listCases.slice(0, caseLimit), [caseLimit, listCases])

  const selectedEntry = useMemo(() => {
    const id = isMobile ? mobileDetailId : selectedId
    if (!id) return null
    return listCases.find((e) => e.surgery.id === id) ?? visibleCases.find((e) => e.surgery.id === id) ?? null
  }, [isMobile, mobileDetailId, selectedId, listCases, visibleCases])

  const counts = snapshot?.counts ?? { "put-date": 0, overdue: 0, coordinated: 0, "in-transit": 0 }
  const hasFilters = selectedMetrics.size > 0 || Boolean(appliedAdvanced.cx || appliedAdvanced.surgeryDate.from || appliedAdvanced.surgeryDate.to || appliedAdvanced.institution || appliedAdvanced.client || appliedAdvanced.availabilityDate.from || appliedAdvanced.availabilityDate.to || appliedAdvanced.cxState) || Boolean(search.trim())

  const clearAll = () => {
    setSearch("")
    selectDay(null)
    onClearAdvanced()
  }

  const openCase = (entry: CoordinatorCase) => {
    if (isMobile) setMobileDetailId(entry.surgery.id)
    else setSelectedId(entry.surgery.id)
  }

  const buildActions = (entry: CoordinatorCase) => ({
    onManage: () => handlers.onManage(entry, "gestion"),
    onTracking: () => handlers.onManage(entry, "seguimiento"),
    onUrgent: () => handlers.onUrgent(entry),
    onOpenLogistics: () => handlers.onOpenLogistics(entry.surgery.id),
    onShare: () => handlers.onShare(entry),
  })

  return (
    <div className="ossum-coordination flex min-h-0 flex-1 flex-col">
      {/* Header compacto */}
      <header className="shrink-0 border-b border-[var(--op-border-default)] bg-[var(--op-surface)] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="op-text-primary text-[19px] font-semibold tracking-tight">Mi coordinación</h1>
              <span className="rounded-full bg-[var(--op-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">Resolver</span>
            </div>
            <p className="op-text-muted mt-0.5 truncate text-[11px]">{subjectLabel} · {snapshot?.cases.length ?? 0} casos activos</p>
          </div>
          {globalLink ? <div className="shrink-0">{globalLink}</div> : null}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="op-text-muted pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar CX, paciente, médico o institución…"
              aria-label="Buscar casos"
              className="op-input h-9 w-full pl-8 pr-3 text-[13px]"
            />
          </div>
          <AdvancedFiltersTrigger
            applied={appliedAdvanced}
            institutionOptions={institutionOptions}
            clientOptions={clientOptions}
            stateOptions={stateOptions}
            cxSuggestions={snapshot?.cases.map((entry) => entry.surgery.visibleNumber?.trim() || entry.surgery.patient) ?? []}
            onApply={onApplyAdvanced}
            onClearAdvanced={onClearAdvanced}
          />
          {hasFilters ? (
            <button type="button" className="op-btn-ghost inline-flex h-9 items-center gap-1 px-2 text-xs" onClick={clearAll} aria-label="Limpiar filtros">
              <FilterX className="size-3.5" /> Limpiar
            </button>
          ) : null}
        </div>

        <CoordinationDateStrip days={dayList} selectedDay={selectedDay} onSelect={selectDay} />

        <div className="mt-2.5">
          <CoordinationSegments counts={counts} selected={selectedMetrics} onToggle={onToggleMetric} />
        </div>
      </header>

      {/* Body: master/detail o feed mobile */}
      {isMobile ? (
        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto">
             {listCases.length === 0 ? (
               <EmptyList hasFilters={hasFilters} onClear={clearAll} />
             ) : (
               <>
               <ul className="divide-y divide-[var(--op-border-subtle)]">
                 {paginatedCases.map((entry) => (
                  <li key={entry.surgery.id}>
                    <SurgeryListCard
                      entry={entry}
                      selected={false}
                      onSelect={() => openCase(entry)}
                       onQuickTracking={() => handlers.onManage(entry, "seguimiento")}
                       onManage={() => handlers.onManage(entry, "gestion")}
                       onShare={() => handlers.onShare(entry)}
                      canMutate={canMutate}
                    />
                  </li>
                 ))}
               </ul>
               <CaseListPagination shown={paginatedCases.length} total={listCases.length} onLoadMore={() => setCaseLimit((current) => current + 25)} />
               </>
             )}
          </div>

          {/* Detail full-screen overlay — el listado no se desmonta, preserva scroll/filtros */}
          {mobileDetailId && selectedEntry ? (
            <div className="fixed inset-0 z-50 flex flex-col bg-[var(--op-app)]" role="dialog" aria-modal="true" aria-label={`Detalle del caso ${selectedEntry.surgery.visibleNumber ?? selectedEntry.surgery.id}`}>
              <CaseDetail
                entry={selectedEntry}
                canMutate={canMutate}
                actions={buildActions(selectedEntry)}
                onBack={() => setMobileDetailId(null)}
                compact
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 bg-[var(--op-app)] p-3 md:grid-cols-[42%_58%] lg:grid-cols-[40%_60%]">
          {/* Listado con scroll independiente */}
          <div className="min-h-0 overflow-y-auto rounded-2xl border border-[var(--op-border-default)] bg-[var(--op-surface)]">
             {listCases.length === 0 ? (
               <EmptyList hasFilters={hasFilters} onClear={clearAll} />
             ) : (
               <>
               <ul>
                 {paginatedCases.map((entry) => (
                  <li key={entry.surgery.id}>
                    <SurgeryListCard
                      entry={entry}
                      selected={(selectedId ?? undefined) === entry.surgery.id}
                      onSelect={() => setSelectedId(entry.surgery.id)}
                       onQuickTracking={() => handlers.onManage(entry, "seguimiento")}
                       onManage={() => handlers.onManage(entry, "gestion")}
                       onShare={() => handlers.onShare(entry)}
                      canMutate={canMutate}
                    />
                  </li>
                 ))}
               </ul>
               <CaseListPagination shown={paginatedCases.length} total={listCases.length} onLoadMore={() => setCaseLimit((current) => current + 25)} />
               </>
             )}
          </div>

          {/* Detail persistente */}
          <div className="min-h-0 overflow-hidden rounded-2xl border border-[var(--op-border-default)] bg-[var(--op-surface)] shadow-sm">
            {selectedEntry ? (
              <CaseDetail
                entry={selectedEntry}
                canMutate={canMutate}
                actions={buildActions(selectedEntry)}
              />
            ) : (
              <EmptyDetail />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import React, { useMemo, useRef, useState } from "react"
import { CalendarClock, ChevronDown, ChevronLeft, ChevronUp, Clipboard, ClipboardCheck, FileText, Image as ImageIcon, Mic, MoreHorizontal, Paperclip, Share2, Tag, Truck } from "lucide-react"
import {
  canMutateSeguimientoEvents,
} from "@/lib/permissions/seguimiento"
import { useAuth } from "@/components/auth/AuthProvider"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import {
  deriveCoordinatorCaseAdvisory,
} from "@/lib/cx-operations-derived"
import {
  getCoordinatorLabel,
  hasScheduledDate,
  parseDateSafe,
} from "@/components/coordinadores/coordinator-queue.helpers"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"

type SitTone = "danger" | "warning" | "success" | "info" | "neutral"

function situationTone(situation: string): SitTone {
  if (situation === "Fuera de plazo" || situation === "Hay un problema") return "danger"
  if (situation === "Falta información" || situation === "Necesita definición") return "warning"
  if (situation === "Avanzando normalmente") return "success"
  return "neutral"
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

function buildEntryIso(entry: { date: string; time?: string }): string | undefined {
  if (!entry.date?.trim()) return undefined
  const normalized = entry.date.includes("T") ? entry.date : `${entry.date}T${entry.time || "00:00"}`
  return normalized
}

// ── Seguimiento feed (activity timeline) ──

type FeedEntry = {
  id: string
  createdAt: string
  authorName: string
  summary?: string
  content: string
  entryType: string
  noteType?: string
  notePriority?: "alta" | "media" | "baja" | null
  isHighlighted?: boolean
  photoMeta?: { files: Array<{ name?: string; mimeType?: string; previewDataUrl?: string }> } | null
  imageEvidenceMeta?: { files: Array<{ name?: string; mimeType?: string; previewDataUrl?: string }> } | null
  documentMeta?: { fileName: string; mimeType?: string; sizeBytes?: number } | null
  mailMeta?: { subject?: string; attachmentCount?: number } | null
}

function groupByDay(entries: FeedEntry[]): Array<{ dayKey: string; label: string; items: FeedEntry[] }> {
  const groups = new Map<string, FeedEntry[]>()
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yKey = yesterday.toISOString().slice(0, 10)

  for (const entry of entries) {
    const date = new Date(entry.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const key = date.toISOString().slice(0, 10)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, items]) => ({
      dayKey: key,
      label: key === todayKey ? "Hoy" : key === yKey ? "Ayer" : formatDate(key),
      items: items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }))
}

function FollowUpFeed({ surgeryId }: { surgeryId: string }) {
  const { entries, loading, loadingMore, error, total, canLoadMore, loadMore } = useSeguimientoFeed(surgeryId)
  const feedEntries: FeedEntry[] = useMemo(
    () => entries.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      authorName: e.authorName,
      summary: e.summary ?? undefined,
      content: e.content,
      entryType: e.entryType,
      noteType: e.noteType ?? undefined,
      notePriority: e.notePriority,
      isHighlighted: e.isHighlighted,
      photoMeta: e.photoMeta,
      imageEvidenceMeta: e.imageEvidenceMeta,
      documentMeta: e.documentMeta,
      mailMeta: e.mailMeta,
    })),
    [entries],
  )
  const groups = useMemo(() => groupByDay(feedEntries), [feedEntries])

  if (loading) {
    return <p className="op-text-muted px-3 py-6 text-xs">Cargando seguimiento…</p>
  }
  if (error) {
    return <p className="px-3 py-6 text-xs text-[var(--op-danger)]">No pudimos cargar el seguimiento.</p>
  }
  if (groups.length === 0) {
    return (
      <p className="op-text-muted px-3 py-6 text-xs">
        Todavía no hay novedades registradas.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.dayKey} aria-label={group.label}>
          <h3 className="op-text-muted px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
            {group.label}
          </h3>
          <ol className="space-y-0.5">
            {group.items.map((entry) => {
              const time = new Date(entry.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", hour12: false, minute: "2-digit" }).replace("24:", "00:")
              const isUrgent = entry.noteType === "urgente"
              const dotTone = isUrgent ? "op-dot-danger" : entry.entryType === "authorization_evidence" ? "op-dot-success" : entry.entryType === "mail_evidence" ? "op-dot-warning" : "op-dot-muted"
              return (
                <li key={entry.id} className="relative pl-5">
                  <span className={cn("absolute left-1 top-3 size-1.5 rounded-full", dotTone)} aria-hidden="true" />
                  <span className="absolute left-[5px] top-5 bottom-0 w-px bg-[var(--op-border-subtle)]" aria-hidden="true" />
                  <div className={cn("rounded-lg px-2.5 py-2", entry.isHighlighted && "bg-[var(--op-surface-2)]", isUrgent && "border border-[var(--op-danger-border)] bg-[var(--op-danger-bg)]")}>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="op-text-primary min-w-0 truncate text-[12px] font-semibold">{entry.summary || entry.authorName}</p>
                      <time className="op-text-muted shrink-0 text-[10px] tabular-nums">{time}</time>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="op-text-muted text-[10px]">{entry.authorName}</span>
                      {entry.notePriority ? <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", entry.notePriority === "alta" ? "bg-red-100 text-red-800" : entry.notePriority === "media" ? "bg-amber-100 text-amber-800" : "border border-[var(--op-border-default)] bg-[var(--op-surface-2)] text-[var(--op-text-primary)]")}>{entry.notePriority === "alta" ? "Alta" : entry.notePriority === "media" ? "Media" : "Baja"}</span> : null}
                      {entry.noteType && entry.noteType !== "coordinacion" ? <span className="rounded-full bg-[var(--op-surface-2)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--op-text-secondary)]">{entry.noteType}</span> : null}
                      {entry.isHighlighted ? <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-800">Fijada</span> : null}
                    </div>
                    {entry.content ? <p className="op-text-secondary mt-1 whitespace-pre-wrap text-[12px] leading-5">{entry.content}</p> : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      <div className="border-t border-[var(--op-border-subtle)] px-3 pt-3 text-center">
        <p className="op-text-muted text-[10px]">Mostrando {entries.length} de {total} novedades</p>
        {canLoadMore ? (
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="op-btn-ghost mt-2 px-3 py-1.5 text-[11px]">
            {loadingMore ? "Cargando…" : "Cargar más novedades"}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ── Composer compacto ──

function FollowUpComposer({ surgeryId }: { surgeryId: string }) {
  const { addNote, addDocumentEvidence, addingNote, addingDocumentEvidence } = useSeguimientoFeed(surgeryId)
  const [text, setText] = useState("")
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media")
  const [noteType, setNoteType] = useState<"coordinacion" | "logistica" | "facturacion" | "general">("coordinacion")
  const [classifying, setClassifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canMutate = canMutateSeguimientoEvents(useAuth().currentAccess?.role)

  if (!canMutate) return null

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || addingNote) return
    try {
      await addNote({ content: trimmed, noteType, priority })
      setText("")
      setError(null)
    } catch {
      setError("No se pudo publicar la novedad.")
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setError("El archivo supera el límite de 4 MB.")
      return
    }
    try {
      await addDocumentEvidence({ file, content: text })
      setText("")
      setError(null)
    } catch {
      setError("No se pudo adjuntar el archivo.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const paste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      if (clipboardText) setText((current) => current ? `${current}\n${clipboardText}` : clipboardText)
    } catch {
      setError("No se pudo leer el portapapeles.")
    }
  }

  const dictate = () => {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; start: () => void } }).SpeechRecognition
    if (!SpeechRecognition) {
      setError("El dictado no está disponible en este navegador.")
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = "es-AR"
    recognition.interimResults = false
    recognition.onresult = (event) => setText((current) => `${current}${current ? " " : ""}${event.results[0][0].transcript}`)
    recognition.onerror = () => setError("No se pudo iniciar el dictado.")
    recognition.start()
  }

  return (
    <section className="border border-[var(--op-border-default)] bg-[var(--op-surface)]" aria-label="Nueva novedad">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--op-border-subtle)] bg-[var(--op-surface-2)] px-3 py-2">
        <div>
          <h3 className="op-text-primary text-[13px] font-semibold">Nueva novedad</h3>
          <p className="op-text-muted text-[10px]">Actualización breve para el equipo.</p>
        </div>
        <span className="op-text-muted text-[10px]">Ctrl + Enter para publicar</span>
      </div>
      <div className="px-3 py-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void submit()
            }
          }}
          placeholder="¿Qué cambió o qué necesita saber el equipo?"
          rows={2}
          aria-label="Nueva novedad"
          className="op-input min-h-16 w-full resize-none border-0 bg-transparent px-0 py-1 text-[13px] shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--op-border-subtle)] px-3 py-2">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <button type="button" className="op-btn-ghost inline-flex h-8 items-center gap-1.5 px-2 text-[11px]" onClick={() => fileInputRef.current?.click()} disabled={addingDocumentEvidence}><Paperclip className="size-3.5" /> {addingDocumentEvidence ? "Adjuntando…" : "Adjuntar"}</button>
        <button type="button" className="op-btn-ghost inline-flex h-8 items-center gap-1.5 px-2 text-[11px]" onClick={() => void paste()}><Clipboard className="size-3.5" /> Pegar</button>
        <button type="button" className="op-btn-ghost inline-flex h-8 items-center gap-1.5 px-2 text-[11px]" onClick={dictate}><Mic className="size-3.5" /> Dictar</button>
        <button type="button" className={cn("op-btn-ghost inline-flex h-8 items-center gap-1.5 px-2 text-[11px]", classifying && "bg-[var(--op-surface-2)]")} onClick={() => setClassifying((open) => !open)}><Tag className="size-3.5" /> Clasificar novedad</button>
        {classifying ? <div className="flex basis-full flex-wrap gap-2 pt-1"><label className="op-text-muted flex items-center gap-1 text-[10px]">Tipo<select className="op-input h-7 px-2 text-[10px]" value={noteType} onChange={(event) => setNoteType(event.target.value as typeof noteType)}><option value="coordinacion">Coordinación</option><option value="logistica">Logística</option><option value="facturacion">Facturación</option><option value="general">General</option></select></label><label className="op-text-muted flex items-center gap-1 text-[10px]">Prioridad<select className="op-input h-7 px-2 text-[10px]" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label></div> : null}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--op-border-subtle)] px-3 py-2">
        <span className="op-text-muted text-[10px]">La novedad quedará registrada en el historial.</span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!text.trim() || addingNote}
          className="op-btn-primary inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-xs disabled:opacity-40"
        >
          {addingNote ? "Publicando…" : "Publicar novedad"}
        </button>
      </div>
      {error ? <p className="px-3 pb-2 text-[10px] text-[var(--op-danger)]" role="alert">{error}</p> : null}
    </section>
  )
}

// ── Datos (key/value agrupado, data-aware) ──

function DataGroup({ title, rows }: { title: string; rows: Array<{ label: string; value?: string }> }) {
  const visible = rows.filter((r) => r.value && r.value.trim())
  if (visible.length === 0) return null
  return (
    <section className="px-3 py-3">
      <h3 className="op-text-muted pb-2 text-[10px] font-semibold uppercase tracking-[0.08em]">{title}</h3>
      <dl className="space-y-1.5">
        {visible.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="op-text-muted text-[11px]">{row.label}</dt>
            <dd className="op-text-primary text-right text-[12px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function CaseDataView({ entry }: { entry: CoordinatorCase }) {
  const { surgery } = entry
  const clientLabel = surgery.financiador || surgery.obraSocial || surgery.client
  return (
    <div className="divide-y divide-[var(--op-border-subtle)]">
      <DataGroup
        title="Cirugía"
        rows={[
          { label: "Paciente", value: surgery.patient },
          { label: "CX", value: surgery.visibleNumber?.trim() || surgery.id },
          { label: "Fecha", value: hasScheduledDate(surgery) ? `${formatDate(surgery.date)}${surgery.time ? ` · ${surgery.time}` : ""}` : "Sin fecha" },
          { label: "Clasificación", value: surgery.classification },
          { label: "Procedimiento", value: surgery.procedure },
        ]}
      />
      <DataGroup
        title="Profesionales"
        rows={[
          { label: "Médico", value: surgery.surgeon },
          { label: "Instrumentador", value: surgery.instrumentador },
          { label: "Coordinador", value: getCoordinatorLabel(surgery) },
        ]}
      />
      <DataGroup
        title="Institución"
        rows={[
          { label: "Institución", value: surgery.institution },
          { label: "Localidad", value: surgery.institutionCity || surgery.localidad },
          { label: "Cliente / Cobertura", value: clientLabel },
        ]}
      />
    </div>
  )
}

function CaseAttachmentsView({ surgeryId }: { surgeryId: string }) {
  const { entries, loading, error } = useSeguimientoFeed(surgeryId)
  const attachments = entries.flatMap((entry) => {
    const files = [...(entry.photoMeta?.files ?? []), ...(entry.imageEvidenceMeta?.files ?? [])]
    return [
      ...files.map((file, index) => ({
        key: `${entry.id}-image-${index}`,
        name: file.name || "Imagen adjunta",
        type: file.mimeType || "Imagen",
        previewDataUrl: file.previewDataUrl,
        icon: ImageIcon,
      })),
      ...(entry.documentMeta ? [{
        key: `${entry.id}-document`,
        name: entry.documentMeta.fileName,
        type: entry.documentMeta.mimeType || "Archivo",
        previewDataUrl: undefined,
        icon: FileText,
      }] : []),
      ...(entry.mailMeta?.attachmentCount ? [{
        key: `${entry.id}-mail`,
        name: entry.mailMeta.subject || "Adjuntos de correo",
        type: `${entry.mailMeta.attachmentCount} archivo${entry.mailMeta.attachmentCount === 1 ? "" : "s"} desde correo`,
        previewDataUrl: undefined,
        icon: Paperclip,
      }] : []),
    ]
  })

  if (loading) return <p className="op-text-muted px-4 py-6 text-xs">Cargando adjuntos…</p>
  if (error) return <p className="px-4 py-6 text-xs text-[var(--op-danger)]">No pudimos cargar los adjuntos.</p>
  if (attachments.length === 0) return <p className="op-text-muted px-4 py-6 text-xs">Todavía no hay imágenes ni archivos asociados a este caso.</p>

  return (
    <div className="grid gap-2 p-3 sm:grid-cols-2">
      {attachments.map((attachment) => {
        const Icon = attachment.icon
        return (
          <article key={attachment.key} className="flex min-w-0 items-center gap-3 border border-[var(--op-border-default)] bg-[var(--op-surface)] p-2.5">
            {attachment.previewDataUrl ? (
              <img src={attachment.previewDataUrl} alt="" className="size-12 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded bg-[var(--op-surface-2)] text-[var(--op-primary)]"><Icon className="size-5" aria-hidden="true" /></span>
            )}
            <div className="min-w-0">
              <p className="op-text-primary truncate text-[12px] font-medium">{attachment.name}</p>
              <p className="op-text-muted mt-0.5 truncate text-[10px]">{attachment.type}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function CaseReceiptsView({ entry, presupuestoIdentity }: { entry: CoordinatorCase; presupuestoIdentity: string | null | undefined }) {
  const { surgery } = entry
  const receipts = [
    surgery.remitoId ? { label: "Remito", value: surgery.remitoId, href: `/remitos/${surgery.remitoId}` } : null,
    surgery.facturado && surgery.facturaNumber ? { label: "Factura", value: surgery.facturaNumber } : null,
    presupuestoIdentity !== undefined ? { label: "Presupuesto", value: presupuestoIdentity ?? "No cargado" } : null,
  ].filter((receipt): receipt is { label: string; value: string; href?: string } => Boolean(receipt))

  if (receipts.length === 0) return <p className="op-text-muted px-4 py-6 text-xs">Todavía no hay comprobantes generados para este caso.</p>

  return (
    <div className="divide-y divide-[var(--op-border-subtle)]">
      {receipts.map((receipt) => (
        <div key={`${receipt.label}-${receipt.value}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="op-text-muted text-[10px] uppercase tracking-[0.08em]">{receipt.label}</p>
            <p className="op-text-primary mt-0.5 truncate text-[13px] font-medium">{receipt.value}</p>
          </div>
          {receipt.href ? <a href={receipt.href} className="op-btn-ghost shrink-0 px-2.5 py-1.5 text-[11px]">Abrir</a> : null}
        </div>
      ))}
    </div>
  )
}

// ── Acciones del caso ──

type CaseActions = {
  onManage: () => void
  onTracking: () => void
  onUrgent: () => void
  onOpenLogistics: () => void
  onShare: () => void
}

function CaseActionsBar({ entry, actions, canMutate }: { entry: CoordinatorCase; actions: CaseActions; canMutate: boolean }) {
  const [overflowOpen, setOverflowOpen] = useState(false)
  return (
    <div className="flex items-center gap-2 px-3 py-2">
       <button type="button" onClick={actions.onOpenLogistics} className="op-btn-ghost inline-flex h-9 items-center gap-1.5 px-3 text-xs">
        <Truck className="size-3.5" /> Logística
      </button>
       <button type="button" onClick={actions.onShare} className="op-btn-ghost inline-flex h-9 items-center gap-1.5 px-3 text-xs">
        <Share2 className="size-3.5" /> Compartir
       </button>
       {canMutate && entry.materialAvailabilityDefined === false ? (
         <button type="button" onClick={actions.onManage} className="op-btn-ghost inline-flex h-9 items-center gap-1.5 px-3 text-xs">
           <ClipboardCheck className="size-3.5" /> Consultar disponibilidad
         </button>
       ) : null}
      {canMutate ? (
        <button type="button" onClick={actions.onManage} className="op-btn-ghost ml-auto inline-flex h-9 items-center gap-1.5 px-3 text-xs">
          Gestionar / resolver
        </button>
      ) : null}
      <div className="relative">
        <button
          type="button"
          aria-label="Más acciones"
          aria-expanded={overflowOpen}
          onClick={() => setOverflowOpen((v) => !v)}
          className="op-btn-ghost inline-flex h-9 w-9 items-center justify-center"
        >
          <MoreHorizontal className="size-4" />
        </button>
         {overflowOpen ? (
           <div className="op-card absolute right-0 z-10 mt-1 min-w-40 overflow-hidden p-1 text-xs shadow-lg" role="menu">
             {canMutate ? (
               <button type="button" className="op-btn-ghost block w-full px-3 py-2 text-left text-xs" onClick={() => { setOverflowOpen(false); actions.onUrgent() }} role="menuitem">
                Marcar urgente
              </button>
            ) : null}
            <button type="button" className="op-btn-ghost block w-full px-3 py-2 text-left text-xs" onClick={() => { setOverflowOpen(false); actions.onShare() }} role="menuitem">
              Compartir caso
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Detail panel (desktop right / mobile full-screen) ──

type DetailTab = "seguimiento" | "datos" | "adjuntos" | "comprobantes"

export type CaseDetailProps = {
  entry: CoordinatorCase
  canMutate: boolean
  actions: CaseActions
  onBack?: () => void
  compact?: boolean
}

export function CaseDetail({ entry, canMutate, actions, onBack, compact }: CaseDetailProps) {
  const [tab, setTab] = useState<DetailTab>("seguimiento")
  const [availabilityExpanded, setAvailabilityExpanded] = useState(true)
  const { surgery } = entry
  const presupuestoAuthority = usePresupuestos({ take: 100 })
  const advisory = useMemo(() => deriveCoordinatorCaseAdvisory(entry), [entry])
  const sitTone = situationTone(advisory.situation)
  const sitClass = `op-sit-${sitTone === "success" ? "success" : sitTone}`
  const caseRef = surgery.visibleNumber?.trim() || `CX ${surgery.id}`
  const surgeryId = surgery.backendId ?? surgery.id
  const presupuestoIdentity = useMemo(() => {
    if (presupuestoAuthority.loading || presupuestoAuthority.error) return null
    const presupuesto = presupuestoAuthority.presupuestos.find((item) => item.surgeryId === surgeryId && item.slot === "CURRENT")
      ?? presupuestoAuthority.presupuestos.find((item) => item.surgeryId === surgeryId && item.slot === "DRAFT")
      ?? presupuestoAuthority.presupuestos.find((item) => item.surgeryId === surgeryId)
    if (!presupuesto) return undefined
    return presupuesto.visibleNumber == null ? "Borrador sin número" : `P-${String(presupuesto.visibleNumber).padStart(4, "0")}`
  }, [presupuestoAuthority.error, presupuestoAuthority.loading, presupuestoAuthority.presupuestos, surgeryId])
  const latestHistory = entry.history[entry.history.length - 1]
  const latestIso = latestHistory ? buildEntryIso(latestHistory) : undefined

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-[var(--op-surface)]">
      {/* Header del caso */}
      <header className={cn("shrink-0 border-b border-[var(--op-border-subtle)] px-4 py-3", compact && "px-3 py-2.5")}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al listado"
            className="op-btn-ghost mb-2 inline-flex h-8 items-center gap-1 px-2 text-xs"
          >
            <ChevronLeft className="size-4" /> Volver
          </button>
        ) : null}
        <div className="flex items-baseline justify-between gap-2">
          <p className="op-text-muted text-[11px] font-medium tabular-nums">{caseRef}</p>
          <span className="rounded-full bg-[var(--op-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">Resolver caso</span>
        </div>
        <h2 className="op-text-primary mt-1 text-[18px] font-semibold leading-tight">{surgery.patient}</h2>
        {(surgery.surgeon || surgery.institution) && (
          <p className="op-text-secondary mt-0.5 text-[12px]">
            {[surgery.surgeon && `Dr. ${surgery.surgeon}`, surgery.institution].filter(Boolean).join(" · ")}
          </p>
        )}
        {surgery.classification ? (
          <p className="op-text-muted mt-0.5 text-[11px]">{surgery.classification}</p>
        ) : null}
        {hasScheduledDate(surgery) ? (
          <p className="op-text-secondary mt-1.5 inline-flex items-center gap-1.5 text-[12px] tabular-nums">
            <CalendarClock className="size-3.5 text-[var(--op-primary-highlight)]" aria-hidden="true" />
            {formatDate(surgery.date)}{surgery.time ? ` · ${surgery.time}` : ""}
          </p>
        ) : (
          <p className="op-text-muted mt-1.5 text-[12px]">Sin fecha</p>
        )}
        {canMutate ? <div className="mt-3"><FollowUpComposer surgeryId={surgeryId} /></div> : null}
      </header>

      {/* Situación */}
       <section className={cn("mx-3 my-3 shrink-0 rounded-xl border px-4 py-3", sitClass)} aria-label="Situación actual">
         <button type="button" onClick={() => setAvailabilityExpanded((expanded) => !expanded)} className="flex w-full items-center justify-between gap-3 text-left">
           <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Situación</span>
           {availabilityExpanded ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}
         </button>
         {availabilityExpanded ? (
           <>
             <p className="mt-1 text-[14px] font-semibold leading-tight">{advisory.situation}</p>
             {advisory.missing && advisory.missing !== "Sin pendientes detectados" && advisory.missing !== "Sin intervención pendiente" ? (
               <p className="mt-0.5 text-[12px] opacity-90">{advisory.missing}</p>
             ) : null}
             <p className="mt-1 text-[10px] opacity-70">
               {latestHistory ? `Último cambio: ${latestHistory.action}${latestIso ? ` · ${formatRelative(latestIso)}` : ""}` : "Sin novedades recientes"}
             </p>
           </>
         ) : null}
       </section>

      {/* Acciones */}
      <div className="border-y border-[var(--op-border-subtle)] bg-[var(--op-surface)]">
        <CaseActionsBar entry={entry} actions={actions} canMutate={canMutate} />
      </div>

      {/* Tabs */}
       <div className="flex shrink-0 items-center gap-4 overflow-x-auto border-b border-[var(--op-border-subtle)] px-4">
         {(["seguimiento", "datos", "adjuntos", "comprobantes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
             className={cn("h-9 shrink-0 whitespace-nowrap text-[12px] font-medium capitalize", tab === t ? "op-tab-active" : "op-tab-idle")}
            aria-selected={tab === t}
            role="tab"
          >
             {t === "seguimiento" ? "Historial" : t === "datos" ? "Datos" : t === "adjuntos" ? "Adjuntos" : "Comprobantes"}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="min-h-0 flex-1 overflow-y-auto">
         {tab === "seguimiento" ? (
           <div className="flex min-h-0 flex-1 flex-col">
             <div className="min-h-0 flex-1 overflow-y-auto py-2">
               <FollowUpFeed surgeryId={surgeryId} />
             </div>
           </div>
         ) : tab === "datos" ? (
           <CaseDataView entry={entry} />
         ) : tab === "adjuntos" ? (
           <CaseAttachmentsView surgeryId={surgeryId} />
         ) : (
            <CaseReceiptsView entry={entry} presupuestoIdentity={presupuestoIdentity} />
         )}
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileClock,
  Link2,
  LockKeyhole,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  TriangleAlert,
  Wrench,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArticleSearchInput } from "@/components/compras/ArticleSearchInput"
import type {
  BoxPresentationSku,
  BoxPresentationUnit,
  BoxUnitCondition,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"
import { cn } from "@/lib/utils"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import { canPerformStockOperations } from "@/lib/permissions/stock-operations-policy"

type MaintenanceStatus = "OPEN" | "SENT" | "RETURNED_PENDING_REVIEW" | "CLOSED" | "CANCELLED"
type MaintenanceKind = "REPAIR" | "PREVENTIVE_MAINTENANCE"
type MaintenanceCase = {
  id: string
  articleId: string | null
  kind: MaintenanceKind
  status: MaintenanceStatus
  description: string
  version: number
  openedAt: string
  openedBy: { id: string; name: string }
  updatedAt: string
  article: { id: string; sku: string; description: string } | null
  transitions: Array<{
    id: string
    sequence: number
    fromStatus: MaintenanceStatus | null
    toStatus: MaintenanceStatus
    note: string | null
    acceptedAt: string
    actor: { id: string; name: string }
  }>
}
type MaintenanceResponse = { unit: { id: string; code: string }; cases: MaintenanceCase[] }

const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  OPEN: "Abierto",
  SENT: "Enviado",
  RETURNED_PENDING_REVIEW: "Devuelto · pendiente de revisión",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
}
const MAINTENANCE_KIND_LABEL: Record<MaintenanceKind, string> = {
  REPAIR: "Reparación correctiva",
  PREVENTIVE_MAINTENANCE: "Mantenimiento preventivo",
}
const MAINTENANCE_MOTIVES = {
  REPAIR: [
    ["DAMAGE", "Rotura o daño visible"],
    ["FUNCTIONAL_FAILURE", "Falla de funcionamiento"],
    ["WEAR", "Desgaste o pérdida de filo"],
    ["MISALIGNMENT", "Desajuste o desalineación"],
    ["OTHER", "Otro motivo"],
  ],
  PREVENTIVE_MAINTENANCE: [
    ["SCHEDULED_REVIEW", "Revisión programada"],
    ["TECHNICAL_CLEANING", "Limpieza o lubricación técnica"],
    ["ADJUSTMENT", "Ajuste, afilado o calibración"],
    ["PREVENTIVE_REPLACEMENT", "Recambio preventivo"],
    ["OTHER", "Otro motivo"],
  ],
} as const
type MaintenanceMotive = (typeof MAINTENANCE_MOTIVES)[MaintenanceKind][number][0]

function maintenanceMotives(kind: MaintenanceKind): readonly (readonly [MaintenanceMotive, string])[] {
  return MAINTENANCE_MOTIVES[kind]
}
const MAINTENANCE_DATE = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function maintenanceDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : MAINTENANCE_DATE.format(date)
}

function legalActions(status: MaintenanceStatus): Array<{ status: Exclude<MaintenanceStatus, "OPEN">; label: string }> {
  if (status === "OPEN") return [{ status: "SENT", label: "Marcar como enviado" }, { status: "CANCELLED", label: "Cancelar caso" }]
  if (status === "SENT") return [{ status: "RETURNED_PENDING_REVIEW", label: "Marcar como devuelto" }]
  if (status === "RETURNED_PENDING_REVIEW") return [{ status: "CLOSED", label: "Cerrar revisión" }]
  return []
}

function MaintenancePanel({ box, unit, companyId, currentRole, onChanged }: {
  box: BoxPresentationSku
  unit: BoxPresentationUnit
  companyId?: string
  currentRole?: string
  onChanged?: () => void
}) {
  const enabled = Boolean(companyId && unit.unitId)
  const canMutate = canPerformStockOperations(currentRole)
  const [cases, setCases] = useState<MaintenanceCase[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [kind, setKind] = useState<MaintenanceKind>("REPAIR")
  const [motive, setMotive] = useState<MaintenanceMotive>("DAMAGE")
  const [articleId, setArticleId] = useState("__none__")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [transitioning, setTransitioning] = useState<string | null>(null)
  const [transitionIntent, setTransitionIntent] = useState<{ maintenanceCase: MaintenanceCase; toStatus: Exclude<MaintenanceStatus, "OPEN">; label: string } | null>(null)
  const [transitionNote, setTransitionNote] = useState("")
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const requestRef = useRef(0)
  const createKeyRef = useRef("")
  const transitionKeysRef = useRef(new Map<string, string>())

  const loadMaintenance = useCallback(async () => {
    if (!companyId || !unit.unitId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<MaintenanceResponse>(`/api/companies/${encodeURIComponent(companyId)}/cajas/units/${encodeURIComponent(unit.unitId)}/maintenance`)
      if (requestId === requestRef.current) setCases(result.cases)
    } catch (cause) {
      if (requestId === requestRef.current) setError(cause instanceof Error ? cause.message : "No se pudo cargar el mantenimiento de esta Caja.")
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [companyId, unit.unitId])

  useEffect(() => {
    if (!enabled) return
    let active = true
    queueMicrotask(() => { if (active) void loadMaintenance() })
    return () => { active = false; requestRef.current += 1 }
  }, [enabled, loadMaintenance])

  function changeCreateIntent(change: () => void) {
    createKeyRef.current = ""
    setMutationError(null)
    change()
  }

  function transitionIntentKey(maintenanceCase: MaintenanceCase, toStatus: Exclude<MaintenanceStatus, "OPEN">) {
    return `${maintenanceCase.id}:${maintenanceCase.version}:${toStatus}`
  }

  function openTransition(maintenanceCase: MaintenanceCase, toStatus: Exclude<MaintenanceStatus, "OPEN">, label: string) {
    transitionKeysRef.current.delete(transitionIntentKey(maintenanceCase, toStatus))
    setMutationError(null)
    setTransitionNote("")
    setTransitionIntent({ maintenanceCase, toStatus, label })
  }

  function closeTransition() {
    if (transitionIntent) transitionKeysRef.current.delete(transitionIntentKey(transitionIntent.maintenanceCase, transitionIntent.toStatus))
    setTransitionIntent(null)
    setTransitionNote("")
    setMutationError(null)
  }

  function changeTransitionNote(value: string) {
    if (transitionIntent) transitionKeysRef.current.delete(transitionIntentKey(transitionIntent.maintenanceCase, transitionIntent.toStatus))
    setMutationError(null)
    setTransitionNote(value)
  }

  async function createCase() {
    if (!companyId || !unit.unitId || !description.trim() || saving) return
    const idempotencyKey = createKeyRef.current || crypto.randomUUID()
    createKeyRef.current = idempotencyKey
    setSaving(true)
    setMutationError(null)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/cajas/units/${encodeURIComponent(unit.unitId)}/maintenance`, {
        method: "POST",
        body: JSON.stringify({ kind, articleId: articleId === "__none__" ? null : articleId, description: `${maintenanceMotives(kind).find(([value]) => value === motive)?.[1] ?? "Otro motivo"} — ${description.trim()}`, idempotencyKey }),
      })
      createKeyRef.current = ""
      setDialogOpen(false)
      setDescription("")
      setArticleId("__none__")
      setKind("REPAIR")
      setMotive("DAMAGE")
      setNotice("Caso de mantenimiento creado.")
      await loadMaintenance()
      onChanged?.()
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : "No se pudo crear el caso. Reintentá sin cerrar este diálogo.")
    } finally {
      setSaving(false)
    }
  }

  async function transitionCase(maintenanceCase: MaintenanceCase, toStatus: Exclude<MaintenanceStatus, "OPEN">) {
    if (!companyId || !unit.unitId || transitioning) return
    const intentKey = transitionIntentKey(maintenanceCase, toStatus)
    const idempotencyKey = transitionKeysRef.current.get(intentKey) ?? crypto.randomUUID()
    transitionKeysRef.current.set(intentKey, idempotencyKey)
    setTransitioning(intentKey)
    setMutationError(null)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/cajas/units/${encodeURIComponent(unit.unitId)}/maintenance/${encodeURIComponent(maintenanceCase.id)}/transition`, {
        method: "POST",
        body: JSON.stringify({ toStatus, expectedVersion: maintenanceCase.version, note: transitionNote.trim() || undefined, idempotencyKey }),
      })
      transitionKeysRef.current.delete(intentKey)
      setTransitionIntent(null)
      setTransitionNote("")
      setNotice(`Caso actualizado: ${MAINTENANCE_STATUS_LABEL[toStatus]}.`)
      await loadMaintenance()
      onChanged?.()
    } catch (cause) {
      const conflict = cause instanceof ApiClientError && cause.status === 409
      setMutationError(conflict ? "El caso cambió mientras lo estabas revisando. Actualizamos la información para que continúes." : cause instanceof Error ? cause.message : "No se pudo actualizar el caso.")
      if (conflict) {
        transitionKeysRef.current.delete(intentKey)
        setTransitionIntent(null)
        setTransitionNote("")
        await loadMaintenance()
      }
    } finally {
      setTransitioning(null)
    }
  }

  if (!enabled) return null

  return (
    <section className="overflow-hidden border border-[var(--ossum-line)] bg-white" aria-labelledby="maintenance-title">
      <div className="flex flex-col gap-3 border-b border-[var(--ossum-line)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><Wrench className="size-3.5 text-gray-400" aria-hidden="true" /><h2 id="maintenance-title" className="text-sm font-semibold text-[var(--ossum-navy)]">Mantenimiento</h2></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">Casos independientes de reparación o mantenimiento preventivo. No modifican la disponibilidad ni la condición de la Caja.</p>
        </div>
        <Button type="button" size="sm" className="min-h-11 shrink-0 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action-hover)] sm:h-8 sm:min-h-0" onClick={() => { setMutationError(null); setDialogOpen(true) }} disabled={!canMutate || loading}>
          <Plus className="size-4" aria-hidden="true" /> Nuevo caso
        </Button>
      </div>

      {!canMutate ? <p className="border-b border-[var(--ossum-line)] bg-[var(--ossum-surface-2)] px-4 py-2 text-xs text-gray-500">Tu acceso permite consultar el historial, pero no crear ni actualizar casos de mantenimiento.</p> : null}
      {mutationError ? <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">{mutationError}</div> : null}
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>

      {loading ? (
        <div className="flex items-center gap-3 px-5 py-10 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando casos de mantenimiento…</div>
      ) : error ? (
        <div className="px-5 py-10 sm:px-6" role="alert">
          <p className="font-medium">No se pudo cargar el mantenimiento</p><p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => void loadMaintenance()}><RefreshCw className="size-4" aria-hidden="true" /> Reintentar</Button>
        </div>
      ) : cases.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6" role="status"><Wrench className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold">Sin casos de mantenimiento</h3><p className="mt-1 text-sm text-muted-foreground">No hay reparaciones ni mantenimientos preventivos registrados para esta unidad.</p></div>
      ) : (
        <div className="divide-y divide-[var(--ossum-line)]">
          {cases.map((maintenanceCase) => {
            const actions = legalActions(maintenanceCase.status)
            return (
              <article key={maintenanceCase.id} className="grid gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{MAINTENANCE_KIND_LABEL[maintenanceCase.kind]}</Badge>
                    <Badge variant="outline" className={maintenanceCase.status === "CLOSED" || maintenanceCase.status === "CANCELLED" ? "text-muted-foreground" : "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}>{MAINTENANCE_STATUS_LABEL[maintenanceCase.status]}</Badge>
                    <span className="text-xs text-muted-foreground">v{maintenanceCase.version}</span>
                  </div>
                   <h3 className="mt-2 break-words text-sm font-semibold">{maintenanceCase.description}</h3>
                   <p className="mt-1 text-xs text-muted-foreground">{maintenanceCase.article ? `${maintenanceCase.article.sku} · ${maintenanceCase.article.description}` : "Caja completa"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Abierto por {maintenanceCase.openedBy.name || "Usuario"} · {maintenanceDate(maintenanceCase.openedAt)}</p>
                   {actions.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{actions.map((action) => {
                    const intentKey = `${maintenanceCase.id}:${maintenanceCase.version}:${action.status}`
                    const busy = transitioning === intentKey
                    return <Button key={action.status} type="button" variant={action.status === "CANCELLED" ? "outline" : "default"} size="sm" className="min-h-10 text-xs sm:h-8 sm:min-h-0" disabled={!canMutate || Boolean(transitioning)} onClick={() => openTransition(maintenanceCase, action.status, action.label)}>{busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : action.status === "CANCELLED" ? <XCircle className="size-4" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}{busy ? "Actualizando…" : action.label}</Button>
                  })}</div> : null}
                </div>
                <ol className="space-y-3 border-l pl-4" aria-label={`Transiciones del caso ${maintenanceCase.id}`}>
                  {maintenanceCase.transitions.map((transition) => <li key={transition.id} className="relative text-sm before:absolute before:-left-[1.23rem] before:top-1.5 before:size-2 before:rounded-full before:bg-muted-foreground"><p className="font-medium">{MAINTENANCE_STATUS_LABEL[transition.toStatus]}</p><p className="mt-1 text-xs text-muted-foreground">{maintenanceDate(transition.acceptedAt)} · {transition.actor.name || "Usuario"}</p>{transition.note ? <p className="mt-1 break-words text-xs text-muted-foreground">{transition.note}</p> : null}</li>)}
                </ol>
              </article>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-[var(--ossum-line)] px-5 py-4"><DialogTitle className="text-base text-[var(--ossum-navy)]">Nuevo caso de mantenimiento</DialogTitle><DialogDescription className="text-xs">Registrá el motivo. El caso se crea abierto y no cambia la disponibilidad de la Caja.</DialogDescription></DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
             <fieldset className="space-y-2"><legend className="text-sm font-medium">Tipo de intervención</legend><div className="grid gap-2 sm:grid-cols-2">{([['REPAIR', 'Reparación correctiva', 'Daño o falla que requiere intervención.'], ['PREVENTIVE_MAINTENANCE', 'Mantenimiento preventivo', 'Revisión programada para evitar fallas.']] as const).map(([value, title, detail]) => <button key={value} type="button" role="radio" aria-checked={kind === value} onClick={() => changeCreateIntent(() => { setKind(value); setMotive(MAINTENANCE_MOTIVES[value][0][0]) })} className={cn("rounded-md border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ossum-action)] focus-visible:ring-offset-1", kind === value ? "border-[var(--ossum-action)] bg-[#eef0ff] ring-1 ring-[var(--ossum-action)]" : "border-[var(--ossum-line)] hover:bg-[var(--ossum-surface-2)]")}><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></button>)}</div></fieldset>
            <div className="space-y-2"><Label htmlFor="maintenance-motive">Motivo específico</Label><Select value={motive} onValueChange={(value) => changeCreateIntent(() => setMotive(value as MaintenanceMotive))}><SelectTrigger id="maintenance-motive" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{maintenanceMotives(kind).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
             <div className="space-y-2"><Label htmlFor="maintenance-article">Componente afectado (opcional)</Label><ArticleSearchInput id="maintenance-article" items={box.expectedContent.items.map((item) => ({ id: item.articleId, code: item.articleSku ?? item.articleId, name: item.articleName }))} value={articleId === "__none__" ? undefined : articleId} onSelect={(item) => changeCreateIntent(() => setArticleId(item.id))} onClear={() => changeCreateIntent(() => setArticleId("__none__"))} placeholder="Buscar por SKU o nombre dentro de esta caja…" /><p className="text-xs text-muted-foreground">{articleId === "__none__" ? `Sin seleccionar: aplica a la caja completa. ${box.expectedContent.items.length} componentes disponibles.` : "Solo identifica el tipo de instrumental; no realiza seguimiento por pieza."}</p></div>
            <div className="space-y-2"><Label htmlFor="maintenance-description">{kind === "REPAIR" ? "Problema detectado" : "Tarea planificada"}</Label><Textarea id="maintenance-description" maxLength={4000} value={description} onChange={(event) => changeCreateIntent(() => setDescription(event.target.value))} placeholder={kind === "REPAIR" ? "Describí la falla, daño o síntoma observado" : "Describí la revisión o tarea preventiva a realizar"} className="min-h-28 resize-y" aria-describedby="maintenance-description-hint" /><p id="maintenance-description-hint" className="text-xs text-muted-foreground">{description.length}/4000 caracteres</p></div>
            {mutationError ? <p className="text-sm text-destructive" role="alert">{mutationError}</p> : null}
          </div>
          <DialogFooter className="border-t border-[var(--ossum-line)] px-5 py-3"><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button><Button type="button" size="sm" className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action-hover)]" onClick={() => void createCase()} disabled={saving || !description.trim()}>{saving ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}{saving ? "Creando…" : "Crear caso"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(transitionIntent)} onOpenChange={(open) => { if (!open && !transitioning) closeTransition() }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-[var(--ossum-line)] px-5 py-4"><DialogTitle className="text-base text-[var(--ossum-navy)]">{transitionIntent?.label}</DialogTitle><DialogDescription className="text-xs">Podés agregar una nota para dejar trazabilidad de este movimiento.</DialogDescription></DialogHeader>
          <div className="min-h-0 space-y-2 overflow-y-auto px-5 py-4"><Label htmlFor="maintenance-transition-note">Nota (opcional)</Label><Textarea id="maintenance-transition-note" autoFocus maxLength={4000} value={transitionNote} onChange={(event) => changeTransitionNote(event.target.value)} placeholder="Ej.: enviado a Taller Central, recibe Juan Pérez" className="min-h-28 resize-y" /><p className="text-xs text-muted-foreground">{transitionNote.length}/4000 caracteres</p>{mutationError ? <p className="text-sm text-destructive" role="alert">{mutationError}</p> : null}</div>
          <DialogFooter className="border-t border-[var(--ossum-line)] px-5 py-3"><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={closeTransition} disabled={Boolean(transitioning)}>Cancelar</Button><Button type="button" size="sm" className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action-hover)]" onClick={() => transitionIntent && void transitionCase(transitionIntent.maintenanceCase, transitionIntent.toStatus)} disabled={Boolean(transitioning)}>{transitioning ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}{transitioning ? "Actualizando…" : "Confirmar movimiento"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ConfirmedCondition({ condition }: { condition: BoxUnitCondition }) {
  if (!condition) {
    return (
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Sin resultado confirmado</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Esta unidad todavía no registra un resultado confirmado.
          </p>
        </div>
      </div>
    )
  }

  const isAvailable = condition === "Disponible"
  const Icon = isAvailable ? CheckCircle2 : TriangleAlert

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Último resultado confirmado</p>
      <Badge
        variant="outline"
        className={cn(
          "min-h-8 gap-2 border-current/20 px-3 text-sm font-medium",
          isAvailable
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
        {condition}
      </Badge>
    </div>
  )
}

export function PhysicalUnitDetail({
  box,
  unit,
  onBack,
  companyId,
  currentRole,
  evidenceLoading = false,
  evidenceError = false,
  onRetryEvidence,
  onMaintenanceChanged,
}: {
  box: BoxPresentationSku
  unit: BoxPresentationUnit
  onBack: () => void
  companyId?: string
  currentRole?: string
  evidenceLoading?: boolean
  evidenceError?: boolean
  onRetryEvidence?: () => void
  onMaintenanceChanged?: () => void
}) {
  const useCount = unit.evidence.filter((entry) => entry.eventKind === "SURGERY_USE").length
  const problemCount = unit.evidence.filter((entry) => entry.eventKind === "PROBLEM_REPORTED").length
  const repairCount = unit.evidence.filter((entry) => entry.eventKind === "REPAIR_SENT").length
  const repairRecurrence = [...unit.evidence
    .reduce((counts, entry) => {
      if (entry.eventKind !== "REPAIR_SENT") return counts
      const current = counts.get(entry.articleId)
      counts.set(entry.articleId, { label: entry.articleDescription, count: (current?.count ?? 0) + 1 })
      return counts
    }, new Map<string, { label: string; count: number }>())]
    .sort((left, right) => right[1].count - left[1].count)

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ossum-surface)]" aria-labelledby="physical-unit-title">
      <header className="shrink-0 border-b border-[var(--ossum-line)] bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-2 text-xs"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a {box.id}
          </Button>
        </div>

        <div className="border-t border-[var(--ossum-line)] px-4 py-3">
          <nav aria-label="Ubicación" className="text-[11px] font-medium text-gray-400">
            Artículos y Stock <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span>{" "}
            <span>{box.id}</span> <span aria-hidden="true">/</span>{" "}
            <span className="break-all text-[var(--ossum-navy)]">{unit.code}</span>
          </nav>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400">Caja identificada</p>
              <h1 id="physical-unit-title" className="mt-0.5 break-all font-mono text-lg font-semibold text-[var(--ossum-navy)]">
                {unit.code}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                Detalle de consulta de una unidad física y su evidencia operativa asociada.
              </p>
            </div>
            <div className="min-w-56 border-l border-[var(--ossum-line)] pl-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">Modelo</p>
              <p className="mt-0.5 break-all font-mono text-xs font-semibold text-[var(--ossum-navy)]">{box.id}</p>
              <p className="mt-0.5 text-xs text-gray-600">{box.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
      <MaintenancePanel box={box} unit={unit} companyId={companyId} currentRole={currentRole} onChanged={onMaintenanceChanged} />

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden border border-[var(--ossum-line)] bg-white" aria-labelledby="evidence-history-title">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--ossum-line)] px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <FileClock className="size-3.5 text-gray-400" aria-hidden="true" />
                <h2 id="evidence-history-title" className="text-sm font-semibold text-[var(--ossum-navy)]">Historial de evidencia</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Lectura cronológica; los registros no ofrecen acciones operativas.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              Solo lectura
            </div>
          </div>

          {evidenceLoading ? (
            <div className="flex items-center gap-3 px-5 py-10 text-sm text-muted-foreground sm:px-6" role="status"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando evidencia operativa…</div>
          ) : evidenceError ? (
            <div className="px-5 py-10 sm:px-6" role="alert"><p className="font-medium">No se pudo cargar la evidencia</p><p className="mt-1 text-sm text-muted-foreground">El mantenimiento se consulta por separado y puede seguir disponible.</p>{onRetryEvidence ? <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onRetryEvidence}><RefreshCw className="size-4" aria-hidden="true" /> Reintentar evidencia</Button> : null}</div>
          ) : unit.evidence.length > 0 ? (
            <div>
              <ol className="divide-y" aria-label={`Evidencia cronológica de ${unit.code}`}>
                {unit.evidence.map((entry) => (
                  <li key={entry.id} className="relative grid gap-2 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                    <time dateTime={entry.occurredAt} className="text-xs font-medium text-muted-foreground tabular-nums">
                      {entry.displayedAt}
                    </time>
                    <article aria-labelledby={`${entry.id}-title`} className="min-w-0">
                      <div className="flex items-start gap-2">
                        <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <h3 id={`${entry.id}-title`} className="text-sm font-semibold">{entry.checkpoint}</h3>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{entry.summary}</p>
                            {entry.surgeryReference ? <p className="mt-1 font-mono text-xs text-muted-foreground">{entry.surgeryReference}</p> : null}
                          {entry.actor ? (
                            <p className="mt-2 text-xs text-muted-foreground">Registrado por: {entry.actor}</p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <FileClock className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold">Sin evidencia registrada</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                 Esta unidad no tiene historial operativo para mostrar.
              </p>
            </div>
          )}
        </section>

         <aside className="divide-y divide-[var(--ossum-line)] border border-[var(--ossum-line)] bg-white" aria-label="Resumen de la Caja identificada">
          <section className="p-4" aria-labelledby="unit-log-summary-title">
            <div className="flex items-center gap-2"><Wrench className="size-3.5 text-gray-400" aria-hidden="true" /><h2 id="unit-log-summary-title" className="text-sm font-semibold text-[var(--ossum-navy)]">Bitácora derivada</h2></div>
            {evidenceLoading ? <p className="mt-4 text-sm text-muted-foreground">Calculando desde la evidencia…</p> : evidenceError ? <p className="mt-4 text-sm text-muted-foreground">Resumen no disponible hasta recuperar la evidencia.</p> : <><dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-[var(--ossum-surface-2)] p-2"><dt className="text-[11px] text-gray-500">Usos / CX</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{useCount}</dd></div>
              <div className="bg-[var(--ossum-surface-2)] p-2"><dt className="text-[11px] text-gray-500">Problemas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{problemCount}</dd></div>
              <div className="bg-[var(--ossum-surface-2)] p-2"><dt className="text-[11px] text-gray-500">Envíos a reparación</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{repairCount}</dd></div>
            </dl>
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Recurrencia de reparación por instrumental</p>
              {repairRecurrence.length ? <ul className="mt-2 space-y-1 text-sm">{repairRecurrence.map(([articleId, recurrence]) => <li key={articleId} className="flex justify-between gap-3"><span>{recurrence.label}</span><span className="font-semibold tabular-nums">{recurrence.count}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Sin envíos registrados.</p>}
            </div></>}
          </section>

          <section className="p-4" aria-labelledby="condition-title">
            <h2 id="condition-title" className="mb-3 text-sm font-semibold text-[var(--ossum-navy)]">Resultado de la unidad</h2>
            <ConfirmedCondition condition={unit.condition} />
          </section>

          {unit.operationReference ? (
            <section className="p-4" aria-labelledby="operation-reference-title">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 id="operation-reference-title" className="text-sm font-semibold text-[var(--ossum-navy)]">Referencia de operación</h2>
              </div>
              <p className="mt-3 break-all font-mono text-sm font-semibold">{unit.operationReference}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Referencia de la asignación operativa vigente.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
      </div>
    </section>
  )
}

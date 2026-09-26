"use client"

import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, CircleAlert, ExternalLink, FilePlus2, Loader2, PackageSearch, Plus, Search, SquareStack, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiClientError } from "@/lib/api/client"
import { clearRemitoWorkspaceDraft, readRemitoWorkspaceDraft, writeRemitoWorkspaceDraft, type RemitoWorkspaceDraftContext } from "@/lib/remito-workspace-draft-recovery"
import {
  createRemito, emitirRemito, fetchRemito, fetchRemitoDevPreset, REMITO_ORIGINS, REMITO_SALIDA_REASONS,
  type CreateRemitoPayload, type RemitoApiRow, type RemitoDevPreset, type RemitoOrigin, type RemitoSalidaReason,
  type UpdateRemitoDraftPayload, updateRemitoDraft,
} from "@/lib/api/remitos"

// ─── OSSUM brand surface (scoped) ────────────────────────────────────────────
const NAVY = "bg-[var(--ossum-navy)] text-white"
const NAVY_SOFT = "bg-[var(--ossum-navy-soft)] text-white"
const ACTION = "bg-[var(--ossum-action)] text-white hover:bg-[var(--ossum-action-hover)]"
const SURFACE = "bg-[var(--ossum-surface)]"
const LINE = "border-[var(--ossum-line)]"
const OSSUM_SCOPE_STYLE = {
  "--ossum-navy": "#071935",
  "--ossum-navy-soft": "#0f2748",
  "--ossum-action": "#1D2FC0",
  "--ossum-action-hover": "#1830a8",
  "--ossum-danger": "#D02F28",
  "--ossum-danger-hover": "#b82922",
  "--ossum-surface": "#FBFBFB",
  "--ossum-surface-2": "#F3F3F3",
  "--ossum-line": "#e6e8eb",
  "--ossum-line-strong": "#d0d4da",
  background: "#FBFBFB",
} as React.CSSProperties

// ─── Types ───────────────────────────────────────────────────────────────────
type DraftItem = { itemId?: string; sku: string; description: string; quantity: string; unit: string; boxId?: string; presupuestoItemId?: string; lotNumber: string; serialNumber: string; expirationDate: string; metadata?: Record<string, unknown> }
type Draft = { origin: RemitoOrigin; salidaReason: RemitoSalidaReason; branchId: string; issuedBranchId: string; surgeryId: string; boxId: string; presupuestoId: string; destinatarioContactId: string; destinatarioNombre: string; domicilio: string; localidad: string; provincia: string; transporte: string; packageCount: string; declaredValue: string; observaciones: string; destinatarioSnapshot: Record<string, unknown> | null; shippingAddressSnapshot: Record<string, unknown> | null; transportSnapshot: Record<string, unknown> | null; metadata: Record<string, unknown> | null; items: DraftItem[] }
type RecoveryDraft = Omit<Draft, "destinatarioSnapshot" | "shippingAddressSnapshot" | "transportSnapshot" | "metadata" | "items"> & { items: Array<Omit<DraftItem, "metadata">> }
type Errors = Record<string, string>

const emptyItem = (): DraftItem => ({ sku: "", description: "", quantity: "1", unit: "unidad", lotNumber: "", serialNumber: "", expirationDate: "" })
const emptyDraft = (): Draft => ({ origin: "manual", salidaReason: "cirugia", branchId: "", issuedBranchId: "", surgeryId: "", boxId: "", presupuestoId: "", destinatarioContactId: "", destinatarioNombre: "", domicilio: "", localidad: "", provincia: "", transporte: "", packageCount: "", declaredValue: "", observaciones: "", destinatarioSnapshot: null, shippingAddressSnapshot: null, transportSnapshot: null, metadata: null, items: [emptyItem()] })
const itemHasContent = (item: DraftItem) => Boolean(item.description.trim() || item.sku.trim() || item.lotNumber.trim() || item.serialNumber.trim() || item.expirationDate.trim() || item.itemId || item.boxId || item.presupuestoItemId)

// ─── Recovery helpers ────────────────────────────────────────────────────────
function recoveryDraft(draft: Draft): RecoveryDraft {
  const { destinatarioSnapshot: _d, shippingAddressSnapshot: _s, transportSnapshot: _t, metadata: _m, ...editable } = draft
  return { ...editable, items: draft.items.map(({ metadata: _im, ...item }) => ({ ...item })) }
}
function isRecoveryDraft(value: unknown): value is RecoveryDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const draft = value as Record<string, unknown>
  const scalarKeys: Array<keyof Draft> = ["origin", "salidaReason", "branchId", "issuedBranchId", "surgeryId", "boxId", "presupuestoId", "destinatarioContactId", "destinatarioNombre", "domicilio", "localidad", "provincia", "transporte", "packageCount", "declaredValue", "observaciones"]
  if (scalarKeys.some((key) => typeof draft[key] !== "string") || !Array.isArray(draft.items)) return false
  return draft.items.every((item) => item && typeof item === "object" && ["sku", "description", "quantity", "unit", "lotNumber", "serialNumber", "expirationDate"].every((key) => typeof (item as Record<string, unknown>)[key] === "string"))
}

// ─── Remito → Draft ──────────────────────────────────────────────────────────
function fromRemito(remito: RemitoApiRow): Draft {
  return {
    origin: REMITO_ORIGINS.includes(remito.origin as RemitoOrigin) ? remito.origin as RemitoOrigin : "manual",
    salidaReason: REMITO_SALIDA_REASONS.includes(remito.salidaReason as RemitoSalidaReason) ? remito.salidaReason as RemitoSalidaReason : "cirugia",
    branchId: remito.branchId ?? "", issuedBranchId: remito.issuedBranchId ?? remito.branchId ?? "",
    surgeryId: remito.surgeryId ?? "", boxId: remito.boxId ?? "", presupuestoId: remito.presupuestoId ?? "",
    destinatarioContactId: remito.destinatarioContactId ?? "",
    destinatarioNombre: remito.destinatarioSnapshot?.nombre ?? "",
    domicilio: remito.shippingAddressSnapshot?.domicilio ?? remito.destinatarioSnapshot?.domicilio ?? "",
    localidad: remito.shippingAddressSnapshot?.localidad ?? remito.destinatarioSnapshot?.localidad ?? "",
    provincia: remito.shippingAddressSnapshot?.provincia ?? remito.destinatarioSnapshot?.provincia ?? "",
    transporte: typeof remito.transportSnapshot?.nombre === "string" ? remito.transportSnapshot.nombre : "",
    packageCount: remito.packageCount == null ? "" : String(remito.packageCount),
    declaredValue: remito.declaredValue == null ? "" : String(remito.declaredValue),
    observaciones: typeof remito.metadata?.observaciones === "string" ? remito.metadata.observaciones : "",
    destinatarioSnapshot: remito.destinatarioSnapshot, shippingAddressSnapshot: remito.shippingAddressSnapshot,
    transportSnapshot: remito.transportSnapshot, metadata: remito.metadata,
    items: remito.items.length ? remito.items.map((item) => ({
      itemId: item.itemId ?? undefined, sku: item.sku ?? "", description: item.description,
      quantity: String(item.quantity), unit: item.unit ?? "unidad", boxId: item.boxId ?? undefined,
      presupuestoItemId: item.presupuestoItemId ?? undefined, lotNumber: item.lotNumber ?? "",
      serialNumber: item.serialNumber ?? "", expirationDate: item.expirationDate?.slice(0, 10) ?? "",
      metadata: item.metadata ?? undefined,
    })) : [emptyItem()],
  }
}

const optional = (value: string) => value.trim() || undefined
const nullable = (value: string) => optional(value) ?? null

// ─── Label resolvers ─────────────────────────────────────────────────────────
function resolveBranchLabel(preset: RemitoDevPreset | null, branchId: string, fallbackLabel: string | null | undefined): string {
  if (preset?.available && branchId && preset.branch.id === branchId) return preset.branch.label
  if (fallbackLabel && branchId) return fallbackLabel
  return branchId
}
function resolveSurgeryLabel(surgeryId: string, fallbackLabel: string | null | undefined, fallbackDescription: string | null | undefined): string {
  if (!surgeryId) return ""
  if (fallbackLabel) return fallbackDescription ? `${fallbackLabel} · ${fallbackDescription}` : fallbackLabel
  return surgeryId
}

// ─── Payload + validation ────────────────────────────────────────────────────
function merged(snapshot: Record<string, unknown> | null, values: Record<string, string | undefined>) {
  const result = { ...(snapshot ?? {}) }
  Object.entries(values).forEach(([key, value]) => (value === undefined ? delete result[key] : (result[key] = value)))
  return Object.keys(result).length ? result : null
}
function payloadFor(draft: Draft): CreateRemitoPayload {
  const domicilio = optional(draft.domicilio), localidad = optional(draft.localidad), provincia = optional(draft.provincia)
  return {
    branchId: optional(draft.branchId) ?? "", issuedBranchId: optional(draft.issuedBranchId) ?? optional(draft.branchId),
    surgeryId: optional(draft.surgeryId), origin: draft.origin, salidaReason: draft.salidaReason,
    boxId: nullable(draft.boxId), presupuestoId: nullable(draft.presupuestoId), destinatarioContactId: nullable(draft.destinatarioContactId),
    destinatarioSnapshot: merged(draft.destinatarioSnapshot, { nombre: optional(draft.destinatarioNombre), domicilio, localidad, provincia }),
    shippingAddressSnapshot: merged(draft.shippingAddressSnapshot, { domicilio, localidad, provincia }),
    transportSnapshot: merged(draft.transportSnapshot, { nombre: optional(draft.transporte) }),
    packageCount: optional(draft.packageCount) ? Number(draft.packageCount) : null,
    declaredValue: optional(draft.declaredValue) ?? null,
    metadata: merged(draft.metadata, { observaciones: optional(draft.observaciones) }),
    items: draft.items.filter(itemHasContent).map((item) => ({
      ...(optional(item.itemId ?? "") ? { itemId: optional(item.itemId ?? "") } : {}),
      sku: optional(item.sku), description: item.description.trim(), quantity: item.quantity, unit: optional(item.unit),
      ...(optional(item.boxId ?? "") ? { boxId: optional(item.boxId ?? "") } : {}),
      ...(optional(item.presupuestoItemId ?? "") ? { presupuestoItemId: optional(item.presupuestoItemId ?? "") } : {}),
      lotNumber: optional(item.lotNumber), serialNumber: optional(item.serialNumber), expirationDate: optional(item.expirationDate),
      ...(item.metadata ? { metadata: item.metadata } : {}),
    })),
  }
}
function validate(draft: Draft): Errors {
  const errors: Errors = {}
  if (!draft.branchId.trim()) errors.branchId = "Indicá el depósito de salida."
  if (!draft.salidaReason) errors.salidaReason = "Seleccioná el motivo de salida."
  if (!draft.items.some(itemHasContent)) errors["item-0-description"] = "Agregá al menos un producto o caja."
  draft.items.forEach((item, index) => {
    if (!itemHasContent(item)) return
    if (!item.description.trim()) errors[`item-${index}-description`] = "La descripción es obligatoria."
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) errors[`item-${index}-quantity`] = "La cantidad debe ser mayor que cero."
  })
  return errors
}

// ─── Workspace input styling (dense, ERP-like) ───────────────────────────────
const fieldClass = "h-8 bg-white text-sm border border-[var(--ossum-line)] rounded-[3px] px-2 focus-visible:outline-none focus-visible:border-[var(--ossum-action)] focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)]"
const cellInputClass = "h-7 w-full bg-transparent text-xs px-1.5 focus-visible:outline-none focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)] rounded-[2px] border border-transparent focus-visible:border-[var(--ossum-action)]"
const selectClass = "h-8 w-full rounded-[3px] border border-[var(--ossum-line)] bg-white px-2 text-sm focus-visible:outline-none focus-visible:border-[var(--ossum-action)] focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)] disabled:cursor-not-allowed disabled:bg-[var(--ossum-surface-2)]"

// ─── Public component ────────────────────────────────────────────────────────
export function OperationalRemitoWorkspace({ remitoId }: { remitoId?: string }) {
  const { activeCompany, currentUser } = useAuth()
  const workspaceIdentity = [currentUser?.id ?? "anonymous", activeCompany?.id ?? "no-company", remitoId ? "edit" : "create", remitoId ?? "new"].map(encodeURIComponent).join(":")

  // A complete identity key makes React unmount the prior session before any new
  // user, company, mode, or document can render with its local state or timers.
  return <OperationalRemitoWorkspaceSession key={workspaceIdentity} remitoId={remitoId} />
}

function OperationalRemitoWorkspaceSession({ remitoId }: { remitoId?: string }) {
  const router = useRouter()
  const { activeCompany, currentUser, currentUserLoading, isLoading } = useAuth()
  const companyId = activeCompany?.id
  const editing = Boolean(remitoId)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [baseline, setBaseline] = useState<Draft | null>(null)
  const [loaded, setLoaded] = useState<RemitoApiRow | null>(null)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [emitting, setEmitting] = useState(false)
  const [confirmEmitOpen, setConfirmEmitOpen] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [conflict, setConflict] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)
  const [preset, setPreset] = useState<RemitoDevPreset | null>(null)
  const branchLabel = resolveBranchLabel(preset, draft.branchId, loaded?.branchLabel)
  const issuedBranchLabel = resolveBranchLabel(preset, draft.issuedBranchId, loaded?.issuedBranchLabel ?? loaded?.branchLabel)
  const surgeryLabel = resolveSurgeryLabel(draft.surgeryId, loaded?.surgeryLabel, loaded?.surgeryDescription)
  const branchPresetLocked = Boolean(preset?.available && draft.branchId && preset.branch.id === draft.branchId)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [recoveryCandidate, setRecoveryCandidate] = useState<{ draft: RecoveryDraft; staleBase: boolean } | null>(null)
  const [recoveryWarning, setRecoveryWarning] = useState("")
  const recoveryWarned = useRef(false)
  const recoverButtonRef = useRef<HTMLButtonElement | null>(null)
  const continueEditingRef = useRef<HTMLButtonElement | null>(null)
  const recoveryOpenerRef = useRef<HTMLElement | null>(null)
  const leaveOpenerRef = useRef<HTMLElement | null>(null)
  const branchIdEditedRef = useRef(false)
  const presetDefaultAttemptedRef = useRef(false)
  const workspaceHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const instanceGenerationRef = useRef(0)
  const refs = useRef<Record<string, HTMLElement | null>>({})
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline ?? emptyDraft())
  const locked = Boolean(loaded && !["Borrador", "Entregado"].includes(loaded.state))
  const recoveryContext: RemitoWorkspaceDraftContext | null = currentUser?.id && companyId ? { userId: currentUser.id, companyId, mode: editing ? "edit" : "create", ...(editing ? { remitoId } : {}) } : null
  const warnRecoveryOnce = () => { if (!recoveryWarned.current) { recoveryWarned.current = true; setRecoveryWarning("No se pudo conservar una copia temporal de estos cambios.") } }
  const clearRecovery = () => { if (recoveryContext && !clearRemitoWorkspaceDraft(recoveryContext)) warnRecoveryOnce() }
  const isCurrentInstance = (generation: number) => instanceGenerationRef.current === generation
  const activeItems = useMemo(() => draft.items.filter(itemHasContent), [draft.items])
  const lineCount = activeItems.length
  const quantityTotal = useMemo(() => activeItems.reduce((total, item) => total + (Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0), 0), [activeItems])
  const boxCount = useMemo(() => new Set(activeItems.map((i) => i.boxId).filter(Boolean)).size, [activeItems])

  // ─── Effects (preserved from V1) ───────────────────────────────────────────
  useEffect(() => () => { instanceGenerationRef.current += 1 }, [])
  useEffect(() => {
    if (!companyId || !remitoId) return
    const generation = instanceGenerationRef.current
    let cancelled = false
    setLoading(true); setError("")
    void fetchRemito(companyId, remitoId).then((row) => {
      if (cancelled || !isCurrentInstance(generation)) return
      const next = fromRemito(row); setLoaded(row); setDraft(next); setBaseline(next)
    }).catch((cause) => { if (!cancelled && isCurrentInstance(generation)) setError(cause instanceof Error ? cause.message : "No se pudo cargar el remito.") })
      .finally(() => { if (!cancelled && isCurrentInstance(generation)) setLoading(false) })
    return () => { cancelled = true }
  }, [companyId, remitoId])

  useEffect(() => {
    if (!companyId || editing) return
    const generation = instanceGenerationRef.current
    let cancelled = false
    void fetchRemitoDevPreset(companyId).then((next) => { if (!cancelled && isCurrentInstance(generation)) setPreset(next) }).catch(() => { if (!cancelled && isCurrentInstance(generation)) setPreset({ available: false }) })
    return () => { cancelled = true }
  }, [companyId, editing])

  useEffect(() => {
    if (editing || !recoveryReady || recoveryCandidate || !preset?.available || presetDefaultAttemptedRef.current || branchIdEditedRef.current) return
    presetDefaultAttemptedRef.current = true
    setDraft((current) => current.branchId.trim() ? current : { ...current, branchId: preset.branch.id, issuedBranchId: current.issuedBranchId.trim() ? current.issuedBranchId : preset.branch.id })
  }, [editing, preset, recoveryCandidate, recoveryReady])

  useEffect(() => {
    setRecoveryReady(false); setRecoveryCandidate(null)
    if (!recoveryContext || isLoading || currentUserLoading || (editing && (!loaded || loading))) return
    if (locked) { clearRecovery(); setRecoveryReady(true); return }
    const stored = readRemitoWorkspaceDraft(recoveryContext, isRecoveryDraft)
    if (stored.status === "valid") {
      recoveryOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setRecoveryCandidate({ draft: stored.envelope.draft, staleBase: editing && stored.envelope.serverBase !== loaded?.updatedAt })
    } else if (stored.status === "invalid") clearRecovery()
    setRecoveryReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryContext?.userId, recoveryContext?.companyId, recoveryContext?.mode, recoveryContext?.remitoId, isLoading, currentUserLoading, editing, loaded, loading, locked])

  useEffect(() => {
    if (!recoveryReady || !recoveryContext || !dirty || loading || saving || locked) return
    const generation = instanceGenerationRef.current
    const timeout = window.setTimeout(() => {
      if (!isCurrentInstance(generation)) return
      const result = writeRemitoWorkspaceDraft(recoveryContext, recoveryDraft(draft), loaded?.updatedAt ?? null)
      if (result.status !== "written" && isCurrentInstance(generation)) warnRecoveryOnce()
    }, 750)
    return () => window.clearTimeout(timeout)
  }, [draft, dirty, loaded?.updatedAt, loading, locked, recoveryContext, recoveryReady, saving])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty && !saving) { event.preventDefault(); event.returnValue = "" } }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty, saving])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    if (key === "branchId") branchIdEditedRef.current = true
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => { const { [key]: _, ...rest } = current; return rest }); setError("")
  }
  const updateItem = (index: number, key: keyof DraftItem, value: string) => {
    setDraft((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }))
    setErrors((current) => { const { [`item-${index}-${key}`]: _, ...rest } = current; return rest })
  }
  const focusNextRow = (index: number) => {
    const next = index + 1
    setDraft((current) => next >= current.items.length ? { ...current, items: [...current.items, emptyItem()] } : current)
    requestAnimationFrame(() => refs.current[`item-${next}-description`]?.focus())
  }
  const requestLeave = (action: () => void, opener?: HTMLElement) => {
    if (saving) return
    if (!dirty) return action()
    leaveOpenerRef.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setPendingLeave(() => action); setLeaveOpen(true)
  }
  const save = async (navigateAfterCreate = true): Promise<RemitoApiRow | null> => {
    const nextErrors = validate(draft)
    if (Object.keys(nextErrors).length) {
      const generation = instanceGenerationRef.current
      setErrors(nextErrors)
      requestAnimationFrame(() => { if (isCurrentInstance(generation)) refs.current[Object.keys(nextErrors)[0]]?.focus() })
      return null
    }
    if (!companyId) { setError("No hay empresa activa."); return null }
    const generation = instanceGenerationRef.current
    setSaving(true); setError(""); setConflict(false)
    try {
      const createPayload = payloadFor(draft)
      const result = editing && loaded
        ? await updateRemitoDraft(companyId, loaded.id, { ...((): Omit<CreateRemitoPayload, "origin"> => { const { origin: _o, ...patch } = createPayload; return patch })(), expectedUpdatedAt: loaded.updatedAt } as UpdateRemitoDraftPayload)
        : await createRemito(companyId, createPayload)
      if (!isCurrentInstance(generation)) return null
      const next = fromRemito(result); setLoaded(result); setDraft(next); setBaseline(next); clearRecovery()
      toast.success(loaded?.state === "Entregado" ? "Remito entregado actualizado" : "Borrador guardado")
      if (!editing && navigateAfterCreate) router.replace(`/remitos/${result.id}/editar`)
      return result
    } catch (cause) {
      if (!isCurrentInstance(generation)) return null
      const isConflict = cause instanceof ApiClientError && cause.status === 409 && cause.code === "remito_update_conflict"
      setConflict(isConflict)
      setError(isConflict ? "Otro usuario actualizó este borrador. Tus cambios locales se conservaron." : cause instanceof Error ? cause.message : "No se pudo guardar el borrador.")
      return null
    } finally {
      if (isCurrentInstance(generation)) setSaving(false)
    }
  }
  const emit = async (targetRemitoId = loaded?.id) => {
    if (!targetRemitoId || (editing && loaded?.state !== "Borrador") || !companyId) return
    const generation = instanceGenerationRef.current
    setEmitting(true)
    try {
      await emitirRemito(companyId, targetRemitoId)
      if (!isCurrentInstance(generation)) return
      clearRecovery(); toast.success("Remito generado"); router.replace("/remitos")
    } catch (cause) {
      if (!isCurrentInstance(generation)) return
      setError(cause instanceof Error ? cause.message : "No se pudo generar el remito.")
    } finally {
      if (isCurrentInstance(generation)) setEmitting(false)
    }
  }
  const generate = async () => {
    setConfirmEmitOpen(false)
    let targetRemitoId = loaded?.id
    if (dirty || !targetRemitoId) {
      const saved = await save(false)
      if (!saved) return
      targetRemitoId = saved.id
    }
    await emit(targetRemitoId)
  }
  const reload = async () => {
    if (!companyId || !remitoId) return
    if (dirty && !window.confirm("Se descartarán los cambios locales. ¿Continuar?")) return
    const generation = instanceGenerationRef.current
    setLoading(true)
    try {
      const row = await fetchRemito(companyId, remitoId)
      if (!isCurrentInstance(generation)) return
      const next = fromRemito(row); setLoaded(row); setDraft(next); setBaseline(next); clearRecovery(); setConflict(false); setError("")
    } finally { if (isCurrentInstance(generation)) setLoading(false) }
  }
  const applyPreset = () => {
    if (!preset?.available || (dirty && !window.confirm("Este ejemplo reemplazará los cambios sin guardar. ¿Continuar?"))) return
    const example = preset.example
    setDraft({
      ...emptyDraft(), branchId: preset.branch.id, issuedBranchId: preset.branch.id,
      surgeryId: example.surgeryId, origin: example.origin, salidaReason: example.salidaReason,
      destinatarioNombre: example.recipientSnapshot.nombre ?? "", destinatarioSnapshot: example.recipientSnapshot,
      shippingAddressSnapshot: example.shippingAddressSnapshot, transportSnapshot: example.transportSnapshot,
      packageCount: example.packageCount == null ? "" : String(example.packageCount),
      declaredValue: example.declaredValue == null ? "" : String(example.declaredValue),
      metadata: example.metadata,
      items: example.items.map((item) => ({ ...emptyItem(), ...item, quantity: String(item.quantity) })),
    })
  }

  // ─── Render guards ─────────────────────────────────────────────────────────
  if (loading || isLoading || currentUserLoading) return <WorkspaceSkeleton />
  if (error && !loaded && editing) return <LockedState message={error} />
  if (locked) return <LockedState message={`Este remito está ${loaded?.state}. Los documentos emitidos no se editan.`} />

  const statusText = saving ? "Guardando…" : emitting ? "Generando remito…" : dirty ? "Cambios sin guardar" : loaded?.state === "Entregado" ? "Entregado · editable" : loaded ? "Borrador guardado" : "Aún no guardado"

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full flex-col" style={OSSUM_SCOPE_STYLE}>
      {/* ── HEADER ── */}
      <header className={`sticky top-0 z-30 ${NAVY} border-b border-[var(--ossum-navy)]`}>
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white h-9" onClick={(e) => requestLeave(() => router.push("/remitos"), e.currentTarget)}>
              <ArrowLeft className="size-4" /> Remitos
            </Button>
            {loaded && (
              <Button asChild type="button" variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white h-9">
                <a href={`/remitos/${loaded.id}/editar`} target="_blank" rel="noopener noreferrer" aria-describedby="new-tab-concurrency-note">
                  <ExternalLink className="size-4" /> Nueva pestaña
                </a>
              </Button>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <h1 ref={workspaceHeadingRef} tabIndex={-1} className="truncate text-base font-semibold text-white">
              {loaded ? `Remito ${loaded.visibleNumber ? `R-${String(loaded.visibleNumber).padStart(4, "0")}` : ""}` : "Nuevo remito"}
            </h1>
            <span className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${loaded ? "bg-white/15 text-white/90" : "bg-white/10 text-white/70"}`}>
              {statusText}
            </span>
            {preset?.available && (
              <Button type="button" variant="ghost" size="sm" className="hidden text-white/80 hover:bg-white/10 hover:text-white h-9 sm:inline-flex" onClick={applyPreset}>
                Cargar ejemplo DEV
              </Button>
            )}
            {loaded && <p id="new-tab-concurrency-note" className="sr-only">La edición simultánea se verifica al guardar.</p>}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-4 sm:px-6" aria-busy={saving || emitting}>
        {/* ── SECTION: Datos generales ── */}
        <Section label="Datos generales" className="mb-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            <CompactField label="Depósito de salida" required error={errors.branchId}>
              <Input ref={(el) => { refs.current.branchId = el }} value={branchLabel} onChange={(e) => update("branchId", e.target.value)} className={fieldClass} aria-invalid={Boolean(errors.branchId)} placeholder="Ej. Depósito Corrientes" readOnly={branchPresetLocked} aria-readonly={branchPresetLocked} title={branchPresetLocked ? "Depósito fijado por el preset DEV" : undefined} />
            </CompactField>
            <CompactField label="Sucursal central emisora">
              <Input value={issuedBranchLabel || branchLabel} onChange={(e) => update("issuedBranchId", e.target.value)} className={fieldClass} placeholder="Usa depósito salida" readOnly={branchPresetLocked} aria-readonly={branchPresetLocked} />
            </CompactField>
            <CompactField label="Motivo" required error={errors.salidaReason}>
              <select value={draft.salidaReason} onChange={(e) => update("salidaReason", e.target.value as RemitoSalidaReason)} className={selectClass} aria-label="Motivo de salida">
                {REMITO_SALIDA_REASONS.map((r) => <option key={r} value={r}>{({ cirugia: "Cirugía", venta: "Venta", prestamo: "Préstamo", traslado: "Traslado", ajuste: "Ajuste", otro: "Otro" } as const)[r]}</option>)}
              </select>
            </CompactField>
            <CompactField label="Origen">
              <select value={draft.origin} disabled={editing} onChange={(e) => update("origin", e.target.value as RemitoOrigin)} className={selectClass} aria-label="Origen">
                {REMITO_ORIGINS.map((o) => <option key={o} value={o}>{({ box: "Desde caja", presupuesto: "Desde presupuesto", manual: "Carga manual", mixto: "Origen mixto" } as const)[o]}</option>)}
              </select>
            </CompactField>
            <CompactField label="Cirugía / expediente" hint={surgeryLabel && surgeryLabel !== draft.surgeryId ? surgeryLabel : undefined}>
              <Input value={draft.surgeryId} onChange={(e) => update("surgeryId", e.target.value)} className={fieldClass} placeholder="Buscar cirugía… (próximamente)" aria-label="Cirugía o expediente" />
            </CompactField>
            <CompactField label="Destinatario">
              <Input value={draft.destinatarioNombre} onChange={(e) => update("destinatarioNombre", e.target.value)} className={fieldClass} placeholder="Nombre o razón social" />
            </CompactField>
            <CompactField label="Contacto">
              <Input value={draft.destinatarioContactId} onChange={(e) => update("destinatarioContactId", e.target.value)} className={fieldClass} placeholder="Código o referencia" />
            </CompactField>
            <CompactField label="Presupuesto">
              <Input value={draft.presupuestoId} onChange={(e) => update("presupuestoId", e.target.value)} className={fieldClass} placeholder="Opcional" />
            </CompactField>
            <CompactField label="Fecha de salida">
              <Input value={loaded?.issuedAt?.slice(0, 10) ?? "Se asigna al generar"} className={`${fieldClass} bg-[var(--ossum-surface-2)] text-gray-500`} readOnly aria-readonly="true" />
            </CompactField>
            <CompactField label="Bultos">
              <Input type="number" min="0" value={draft.packageCount} onChange={(e) => update("packageCount", e.target.value)} className={fieldClass} placeholder="0" />
            </CompactField>
            <CompactField label="Valor declarado">
              <Input type="number" min="0" step="0.01" value={draft.declaredValue} onChange={(e) => update("declaredValue", e.target.value)} className={fieldClass} placeholder="0.00" />
            </CompactField>
          </div>
        </Section>

        {/* ── SECTION: Detalle operativo (colapsable) ── */}
        <details className={`mb-3 rounded-md border ${LINE} ${SURFACE}`}>
          <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--ossum-navy)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)]">
            <ChevronRight className="size-3.5 [[open]>&]:hidden" />
            <ChevronDown className="hidden size-3.5 [[open]>&]:block" />
            Detalle operativo (transporte, destino, observaciones)
          </summary>
          <div className="border-t border-[var(--ossum-line)] px-3 py-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
              <CompactField label="Transporte"><Input value={draft.transporte} onChange={(e) => update("transporte", e.target.value)} className={fieldClass} /></CompactField>
              <CompactField label="Domicilio"><Input value={draft.domicilio} onChange={(e) => update("domicilio", e.target.value)} className={fieldClass} /></CompactField>
              <CompactField label="Localidad"><Input value={draft.localidad} onChange={(e) => update("localidad", e.target.value)} className={fieldClass} /></CompactField>
              <CompactField label="Provincia"><Input value={draft.provincia} onChange={(e) => update("provincia", e.target.value)} className={fieldClass} /></CompactField>
              <CompactField label="Observaciones" className="sm:col-span-3 lg:col-span-5">
                <Textarea value={draft.observaciones} onChange={(e) => update("observaciones", e.target.value)} className="min-h-16 text-sm" />
              </CompactField>
            </div>
          </div>
        </details>

        {/* ── SECTION: Material remitido — grilla principal ── */}
        <Section label="Material remitido" className="mb-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ossum-line)] bg-white px-2 py-1.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Buscar producto, SKU, lote o caja… (próximamente)" disabled className="h-8 border-[var(--ossum-line)] bg-[var(--ossum-surface-2)] pl-7 text-xs text-gray-400" aria-label="Buscar producto" />
            </div>
            <Button type="button" size="sm" variant="outline" disabled title="No hay catálogo disponible" className="h-8 border-[var(--ossum-line)] text-xs text-gray-400">
              <PackageSearch className="size-3.5" /> Producto · próximamente
            </Button>
            <Button type="button" size="sm" variant="outline" disabled title="No hay contrato de caja disponible" className="h-8 border-[var(--ossum-line)] text-xs text-gray-400">
              <SquareStack className="size-3.5" /> Caja · próximamente
            </Button>
            <Button type="button" size="sm" disabled title="No hay contrato de importación disponible" className="h-8 border-[var(--ossum-line)] text-xs text-gray-400">
              Importar desde pedido/matriz · próximamente
            </Button>
            <Button type="button" size="sm" className={`h-8 ${ACTION} text-xs`} onClick={() => { setDraft((c) => ({ ...c, items: [...c.items, emptyItem()] })); requestAnimationFrame(() => refs.current[`item-${draft.items.length}-description`]?.focus()) }}>
              <Plus className="size-3.5" /> Agregar renglón
            </Button>
          </div>

          {/* Grid — desktop */}
          <div className="hidden overflow-x-auto border-x border-b border-[var(--ossum-line)] md:block">
            <table className="w-full min-w-[1100px] text-xs">
              <thead className="bg-[var(--ossum-navy)] text-white">
                <tr>{["#", "SKU", "Producto / Caja", "Cant.", "Unidad", "Lote", "Serie / GTIN", "Vencimiento", "Stock", ""].map((h, i) => (
                  <th key={h} className={`px-2 py-1.5 text-left font-medium ${i === 0 ? "w-8 text-right" : ""} ${i === 3 ? "text-right" : ""} ${i === 8 ? "text-right" : ""} ${i === 9 ? "w-8" : ""}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {draft.items.map((item, index) => (
                  <GridRow key={index} item={item} index={index} errors={errors} refs={refs}
                    onChange={updateItem}
                    onRemove={() => setDraft((c) => ({ ...c, items: c.items.length === 1 ? c.items : c.items.filter((_, r) => r !== index) }))}
                    onEnter={() => focusNextRow(index)}
                    removable={draft.items.length > 1}
                  />
                ))}
              </tbody>
              <tfoot className="border-t border-[var(--ossum-line-strong)] bg-[var(--ossum-surface-2)]">
                <tr>
                  <td colSpan={3} className="px-2 py-1.5 text-right text-[11px] font-medium text-gray-600">Totales</td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[var(--ossum-navy)]">{new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(quantityTotal)}</td>
                  <td colSpan={5} className="px-2 py-1.5 text-[11px] text-gray-500">{lineCount} renglón{lineCount !== 1 ? "es" : ""}{boxCount > 0 ? ` · ${boxCount} caja${boxCount !== 1 ? "s" : ""}` : ""}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grid — mobile (stacked) */}
          <div className="space-y-2 border-x border-b border-[var(--ossum-line)] p-2 md:hidden">
            {draft.items.map((item, index) => (
              <MobileItemRow key={index} item={item} index={index} errors={errors} refs={refs}
                onChange={updateItem}
                onRemove={() => setDraft((c) => ({ ...c, items: c.items.length === 1 ? c.items : c.items.filter((_, r) => r !== index) }))}
                removable={draft.items.length > 1}
              />
            ))}
          </div>
        </Section>
      </main>

      {/* ── ACTION BAR ── */}
      <footer className={`sticky bottom-0 z-30 border-t border-[var(--ossum-line-strong)] ${SURFACE}`}>
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-h-5 flex-1 text-xs" aria-live="polite">
            {error ? (
              <span className="inline-flex items-center gap-1 text-[var(--ossum-danger)]"><CircleAlert className="size-3.5" /> {error}
                {conflict && <button type="button" className="ml-2 underline hover:no-underline" onClick={() => void reload()}>Actualizar desde servidor</button>}
              </span>
            ) : saving || emitting ? (
              <span className="inline-flex items-center gap-1 text-gray-500"><Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> {statusText}</span>
            ) : recoveryWarning ? (
              <span className="text-amber-600">{recoveryWarning}</span>
            ) : dirty ? (
              <span className="text-gray-500">Cambios sin guardar</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={(e) => requestLeave(() => router.push("/remitos"), e.currentTarget)} disabled={saving || emitting} className="h-9 border-[var(--ossum-line-strong)] text-xs">
              Volver
            </Button>
            <Button type="button" variant="outline" onClick={() => void save()} disabled={saving || emitting} className="h-9 border-[var(--ossum-line-strong)] text-xs">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar borrador"}
            </Button>
            {(!loaded || loaded.state === "Borrador") && <Button type="button" onClick={() => setConfirmEmitOpen(true)} disabled={saving || emitting} className={`h-9 text-xs ${ACTION}`}>
              {emitting ? "Generando…" : "Generar remito"}
            </Button>}
          </div>
        </div>
      </footer>

      {/* ── DIALOGS ── */}
      <Dialog open={confirmEmitOpen} onOpenChange={setConfirmEmitOpen}>
        <DialogContent className="sm:max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--ossum-navy)]">Generar remito</DialogTitle>
            <DialogDescription>Confirmá la generación del remito. Esta acción actualizará stock y el estado operativo asociado.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 py-2">
            <ConfirmStat label="Cajas" value={boxCount} />
            <ConfirmStat label="Productos" value={lineCount} />
            <ConfirmStat label="Unidades" value={quantityTotal} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEmitOpen(false)} disabled={emitting}>Cancelar</Button>
            <Button onClick={() => void generate()} disabled={emitting} className={ACTION}>
              {emitting ? "Generando…" : "Confirmar y generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(recoveryCandidate)} onOpenChange={(open) => { if (!open) setRecoveryCandidate(null) }}>
        <DialogContent showCloseButton={false} className="sm:max-w-md" onOpenAutoFocus={(e) => { e.preventDefault(); (recoverButtonRef.current?.isConnected ? recoverButtonRef.current : workspaceHeadingRef.current)?.focus() }} onCloseAutoFocus={(e) => { e.preventDefault(); (recoveryOpenerRef.current?.isConnected ? recoveryOpenerRef.current : workspaceHeadingRef.current)?.focus() }}>
          <DialogHeader>
            <DialogTitle>Recuperar cambios sin guardar</DialogTitle>
            <DialogDescription>Encontramos una copia temporal de este remito en esta sesión.</DialogDescription>
          </DialogHeader>
          {recoveryCandidate?.staleBase && <p role="status" className="text-sm text-amber-700">El remito fue actualizado en el servidor desde esta copia. Al guardar se conservará el control de concurrencia.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { clearRecovery(); setRecoveryCandidate(null) }}>Descartar</Button>
            <Button ref={recoverButtonRef} onClick={() => { if (!recoveryCandidate) return; setDraft({ ...emptyDraft(), ...recoveryCandidate.draft, items: recoveryCandidate.draft.items.map((item) => ({ ...emptyItem(), ...item })) }); setRecoveryCandidate(null) }}>Recuperar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={(open) => { setLeaveOpen(open); if (!open) setPendingLeave(null) }}>
        <DialogContent showCloseButton={false} className="sm:max-w-md" onOpenAutoFocus={(e) => { e.preventDefault(); continueEditingRef.current?.focus() }} onCloseAutoFocus={(e) => { e.preventDefault(); leaveOpenerRef.current?.focus() }}>
          <DialogHeader>
            <DialogTitle>Cambios sin guardar</DialogTitle>
            <DialogDescription>Podés guardarlos antes de salir o descartarlos.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button ref={continueEditingRef} variant="outline" onClick={() => setLeaveOpen(false)}>Seguir editando</Button>
            <Button variant="outline" onClick={() => { clearRecovery(); setLeaveOpen(false); pendingLeave?.() }}>Descartar cambios</Button>
            <Button onClick={() => void save().then((saved) => { if (saved) { setLeaveOpen(false); pendingLeave?.() } })}>Guardar borrador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Presentational components (rediseño V2) ─────────────────────────────────

function Section({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-md border ${LINE} bg-white ${className ?? ""}`}>
      <div className={`flex items-center gap-2 border-b border-[var(--ossum-line)] ${NAVY_SOFT} px-3 py-1.5`}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/90">{label}</h2>
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function CompactField({ label, required, error, hint, className, children }: { label: string; required?: boolean; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  const id = useId()
  const errorId = `${id}-error`
  const control = React.isValidElement<{ id?: string; "aria-describedby"?: string }>(children)
    ? React.cloneElement(children, { id: (children.props as { id?: string }).id ?? id, "aria-describedby": error ? errorId : (children.props as { "aria-describedby"?: string })["aria-describedby"] })
    : children
  return (
    <div className={className}>
      <div className="mb-0.5 flex items-baseline justify-between">
        <Label htmlFor={id} className="text-[11px] font-medium text-gray-500">{label}{required ? " *" : ""}</Label>
        {hint && <span className="truncate text-[10px] text-gray-400" title={hint}>{hint}</span>}
      </div>
      {control}
      {error && <p id={errorId} className="mt-0.5 text-[11px] text-[var(--ossum-danger)]" role="alert">{error}</p>}
    </div>
  )
}

function ConfirmStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-surface-2)] px-3 py-2 text-center">
      <p className="text-xl font-semibold tabular-nums text-[var(--ossum-navy)]">{new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(value)}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}

function GridRow({ item, index, errors, refs, onChange, onRemove, onEnter, removable }: {
  item: DraftItem; index: number; errors: Errors; refs: React.MutableRefObject<Record<string, HTMLElement | null>>
  onChange: (index: number, key: keyof DraftItem, value: string) => void; onRemove: () => void; onEnter: () => void; removable: boolean
}) {
  const cellInput = (key: keyof DraftItem, label: string, type = "text", extraClass = "") => (
    <Input
      ref={key === "description" || key === "quantity" ? (el) => { refs.current[`item-${index}-${key}`] = el } : undefined}
      type={type}
      min={key === "quantity" ? "0.0001" : undefined}
      step={key === "quantity" ? "0.0001" : undefined}
      value={item[key] as string}
      onChange={(e) => onChange(index, key, e.target.value)}
      onKeyDown={(e) => { if (key === "description" && e.key === "Enter") { e.preventDefault(); onEnter() } }}
      className={`${cellInputClass} ${extraClass}`}
      aria-label={`${label} del renglón ${index + 1}`}
      aria-invalid={Boolean(errors[`item-${index}-${key}`])}
    />
  )
  const rowError = errors[`item-${index}-description`] ?? errors[`item-${index}-quantity`]
  return (
    <tr className={`border-b border-[var(--ossum-line)] last:border-0 hover:bg-[var(--ossum-surface-2)]/60 ${rowError ? "bg-red-50/40" : ""}`}>
      <td className="px-1.5 py-0.5 text-right text-[11px] text-gray-400 tabular-nums">{index + 1}</td>
      <td className="px-0.5 py-0.5">{cellInput("sku", "SKU")}</td>
      <td className="px-0.5 py-0.5">
        {cellInput("description", "Descripción")}
        {rowError && <p className="mt-0.5 px-1.5 text-[10px] text-[var(--ossum-danger)]">{rowError}</p>}
      </td>
      <td className="px-0.5 py-0.5">{cellInput("quantity", "Cantidad", "number", "text-right tabular-nums font-medium")}</td>
      <td className="px-0.5 py-0.5">{cellInput("unit", "Unidad")}</td>
      <td className="px-0.5 py-0.5">{cellInput("lotNumber", "Lote")}</td>
      <td className="px-0.5 py-0.5">{cellInput("serialNumber", "Serie o GTIN")}</td>
      <td className="px-0.5 py-0.5">{cellInput("expirationDate", "Vencimiento", "date")}</td>
      <td className="px-1 py-0.5 text-right text-[11px] text-gray-300">—</td>
      <td className="px-0.5 py-0.5">
        <button type="button" disabled={!removable} onClick={onRemove} aria-label={`Quitar renglón ${index + 1}`} className="rounded p-1 text-gray-300 hover:bg-[var(--ossum-danger)]/10 hover:text-[var(--ossum-danger)] disabled:cursor-not-allowed disabled:opacity-40">
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </tr>
  )
}

function MobileItemRow({ item, index, errors, refs, onChange, onRemove, removable }: {
  item: DraftItem; index: number; errors: Errors; refs: React.MutableRefObject<Record<string, HTMLElement | null>>
  onChange: (index: number, key: keyof DraftItem, value: string) => void; onRemove: () => void; removable: boolean
}) {
  const control = (key: keyof DraftItem, label: string, type = "text") => (
    <CompactField label={label} error={errors[`item-${index}-${key}`]}>
      <Input
        ref={key === "description" || key === "quantity" ? (el) => { refs.current[`item-${index}-${key}`] = el } : undefined}
        type={type}
        min={key === "quantity" ? "0.0001" : undefined}
        step={key === "quantity" ? "0.0001" : undefined}
        value={item[key] as string}
        onChange={(e) => onChange(index, key, e.target.value)}
        className={fieldClass}
        aria-label={`${label} del renglón ${index + 1}`}
      />
    </CompactField>
  )
  return (
    <fieldset className="rounded-md border border-[var(--ossum-line)] p-2">
      <legend className="px-1 text-[11px] font-medium text-gray-500">Renglón {index + 1}</legend>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {control("description", "Descripción *")}
        {control("quantity", "Cantidad *", "number")}
        {control("sku", "SKU")}
        {control("unit", "Unidad")}
        {control("lotNumber", "Lote")}
        {control("serialNumber", "Serie / GTIN")}
        <div className="col-span-2">{control("expirationDate", "Vencimiento", "date")}</div>
      </div>
      <button type="button" disabled={!removable} onClick={onRemove} className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--ossum-danger)] disabled:opacity-40">
        <Trash2 className="size-3" /> Quitar renglón
      </button>
    </fieldset>
  )
}

function WorkspaceSkeleton() {
  return (
    <div className="min-h-full p-6" style={OSSUM_SCOPE_STYLE}>
      <div className="mx-auto max-w-[1800px] animate-pulse motion-reduce:animate-none space-y-3">
        <div className="h-10 rounded-md bg-[var(--ossum-navy)]/10" />
        <div className="h-32 rounded-md bg-white/60" />
        <div className="h-64 rounded-md bg-white/60" />
      </div>
    </div>
  )
}

function LockedState({ message }: { message: string }) {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-xl p-6" style={OSSUM_SCOPE_STYLE}>
      <div className="rounded-md border border-[var(--ossum-line)] bg-white p-6">
        <FilePlus2 className="size-5 text-gray-400" />
        <h1 className="mt-3 text-base font-semibold text-[var(--ossum-navy)]">Edición no disponible</h1>
        <p className="mt-1.5 text-sm text-gray-500">{message}</p>
        <Button className={`mt-4 ${ACTION}`} onClick={() => router.replace("/remitos")}>Volver a remitos</Button>
      </div>
    </main>
  )
}

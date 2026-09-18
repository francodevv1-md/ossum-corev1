"use client"

export const REMITO_WORKSPACE_DRAFT_TTL_MS = 12 * 60 * 60 * 1000
export const REMITO_WORKSPACE_DRAFT_MAX_BYTES = 64 * 1024

export type RemitoWorkspaceDraftContext = {
  userId: string
  companyId: string
  mode: "create" | "edit"
  remitoId?: string
}

type DraftEnvelope<T> = {
  version: 1
  context: RemitoWorkspaceDraftContext
  expiresAt: number
  serverBase: string | null
  draft: T
}

export type DraftRecoveryRead<T> =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "valid"; envelope: DraftEnvelope<T> }

export function remitoWorkspaceDraftKey(context: RemitoWorkspaceDraftContext) {
  const segment = (value: string) => encodeURIComponent(value)
  return ["ossum:remito-workspace-draft:v1", segment(context.userId), segment(context.companyId), context.mode, context.mode === "edit" ? segment(context.remitoId ?? "") : "new"].join(":")
}

function sameContext(left: RemitoWorkspaceDraftContext, right: RemitoWorkspaceDraftContext) {
  return left.userId === right.userId && left.companyId === right.companyId && left.mode === right.mode && (left.remitoId ?? undefined) === (right.remitoId ?? undefined)
}

function storageAvailable() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

export function readRemitoWorkspaceDraft<T>(context: RemitoWorkspaceDraftContext, isDraft: (value: unknown) => value is T, now = Date.now()): DraftRecoveryRead<T> {
  if (!storageAvailable()) return { status: "none" }

  const key = remitoWorkspaceDraftKey(context)
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return { status: "none" }
    let parsed: Partial<DraftEnvelope<unknown>>
    try { parsed = JSON.parse(raw) as Partial<DraftEnvelope<unknown>> } catch { window.sessionStorage.removeItem(key); return { status: "invalid" } }
    if (!parsed || parsed.version !== 1 || !parsed.context || !sameContext(parsed.context, context) || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= now || typeof parsed.serverBase !== "string" && parsed.serverBase !== null || !isDraft(parsed.draft)) { window.sessionStorage.removeItem(key); return { status: "invalid" } }
    return { status: "valid", envelope: parsed as DraftEnvelope<T> }
  } catch {
    return { status: "invalid" }
  }
}

export function writeRemitoWorkspaceDraft<T>(context: RemitoWorkspaceDraftContext, draft: T, serverBase: string | null, now = Date.now()) {
  if (!storageAvailable()) return { status: "unavailable" as const }

  const envelope: DraftEnvelope<T> = { version: 1, context, expiresAt: now + REMITO_WORKSPACE_DRAFT_TTL_MS, serverBase, draft }
  try {
    const serialized = JSON.stringify(envelope)
    if (new Blob([serialized]).size > REMITO_WORKSPACE_DRAFT_MAX_BYTES) return { status: "too_large" as const }
    window.sessionStorage.setItem(remitoWorkspaceDraftKey(context), serialized)
    return { status: "written" as const }
  } catch {
    return { status: "failed" as const }
  }
}

export function clearRemitoWorkspaceDraft(context: RemitoWorkspaceDraftContext) {
  if (!storageAvailable()) return false
  try {
    window.sessionStorage.removeItem(remitoWorkspaceDraftKey(context))
    return true
  } catch {
    return false
  }
}

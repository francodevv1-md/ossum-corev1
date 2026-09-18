"use client"

import { buildReceiptFlowQuery, type ReceiptFlowContext } from "@/lib/digital-receipts/ui"

const STORAGE_KEY = "digital-receipt-public-preview-tokens"

type StoredPreviewToken = {
  receiptId: string
  accessId: string
  token: string
  tokenLastFour?: string
}

type StoredPreviewTokenMap = Record<string, StoredPreviewToken>

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

function readStoredPreviewTokenMap(): StoredPreviewTokenMap {
  if (!canUseSessionStorage()) return {}

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

    return parsed as StoredPreviewTokenMap
  } catch {
    return {}
  }
}

function writeStoredPreviewTokenMap(value: StoredPreviewTokenMap) {
  if (!canUseSessionStorage()) return

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // noop
  }
}

export function storeDigitalReceiptPublicPreviewToken(input: StoredPreviewToken) {
  const current = readStoredPreviewTokenMap()
  current[input.receiptId] = input
  writeStoredPreviewTokenMap(current)
}

export function getDigitalReceiptPublicPreviewToken(receiptId: string) {
  return readStoredPreviewTokenMap()[receiptId] ?? null
}

export function clearDigitalReceiptPublicPreviewToken(receiptId: string) {
  const current = readStoredPreviewTokenMap()
  if (!current[receiptId]) return

  delete current[receiptId]
  writeStoredPreviewTokenMap(current)
}

export function resolveDigitalReceiptPublicPreviewHref({
  receiptId,
  accessId,
  tokenLastFour,
  context,
}: {
  receiptId: string
  accessId?: string
  tokenLastFour?: string
  context?: ReceiptFlowContext
}) {
  const stored = getDigitalReceiptPublicPreviewToken(receiptId)
  if (!stored?.token) return null

  if (accessId && stored.accessId !== accessId) {
    return null
  }

  if (tokenLastFour && stored.tokenLastFour && stored.tokenLastFour !== tokenLastFour) {
    return null
  }

  return `/ventas/recibos/publico/${encodeURIComponent(stored.token)}${buildReceiptFlowQuery(context)}`
}

export function resolveDigitalReceiptPublicPreviewState({
  receiptId,
  accessId,
  tokenLastFour,
  context,
}: {
  receiptId: string
  accessId?: string
  tokenLastFour?: string
  context?: ReceiptFlowContext
}) {
  if (!accessId) {
    return {
      status: "unavailable" as const,
      href: null,
      label: "Todavía no hay acceso público activo",
      detail: "Primero emití un acceso interno para generar un token público real.",
    }
  }

  const stored = getDigitalReceiptPublicPreviewToken(receiptId)
  if (!stored?.token) {
    return {
      status: "reissue_required" as const,
      href: null,
      label: "Hace falta reemitir el acceso en este navegador",
      detail: "Existe un acceso activo, pero esta sesión no conserva el token necesario para abrir la preview pública real.",
    }
  }

  if (stored.accessId !== accessId) {
    return {
      status: "reissue_required" as const,
      href: null,
      label: "El token guardado ya no coincide con el acceso activo",
      detail: "Reemití el acceso para refrescar el token público real en esta sesión.",
    }
  }

  if (tokenLastFour && stored.tokenLastFour && stored.tokenLastFour !== tokenLastFour) {
    return {
      status: "reissue_required" as const,
      href: null,
      label: "El token guardado quedó desactualizado",
      detail: "La preview pública real requiere volver a emitir el acceso activo para sincronizar el token.",
    }
  }

  return {
    status: "available" as const,
    href: `/ventas/recibos/publico/${encodeURIComponent(stored.token)}${buildReceiptFlowQuery(context)}`,
    label: "Preview pública real disponible en este navegador",
    detail: "Esta sesión conserva el token del acceso activo y puede abrir la firma pública real.",
  }
}

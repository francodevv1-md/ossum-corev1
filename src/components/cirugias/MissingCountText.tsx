"use client"

/**
 * MissingCountText — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-04)
 *
 * Pure presentational footer line that reports the current count of missing
 * required fields on Paso 1 ("Datos del caso"), derived from
 * `Object.keys(step0Errors).length` computed by the existing `validateStep0`.
 *
 * Constraints (DESIGN §4.3/§7.4):
 * - Informational only. Does NOT disable "Siguiente" (AC-04).
 * - Reads the count via props; no internal state, no validation pass.
 * - Amber token set reused from NewSurgeryDialog.tsx L838 (AC-07).
 */

import { AlertTriangle } from "lucide-react"

export type MissingCountTextProps = {
  count: number
}

export function MissingCountText({ count }: MissingCountTextProps) {
  if (count <= 0) return null

  const text = count === 1 ? "Faltan 1 obligatorio" : `Faltan ${count} obligatorios`

  return (
    <span className="mr-auto inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="size-3.5" />
      {text}
    </span>
  )
}

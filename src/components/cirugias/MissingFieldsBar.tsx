"use client"

/**
 * MissingFieldsBar — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-01)
 *
 * Pure presentational bar that renders each missing required field on Paso 1
 * ("Datos del caso") as a clickable chip. Clicking a chip focuses the
 * corresponding input via a `data-step0-field="<key>"` wrapper attribute
 * declared in NewSurgeryDialog.tsx (DESIGN §5/§6.5).
 *
 * Constraints (DESIGN §4.1):
 * - No internal state. Reads `step0Errors` via props only.
 * - Does NOT call `validateStep0`, does NOT recompute errors, does NOT mutate
 *   form state, does NOT clear errors, does NOT advance the wizard.
 * - On chip click: focus + scrollIntoView only (or delegate to `onFocusField`).
 * - Emerald/amber design tokens only — no mockup hex values (AC-07).
 */

import { AlertTriangle } from "lucide-react"

import type { Step0ErrorKey, Step0Errors } from "@/components/cirugias/dialogs/NewSurgeryDialog"

export type MissingFieldTarget = {
  /** Human-readable chip label (Spanish, matches the field label minus the asterisk). */
  label: string
  /** CSS selector for the field wrapper carrying data-step0-field="<key>". */
  focusSelector: string
}

export type MissingFieldsBarProps = {
  /** Read-only view of the existing step0Errors state. */
  errors: Step0Errors
  /** Label + focus-target map for every possible error key. */
  fields: Record<Step0ErrorKey, MissingFieldTarget>
  /**
   * Optional override for the focus action. When omitted, the bar performs
   * the focus internally: document.querySelector(focusSelector)
   *   ?.querySelector('input, button, select, textarea')?.focus() + scrollIntoView.
   * Provided mainly for unit testing.
   */
  onFocusField?: (key: Step0ErrorKey, focusSelector: string) => void
}

// Visual chip order (APPLY-NUEVA-CIRUGIA-POLISH-001):
// client → patient → surgeon → institution → classification.
const STEP0_ERROR_ORDER: readonly Step0ErrorKey[] = [
  "client",
  "patient",
  "surgeon",
  "institution",
  "classification",
] as const

/**
 * Focus the first focusable element inside the wrapper carrying
 * `data-step0-field="<key>"`. Focus-only — no state mutation.
 */
function focusFieldTarget(focusSelector: string): void {
  if (typeof document === "undefined") return
  const wrapper = document.querySelector<HTMLElement>(focusSelector)
  if (!wrapper) return
  const focusable = wrapper.querySelector<HTMLElement>(
    "input, button, select, textarea"
  )
  focusable?.focus()
  focusable?.scrollIntoView({ behavior: "smooth", block: "center" })
}

export function MissingFieldsBar({ errors, fields, onFocusField }: MissingFieldsBarProps) {
  const presentKeys = STEP0_ERROR_ORDER.filter((key) => Boolean(errors[key]))

  if (presentKeys.length === 0) return null

  const handleChipClick = (key: Step0ErrorKey, focusSelector: string) => {
    if (onFocusField) {
      onFocusField(key, focusSelector)
      return
    }
    focusFieldTarget(focusSelector)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <AlertTriangle className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Faltan datos obligatorios:
        </span>
        {presentKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleChipClick(key, fields[key].focusSelector)}
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          >
            {fields[key].label}
          </button>
        ))}
      </div>
    </div>
  )
}

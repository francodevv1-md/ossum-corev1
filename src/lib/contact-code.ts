// src/lib/contact-code.ts
// Contacto code format helpers — Phase 1 (Zustand prototype).
// Forward-compat: signatures are stable for Phase 2 (DB-backed counter).

export const CONTACT_CODE_PREFIX = "C-" as const
export const CONTACT_CODE_MIN_WIDTH = 4 as const
/** Canonical stored/recognized contact code. Matches C-0001, C-9999, C-10000… */
export const CONTACT_CODE_REGEX = /^C-\d{4,}$/

/** Input acceptance, case-insensitive (typing tolerance). */
export const CONTACT_CODE_INPUT_REGEX = /^(C-?)?\d{1,}$/i

/**
 * Format a positive integer n as a canonical contact code C-00..0n
 * (MIN_WIDTH zero-pad, auto-grow to 5 digits when n >= 10000).
 */
export function formatContactCode(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`formatContactCode: n must be a positive integer (got ${n})`)
  }
  return `${CONTACT_CODE_PREFIX}${String(n).padStart(CONTACT_CODE_MIN_WIDTH, "0")}`
}

/**
 * Parse a canonical code into its integer suffix.
 * Returns null if code is not strictly canonical (no input tolerance here).
 */
export function parseContactCode(code: string): number | null {
  if (typeof code !== "string") return null
  const m = code.match(CONTACT_CODE_REGEX)
  if (!m) return null
  return Number(code.slice(CONTACT_CODE_PREFIX.length))
}

/** True iff code is exactly the canonical stored form. */
export function isValidContactCodeFormat(code: string): boolean {
  return typeof code === "string" && CONTACT_CODE_REGEX.test(code)
}

/**
 * Normalize a loose user input into the canonical form, or null if unparseable.
 * Accepts case-insensitive prefix, optional dash, and any digit run:
 *   "1" → "C-0001", "0001" → "C-0001", "C-1" → "C-0001", "c-0001" → "C-0001".
 *   "C-10000" → "C-10000" (auto-grow, no truncation).
 *   "" / "abc" / "C-abc" / "C-" / "12a" → null.
 */
export function normalizeContactCode(input: string): string | null {
  if (typeof input !== "string") return null
  const trimmed = input.trim()
  if (!trimmed) return null
  if (!CONTACT_CODE_INPUT_REGEX.test(trimmed)) return null
  const digits = trimmed.replace(/^(C-?)/i, "")
  const n = Number(digits)
  if (!Number.isInteger(n) || n < 1) return null
  return formatContactCode(n)
}
// CHATZAI-020A: Counter initialized high to avoid collisions with mock data IDs.
// Mock data uses IDs like CX-0001..CX-0006, PR-0001..PR-0006, CONT-0001..CONT-0015 etc.
//
// BUGFIX (2026-06-29): Sequential counter (`NOT-9001`, `NOT-9002`...) was a
// module-level `let counter = 9000` that reset on every page load. When Zustand
// persist rehydrates previously-created entities from localStorage, the counter
// restarts from 9000 and produces IDs that collide with existing records,
// causing React "duplicate key" warnings.
//
// Fix: Use crypto.randomUUID() for guaranteed uniqueness. No counter state,
// no localStorage coordination needed. The format changes from `PREFIX-NNNN`
// to `PREFIX-{uuid12}` (first 12 hex chars of a UUID, compact and unique).
export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    // Strip dashes, take first 12 chars for a compact unique suffix.
    // Full UUID = 36 chars with dashes, 32 without. 12 hex chars = 48 bits
    // of randomness, far beyond what a sequential counter provides.
    const uuid = crypto.randomUUID().replace(/-/g, "")
    return `${prefix}-${uuid.slice(0, 12)}`
  }

  // Fallback for environments without crypto.randomUUID (should not happen
  // in modern browsers or Node ≥19). Timestamp + random still gives
  // practical uniqueness.
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${ts}${rand}`
}

export function nowDate(): string {
  return new Date().toISOString().split("T")[0]
}

export function nowTime(): string {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

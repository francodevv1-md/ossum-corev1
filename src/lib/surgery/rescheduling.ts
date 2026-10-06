import type { Surgery } from "@/types"

export type ReschedulingSaveResult = { partialError?: string; noteSaved?: boolean }

export function argentinaDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

export function encodeReschedulingDate(day: string, time?: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    throw new Error("Fecha inválida")
  }
  if (time !== undefined && time !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Hora inválida")
  return new Date(`${day}T${time || "00:00"}:00${time === undefined ? "Z" : "-03:00"}`).toISOString()
}

export function buildReschedulingPatch(existing: Pick<Surgery, "date" | "time" | "surgeryTimeSpecified" | "fechaEnvioMaterial" | "materialTransport" | "urgente">, updates: Partial<Surgery>) {
  const patch: { surgeryDate?: string | null; surgeryTimeSpecified?: boolean | null; materialShippingDate?: string | null; materialTransport?: string | null; priority?: "urgent" | "normal" } = {}
  const date = updates.date ?? existing.date
  const time = updates.time ?? existing.time ?? ""
  if ((updates.date !== undefined && date !== (existing.date || "")) || (updates.time !== undefined && time !== (existing.time || ""))) {
    patch.surgeryDate = date ? encodeReschedulingDate(date, time) : null
    patch.surgeryTimeSpecified = date ? Boolean(time) : null
  }
  if (updates.fechaEnvioMaterial !== undefined && updates.fechaEnvioMaterial !== (existing.fechaEnvioMaterial || "")) {
    patch.materialShippingDate = updates.fechaEnvioMaterial ? encodeReschedulingDate(updates.fechaEnvioMaterial).slice(0, 10) : null
  }
  if (updates.materialTransport !== undefined && updates.materialTransport !== (existing.materialTransport || "")) patch.materialTransport = updates.materialTransport || null
  if (updates.urgente !== undefined && updates.urgente !== Boolean(existing.urgente)) patch.priority = updates.urgente ? "urgent" : "normal"
  return patch
}

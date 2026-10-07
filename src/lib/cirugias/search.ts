import type { Surgery } from "@/types"
import type { SearchChip, SearchChipField } from "@/lib/cirugias.types"
import { normalizeAccents } from "@/lib/utils"

export type SurgerySearchRecord = Pick<Surgery,
  "id" | "visibleNumber" | "patient" | "surgeon" | "institution" | "client" | "prNumber" | "expedienteNumber"
>

export type SurgerySearchSuggestion = Omit<SearchChip, "id">

const SEARCH_FIELDS = [
  { field: "paciente", key: "patient", label: "Paciente" },
  { field: "medico", key: "surgeon", label: "Médico" },
  { field: "institucion", key: "institution", label: "Institución" },
  { field: "cliente", key: "client", label: "Cliente" },
  { field: "general", key: "id", label: "Cirugía" },
  { field: "general", key: "visibleNumber", label: "Cirugía" },
  { field: "general", key: "prNumber", label: "Presupuesto" },
  { field: "general", key: "expedienteNumber", label: "Expediente" },
] as const

export function normalizeSurgerySearch(value: string): string {
  return normalizeAccents(value).trim().replace(/\s+/g, " ")
}

export function matchesSurgerySearchText(
  surgery: SurgerySearchRecord,
  query: string,
  field: SearchChipField = "general",
): boolean {
  const q = normalizeSurgerySearch(query)
  if (!q) return false
  return SEARCH_FIELDS.some((entry) =>
    (field === "general" || entry.field === field)
    && normalizeSurgerySearch(surgery[entry.key] || "").includes(q),
  )
}

// Suggestions use the same fields/normalization as the actual filter. The caller
// supplies its authorized dataset; this helper never fetches or widens that scope.
export function getSurgerySearchSuggestions(
  surgeries: readonly SurgerySearchRecord[],
  query: string,
): SurgerySearchSuggestion[] {
  const q = normalizeSurgerySearch(query)
  if (!q) return []

  const suggestions: SurgerySearchSuggestion[] = []
  const seen = new Set<string>()
  const counts = new Map<SearchChipField, number>()
  for (const entry of SEARCH_FIELDS) {
    for (const surgery of surgeries) {
      const value = (surgery[entry.key] || "").trim()
      const normalized = normalizeSurgerySearch(value)
      const key = `${entry.field}:${normalized}`
      if (!normalized.includes(q) || seen.has(key)) continue
      if ((counts.get(entry.field) ?? 0) >= 5) break
      seen.add(key)
      counts.set(entry.field, (counts.get(entry.field) ?? 0) + 1)
      suggestions.push({ field: entry.field, value, match: "text", label: `${entry.label}: ${value}` })
    }
  }
  return suggestions
}

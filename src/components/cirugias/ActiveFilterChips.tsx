"use client"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FilterChip, SearchChip, SearchChipField } from "@/lib/cirugias.types"

// ═══════════════════════════════════════════════════════════════
// Chip colors by search field
// ═══════════════════════════════════════════════════════════════

const SEARCH_CHIP_COLORS: Record<SearchChipField, string> = {
  medico: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
  paciente: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
  cliente: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
  institucion: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
  general: "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
}

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface ActiveFilterChipsProps {
  chips: FilterChip[]
  searchChips: SearchChip[]
  onRemoveSearchChip: (chipId: string) => void
  hasExtendedSearch: boolean
  onClearExtendedSearch: () => void
  onClearAll: () => void
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function ActiveFilterChips({
  chips,
  searchChips,
  onRemoveSearchChip,
  hasExtendedSearch,
  onClearExtendedSearch,
  onClearAll,
}: ActiveFilterChipsProps) {
  const hasAny = chips.length > 0 || searchChips.length > 0 || hasExtendedSearch

  if (!hasAny) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Search chips */}
      {searchChips.map((chip) => (
        <span
          key={chip.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
            SEARCH_CHIP_COLORS[chip.field]
          )}
        >
          {chip.label}
          <button
            onClick={() => onRemoveSearchChip(chip.id)}
            className="hover:opacity-70"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {/* Regular filter chips */}
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700"
        >
          {chip.label}
          <button onClick={chip.onClear} className="hover:text-blue-900">
            <X className="size-3" />
          </button>
        </span>
      ))}

      {/* Extended search indicator */}
      {hasExtendedSearch && (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] text-amber-700">
          Búsqueda extendida
          <button onClick={onClearExtendedSearch} className="hover:text-amber-900">
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* Limpiar todo */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] text-blue-600 px-1"
        onClick={onClearAll}
      >
        Limpiar todo
      </Button>
    </div>
  )
}

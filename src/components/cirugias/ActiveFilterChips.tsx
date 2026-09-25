"use client"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FilterChip, SearchChip, SearchChipField } from "@/lib/cirugias.types"
import type { CxOperationPresetKey } from "./CxOperationPresets"
import { CX_OPERATION_PRESETS } from "./CxOperationPresets"

// ═══════════════════════════════════════════════════════════════
// Chip colors by search field
// ═══════════════════════════════════════════════════════════════

const SEARCH_CHIP_COLORS: Record<SearchChipField, string> = {
  medico: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50",
  paciente: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50",
  cliente: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50",
  institucion: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50",
  general: "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
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
  selectedPreset?: CxOperationPresetKey | null
  onClearPreset?: () => void
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
  selectedPreset,
  onClearPreset,
}: ActiveFilterChipsProps) {
  const hasAny = chips.length > 0 || searchChips.length > 0 || hasExtendedSearch || !!selectedPreset

  if (!hasAny) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-slate-300/80 bg-white/85 px-2.5 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Activos</span>
      <AnimatePresence mode="popLayout">
        {selectedPreset ? (
          <motion.span
            key={`preset-${selectedPreset}`}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-1 rounded-sm border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 shadow-sm dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
          >
            Preset: {CX_OPERATION_PRESETS[selectedPreset].label}
            <button type="button" aria-label={`Limpiar preset ${CX_OPERATION_PRESETS[selectedPreset].label}`} onClick={onClearPreset} className="hover:text-violet-900">
              <X className="size-3" />
            </button>
          </motion.span>
        ) : null}
        {/* Search chips */}
        {searchChips.map((chip) => (
          <motion.span
            key={chip.id}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-semibold shadow-sm",
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
          </motion.span>
        ))}

        {/* Regular filter chips */}
        {chips.map((chip) => (
          <motion.span
            key={chip.key}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-1 rounded-sm border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 shadow-sm dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
          >
            {chip.label}
            <button onClick={chip.onClear} className="hover:text-blue-900">
              <X className="size-3" />
            </button>
          </motion.span>
        ))}

        {/* Extended search indicator */}
        {hasExtendedSearch && (
          <motion.span
            key="extended-search"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          >
            Búsqueda extendida
            <button onClick={onClearExtendedSearch} className="hover:text-amber-900">
              <X className="size-3" />
            </button>
          </motion.span>
        )}
      </AnimatePresence>

      {/* Limpiar todo */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 rounded-sm px-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-200"
        onClick={onClearAll}
      >
        Limpiar todo
      </Button>
    </div>
  )
}

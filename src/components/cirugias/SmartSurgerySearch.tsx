"use client"

import React, { useState, useRef, useMemo, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Hash } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import type { SearchChip, SearchChipField } from "@/lib/cirugias.types"
import { cn } from "@/lib/utils"
import { generateId } from "@/lib/idGenerators"
import {
  getSurgerySearchSuggestions,
  normalizeSurgerySearch,
  type SurgerySearchRecord,
  type SurgerySearchSuggestion,
} from "@/lib/cirugias/search"

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

export interface SmartSurgerySearchProps {
  /** Supply only surgeries authorized for the caller's current scope. */
  surgeries: readonly SurgerySearchRecord[]
  chips: SearchChip[]
  onChipsChange: (chips: SearchChip[]) => void
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const FIELD_BADGE_COLORS: Record<SearchChipField, string> = {
  medico: "bg-violet-50 border-violet-200 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300",
  paciente: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  cliente: "bg-amber-50 border-amber-200 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  institucion: "bg-sky-50 border-sky-200 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
  general: "bg-gray-50 border-gray-200 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function SmartSurgerySearch({ surgeries, chips, onChipsChange }: SmartSurgerySearchProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const isAlreadyChipped = (suggestion: SurgerySearchSuggestion) => chips.some((chip) =>
    chip.field === suggestion.field
    && (chip.match === "text" || chip.field === "general")
    && normalizeSurgerySearch(chip.value) === normalizeSurgerySearch(suggestion.value),
  )
  const suggestions = useMemo(() => getSurgerySearchSuggestions(surgeries, query), [surgeries, query])
  const options = suggestions.filter((suggestion) => !isAlreadyChipped(suggestion))

  const addChip = (suggestion: SurgerySearchSuggestion) => {
    if (!normalizeSurgerySearch(suggestion.value)) return
    if (!isAlreadyChipped(suggestion)) onChipsChange([...chips, { ...suggestion, id: generateId("chip") }])
    inputRef.current?.focus()
    setQuery("")
    setOpen(false)
    setActiveIndex(-1)
  }
  const addGeneralChip = () => addChip({ field: "general", value: query.trim(), match: "text", label: `Búsqueda: ${query.trim()}` })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === "Enter") {
      e.preventDefault()
      if (open && options[activeIndex]) addChip(options[activeIndex])
      else addGeneralChip()
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && options.length > 0) {
      e.preventDefault()
      setOpen(true)
      const next = e.key === "ArrowDown"
        ? (activeIndex + 1) % options.length
        : (activeIndex <= 0 ? options.length - 1 : activeIndex - 1)
      setActiveIndex(next)
      document.getElementById(`${listId}-${next}`)?.scrollIntoView?.({ block: "nearest" })
    } else if (e.key === "Escape") {
      setOpen(false)
      setActiveIndex(-1)
    } else if (e.key === "Backspace" && !query && chips.length > 0) {
      onChipsChange(chips.slice(0, -1))
    }
  }

  return (
    <div className="flex w-full items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div
            ref={anchorRef}
            className={cn(
               "flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1 rounded-sm border border-slate-300 bg-white px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900",
                "cursor-text",
                "focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-300 dark:focus-within:border-slate-500 dark:focus-within:ring-slate-600",
                "hover:border-slate-400 dark:hover:border-slate-500"
              )}
            onClick={() => inputRef.current?.focus()}
            role="search"
            aria-label="Buscar cirugías"
          >
            {/* Existing chips */}
            <AnimatePresence mode="popLayout">
              {chips.map((chip) => (
                <motion.div
                  key={chip.id}
                  className="max-w-full"
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 max-w-full gap-0.5 border px-1.5 text-[10px] font-semibold shadow-sm",
                      FIELD_BADGE_COLORS[chip.field]
                    )}
                  >
                    <span className="min-w-0 truncate">{chip.label}</span>
                    <button
                      type="button"
                      aria-label={`Quitar ${chip.label}`}
                      className="ml-0.5 shrink-0 hover:opacity-70 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onChipsChange(chips.filter((c) => c.id !== chip.id))
                        setActiveIndex(-1)
                      }}
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Search input */}
              <div className="relative min-w-[120px] flex-1">
                <Search className="absolute left-0.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                ref={inputRef}
                inputMode="search"
                role="combobox"
                aria-label="Buscar cirugías"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(-1)
                  setOpen(Boolean(normalizeSurgerySearch(e.target.value)))
                }}
                onFocus={() => {
                  if (query.trim()) setOpen(true)
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  chips.length > 0
                    ? "Agregar filtro..."
                    : "Paciente, médico, cliente, institución, CX/PR/expediente…"
                }
                className="h-7 w-full border-0 bg-transparent px-0 pl-5 text-[13px] shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] border-slate-300 p-0 shadow-md dark:border-slate-700 dark:bg-slate-950"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault()
          }}
        >
          <div id={listId} role="listbox" aria-label="Sugerencias de cirugías" className="max-h-72 overflow-y-auto p-1">
            {options.map((suggestion, index) => (
              <button
                key={`${suggestion.field}:${normalizeSurgerySearch(suggestion.value)}`}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={index === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addChip(suggestion)}
                className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-xs hover:bg-accent", index === activeIndex && "bg-accent")}
              >
                <Hash className="size-3.5 shrink-0 text-muted-foreground" />
                <span>{suggestion.label}</span>
              </button>
            ))}
          </div>
          {suggestions.length === 0 && query.trim() && (
            <p className="px-3 py-2 text-xs text-muted-foreground" role="status">Sin sugerencias en las cirugías cargadas de esta empresa/sucursal.</p>
          )}
          {query.trim() && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={addGeneralChip} className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs hover:bg-accent">
              <Search className="size-3.5 shrink-0" />
              <span>Buscar: &quot;{query.trim()}&quot;</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Enter</span>
            </button>
          )}
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 shrink-0 rounded-sm border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-2.5"
        onClick={addGeneralChip}
        disabled={!normalizeSurgerySearch(query)}
        aria-label="Ejecutar búsqueda"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Buscar</span>
      </Button>
    </div>
  )
}

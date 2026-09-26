"use client"

import React, { useState, useRef, useMemo, useCallback } from "react"
import { Search, X, User, Building2, Hospital, CreditCard, Hash } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useOrtoTrackStore } from "@/lib/store"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import type { Contacto, ContactRole } from "@/types"
import type { SearchChip, SearchChipField } from "@/lib/cirugias.types"
import { cn } from "@/lib/utils"
import { normalizeAccents } from "@/lib/utils"

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface SmartSurgerySearchProps {
  chips: SearchChip[]
  onChipsChange: (chips: SearchChip[]) => void
  onSearch: () => void
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

/**
 * CHATZAI-025A.2: Role config for grouped suggestions.
 * Each entry defines a search context: role + groups → chip field.
 * All groups are searched independently so "López" appears in both
 * Médicos and Pacientes when matching contacts exist.
 */
const ROLE_CONFIG: Array<{
  role: ContactRole
  groups: string[]
  field: SearchChipField
  label: string
  singular: string
  icon: React.ElementType
}> = [
  { role: "cliente", groups: ["medicos"], field: "medico", label: "Médicos", singular: "Médico", icon: User },
  { role: "cliente", groups: ["pacientes"], field: "paciente", label: "Pacientes", singular: "Paciente", icon: User },
  { role: "cliente", groups: ["obras_sociales", "art", "particulares", "prepagas"], field: "cliente", label: "Clientes / OS", singular: "Cliente", icon: CreditCard },
  { role: "cliente", groups: ["instituciones"], field: "institucion", label: "Instituciones", singular: "Institución", icon: Hospital },
]

/**
 * CHATZAI-025A.2: Surgery-level suggestion types.
 * These search directly in surgery data, not in contactos.
 */
interface SurgerySuggestion {
  surgeryId: string
  display: string
  context: string
  field: SearchChipField
}

const FIELD_BADGE_COLORS: Record<SearchChipField, string> = {
  medico: "bg-violet-50 border-violet-200 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300",
  paciente: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  cliente: "bg-amber-50 border-amber-200 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  institucion: "bg-sky-50 border-sky-200 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
  general: "bg-gray-50 border-gray-200 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
}

/** Max results per group — balanced so one category doesn't dominate */
const MAX_RESULTS_PER_GROUP = 5

/** Max surgery-level suggestions */
const MAX_SURGERY_SUGGESTIONS = 3

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function generateChipId(): string {
  return `chip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Build surgery-level suggestions by searching directly in surgery data.
 * This complements contacto-based suggestions for cases where a name
 * appears in surgery data but not (yet) in contactos, or for surgery
 * IDs/PR numbers.
 */
function buildSurgerySuggestions(
  query: string,
  surgeries: Array<{ id: string; backendId?: string; patient: string; surgeon: string; institution: string; client: string; expedienteNumber?: string }>,
  existingContactoMatches: Set<string>, // contacto names already matched, to avoid duplicates
  presupuestoIdentities: Map<string, string>,
): SurgerySuggestion[] {
  const q = normalizeAccents(query.trim().toLowerCase())
  if (!q) return []

  const suggestions: SurgerySuggestion[] = []
  const seen = new Set<string>() // avoid duplicate suggestions

  for (const s of surgeries) {
    // Check patient — only add if not already matched via contactos
    const patientNorm = normalizeAccents(s.patient || "").toLowerCase()
    if (patientNorm.includes(q) && !existingContactoMatches.has(s.patient)) {
      const key = `paciente-${s.patient}`
      if (!seen.has(key) && suggestions.length < MAX_SURGERY_SUGGESTIONS) {
        seen.add(key)
        suggestions.push({
          surgeryId: s.id,
          display: s.patient,
          context: `Paciente — ${s.id}`,
          field: "paciente",
        })
      }
    }

    // Check surgeon — only add if not already matched via contactos
    const surgeonNorm = normalizeAccents(s.surgeon || "").toLowerCase()
    if (surgeonNorm.includes(q) && !existingContactoMatches.has(s.surgeon)) {
      const key = `medico-${s.surgeon}`
      if (!seen.has(key) && suggestions.length < MAX_SURGERY_SUGGESTIONS) {
        seen.add(key)
        suggestions.push({
          surgeryId: s.id,
          display: s.surgeon,
          context: `Médico — ${s.id}`,
          field: "medico",
        })
      }
    }

    // Check surgery ID
    if (normalizeAccents(s.id).toLowerCase().includes(q)) {
      const key = `id-${s.id}`
      if (!seen.has(key) && suggestions.length < MAX_SURGERY_SUGGESTIONS) {
        seen.add(key)
        suggestions.push({
          surgeryId: s.id,
          display: s.id,
          context: `Cirugía`,
          field: "general",
        })
      }
    }

    // Check PR number
    const presupuestoIdentity = presupuestoIdentities.get(s.backendId ?? s.id)
    if (presupuestoIdentity && normalizeAccents(presupuestoIdentity).toLowerCase().includes(q)) {
      const key = `pr-${presupuestoIdentity}`
      if (!seen.has(key) && suggestions.length < MAX_SURGERY_SUGGESTIONS) {
        seen.add(key)
        suggestions.push({
          surgeryId: s.id,
          display: presupuestoIdentity,
          context: `Presupuesto — ${s.id}`,
          field: "general",
        })
      }
    }

    // Check expediente number
    if (s.expedienteNumber && normalizeAccents(s.expedienteNumber).toLowerCase().includes(q)) {
      const key = `exp-${s.expedienteNumber}`
      if (!seen.has(key) && suggestions.length < MAX_SURGERY_SUGGESTIONS) {
        seen.add(key)
        suggestions.push({
          surgeryId: s.id,
          display: s.expedienteNumber,
          context: `Expediente — ${s.id}`,
          field: "general",
        })
      }
    }

    // Check institution
    const instNorm = normalizeAccents(s.institution || "").toLowerCase()
    if (instNorm.includes(q) && !existingContactoMatches.has(s.institution)) {
      const key = `inst-${s.institution}`
      if (!seen.has(key) && suggestions.length < MAX_SURGERY_SUGGESTIONS) {
        seen.add(key)
        suggestions.push({
          surgeryId: s.id,
          display: s.institution,
          context: `Institución — ${s.id}`,
          field: "institucion",
        })
      }
    }

    // Check client
    const clientNorm = normalizeAccents(s.client || "").toLowerCase()
    if (clientNorm.includes(q) && !existingContactoMatches.has(s.client)) {
      const key = `cliente-${s.client}`
      if (!seen.has(key) && suggestions.length < MAX_SURGERY_SUGGESTIONS) {
        seen.add(key)
        suggestions.push({
          surgeryId: s.id,
          display: s.client,
          context: `Cliente — ${s.id}`,
          field: "cliente",
        })
      }
    }
  }

  return suggestions
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function SmartSurgerySearch({ chips, onChipsChange, onSearch }: SmartSurgerySearchProps) {
  const store = useOrtoTrackStore()
  const presupuestoAuthority = usePresupuestos({ take: 100 })
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Grouped suggestions from contactos ──
  // CHATZAI-025A.2: All ROLE_CONFIG groups are searched independently.
  // If "López" matches in both "medicos" and "pacientes" contactos,
  // both groups will appear in the dropdown.
  const contactoSuggestions = useMemo(() => {
    if (!query.trim()) return []

    return ROLE_CONFIG.map(({ role, groups, field, label, icon }) => {
      const contacts = store.searchContactos(query.trim(), role, groups.length > 0 ? groups : undefined)
        .filter((c) => c.estado === "activo")
        .slice(0, MAX_RESULTS_PER_GROUP)

      return { role, field, label, icon, contacts }
    }).filter((g) => g.contacts.length > 0)
  }, [query, store])

  // ── Collect names already found in contactos to avoid duplicates in surgery suggestions ──
  const contactoMatchedNames = useMemo(() => {
    const names = new Set<string>()
    for (const group of contactoSuggestions) {
      for (const c of group.contacts) {
        names.add(c.nombreFantasia || c.nombre)
      }
    }
    return names
  }, [contactoSuggestions])

  const presupuestoIdentities = useMemo(() => {
    const identities = new Map<string, string>()
    for (const item of presupuestoAuthority.presupuestos) {
      if (!item.surgeryId || item.slot === "HISTORY") continue
      const label = item.visibleNumber == null
        ? "Presupuesto en borrador"
        : `P-${String(item.visibleNumber).padStart(4, "0")}`
      if (item.slot === "CURRENT" || !identities.has(item.surgeryId)) identities.set(item.surgeryId, label)
    }
    return identities
  }, [presupuestoAuthority.presupuestos])

  // ── Surgery-level suggestions (complement contactos) ──
  const surgerySuggestions = useMemo(() => {
    if (!query.trim()) return []
    return buildSurgerySuggestions(query, store.surgeries, contactoMatchedNames, presupuestoIdentities)
  }, [query, store.surgeries, contactoMatchedNames, presupuestoIdentities])

  // ── Has any suggestions at all ──
  const hasSuggestions = contactoSuggestions.length > 0 || surgerySuggestions.length > 0

  // ── Check if a contacto is already chipped ──
  const isAlreadyChipped = useCallback(
    (contactoId: string, field: SearchChipField) =>
      chips.some((c) => c.field === field && c.value === contactoId),
    [chips]
  )

  // ── Check if a surgery suggestion is already chipped ──
  const isSurgerySuggestionChipped = useCallback(
    (suggestion: SurgerySuggestion) =>
      chips.some((c) => c.field === suggestion.field && c.value === suggestion.surgeryId),
    [chips]
  )

  // ── Add chip from contacto suggestion ──
  const handleSelectContact = useCallback(
    (contacto: Contacto, field: SearchChipField) => {
      if (isAlreadyChipped(contacto.id, field)) return

      const fieldLabel = ROLE_CONFIG.find((r) => r.field === field)?.singular || field
      const display = contacto.nombreFantasia || contacto.nombre
      const chip: SearchChip = {
        id: generateChipId(),
        field,
        value: contacto.id,
        label: `${fieldLabel}: ${display}`,
      }
      onChipsChange([...chips, chip])
      setQuery("")
      setOpen(false)
      inputRef.current?.focus()
    },
    [chips, onChipsChange, isAlreadyChipped]
  )

  // ── Add chip from surgery suggestion ──
  const handleSelectSurgerySuggestion = useCallback(
    (suggestion: SurgerySuggestion) => {
      if (isSurgerySuggestionChipped(suggestion)) return

      const fieldLabel = ROLE_CONFIG.find((r) => r.field === suggestion.field)?.singular || suggestion.field
      const chip: SearchChip = {
        id: generateChipId(),
        field: suggestion.field,
        value: suggestion.surgeryId,
        label: `${fieldLabel}: ${suggestion.display}`,
      }
      onChipsChange([...chips, chip])
      setQuery("")
      setOpen(false)
      inputRef.current?.focus()
    },
    [chips, onChipsChange, isSurgerySuggestionChipped]
  )

  // ── Add general search chip (Enter) ──
  const handleAddGeneralChip = useCallback(() => {
    if (!query.trim()) return

    // Check if this exact general chip already exists
    if (chips.some((c) => c.field === "general" && c.value === query.trim())) return

    const chip: SearchChip = {
      id: generateChipId(),
      field: "general",
      value: query.trim(),
      label: `Búsqueda: ${query.trim()}`,
    }
    onChipsChange([...chips, chip])
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }, [query, chips, onChipsChange])

  // ── Remove chip ──
  const handleRemoveChip = useCallback(
    (chipId: string) => {
      onChipsChange(chips.filter((c) => c.id !== chipId))
    },
    [chips, onChipsChange]
  )

  // ── Key handlers ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        if (query.trim()) {
          handleAddGeneralChip()
          onSearch()
        } else if (chips.length > 0) {
          onSearch()
        }
      }
      if (e.key === "Backspace" && !query && chips.length > 0) {
        onChipsChange(chips.slice(0, -1))
      }
    },
    [query, chips, handleAddGeneralChip, onSearch, onChipsChange]
  )

  return (
    <div className="flex w-full items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
               "flex min-h-9 flex-1 flex-wrap items-center gap-1 rounded-sm border border-slate-300 bg-white px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900",
                "cursor-text",
                "focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-300 dark:focus-within:border-slate-500 dark:focus-within:ring-slate-600",
                "hover:border-slate-400 dark:hover:border-slate-500"
              )}
            onClick={() => inputRef.current?.focus()}
            role="search"
            aria-label="Buscar cirugías"
          >
            {/* Existing chips */}
            {chips.map((chip) => (
              <Badge
                key={chip.id}
                variant="outline"
                className={cn(
                   "h-5 shrink-0 gap-0.5 border px-1.5 text-[10px] font-semibold shadow-sm",
                   FIELD_BADGE_COLORS[chip.field]
                  )}
              >
                {chip.label}
                <button
                  className="ml-0.5 hover:opacity-70"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveChip(chip.id)
                  }}
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            ))}

            {/* Search input */}
              <div className="relative min-w-[120px] flex-1">
                <Search className="absolute left-0.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (e.target.value.trim()) {
                    setOpen(true)
                  }
                }}
                onFocus={() => {
                  if (query.trim()) setOpen(true)
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  chips.length > 0
                    ? "Agregar filtro..."
                    : "Buscar paciente, médico, cliente o institución..."
                }
                className="h-7 w-full border-0 bg-transparent px-0 pl-5 text-[13px] shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] border-slate-300 p-0 shadow-md dark:border-slate-700 dark:bg-slate-950"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                {query.trim() ? "No se encontraron resultados" : "Escribe para buscar"}
              </CommandEmpty>

              {/* ── Contactos-based suggestions (grouped by category) ── */}
              {contactoSuggestions.map((group) => (
                <CommandGroup key={group.field} heading={group.label}>
                  {group.contacts.map((contacto) => {
                    const Icon = group.icon
                    const alreadyAdded = isAlreadyChipped(contacto.id, group.field)
                    const display = contacto.nombreFantasia || contacto.nombre
                    return (
                      <CommandItem
                        key={`${group.field}-${contacto.id}`}
                        value={`${group.field}-${contacto.id}`}
                        disabled={alreadyAdded}
                        onSelect={() => handleSelectContact(contacto, group.field)}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Icon className="size-3.5 text-muted-foreground" />
                        <span className="flex-1">{display}</span>
                        {contacto.datosMedico?.especialidad && (
                          <span className="text-[10px] text-muted-foreground">{contacto.datosMedico.especialidad}</span>
                        )}
                        {contacto.cuit && (
                          <span className="text-[10px] text-muted-foreground">CUIT {contacto.cuit}</span>
                        )}
                        {contacto.dni && (
                          <span className="text-[10px] text-muted-foreground">DNI {contacto.dni}</span>
                        )}
                        {alreadyAdded && (
                          <span className="text-[10px] text-muted-foreground italic">agregado</span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}

              {/* ── Surgery-level suggestions (from surgery data directly) ── */}
              {surgerySuggestions.length > 0 && (
                <CommandGroup heading="En cirugías">
                  {surgerySuggestions.map((sug) => {
                    const alreadyAdded = isSurgerySuggestionChipped(sug)
                    return (
                      <CommandItem
                        key={`surgery-${sug.surgeryId}-${sug.field}`}
                        value={`surgery-${sug.surgeryId}-${sug.field}`}
                        disabled={alreadyAdded}
                        onSelect={() => handleSelectSurgerySuggestion(sug)}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Hash className="size-3.5 text-muted-foreground" />
                        <span className="flex-1">{sug.display}</span>
                        <span className="text-[10px] text-muted-foreground">{sug.context}</span>
                        {alreadyAdded && (
                          <span className="text-[10px] text-muted-foreground italic">agregado</span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              {query.trim() && (presupuestoAuthority.loading || presupuestoAuthority.error) && (
                <CommandGroup heading="Presupuestos">
                  <CommandItem disabled value="__presupuestos_unavailable__" className="text-xs text-muted-foreground">
                    {presupuestoAuthority.loading ? "Cargando identidades…" : "Identidades no cargadas"}
                  </CommandItem>
                </CommandGroup>
              )}

              {/* General search option */}
              {query.trim() && (
                <CommandGroup heading="Búsqueda general">
                  <CommandItem
                    value="__general__"
                    onSelect={handleAddGeneralChip}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Search className="size-3.5 text-muted-foreground" />
                    <span>Buscar: &quot;{query.trim()}&quot;</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">Enter</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 rounded-sm border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-2.5"
        onClick={() => {
          if (query.trim()) {
            handleAddGeneralChip()
          }
          onSearch()
        }}
        aria-label="Ejecutar búsqueda"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Buscar</span>
      </Button>
    </div>
  )
}

"use client"

import React, { useState } from "react"
import { Calendar, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { DateFilter, DateFilterType } from "@/lib/cirugias.types"
import { DATE_FILTER_TYPE_LABELS } from "@/lib/cirugias.types"

// ═══════════════════════════════════════════════════════════════
// DateFiltersPopover — Enhanced date filter with type selector,
// Desde/Hasta inputs, shortcuts, and date chips.
// CHATZAI-025: Replaces the simple DateFilterPopover.
// ═══════════════════════════════════════════════════════════════

interface DateFiltersPopoverProps {
  dateFilters: DateFilter[]
  onDateFiltersChange: (filters: DateFilter[]) => void
}

// ── Date type options for the dropdown ──
const DATE_TYPE_OPTIONS: { value: DateFilterType; label: string }[] = [
  { value: "fecha_cirugia", label: "Fecha de cirugía" },
  { value: "fecha_probable", label: "Fecha probable" },
  { value: "fecha_material", label: "Fecha disponibilidad de material" },
  { value: "fecha_envio", label: "Fecha de envío" },
]

// ── Helper: format date as DD/MM/YYYY ──
function formatDateShort(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00")
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// ── Helper: format date as YYYY-MM-DD ──
function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// ── Helper: get start of week (Monday) ──
function getStartOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  return date
}

// ── Helper: get end of week (Sunday) ──
function getEndOfWeek(d: Date): Date {
  const start = getStartOfWeek(d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

// ── Helper: get start of month ──
function getStartOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// ── Helper: get end of month ──
function getEndOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

// ── Helper: build label for a date filter ──
function buildDateFilterLabel(type: DateFilterType, from: string, to: string): string {
  const typeLabel = DATE_FILTER_TYPE_LABELS[type]
  const fromStr = formatDateShort(from)
  const toStr = formatDateShort(to)
  if (from && to) return `${typeLabel}: ${fromStr} - ${toStr}`
  if (from) return `${typeLabel}: desde ${fromStr}`
  if (to) return `${typeLabel}: hasta ${toStr}`
  return `${typeLabel}`
}

export function DateFiltersPopover({ dateFilters, onDateFiltersChange }: DateFiltersPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<DateFilterType>("fecha_cirugia")
  const [tempFrom, setTempFrom] = useState("")
  const [tempTo, setTempTo] = useState("")

  const hasActiveFilters = dateFilters.length > 0

  // ── Check if the selected type already has a filter ──
  const existingFilterForType = dateFilters.find(f => f.type === selectedType)

  // ── Apply shortcut ──
  function applyShortcut(from: string, to: string) {
    setTempFrom(from)
    setTempTo(to)
  }

  // ── Apply date filter ──
  function handleApply() {
    if (!tempFrom && !tempTo) return

    const label = buildDateFilterLabel(selectedType, tempFrom, tempTo)
    const newFilter: DateFilter = {
      id: `df-${selectedType}-${Date.now()}`,
      type: selectedType,
      from: tempFrom,
      to: tempTo,
      label,
    }

    // Replace existing filter for same type (one range per type in V1)
    const updated = dateFilters.filter(f => f.type !== selectedType)
    updated.push(newFilter)
    onDateFiltersChange(updated)

    // Reset form
    setTempFrom("")
    setTempTo("")

    // Auto-close popover after applying
    setOpen(false)
  }

  // ── Remove a date filter ──
  function handleRemoveFilter(id: string) {
    onDateFiltersChange(dateFilters.filter(f => f.id !== id))
  }

  // ── Clear all date filters ──
  function handleClearAll() {
    onDateFiltersChange([])
  }

  const today = new Date()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-7 gap-1 text-[11px] px-2.5 shrink-0",
            hasActiveFilters && "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
          )}
        >
          <Calendar className="size-3" />
          Fechas
          {hasActiveFilters && (
            <span className="flex size-4 rounded-full bg-white/25 items-center justify-center text-[9px] font-bold leading-none">
              {dateFilters.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0">
        {/* Header */}
        <div className="p-2.5 border-b">
          <p className="text-xs font-semibold">Filtro de fechas</p>
        </div>

        {/* Active date filter chips */}
        {dateFilters.length > 0 && (
          <div className="px-2.5 pt-2.5">
            <div className="flex flex-wrap gap-1.5">
              {dateFilters.map(filter => (
                <span
                  key={filter.id}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700"
                >
                  {filter.label}
                  <button
                    onClick={() => handleRemoveFilter(filter.id)}
                    className="hover:text-blue-900"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={handleClearAll}
                className="text-[10px] text-blue-600 hover:underline px-1"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

        {/* Filter builder */}
        <div className="p-2.5 space-y-2.5">
          {/* Date type selector */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Tipo de fecha</Label>
            <select
              className="h-7 w-full rounded-md border text-xs px-2 bg-background"
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value as DateFilterType)
                // Pre-fill from existing filter if exists
                const existing = dateFilters.find(f => f.type === e.target.value)
                if (existing) {
                  setTempFrom(existing.from)
                  setTempTo(existing.to)
                } else {
                  setTempFrom("")
                  setTempTo("")
                }
              }}
            >
              {DATE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {existingFilterForType && (
              <p className="text-[9px] text-amber-600">
                Ya existe un filtro para este tipo. Se reemplazará al aplicar.
              </p>
            )}
          </div>

          {/* Desde / Hasta */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={tempFrom}
                onChange={e => setTempFrom(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={tempTo}
                onChange={e => setTempTo(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>

          {/* Shortcuts */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Atajos</Label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => applyShortcut(toISODate(today), toISODate(today))}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  const tomorrow = new Date(today)
                  tomorrow.setDate(today.getDate() + 1)
                  applyShortcut(toISODate(tomorrow), toISODate(tomorrow))
                }}
              >
                Mañana
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  applyShortcut(toISODate(getStartOfWeek(today)), toISODate(getEndOfWeek(today)))
                }}
              >
                Esta semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  const in7 = new Date(today)
                  in7.setDate(today.getDate() + 7)
                  applyShortcut(toISODate(today), toISODate(in7))
                }}
              >
                Próx. 7 días
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  applyShortcut(toISODate(getStartOfMonth(today)), toISODate(getEndOfMonth(today)))
                }}
              >
                Este mes
              </Button>
            </div>
          </div>
        </div>

        {/* Footer: Apply button */}
        <div className="p-2.5 border-t flex justify-end">
          <Button
            size="sm"
            className="h-7 text-[11px] px-4"
            disabled={!tempFrom && !tempTo}
            onClick={() => {
              handleApply()
            }}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

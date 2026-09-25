"use client"

import React, { useState, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarRange,
  Clock,
  Check,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { PeriodPreset } from "@/hooks/useTemporalNavigation"
import { cn } from "@/lib/utils"

interface TimelinePeriodNavigatorProps {
  periodTitle: string
  visibleCount: number
  totalCount: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  startDateStr?: string
  endDateStr?: string
  activePreset?: PeriodPreset
  onSelectRange?: (start: string, end: string, preset?: PeriodPreset) => void
  onApplyPreset?: (preset: PeriodPreset) => void
}

export function TimelinePeriodNavigator({
  periodTitle,
  visibleCount,
  totalCount,
  onPrev,
  onNext,
  onToday,
  startDateStr = "",
  endDateStr = "",
  activePreset = "today",
  onSelectRange,
  onApplyPreset,
}: TimelinePeriodNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStart, setTempStart] = useState(startDateStr)
  const [tempEnd, setTempEnd] = useState(endDateStr)

  useEffect(() => {
    if (startDateStr) setTempStart(startDateStr)
    if (endDateStr) setTempEnd(endDateStr)
  }, [startDateStr, endDateStr, isOpen])

  const presets: { id: PeriodPreset; label: string }[] = [
    { id: "today", label: "Hoy" },
    { id: "thisWeek", label: "Esta semana" },
    { id: "next7", label: "Próximos 7 días" },
    { id: "next15", label: "Próximos 15 días" },
    { id: "thisMonth", label: "Este mes" },
    { id: "nextMonth", label: "Próximo mes" },
  ]

  const handleApplyCustom = () => {
    if (tempStart && tempEnd && onSelectRange) {
      if (tempStart > tempEnd) {
        onSelectRange(tempEnd, tempStart, "custom")
      } else {
        onSelectRange(tempStart, tempEnd, "custom")
      }
      setIsOpen(false)
    }
  }

  const handleSelectPreset = (preset: PeriodPreset) => {
    if (onApplyPreset) {
      onApplyPreset(preset)
      setIsOpen(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full sm:w-auto">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm"
          aria-label="Anterior período"
          title="Anterior período"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToday}
          className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          Hoy
        </button>

        <button
          type="button"
          onClick={onNext}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm"
          aria-label="Siguiente período"
          title="Siguiente período"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Popover selector de período */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors cursor-pointer group"
              title="Cambiar período de fechas"
            >
              <CalendarRange className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {periodTitle}
              </h2>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-80 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl space-y-3.5 z-50"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                Seleccionar Período
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Filtrar por rango</span>
            </div>

            {/* Presets rápidos */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Atajos rápidos
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((p) => {
                  const isSelected = activePreset === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors flex items-center justify-between cursor-pointer",
                        isSelected
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                      )}
                    >
                      <span>{p.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Rango manual de fechas */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Rango personalizado
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="period-from" className="text-[10px] font-medium text-slate-500">
                    Desde
                  </Label>
                  <Input
                    id="period-from"
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="h-8 text-xs font-medium bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="period-to" className="text-[10px] font-medium text-slate-500">
                    Hasta
                  </Label>
                  <Input
                    id="period-to"
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="h-8 text-xs font-medium bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleApplyCustom}
                disabled={!tempStart || !tempEnd}
                className="w-full h-8 text-xs font-semibold bg-[#1D2FC0] hover:bg-[#152399] text-white mt-1 cursor-pointer"
              >
                Aplicar Período
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {visibleCount} de {totalCount} cx
        </span>
      </div>
    </div>
  )
}

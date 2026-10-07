"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DatePickerProps {
  value?: string
  onChange?: (dateStr: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  "data-testid"?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className,
  id,
  "data-testid": dataTestId,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse ISO string YYYY-MM-DD to Date object in local time
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    // If value has YYYY-MM-DD
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      const d = new Date(year, month, day)
      if (isValid(d)) return d
    }
    const parsed = new Date(value)
    return isValid(parsed) ? parsed : undefined
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.("")
      setOpen(false)
      return
    }
    const formatted = format(date, "yyyy-MM-dd")
    onChange?.(formatted)
    setOpen(false)
  }

  const setQuickDate = (offsetDays: number) => {
    const target = new Date()
    target.setDate(target.getDate() + offsetDays)
    target.setHours(0, 0, 0, 0)
    const formatted = format(target, "yyyy-MM-dd")
    onChange?.(formatted)
    setOpen(false)
  }

  const displayString = React.useMemo(() => {
    if (!selectedDate) return ""
    return format(selectedDate, "dd/MM/yyyy")
  }, [selectedDate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background dark:bg-input/30 px-2.5 py-1.5 text-xs text-foreground shadow-2xs outline-none transition-all duration-150 ease-out hover:bg-accent/40 hover:border-slate-400 dark:hover:border-slate-600 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayString || placeholder}</span>
          <div className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange?.("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    onChange?.("")
                  }
                }}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Limpiar fecha"
              >
                <X className="size-3" />
              </span>
            )}
            <CalendarIcon className="size-3.5 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 shadow-xl border-border/80" align="start">
        <div className="p-1 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-1 px-3 py-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Seleccionar fecha</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setQuickDate(0)}
              className="h-6 px-2 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              Hoy
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setQuickDate(1)}
              className="h-6 px-2 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Mañana
            </Button>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          locale={es}
          initialFocus
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          classNames={{
            day_selected: "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white font-semibold rounded-md",
            day_today: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 rounded-md",
          }}
        />
        {value && (
          <div className="p-2 border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange?.("")
                setOpen(false)
              }}
              className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
            >
              Borrar fecha
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

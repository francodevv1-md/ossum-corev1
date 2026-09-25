import { useState, useMemo, useCallback } from "react"
import type { CoordinadorViewMode, MonthDayCell, WeekDayGroup } from "@/types/coordinadores.types"
import type { Surgery } from "@/types"

export type PeriodPreset = "today" | "next7" | "next15" | "thisWeek" | "thisMonth" | "nextMonth" | "custom"

// Helper: format Date to local YYYY-MM-DD string
export const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Helper: parse YYYY-MM-DD string to local Date
export const parseLocalDate = (str: string): Date => {
  if (!str) return new Date()
  const parts = str.split("T")[0].split("-")
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  }
  return new Date(str)
}

export function useTemporalNavigation(initialDate?: Date) {
  const [currentDate, setCurrentDate] = useState<Date>(() => initialDate || new Date())
  const [startDate, setStartDate] = useState<Date>(() => initialDate || new Date())
  const [endDate, setEndDate] = useState<Date>(() => initialDate || new Date())
  const [activePreset, setActivePreset] = useState<PeriodPreset>("today")
  const [viewMode, setViewMode] = useState<CoordinadorViewMode>("day")

  const setDateRange = useCallback((start: Date | string, end: Date | string, preset: PeriodPreset = "custom") => {
    const s = typeof start === "string" ? parseLocalDate(start) : new Date(start)
    const e = typeof end === "string" ? parseLocalDate(end) : new Date(end)
    setStartDate(s)
    setEndDate(e)
    setCurrentDate(s)
    setActivePreset(preset)
  }, [])

  const applyPreset = useCallback((preset: PeriodPreset) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (preset === "today") {
      setDateRange(today, today, "today")
    } else if (preset === "thisWeek") {
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      const start = new Date(today)
      start.setDate(diff)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      setDateRange(start, end, "thisWeek")
    } else if (preset === "next7") {
      const end = new Date(today)
      end.setDate(today.getDate() + 6)
      setDateRange(today, end, "next7")
    } else if (preset === "next15") {
      const end = new Date(today)
      end.setDate(today.getDate() + 14)
      setDateRange(today, end, "next15")
    } else if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setDateRange(start, end, "thisMonth")
    } else if (preset === "nextMonth") {
      const start = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      setDateRange(start, end, "nextMonth")
    }
  }, [setDateRange])

  const goToToday = useCallback(() => {
    applyPreset("today")
  }, [applyPreset])

  const goToPrev = useCallback(() => {
    if (viewMode === "day") {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1)

      start.setDate(start.getDate() - diffDays)
      end.setDate(end.getDate() - diffDays)
      setStartDate(start)
      setEndDate(end)
      setCurrentDate(start)
      setActivePreset("custom")
    } else if (viewMode === "week") {
      setCurrentDate((prev) => {
        const next = new Date(prev)
        next.setDate(next.getDate() - 7)
        return next
      })
    } else if (viewMode === "month") {
      setCurrentDate((prev) => {
        const next = new Date(prev)
        next.setMonth(next.getMonth() - 1)
        return next
      })
    }
  }, [viewMode, startDate, endDate])

  const goToNext = useCallback(() => {
    if (viewMode === "day") {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1)

      start.setDate(start.getDate() + diffDays)
      end.setDate(end.getDate() + diffDays)
      setStartDate(start)
      setEndDate(end)
      setCurrentDate(start)
      setActivePreset("custom")
    } else if (viewMode === "week") {
      setCurrentDate((prev) => {
        const next = new Date(prev)
        next.setDate(next.getDate() + 7)
        return next
      })
    } else if (viewMode === "month") {
      setCurrentDate((prev) => {
        const next = new Date(prev)
        next.setMonth(next.getMonth() + 1)
        return next
      })
    }
  }, [viewMode, startDate, endDate])

  const periodTitle = useMemo(() => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

    if (viewMode === "day") {
      const startDayName = days[startDate.getDay()]
      const startDayNum = startDate.getDate()
      const startMonthName = months[startDate.getMonth()]
      const startYear = startDate.getFullYear()

      const endDayName = days[endDate.getDay()]
      const endDayNum = endDate.getDate()
      const endMonthName = months[endDate.getMonth()]
      const endYear = endDate.getFullYear()

      // Single day
      if (formatLocalDate(startDate) === formatLocalDate(endDate)) {
        return `${startDayName} ${startDayNum} de ${startMonthName}, ${startYear}`
      }

      // Same month & year
      if (startDate.getMonth() === endDate.getMonth() && startYear === endYear) {
        return `Período: ${startDayName} ${startDayNum} al ${endDayNum} de ${endMonthName}, ${endYear}`
      }

      // Different month, same year
      if (startYear === endYear) {
        return `Período: ${startDayNum} de ${startMonthName} al ${endDayNum} de ${endMonthName}, ${endYear}`
      }

      // Different year
      return `Período: ${startDayNum}/${startDate.getMonth() + 1}/${startYear} al ${endDayNum}/${endDate.getMonth() + 1}/${endYear}`
    }

    if (viewMode === "week") {
      // Start of week (Monday)
      const start = new Date(currentDate)
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)

      const end = new Date(start)
      end.setDate(start.getDate() + 5) // Mon to Sat

      return `${start.getDate()} al ${end.getDate()} de ${months[end.getMonth()]} ${end.getFullYear()}`
    }

    // Month
    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [currentDate, startDate, endDate, viewMode])

  // Checks if a surgery date string is inside the active date range
  const isDateInPeriod = useCallback((surgeryDate?: string | null): boolean => {
    if (!surgeryDate || surgeryDate.trim() === "") return false
    const clean = surgeryDate.includes("T") ? surgeryDate.split("T")[0] : surgeryDate.trim()
    const startStr = formatLocalDate(startDate)
    const endStr = formatLocalDate(endDate)
    return clean >= startStr && clean <= endStr
  }, [startDate, endDate])

  // Generator for Month View Grid
  const getMonthMatrix = useCallback((surgeries: Surgery[]): MonthDayCell[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Adjust for Monday start (0=Mon, 6=Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const cells: MonthDayCell[] = []
    const today = new Date()
    const todayStr = formatLocalDate(today)

    // Days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      const dateString = formatLocalDate(d)
      const daySurgeries = surgeries.filter((s) => {
        if (!s.date) return false
        const clean = s.date.includes("T") ? s.date.split("T")[0] : s.date.trim()
        return clean === dateString
      })
      cells.push({
        date: d,
        dateString,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        count: daySurgeries.length,
        alertCount: daySurgeries.filter((s) => s.urgente || s.state === "Suspendida").length,
        loadLevel: daySurgeries.length > 10 ? "high" : daySurgeries.length >= 6 ? "medium" : daySurgeries.length > 0 ? "low" : "none",
        surgeries: daySurgeries,
      })
    }

    // Days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const d = new Date(year, month, day)
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const daySurgeries = surgeries.filter((s) => {
        if (!s.date) return false
        const clean = s.date.includes("T") ? s.date.split("T")[0] : s.date.trim()
        return clean === dateString
      })
      cells.push({
        date: d,
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        count: daySurgeries.length,
        alertCount: daySurgeries.filter((s) => s.urgente || s.state === "Suspendida").length,
        loadLevel: daySurgeries.length > 10 ? "high" : daySurgeries.length >= 6 ? "medium" : daySurgeries.length > 0 ? "low" : "none",
        surgeries: daySurgeries,
      })
    }

    // Days of next month to complete standard grid (35 or 42)
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day)
      const dateString = formatLocalDate(d)
      const daySurgeries = surgeries.filter((s) => {
        if (!s.date) return false
        const clean = s.date.includes("T") ? s.date.split("T")[0] : s.date.trim()
        return clean === dateString
      })
      cells.push({
        date: d,
        dateString,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        count: daySurgeries.length,
        alertCount: daySurgeries.filter((s) => s.urgente).length,
        loadLevel: daySurgeries.length > 10 ? "high" : daySurgeries.length >= 6 ? "medium" : daySurgeries.length > 0 ? "low" : "none",
        surgeries: daySurgeries,
      })
    }

    return cells
  }, [currentDate])

  // Generator for Week View Grouped Days (Mon - Sat)
  const getWeekGroups = useCallback((surgeries: Surgery[]): WeekDayGroup[] => {
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const today = new Date()
    const todayStr = formatLocalDate(today)

    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)

    const groups: WeekDayGroup[] = []

    for (let i = 0; i < 6; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const dateString = formatLocalDate(d)
      const daySurgeries = surgeries.filter((s) => {
        if (!s.date) return false
        const clean = s.date.includes("T") ? s.date.split("T")[0] : s.date.trim()
        return clean === dateString
      })

      groups.push({
        date: d,
        dateString,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        formattedDate: `${d.getDate()} ${months[d.getMonth()]}`,
        isToday: dateString === todayStr,
        surgeries: daySurgeries,
        alertCount: daySurgeries.filter((s) => s.urgente || s.state === "Suspendida").length,
      })
    }

    return groups
  }, [currentDate])

  return {
    currentDate,
    setCurrentDate,
    startDate,
    endDate,
    startDateStr: formatLocalDate(startDate),
    endDateStr: formatLocalDate(endDate),
    activePreset,
    setDateRange,
    applyPreset,
    viewMode,
    setViewMode,
    goToToday,
    goToPrev,
    goToNext,
    periodTitle,
    isDateInPeriod,
    getMonthMatrix,
    getWeekGroups,
  }
}

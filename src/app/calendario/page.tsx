"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { StateBadge, SearchInput, FilterSelect, SectionHeader } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { SURGERY_STATE_OPTIONS, CLASSIFICATION_OPTIONS } from "@/lib/statusHelpers"
import { CX_STATE_COLORS } from "@/lib/shared-constants"
import { ChevronLeft, ChevronRight, CalendarDays, List, Clock, Scissors, Users, CheckCircle2, XCircle, AlertTriangle, Plus } from "lucide-react"
import type { Surgery, SurgeryState, SurgeryClassification } from "@/types"

// ── State pill colors — imported from shared-constants ──
const STATE_COLORS = CX_STATE_COLORS

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7
  return `${String(hour).padStart(2, "0")}:00`
})

type ViewMode = "mensual" | "semanal" | "diario"

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []
  const startDow = (firstDay.getDay() + 6) % 7
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push(new Date(year, month + 1, d))
    }
  }
  return days
}

function getWeekDays(date: Date): Date[] {
  const dow = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isSameMonth(d: Date, ref: Date): boolean {
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

export default function CalendarioPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  // ── View state ──
  const [viewMode, setViewMode] = useState<ViewMode>("mensual")
  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [classFilter, setClassFilter] = useState("")
  const [surgeonFilter, setSurgeonFilter] = useState("")

  // ── Dialog ──
  const [dayDialogOpen, setDayDialogOpen] = useState(false)
  const [dayDialogSurgeries, setDayDialogSurgeries] = useState<Surgery[]>([])
  const [dayDialogDate, setDayDialogDate] = useState("")

  // ── Unique surgeons for filter ──
  const surgeonOptions = useMemo(() => {
    const surgeons = Array.from(new Set(store.surgeries.map((s) => s.surgeon))).sort()
    return [{ value: "", label: "Todos los médicos" }, ...surgeons.map((s) => ({ value: s, label: s }))]
  }, [store.surgeries])

  // ── Filtered surgeries ──
  const filtered = useMemo(() => {
    let data = store.surgeries.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (s) =>
          s.patient.toLowerCase().includes(q) ||
          s.surgeon.toLowerCase().includes(q) ||
          s.institution.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((s) => s.state === stateFilter)
    if (classFilter) data = data.filter((s) => s.classification === classFilter)
    if (surgeonFilter) data = data.filter((s) => s.surgeon === surgeonFilter)
    return data
  }, [store.surgeries, search, stateFilter, classFilter, surgeonFilter])

  // ── Surgery map by date ──
  const surgeriesByDate = useMemo(() => {
    const map: Record<string, Surgery[]> = {}
    for (const s of filtered) {
      if (!s.date) continue
      if (!map[s.date]) map[s.date] = []
      map[s.date].push(s)
    }
    return map
  }, [filtered])

  // ── Navigation helpers ──
  const navigatePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === "mensual") d.setMonth(d.getMonth() - 1)
    else if (viewMode === "semanal") d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }

  const navigateNext = () => {
    const d = new Date(currentDate)
    if (viewMode === "mensual") d.setMonth(d.getMonth() + 1)
    else if (viewMode === "semanal") d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  const navigateToday = () => setCurrentDate(new Date())

  const headerLabel = useMemo(() => {
    if (viewMode === "mensual") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
    if (viewMode === "semanal") {
      const days = getWeekDays(currentDate)
      const from = days[0]
      const to = days[6]
      return `${from.getDate()} ${MONTH_NAMES[from.getMonth()].slice(0, 3)} - ${to.getDate()} ${MONTH_NAMES[to.getMonth()].slice(0, 3)} ${to.getFullYear()}`
    }
    return `${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [viewMode, currentDate])

  // ── Monthly stats ──
  const monthStats = useMemo(() => {
    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`
    const monthSurgeries = filtered.filter((s) => s.date.startsWith(monthStr))
    const thisMonth = monthSurgeries.length
    const pendingAuth = monthSurgeries.filter((s) => s.state === "Pendiente" || s.state === "Sin autorizar").length
    const completed = monthSurgeries.filter((s) => s.state === "Realizada" || s.state === "Finalizada").length
    return { thisMonth, pendingAuth, completed }
  }, [filtered, currentDate])

  // ── State distribution ──
  const stateDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of filtered) {
      counts[s.state] = (counts[s.state] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [filtered])

  const maxStateCount = stateDistribution.length > 0 ? stateDistribution[0][1] : 1

  // ── Upcoming surgeries ──
  const upcomingSurgeries = useMemo(() => {
    const today = dateKey(new Date())
    const in7 = new Date()
    in7.setDate(in7.getDate() + 7)
    const in7Str = dateKey(in7)
    return filtered
      .filter((s) => s.date >= today && s.date <= in7Str)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))
      .slice(0, 8)
  }, [filtered])

  // ── Open day dialog ──
  const openDayDialog = (surgeries: Surgery[], date: string) => {
    setDayDialogSurgeries(surgeries)
    setDayDialogDate(date)
    setDayDialogOpen(true)
  }

  // ── Month grid ──
  const monthDays = useMemo(
    () => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  )

  // ── Week grid ──
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  // ── Surgery pill ──
  const SurgeryPill = ({ surgery, compact = false }: { surgery: Surgery; compact?: boolean }) => {
    const colorClass = STATE_COLORS[surgery.state] || "bg-slate-400 text-white"
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => openExpediente(surgery.id)}
              className={cn(
                "w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer transition-opacity hover:opacity-80",
                colorClass,
                compact && "py-0"
              )}
            >
              {compact ? surgery.patient.split(",")[0] : `${surgery.time || ""} ${surgery.patient.split(",")[0]}`}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-64">
            <div className="space-y-0.5">
              <p className="font-semibold">{surgery.patient}</p>
              <p>Dr. {surgery.surgeon}</p>
              <p>{surgery.institution}</p>
              <p>{surgery.classification}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // ── Monthly view ──
  const renderMonthly = () => (
    <div className="grid grid-cols-7 border-t border-l">
      {DAY_NAMES.map((day) => (
        <div key={day} className="border-b border-r bg-muted/50 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
          {day}
        </div>
      ))}
      {monthDays.map((day, idx) => {
        const dk = dateKey(day)
        const daySurgeries = surgeriesByDate[dk] || []
        const inMonth = isSameMonth(day, currentDate)
        return (
          <div
            key={idx}
            className={cn(
              "min-h-[90px] border-b border-r p-1 transition-colors",
              !inMonth && "bg-muted/20",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground",
                  !isToday(day) && inMonth && "text-foreground",
                  !inMonth && "text-muted-foreground"
                )}
              >
                {day.getDate()}
              </span>
              {daySurgeries.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                  {daySurgeries.length}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {daySurgeries.slice(0, 3).map((s) => (
                <SurgeryPill key={s.id} surgery={s} compact />
              ))}
              {daySurgeries.length > 3 && (
                <button
                  onClick={() => openDayDialog(daySurgeries, dk)}
                  className="text-[10px] text-primary hover:underline cursor-pointer font-medium text-left"
                >
                  +{daySurgeries.length - 3} más
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Weekly view ──
  const renderWeekly = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-t border-l">
          <div className="border-b border-r bg-muted/50 p-2 text-xs font-semibold text-muted-foreground text-center">
            Hora
          </div>
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={cn(
                "border-b border-r bg-muted/50 p-2 text-center text-xs font-semibold",
                isToday(day) && "bg-primary/10 text-primary"
              )}
            >
              <div>{DAY_NAMES[i]}</div>
              <div className={cn("text-sm font-bold", isToday(day) && "text-primary")}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        {/* Time slots */}
        {TIME_SLOTS.map((time) => (
          <div key={time} className="grid grid-cols-[60px_repeat(7,1fr)] border-t border-l">
            <div className="border-b border-r px-2 py-1 text-[10px] text-muted-foreground text-center">
              {time}
            </div>
            {weekDays.map((day, i) => {
              const dk = dateKey(day)
              const daySurgeries = surgeriesByDate[dk] || []
              const slotSurgeries = daySurgeries.filter(
                (s) => s.time && s.time >= time && s.time < `${String(parseInt(time.split(":")[0]) + 1).padStart(2, "0")}:00`
              )
              return (
                <div key={i} className={cn("border-b border-r p-1 min-h-[40px]", isToday(day) && "bg-primary/5")}>
                  {slotSurgeries.map((s) => (
                    <SurgeryPill key={s.id} surgery={s} />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  // ── Daily view ──
  const renderDaily = () => {
    const dk = dateKey(currentDate)
    const daySurgeries = surgeriesByDate[dk] || []
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="size-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {currentDate.getDate()} de {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <Badge variant="secondary">{daySurgeries.length} cirugías</Badge>
        </div>
        {daySurgeries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No hay cirugías programadas para este día</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {daySurgeries
              .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
              .map((surgery) => {
                const colorClass = STATE_COLORS[surgery.state] || "bg-slate-400 text-white"
                return (
                  <Card
                    key={surgery.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openExpediente(surgery.id)}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex flex-col items-center shrink-0">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-sm font-semibold mt-1">{surgery.time || "—"}</span>
                      </div>
                      <Separator orientation="vertical" className="h-12" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{surgery.patient}</span>
                          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", colorClass)}>
                            {surgery.state}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <span>Dr. {surgery.surgeon}</span>
                          <span>{surgery.institution}</span>
                          <span>{surgery.classification}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {surgery.id}
                      </Badge>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ── */}
      <SectionHeader
        title="Calendario de Cirugías"
        description="Vista calendario de cirugías programadas"
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="mensual" className="text-xs px-3 h-6">
                  <CalendarDays className="size-3 mr-1" /> Mensual
                </TabsTrigger>
                <TabsTrigger value="semanal" className="text-xs px-3 h-6">
                  <List className="size-3 mr-1" /> Semanal
                </TabsTrigger>
                <TabsTrigger value="diario" className="text-xs px-3 h-6">
                  <Clock className="size-3 mr-1" /> Diario
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      {/* ── Navigation bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrev} className="h-8 w-8 p-0">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToday} className="h-8 text-xs">
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext} className="h-8 w-8 p-0">
            <ChevronRight className="size-4" />
          </Button>
          <h3 className="text-sm font-semibold ml-2">{headerLabel}</h3>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Paciente, médico, institución, ID..."
          className="w-64"
        />
        <FilterSelect
          value={stateFilter}
          onChange={setStateFilter}
          options={SURGERY_STATE_OPTIONS}
          className="w-44"
        />
        <FilterSelect
          value={classFilter}
          onChange={setClassFilter}
          options={CLASSIFICATION_OPTIONS}
          className="w-52"
        />
        <FilterSelect
          value={surgeonFilter}
          onChange={setSurgeonFilter}
          options={surgeonOptions}
          className="w-52"
        />
        {(search || stateFilter || classFilter || surgeonFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setSearch("")
              setStateFilter("")
              setClassFilter("")
              setSurgeonFilter("")
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Main content + Sidebar ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Calendar ── */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-0 overflow-hidden">
              {viewMode === "mensual" && renderMonthly()}
              {viewMode === "semanal" && renderWeekly()}
              {viewMode === "diario" && <div className="p-4">{renderDaily()}</div>}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen del mes</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Scissors className="size-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{monthStats.thisMonth}</p>
                    <p className="text-[10px] text-muted-foreground">Cirugías este mes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <AlertTriangle className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{monthStats.pendingAuth}</p>
                    <p className="text-[10px] text-muted-foreground">Pendientes autorizar</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{monthStats.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Completadas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* State distribution */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distribución por estado</h4>
              {stateDistribution.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {stateDistribution.map(([state, count]) => {
                    const pct = Math.max(8, Math.round((count / maxStateCount) * 100))
                    const colorClass = STATE_COLORS[state] || "bg-slate-400 text-white"
                    return (
                      <div key={state} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground truncate">{state}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", colorClass.split(" ")[0])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming surgeries */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximas Cirugías</h4>
              {upcomingSurgeries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No hay cirugías próximas</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {upcomingSurgeries.map((s) => {
                    const colorClass = STATE_COLORS[s.state] || "bg-slate-400 text-white"
                    return (
                      <button
                        key={s.id}
                        onClick={() => openExpediente(s.id)}
                        className="w-full text-left rounded-md border p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{s.patient}</span>
                          <span className={cn("inline-flex items-center rounded px-1 py-0 text-[8px] font-medium", colorClass)}>
                            {s.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <CalendarDays className="size-3" />
                          <span>{formatDate(s.date)}</span>
                          {s.time && (
                            <>
                              <Clock className="size-3 ml-1" />
                              <span>{s.time}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">Dr. {s.surgeon} • {s.institution}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Day detail dialog ── */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              Cirugías del {formatDate(dayDialogDate)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dayDialogSurgeries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay cirugías</p>
            ) : (
              dayDialogSurgeries.map((s) => {
                const colorClass = STATE_COLORS[s.state] || "bg-slate-400 text-white"
                return (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      openExpediente(s.id)
                      setDayDialogOpen(false)
                    }}
                  >
                    <CardContent className="flex items-start gap-3 p-3">
                      <div className="shrink-0">
                        <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", colorClass)}>
                          {s.state}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.patient}</p>
                        <p className="text-xs text-muted-foreground">
                          Dr. {s.surgeon} • {s.institution} • {s.time || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{s.classification}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {s.id}
                      </Badge>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

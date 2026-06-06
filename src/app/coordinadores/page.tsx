"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { StateBadge, SearchInput, FilterSelect, SectionHeader } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { SURGERY_STATE_OPTIONS, CLASSIFICATION_OPTIONS } from "@/lib/statusHelpers"
import { CX_STATE_COLORS, PIPELINE_STATES } from "@/lib/shared-constants"
import {
  Users,
  UserCircle,
  Search,
  Clock,
  CalendarDays,
  Scissors,
  ChevronRight,
  FilterX,
  LayoutGrid,
  ArrowRight,
} from "lucide-react"
import type { Surgery, SurgeryState } from "@/types"

// ── State pill colors — imported from shared-constants ──
const STATE_COLORS = CX_STATE_COLORS

// ── Pipeline state order — imported from shared-constants ──

export default function CoordinadoresPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [coordFilter, setCoordFilter] = useState("")

  // ── Unique coordinators ──
  const coordinatorOptions = useMemo(() => {
    const coords = Array.from(
      new Set(store.surgeries.map((s) => s.coordinadorCx || "Sin asignar"))
    ).sort((a, b) => {
      // "Sin asignar" always last
      if (a === "Sin asignar") return 1
      if (b === "Sin asignar") return -1
      return a.localeCompare(b)
    })
    return [
      { value: "", label: "Todos los coordinadores" },
      ...coords.map((c) => ({ value: c, label: c })),
    ]
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
    if (coordFilter) {
      data = data.filter((s) => (s.coordinadorCx || "Sin asignar") === coordFilter)
    }
    return data
  }, [store.surgeries, search, stateFilter, coordFilter])

  // ── Coordinator summary ──
  const coordinatorSummary = useMemo(() => {
    const map: Record<
      string,
      { total: number; byState: Record<string, number> }
    > = {}
    for (const s of filtered) {
      const coord = s.coordinadorCx || "Sin asignar"
      if (!map[coord]) map[coord] = { total: 0, byState: {} }
      map[coord].total++
      map[coord].byState[s.state] = (map[coord].byState[s.state] || 0) + 1
    }
    return Object.entries(map).sort(([a], [b]) => {
      if (a === "Sin asignar") return 1
      if (b === "Sin asignar") return -1
      return a.localeCompare(b)
    })
  }, [filtered])

  // ── Pipeline: surgeries grouped by state ──
  const pipelineData = useMemo(() => {
    const map: Record<string, Surgery[]> = {}
    for (const state of PIPELINE_STATES) {
      map[state] = []
    }
    for (const s of filtered) {
      if (map[s.state]) {
        map[s.state].push(s)
      }
    }
    // Sort within each state by date then time
    for (const state of PIPELINE_STATES) {
      map[state].sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time || "").localeCompare(b.time || "")
      )
    }
    return map
  }, [filtered])

  // ── Active pipeline states (only states that have surgeries) ──
  const activePipelineStates = useMemo(
    () => PIPELINE_STATES.filter((s) => pipelineData[s].length > 0),
    [pipelineData]
  )

  // ── Totals ──
  const totalSurgeries = filtered.length

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ── */}
      <SectionHeader
        title="Seguimiento de Coordinadores"
        description="Herramienta de seguimiento y control de cirugías por coordinador"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Users className="size-3 mr-1" />
              {coordinatorSummary.length} coordinadores
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {totalSurgeries} cirugías
            </Badge>
          </div>
        }
      />

      {/* ── Coordinator summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coordinatorSummary.map(([coord, data]) => {
          const isInProgress = Object.keys(data.byState).some(
            (s) =>
              s === "Autorizada" ||
              s === "En preparación" ||
              s === "En tránsito" ||
              s === "Pendiente"
          )
          const completed = (data.byState["Realizada"] || 0) + (data.byState["Finalizada"] || 0)
          const cancelled = (data.byState["Suspendida"] || 0) + (data.byState["Cancelada"] || 0)
          return (
            <Card
              key={coord}
              className={cn(
                "cursor-pointer hover:shadow-md transition-all",
                coordFilter === coord && "ring-2 ring-primary"
              )}
              onClick={() =>
                setCoordFilter(coordFilter === coord ? "" : coord)
              }
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full",
                        coord === "Sin asignar"
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "bg-primary/10"
                      )}
                    >
                      <UserCircle
                        className={cn(
                          "size-4",
                          coord === "Sin asignar"
                            ? "text-slate-500"
                            : "text-primary"
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{coord}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Coordinador CX
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{data.total}</span>
                </div>

                <Separator />

                {/* State breakdown */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.byState)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([state, count]) => {
                      const colorClass =
                        STATE_COLORS[state] || "bg-slate-400 text-white"
                      return (
                        <span
                          key={state}
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                            colorClass
                          )}
                        >
                          {count} {state}
                        </span>
                      )
                    })}
                  {Object.keys(data.byState).length > 5 && (
                    <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      +{Object.keys(data.byState).length - 5} más
                    </span>
                  )}
                </div>

                {/* Quick stats */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span className="text-emerald-600 font-medium">
                    {completed} completadas
                  </span>
                  {cancelled > 0 && (
                    <span className="text-red-500 font-medium">
                      {cancelled} canceladas
                    </span>
                  )}
                  {isInProgress && (
                    <span className="text-blue-500 font-medium">
                      En proceso
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Filter bar ── */}
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
          value={coordFilter}
          onChange={setCoordFilter}
          options={coordinatorOptions}
          className="w-52"
        />
        {(search || stateFilter || coordFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setSearch("")
              setStateFilter("")
              setCoordFilter("")
            }}
          >
            <FilterX className="size-3 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Pipeline view ── */}
      {activePipelineStates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No hay cirugías que coincidan con los filtros
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajustá los filtros para ver resultados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATES.filter(
            (state) => pipelineData[state].length > 0
          ).map((state) => {
            const surgeries = pipelineData[state]
            const colorClass = STATE_COLORS[state] || "bg-slate-400 text-white"
            return (
              <div
                key={state}
                className="flex flex-col w-72 shrink-0"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold",
                      colorClass
                    )}
                  >
                    {state}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 px-1.5"
                  >
                    {surgeries.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-1">
                  {surgeries.map((surgery) => {
                    const sColorClass =
                      STATE_COLORS[surgery.state] ||
                      "bg-slate-400 text-white"
                    const coord =
                      surgery.coordinadorCx || "Sin asignar"
                    return (
                      <Card
                        key={surgery.id}
                        className="cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => openExpediente(surgery.id)}
                      >
                        <CardContent className="p-3 space-y-2">
                          {/* Patient + ID */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold truncate leading-tight">
                              {surgery.patient}
                            </span>
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[9px] h-5 px-1"
                            >
                              {surgery.id}
                            </Badge>
                          </div>

                          {/* State badge */}
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                              sColorClass
                            )}
                          >
                            {surgery.state}
                          </span>

                          {/* Date & time */}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              <span>{formatDate(surgery.date)}</span>
                            </div>
                            {surgery.time && (
                              <div className="flex items-center gap-1">
                                <Clock className="size-3" />
                                <span>{surgery.time}</span>
                              </div>
                            )}
                          </div>

                          {/* Surgeon & institution */}
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <p className="truncate">
                              Dr. {surgery.surgeon}
                            </p>
                            <p className="truncate">
                              {surgery.institution}
                            </p>
                          </div>

                          {/* Coordinator */}
                          <div className="flex items-center gap-1.5 pt-1 border-t">
                            <UserCircle className="size-3 text-muted-foreground" />
                            <span
                              className={cn(
                                "text-[10px] font-medium truncate",
                                coord === "Sin asignar"
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                              )}
                            >
                              {coord}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Detailed table per coordinator ── */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">
                Detalle por Coordinador
              </h3>
            </div>
          </div>

          {coordinatorSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay datos para mostrar
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {coordinatorSummary.map(([coord, data]) => {
                const coordSurgeries = filtered.filter(
                  (s) => (s.coordinadorCx || "Sin asignar") === coord
                )
                return (
                  <div key={coord} className="px-4 py-3">
                    {/* Coordinator row header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <UserCircle
                          className={cn(
                            "size-4",
                            coord === "Sin asignar"
                              ? "text-slate-400"
                              : "text-primary"
                          )}
                        />
                        <span className="text-sm font-semibold">
                          {coord}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 px-1.5"
                        >
                          {data.total} cirugías
                        </Badge>
                      </div>

                      {/* Mini pipeline indicators */}
                      <div className="flex items-center gap-1">
                        {PIPELINE_STATES.filter(
                          (s) => data.byState[s]
                        ).map((s) => {
                          const colorClass =
                            STATE_COLORS[s] || "bg-slate-400 text-white"
                          return (
                            <TooltipProvider
                              key={s}
                              delayDuration={200}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded px-1 py-0 text-[9px] font-medium cursor-default",
                                      colorClass
                                    )}
                                  >
                                    {data.byState[s]}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="text-xs"
                                >
                                  {s}: {data.byState[s]}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                      </div>
                    </div>

                    {/* Surgery list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
                      {coordSurgeries
                        .sort(
                          (a, b) =>
                            a.date.localeCompare(b.date) ||
                            (a.time || "").localeCompare(
                              b.time || ""
                            )
                        )
                        .map((surgery) => {
                          const sColorClass =
                            STATE_COLORS[surgery.state] ||
                            "bg-slate-400 text-white"
                          return (
                            <button
                              key={surgery.id}
                              onClick={() =>
                                openExpediente(surgery.id)
                              }
                              className="w-full text-left rounded-md border p-2 hover:bg-muted/50 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium truncate">
                                  {surgery.patient}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[8px] h-4 px-1 shrink-0 ml-1"
                                >
                                  {surgery.id}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded px-1 py-0 text-[8px] font-medium",
                                    sColorClass
                                  )}
                                >
                                  {surgery.state}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <CalendarDays className="size-3" />
                                <span>
                                  {formatDate(surgery.date)}
                                </span>
                                {surgery.time && (
                                  <>
                                    <Clock className="size-3 ml-1" />
                                    <span>{surgery.time}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                Dr. {surgery.surgeon} •{" "}
                                {surgery.institution}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

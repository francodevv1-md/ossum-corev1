"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  PackageOpen,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  BoxPresentationSku,
  BoxPresentationUnit,
  BoxUnitCondition,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"
import { cn } from "@/lib/utils"

type ViewState = "ready" | "loading" | "empty" | "error" | "refreshing"
type ConditionFilter = Exclude<BoxUnitCondition, null> | "all"
type UnitRow = { box: BoxPresentationSku; unit: BoxPresentationUnit }

const CONDITION_OPTIONS: Array<Exclude<ConditionFilter, "all">> = ["Disponible", "Con diferencias"]
const SURGERY_DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" })

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es")
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : SURGERY_DATE.format(date)
}

const MAINTENANCE_STATUS = {
  OPEN: "Abierto",
  SENT: "Enviado",
  RETURNED_PENDING_REVIEW: "Devuelto · pendiente de revisión",
} as const

function MaintenanceSignal({ unit }: { unit: BoxPresentationUnit }) {
  const count = unit.activeMaintenanceCount ?? 0
  const latest = unit.latestActiveMaintenance
  if (!count || !latest) return <span className="text-xs text-muted-foreground">Sin casos activos</span>

  return (
    <div className="min-w-0 text-sm">
      <span className="flex items-center gap-1.5 font-medium">
        <Wrench className="size-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        {count} {count === 1 ? "caso activo" : "casos activos"}
      </span>
      <span className="mt-1 block truncate text-xs text-muted-foreground" title={latest.articleDescription ?? undefined}>
        {MAINTENANCE_STATUS[latest.status]}{latest.articleDescription ? ` · ${latest.articleDescription}` : " · Caja completa"}
      </span>
    </div>
  )
}

function ConditionBadge({ condition }: { condition: BoxUnitCondition }) {
  if (!condition) return <span className="text-xs text-muted-foreground">Sin resultado confirmado</span>

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-current/20 font-medium",
        condition === "Disponible"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {condition}
    </Badge>
  )
}

function OperationalState({ state, onRetry }: {
  state: Exclude<ViewState, "ready" | "refreshing">
  onRetry: () => void
}) {
  if (state === "loading") {
    return (
      <div className="space-y-2 border-t border-[var(--ossum-line)] p-3" role="status" aria-label="Cargando unidades físicas">
        {[0, 1, 2].map((item) => (
          <div key={item} className="grid min-h-12 gap-3 border border-[var(--ossum-line)] p-3 lg:grid-cols-[minmax(14rem,1fr)_9rem_5rem_minmax(9rem,1fr)_7rem_minmax(10rem,1fr)_minmax(12rem,1fr)_8rem] lg:items-center">
            {["w-48", "w-28", "w-12", "w-32", "w-16", "w-32", "w-36", "w-24"].map((width, index) => (
              <div key={index} className={cn("h-4 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none", width)} />
            ))}
          </div>
        ))}
        <span className="sr-only">Cargando resultados de unidades físicas.</span>
      </div>
    )
  }

  const content = {
    empty: {
      icon: PackageOpen,
      title: "Todavía no hay cajas para mostrar",
      body: "Las cajas se administran como artículos compuestos desde Artículos y Stock.",
    },
    error: {
      icon: AlertTriangle,
      title: "No pudimos cargar las cajas",
      body: "La información anterior no se presenta como actual. Volvé a intentar la carga.",
    },
  }[state]
  const Icon = content.icon

  return (
    <div className="border-t border-[var(--ossum-line)] px-5 py-12 text-center" role={state === "error" ? "alert" : "status"}>
      <Icon className="mx-auto size-5 text-gray-400" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[var(--ossum-navy)]">{content.title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">{content.body}</p>
      {state === "error" ? (
        <Button size="sm" className="mt-4 h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[var(--ossum-action-hover)]" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" /> Reintentar
        </Button>
      ) : null}
    </div>
  )
}

export function BoxesOperationalIndex({
  items,
  onOpenBox,
  onOpenUnit,
  loading = false,
  error = false,
  onRetry,
}: {
  items: BoxPresentationSku[]
  onOpenBox?: (box: BoxPresentationSku) => void
  onOpenUnit?: (box: BoxPresentationSku, unit: BoxPresentationUnit) => void
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}) {
  const [search, setSearch] = useState("")
  const [condition, setCondition] = useState<ConditionFilter>("all")
  const [navigationNotice, setNavigationNotice] = useState("")

  const allUnits = useMemo<UnitRow[]>(() => items.flatMap((box) => box.units.map((unit) => ({ box, unit }))), [items])
  const searchScopedUnits = useMemo(() => {
    const query = normalize(search)
    if (!query) return allUnits

    return allUnits.filter(({ box, unit }) => [
      unit.code,
      box.id,
      box.name,
      box.description,
      box.category,
      unit.lastSurgery?.reference ?? "",
    ].some((value) => normalize(value).includes(query)))
  }, [allUnits, search])
  const visibleUnits = condition === "all"
    ? searchScopedUnits
    : searchScopedUnits.filter(({ unit }) => unit.condition === condition)
  const counts = Object.fromEntries(CONDITION_OPTIONS.map((option) => [
    option,
    searchScopedUnits.filter(({ unit }) => unit.condition === option).length,
  ])) as Record<Exclude<ConditionFilter, "all">, number>
  const hasFilters = Boolean(search || condition !== "all")
  const sourceState: ViewState = error
    ? "error"
    : loading
      ? allUnits.length > 0 ? "refreshing" : "loading"
      : items.length === 0
        ? "empty"
        : "ready"
  const visibleState = sourceState === "ready" || sourceState === "refreshing" ? "results" : sourceState

  function clearFilters() {
    setSearch("")
    setCondition("all")
  }

  function openBox(box: BoxPresentationSku) {
    if (onOpenBox) return onOpenBox(box)
    setNavigationNotice(`Abrir modelo ${box.id}.`)
  }

  function openUnit(box: BoxPresentationSku, unit: BoxPresentationUnit) {
    if (onOpenUnit) return onOpenUnit(box, unit)
    setNavigationNotice(`Abrir historial de ${unit.code}.`)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--ossum-line)] bg-white" aria-labelledby="physical-units-title">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--ossum-line)] bg-white px-3 py-1.5">
        <div className="mr-2 flex items-baseline gap-2">
          <h2 id="physical-units-title" className="text-sm font-semibold text-[var(--ossum-navy)]">Unidades físicas</h2>
          <span className="text-[11px] text-gray-400"><strong className="font-semibold tabular-nums">{allUnits.length}</strong> registradas</span>
        </div>
        <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input
              id="boxes-search"
              aria-label="Buscar unidad o modelo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Código, modelo o última CX"
              className="h-8 pl-8 pr-8 text-xs"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[11px] font-medium text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Limpiar búsqueda"
              >
                Limpiar
              </button>
            ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hasFilters && visibleUnits.length > 0 ? <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={clearFilters}>Restablecer filtros</button> : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--ossum-line)] bg-white px-3 py-1 text-xs" role="group" aria-label="Filtrar por condición actual">
        {CONDITION_OPTIONS.map((option) => {
          const selected = condition === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              aria-label={`${option}, ${counts[option]} ${counts[option] === 1 ? "unidad física" : "unidades físicas"}`}
              onClick={() => setCondition(selected ? "all" : option)}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded px-2 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-[#eef0ff] text-[var(--ossum-action)]" : "text-gray-500 hover:bg-[var(--ossum-surface-2)] hover:text-gray-700",
              )}
            >
              {selected ? <Check className="size-3.5" aria-hidden="true" /> : null}
              {option} <span className="font-mono tabular-nums">{counts[option]}</span>
            </button>
          )
        })}
        <p className="ml-auto self-center text-xs" aria-live="polite">
          <strong className="tabular-nums">{visibleState === "results" ? visibleUnits.length : 0}</strong>{" "}
          <span className="text-muted-foreground">{visibleUnits.length === 1 ? "unidad visible" : "unidades visibles"}</span>
        </p>
        {sourceState === "refreshing" ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-label="Actualizando información">
            <RefreshCw className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Actualizando
          </span>
        ) : null}
      </div>

      {visibleState !== "results" ? (
        <OperationalState state={visibleState} onRetry={onRetry ?? (() => undefined)} />
      ) : allUnits.length === 0 ? (
        <div className="border-t px-5 py-14 text-center" role="status">
          <PackageOpen className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 font-semibold">No hay unidades físicas identificadas</h3>
          <p className="mt-1 text-sm text-muted-foreground">Los modelos existen, pero todavía no tienen unidades identificadas.</p>
        </div>
      ) : visibleUnits.length === 0 ? (
        <div className="border-t px-5 py-14 text-center" role="status">
          <Search className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-4 font-semibold">No hay resultados para esta búsqueda o filtro</h3>
          <p className="mt-1 text-sm text-muted-foreground">Probá con otro código o restablecé los filtros activos.</p>
          <Button variant="outline" className="mt-5" onClick={clearFilters}>Restablecer filtros</Button>
        </div>
      ) : (
        <div className={cn("min-h-0 flex-1 overflow-auto", sourceState === "refreshing" && "opacity-70")} aria-busy={sourceState === "refreshing"}>
          <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-xs">
            <caption className="sr-only">Unidades físicas</caption>
            <thead className="sticky top-0 z-10 bg-[var(--ossum-navy)] text-white">
              <tr>{["Unidad / modelo", "Condición", "Usos/CX", "Última CX", "Problemas", "Reparaciones", "Mantenimiento", "Acción"].map((label) => <th key={label} scope="col" className={cn("whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium", label === "Acción" && "text-right")}>{label}</th>)}</tr>
            </thead>
            <tbody>
            {visibleUnits.map(({ box, unit }) => (
              <tr key={`${box.id}:${unit.unitId ?? unit.code}`} className="group outline-none transition-colors hover:bg-[var(--ossum-surface-2)] focus-within:bg-[var(--ossum-surface-2)]">
                <td className="min-w-56 border-b border-[var(--ossum-line)] px-3 py-1.5">
                  <p className="break-all font-mono text-xs font-semibold text-[var(--ossum-navy)]">{unit.code}</p>
                  <p className="mt-0.5 truncate text-xs font-medium">{box.name}</p>
                  <button type="button" aria-label={`Abrir Caja ${box.id}`} onClick={() => openBox(box)} className="mt-0.5 text-left font-mono text-[11px] text-gray-500 underline-offset-4 hover:text-[var(--ossum-action)] hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring">
                    Ver modelo {box.id}
                  </button>
                </td>
                <td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><ConditionBadge condition={unit.condition} /></td>
                <td className="border-b border-[var(--ossum-line)] px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">{unit.usageCount ?? 0}</td>
                <td className="border-b border-[var(--ossum-line)] px-3 py-1.5">
                    {unit.lastSurgery ? <><span className="block break-all font-mono font-semibold">{unit.lastSurgery.reference}</span><span className="mt-0.5 block text-[11px] text-gray-500">{formatDate(unit.lastSurgery.occurredAt)}</span></> : <span className="text-[11px] text-gray-500">Sin CX realizada</span>}
                </td>
                <td className="border-b border-[var(--ossum-line)] px-3 py-1.5 font-mono font-semibold tabular-nums">{unit.reportedProblemCount ?? 0}</td>
                <td className="border-b border-[var(--ossum-line)] px-3 py-1.5">
                  <div>
                    {(unit.repairSendCount ?? 0) === 0 ? <span className="text-xs text-muted-foreground">Sin envíos</span> : <><span className="flex items-center gap-1.5 font-medium"><Wrench className="size-3.5 text-muted-foreground" aria-hidden="true" />{unit.repairSendCount} {(unit.repairSendCount ?? 0) === 1 ? "envío" : "envíos"}</span>{(unit.repairLatestSentSignalCount ?? 0) > 0 ? <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">{unit.repairLatestSentSignalCount} {(unit.repairLatestSentSignalCount ?? 0) === 1 ? "instrumental con último evento: envío" : "instrumentales con último evento: envío"}</span> : <span className="mt-1 block text-xs text-muted-foreground">Último evento por instrumental: regreso</span>}</>}
                  </div>
                </td>
                <td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><MaintenanceSignal unit={unit} /></td>
                <td className="border-b border-[var(--ossum-line)] px-3 py-1.5 text-right">
                <Button aria-label={`Ver historial de ${unit.code}`} variant="outline" size="sm" className="min-h-11 w-full justify-between text-xs lg:h-8 lg:min-h-0 lg:w-auto" onClick={() => openUnit(box, unit)}>
                  Ver historial <ArrowUpRight className="size-4" aria-hidden="true" />
                </Button>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">{navigationNotice}</p>
    </section>
  )
}

import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { CoordinationUiState } from "@/components/coordinadores/coordination-ui-state"

type Props = {
  state: CoordinationUiState
  surface: "personal" | "global"
  emptyStateVariant?: "shared" | "productive-personal"
  loadedAnnouncements?: "internal" | "external"
  onRetry?: () => void
  onClearFilters?: () => void
  onExitPreview?: () => void
  children?: ReactNode
}

export function CoordinationStateSurface({ state, surface, emptyStateVariant = "shared", loadedAnnouncements = "internal", onRetry, onClearFilters, onExitPreview, children }: Props) {
  const loadingCopy = surface === "personal" ? "Cargando tu bandeja…" : "Cargando panel global…"
  const shellClass = "rounded-xl border border-slate-200 bg-white px-4 py-8 text-center"
  const loadedStatusProps = loadedAnnouncements === "internal"
    ? { role: "status" as const, "aria-live": "polite" as const }
    : {}

  if (state.tag === "refreshing") {
    return <div aria-busy="true"><p className="mb-2 text-xs font-medium text-sky-700" {...loadedStatusProps}>Actualizando…</p>{children}</div>
  }
  if (state.tag === "error-refresh") {
    return <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><span {...loadedStatusProps}>No pudimos actualizar. Seguís viendo la última información cargada.</span><Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>Reintentar</Button></div>{children}</div>
  }
  if (state.tag === "ready-populated") return <div>{children}</div>
  if (state.tag === "waiting-auth" || state.tag === "loading-initial") {
    return <div className={shellClass} role="status" aria-live="polite" aria-busy="true"><p className="text-sm font-medium text-slate-700">{loadingCopy}</p></div>
  }
  if (state.tag === "error-initial") {
    return <div className={shellClass} role="alert"><p className="text-sm font-medium text-slate-800">No pudimos cargar la bandeja.</p><Button type="button" className="mt-4 min-h-11" onClick={onRetry}>Reintentar</Button></div>
  }
  if (state.tag === "blocked-unresolved") {
    return <div className={shellClass} role="status"><p className="text-sm font-semibold text-slate-800">No pudimos vincular tu usuario con un coordinador activo.</p><p className="mt-1 text-xs text-slate-500">Contactá a un administrador para revisar la vinculación.</p></div>
  }
  if (state.tag === "blocked-ambiguous") {
    return <div className={shellClass} role="status"><p className="text-sm font-semibold text-slate-800">Encontramos más de un coordinador posible para tu usuario.</p><p className="mt-1 text-xs text-slate-500">Contactá a un administrador para revisar la vinculación.</p></div>
  }
  if (state.tag === "preview-denied") {
    return <div className={shellClass} role="alert"><p className="text-sm font-semibold text-slate-800">La vista de prueba ya no está disponible.</p><Button type="button" className="mt-4 min-h-11" onClick={onExitPreview}>Volver a mi bandeja</Button></div>
  }
  if (state.tag === "ready-empty") {
    return <div className={shellClass} {...loadedStatusProps}><p className="text-sm font-medium text-slate-700">{surface === "personal" ? "No tenés casos asignados en esta etapa." : "No hay casos operativos para mostrar."}</p></div>
  }
  if (state.tag === "ready-contradictory-empty") {
    const copy = emptyStateVariant === "productive-personal" ? "Los filtros seleccionados se contradicen" : "No hay casos con estos filtros."
    return <div className={shellClass} {...loadedStatusProps}><p className="text-sm font-medium text-slate-700">{copy}</p><Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onClearFilters}>Limpiar filtros</Button></div>
  }
  const filteredEmptyCopy = emptyStateVariant === "productive-personal" ? "No hay resultados con estos filtros" : "No hay casos con estos filtros."
  return <div className={shellClass} {...loadedStatusProps}><p className="text-sm font-medium text-slate-700">{filteredEmptyCopy}</p><Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onClearFilters}>Limpiar filtros</Button></div>
}

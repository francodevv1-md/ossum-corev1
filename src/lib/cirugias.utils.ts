/**
 * cirugias.utils.ts
 * Funciones auxiliares del módulo Cirugías.
 * Lógica pura sin dependencias de React.
 */

import type { Surgery } from "@/types"
import type { CirugiasKpis, PendientePrincipal } from "./cirugias.types"
import type { ResumenCobranzaSurgery } from "./cobros.utils"
import { ACTIVE_STATES } from "./cirugias.constants"

// ═══════════════════════════════════════════════════════════════
// FACTURACIÓN STATUS
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene el estado de facturación de una cirugía.
 * Requiere getters del store como parámetros para evitar acoplamiento.
 *
 * V2: usa resumenCobranza para determinar el estado de cobro.
 */
export function getFacturacionStatus(
  surgery: Surgery,
  getDocStatus: (id: string) => string,
  resumenCobranza: ResumenCobranzaSurgery,
): string {
  if (surgery.facturado) {
    if (resumenCobranza.totalCobrado > 0 && resumenCobranza.saldoPendiente <= 0) return "Facturada"
    if (resumenCobranza.totalCobrado > 0) return "Facturada"
    return "Pendiente de cobro"
  }
  const docStatus = getDocStatus(surgery.id)
  if (docStatus === "Apta para facturar" && surgery.autorizado) return "Autorizada para facturar"
  return "Sin facturar"
}

// ═══════════════════════════════════════════════════════════════
// PENDIENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export function getPendientePrincipal(
  surgery: Surgery,
  docStatus: string,
  consumo: { state: string } | undefined,
  box: { id: string } | undefined,
): PendientePrincipal {
  const s = surgery
  if (s.state === "Suspendida") return { text: "Cirugía suspendida", color: "bg-violet-50 text-violet-700 border-violet-200" }
  if (s.state === "Cancelada") return { text: "Cirugía cancelada", color: "bg-red-50 text-red-700 border-red-200" }
  if (!s.autorizado) return { text: "Sin autorización", color: "bg-amber-50 text-amber-700 border-amber-200" }
  if (docStatus === "Incompleta") return { text: "Documentación incompleta", color: "bg-red-50 text-red-700 border-red-200" }
  if (s.state === "Realizada" && !s.facturado && docStatus === "Apta para facturar") return { text: "Apta para facturar", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
  if (s.state === "Realizada" && !s.facturado) return { text: "No facturada", color: "bg-gray-50 text-gray-700 border-gray-200" }
  if (s.preparationState === "En preparación" && !box) return { text: "Caja no asignada", color: "bg-sky-50 text-sky-700 border-sky-200" }
  if (s.state === "En tránsito" && !consumo) return { text: "Consumo pendiente", color: "bg-amber-50 text-amber-700 border-amber-200" }
  if (s.preparationState === "En preparación") return { text: "En preparación", color: "bg-sky-50 text-sky-700 border-sky-200" }
  if (s.state === "En tránsito") return { text: "Material en tránsito", color: "bg-cyan-50 text-cyan-700 border-cyan-200" }
  if (s.state === "Finalizada") return { text: "Cirugía finalizada", color: "bg-green-50 text-green-700 border-green-200" }
  if (s.state === "Autorizada") return { text: "Autorizada — pendiente preparación", color: "bg-blue-50 text-blue-700 border-blue-200" }
  return { text: s.state, color: "bg-gray-50 text-gray-700 border-gray-200" }
}

// ═══════════════════════════════════════════════════════════════
// KPI COMPUTATION
// ═══════════════════════════════════════════════════════════════

export function computeKpis(
  surgeries: Surgery[],
  getDocStatus: (id: string) => string,
): CirugiasKpis {
  const totalActivas = surgeries.filter((s) => ACTIVE_STATES.includes(s.state)).length
  const sinAutorizar = surgeries.filter((s) => s.state === "Sin autorizar").length
  const autorizadas = surgeries.filter((s) => s.state === "Autorizada").length
  const enPreparacion = surgeries.filter((s) => s.preparationState === "En preparación").length
  const enTransito = surgeries.filter((s) => s.state === "En tránsito").length
  const realizadas = surgeries.filter((s) => s.state === "Realizada").length
  const docIncompleta = surgeries.filter((s) => getDocStatus(s.id) === "Incompleta").length
  const pendFacturar = surgeries.filter((s) => !s.facturado && s.state === "Realizada").length
  return { totalActivas, sinAutorizar, autorizadas, enPreparacion, enTransito, realizadas, docIncompleta, pendFacturar }
}

// ═══════════════════════════════════════════════════════════════
// DOC PROGRESS
// ═══════════════════════════════════════════════════════════════

export function computeDocProgress(checklist: { items: Array<{ completed: boolean }> } | undefined): number {
  if (!checklist) return 0
  const completed = checklist.items.filter((i) => i.completed).length
  const total = checklist.items.length
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

// ═══════════════════════════════════════════════════════════════
// FACTURACIÓN DISPLAY
// ═══════════════════════════════════════════════════════════════

export function getFacturacionBadgeLabel(status: string): string {
  if (status === "Sin facturar") return "No facturada"
  if (status === "Pendiente de cobro") return "Pendiente de cobro"
  return "Facturada"
}

// ═══════════════════════════════════════════════════════════════
// KPI FILTER CLICK
// ═══════════════════════════════════════════════════════════════

export function resolveKpiFilter(
  currentKpiFilter: string | null,
  filterKey: string | null,
): { newKpiFilter: string | null; newStateFilters: string[] | null } {
  if (filterKey === null) {
    return { newKpiFilter: null, newStateFilters: null }
  }
  if (currentKpiFilter === filterKey) {
    return { newKpiFilter: null, newStateFilters: null }
  }
  if (filterKey === "En preparación") {
    return { newKpiFilter: filterKey, newStateFilters: null }
  }
  if (filterKey !== "docIncompleta" && filterKey !== "pendFacturar") {
    return { newKpiFilter: filterKey, newStateFilters: [filterKey] }
  }
  return { newKpiFilter: filterKey, newStateFilters: null }
}

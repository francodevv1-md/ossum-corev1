/**
 * facturacion.constants.ts
 * Constantes del módulo Facturación (CHATZAI-010).
 * Labels, colores y opciones para los estados extendidos y selector de base.
 */

import type { BaseFacturacion, EstadoFacturacion } from "@/types"

// ═══════════════════════════════════════════════════════════════
// BASE DE FACTURACIÓN
// ═══════════════════════════════════════════════════════════════

export const BASE_FACTURACION_OPTIONS: { value: BaseFacturacion; label: string }[] = [
  { value: "presupuesto", label: "Presupuesto vigente" },
  { value: "consumo", label: "Consumo valorizado" },
  { value: "mixto", label: "Mixto (manual)" },
]

// ═══════════════════════════════════════════════════════════════
// ESTADOS DE FACTURACIÓN
// ═══════════════════════════════════════════════════════════════

export const ESTADO_FACTURACION_LABELS: Record<EstadoFacturacion, string> = {
  sin_facturar: "Sin facturar",
  autorizado_para_facturar: "Autorizado para facturar",
  pendiente_sin_documentacion: "Pendiente sin documentación",
  listo_para_facturar: "Listo para facturar",
  facturado: "Facturado",
  factura_sin_cobrar: "Sin cobrar",
  factura_cobrada_parcialmente: "Cobro parcial",
  factura_cobrada: "Cobrada",
  vencida: "Vencida",
}

export const ESTADO_FACTURACION_COLORS: Record<EstadoFacturacion, string> = {
  sin_facturar: "bg-gray-100 text-gray-700",
  autorizado_para_facturar: "bg-blue-100 text-blue-700",
  pendiente_sin_documentacion: "bg-amber-100 text-amber-700",
  listo_para_facturar: "bg-green-100 text-green-700",
  facturado: "bg-indigo-100 text-indigo-700",
  factura_sin_cobrar: "bg-red-100 text-red-700",
  factura_cobrada_parcialmente: "bg-orange-100 text-orange-700",
  factura_cobrada: "bg-emerald-100 text-emerald-700",
  vencida: "bg-red-200 text-red-800",
}

// ═══════════════════════════════════════════════════════════════
// SUGERENCIA DE BASE (DF-Fact-01)
// ═══════════════════════════════════════════════════════════════

export type BaseSuggestionReason =
  | "sin_diferencia"
  | "consumo_mayor"
  | "consumo_menor"
  | "articulos_z"
  | "sin_presupuesto"
  | "sin_consumo"
  | "sin_base"

export interface BaseSuggestion {
  base: BaseFacturacion
  reason: BaseSuggestionReason
  forced: boolean  // true when user cannot change (e.g. no presupuesto → forced consumo)
}

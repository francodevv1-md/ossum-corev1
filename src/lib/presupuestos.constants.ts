/**
 * presupuestos.constants.ts
 * Constantes del módulo Presupuestos.
 * CHATZAI-004: Constantes para el formulario unificado de presupuestos.
 */

export const VIGENCIA_OPTIONS = ["15 días", "30 días", "60 días", "90 días"] as const

export const LISTA_PRECIOS_OPTIONS = [
  "LP-OSDE-2026-04",
  "LP-SM-2026-04",
  "LP-GA-2026-04",
  "LP-PAMI-2026-04",
  "LP-OSDE-2026-05",
  "LP-Gral-2026-05",
] as const

export const CONDICION_PAGO_OPTIONS = ["Contado", "30 días", "60 días", "A convenir"] as const

/**
 * CHATZAI-017J: Opciones de IVA para el presupuesto.
 * Cada opción tiene un key único para el selector y un valor numérico para el cálculo.
 * "exento" y "no_gravado" conservan tratamientos distintos de gravado al 0%.
 * Las alícuotas siguen la nomenclatura AFIP vigente.
 */
export const IVA_OPTIONS = [
  { key: "exento", value: 0, label: "Exento" },
  { key: "no_gravado", value: 0, label: "No gravado" },
  { key: "0", value: 0, label: "0%" },
  { key: "10.5", value: 10.5, label: "10,5%" },
  { key: "21", value: 21, label: "21%" },
  { key: "27", value: 27, label: "27%" },
] as const

/** Tipo del key de IVA (string para selector Radix) */
export type IvaKey = (typeof IVA_OPTIONS)[number]["key"]

/** Lookup: IVA key → valor numérico */
export function ivaValueFromKey(key: string): number {
  return IVA_OPTIONS.find((o) => o.key === key)?.value ?? 0
}

/** Lookup: valor numérico → IVA key (toma el primero que coincide) */
export function ivaKeyFromValue(value: number): string {
  // Para 0, distinguir exento vs 0%: por defecto devolver "0"
  return IVA_OPTIONS.find((o) => o.value === value && o.key !== "exento" && o.key !== "no_gravado")?.key ?? "0"
}

export { VENDEDORES_OPTIONS } from "@/lib/shared-constants"

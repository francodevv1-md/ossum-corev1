/**
 * facturacion.utils.ts
 * Funciones de negocio del módulo Facturación (CHATZAI-010).
 * Implementa DF-Fact-01 a DF-Fact-10 según el brief de implementación.
 */

import type {
  Consumo, Presupuesto, StockItem, Comprobante, ImputacionCobro, Surgery,
  DocumentStatus, ConsumoState, BaseFacturacion, EstadoFacturacion,
  DiferenciaFactura, FacturaVentaData,
} from "@/types"
import type { BaseSuggestion, BaseSuggestionReason } from "./facturacion.constants"
import { getSaldoPendienteFactura } from "./cobros.utils"

// ═══════════════════════════════════════════════════════════════
// CONSUMO VALORIZADO (DF-Fact-10)
// ═══════════════════════════════════════════════════════════════

export interface ConsumoValorizadoItem {
  stockItemId: string
  name: string
  code: string
  consumed: number
  unitPrice: number
  subtotal: number
  precioOrigen: "presupuesto" | "stock" | "manual"
}

export interface ConsumoValorizadoResult {
  items: ConsumoValorizadoItem[]
  total: number
  itemsSinPrecio: string[]
}

/**
 * Valoriza los ítems consumidos según precios del presupuesto.
 * Ítems no presupuestados usan precio de stock.
 * Ítems sin precio se marcan en itemsSinPrecio.
 */
export function getConsumoValorizado(
  consumo: Consumo | undefined,
  presupuesto: Presupuesto | undefined,
  stockItems: StockItem[]
): ConsumoValorizadoResult {
  if (!consumo || consumo.items.length === 0) {
    return { items: [], total: 0, itemsSinPrecio: [] }
  }

  // Build price maps from presupuesto
  const presupuestoPriceMap = new Map<string, { unitPrice: number; isArticuloZ: boolean }>()
  if (presupuesto) {
    for (const item of presupuesto.items) {
      presupuestoPriceMap.set(item.code, { unitPrice: item.unitPrice, isArticuloZ: item.isArticuloZ ?? false })
    }
  }

  // Build price map from stock
  const stockPriceMap = new Map<string, number>()
  for (const item of stockItems) {
    stockPriceMap.set(item.id, item.unitPrice)
  }

  const items: ConsumoValorizadoItem[] = []
  const itemsSinPrecio: string[] = []
  let total = 0

  for (const ci of consumo.items) {
    if (ci.consumed <= 0) continue

    // 1. Try presupuesto price by code
    const prPrice = presupuestoPriceMap.get(ci.code)
    if (prPrice) {
      const subtotal = ci.consumed * prPrice.unitPrice
      items.push({
        stockItemId: ci.stockItemId,
        name: ci.name,
        code: ci.code,
        consumed: ci.consumed,
        unitPrice: prPrice.unitPrice,
        subtotal,
        precioOrigen: "presupuesto",
      })
      total += subtotal
      continue
    }

    // 2. Try stock price by stockItemId
    const stkPrice = stockPriceMap.get(ci.stockItemId)
    if (stkPrice !== undefined && stkPrice > 0) {
      const subtotal = ci.consumed * stkPrice
      items.push({
        stockItemId: ci.stockItemId,
        name: ci.name,
        code: ci.code,
        consumed: ci.consumed,
        unitPrice: stkPrice,
        subtotal,
        precioOrigen: "stock",
      })
      total += subtotal
      continue
    }

    // 3. No price found
    items.push({
      stockItemId: ci.stockItemId,
      name: ci.name,
      code: ci.code,
      consumed: ci.consumed,
      unitPrice: 0,
      subtotal: 0,
      precioOrigen: "manual",
    })
    itemsSinPrecio.push(ci.name)
  }

  return { items, total, itemsSinPrecio }
}

// ═══════════════════════════════════════════════════════════════
// DIFERENCIAS PRESUPUESTO vs CONSUMO (DF-Fact-02)
// ═══════════════════════════════════════════════════════════════

/**
 * Compara ítems del presupuesto vs consumo y genera DiferenciaFactura[].
 * Detecta 5 tipos de diferencia: cantidad, no_consumido, no_presupuestado, articulo_z, precio.
 */
export function getDiferenciasPresupuestoConsumo(
  presupuesto: Presupuesto | undefined,
  consumo: Consumo | undefined
): DiferenciaFactura[] {
  if (!presupuesto && !consumo) return []
  if (!presupuesto) return []
  if (!consumo) {
    // All budgeted items not consumed
    return presupuesto.items.map((pi) => ({
      stockItemId: pi.stockItemId,
      name: pi.name,
      code: pi.code,
      cantPresupuestada: pi.quantity,
      cantConsumida: 0,
      precioUnitario: pi.unitPrice,
      diferencia: -pi.quantity,
      impactoMonetario: -pi.quantity * pi.unitPrice,
      tipo: (pi.isArticuloZ ? "articulo_z" : "no_consumido") as DiferenciaFactura["tipo"],
    }))
  }

  const diferencias: DiferenciaFactura[] = []

  // Build consumption map
  const consumoMap = new Map<string, { consumed: number; stockItemId: string }>()
  for (const ci of consumo.items) {
    consumoMap.set(ci.code, { consumed: ci.consumed, stockItemId: ci.stockItemId })
  }

  // Track which consumption items were matched
  const matchedConsumoCodes = new Set<string>()

  // 1. Check each presupuesto item against consumo
  for (const pi of presupuesto.items) {
    const consumoItem = consumoMap.get(pi.code)
    if (consumoItem) {
      matchedConsumoCodes.add(pi.code)
      if (consumoItem.consumed !== pi.quantity) {
        // Diferencia de cantidad
        const diff = consumoItem.consumed - pi.quantity
        diferencias.push({
          stockItemId: pi.stockItemId,
          name: pi.name,
          code: pi.code,
          cantPresupuestada: pi.quantity,
          cantConsumida: consumoItem.consumed,
          precioUnitario: pi.unitPrice,
          diferencia: diff,
          impactoMonetario: diff * pi.unitPrice,
          tipo: pi.isArticuloZ ? "articulo_z" : "cantidad",
        })
      }
    } else {
      // Presupuestado pero no consumido
      diferencias.push({
        stockItemId: pi.stockItemId,
        name: pi.name,
        code: pi.code,
        cantPresupuestada: pi.quantity,
        cantConsumida: 0,
        precioUnitario: pi.unitPrice,
        diferencia: -pi.quantity,
        impactoMonetario: -pi.quantity * pi.unitPrice,
        tipo: pi.isArticuloZ ? "articulo_z" : "no_consumido",
      })
    }
  }

  // 2. Check consumed items not in presupuesto
  for (const ci of consumo.items) {
    if (matchedConsumoCodes.has(ci.code)) continue
    if (ci.consumed <= 0) continue

    // Find price from presupuesto (may exist but code mismatch)
    const prItem = presupuesto.items.find((pi) => pi.stockItemId === ci.stockItemId)
    const unitPrice = prItem?.unitPrice ?? 0

    diferencias.push({
      stockItemId: ci.stockItemId,
      name: ci.name,
      code: ci.code,
      cantPresupuestada: 0,
      cantConsumida: ci.consumed,
      precioUnitario: unitPrice,
      diferencia: ci.consumed,
      impactoMonetario: ci.consumed * unitPrice,
      tipo: "no_presupuestado",
    })
  }

  return diferencias
}

// ═══════════════════════════════════════════════════════════════
// MONTO FACTURABLE (DF-Fact-01, DF-Fact-10)
// ═══════════════════════════════════════════════════════════════

export interface MontoFacturableResult {
  totalPresupuestado: number
  totalConsumidoValorizado: number
  deltaDetectado: number
  totalAFacturar: number
}

/**
 * Calcula el monto facturable según la base seleccionada.
 * totalAFacturar = totalBase + diferenciasAceptadas
 */
export function getMontoFacturable(
  presupuesto: Presupuesto | undefined,
  consumo: Consumo | undefined,
  stockItems: StockItem[],
  base: BaseFacturacion,
  diferenciasAceptadas: number = 0
): MontoFacturableResult {
  const totalPresupuestado = presupuesto?.total ?? 0
  const totalConsumidoValorizado = getConsumoValorizado(consumo, presupuesto, stockItems).total
  const deltaDetectado = totalConsumidoValorizado - totalPresupuestado

  let totalBase: number
  switch (base) {
    case "presupuesto":
      totalBase = totalPresupuestado
      break
    case "consumo":
      totalBase = totalConsumidoValorizado
      break
    case "mixto":
      // En modo mixto, el totalBase es el de la base original elegida + los ítems importados
      // Default: tomar el mayor como referencia
      totalBase = Math.max(totalPresupuestado, totalConsumidoValorizado)
      break
    default:
      totalBase = totalPresupuestado
  }

  const totalAFacturar = totalBase + diferenciasAceptadas

  return {
    totalPresupuestado,
    totalConsumidoValorizado,
    deltaDetectado,
    totalAFacturar,
  }
}

// ═══════════════════════════════════════════════════════════════
// SUGERENCIA DE BASE (DF-Fact-01)
// ═══════════════════════════════════════════════════════════════

/**
 * Sugiere la base de facturación según las condiciones detectadas.
 * Retorna la base sugerida, el motivo y si es forzada (sin alternativa).
 */
export function suggestBaseFacturacion(
  presupuesto: Presupuesto | undefined,
  consumo: Consumo | undefined,
  stockItems: StockItem[]
): BaseSuggestion {
  const tienePresupuesto = !!presupuesto
  const tieneConsumoValidado = !!consumo && (consumo.state === "Validado" || consumo.state === "Facturado")

  // No hay base económica
  if (!tienePresupuesto && !tieneConsumoValidado) {
    return { base: "presupuesto", reason: "sin_base", forced: true }
  }

  // Solo consumo (no hay presupuesto)
  if (!tienePresupuesto) {
    return { base: "consumo", reason: "sin_presupuesto", forced: true }
  }

  // Solo presupuesto (no hay consumo validado)
  if (!tieneConsumoValidado) {
    return { base: "presupuesto", reason: "sin_consumo", forced: true }
  }

  const { totalPresupuestado, totalConsumidoValorizado } = getMontoFacturable(
    presupuesto, consumo, stockItems, "presupuesto"
  )

  // Verificar Artículos Z
  const tieneArticulosZ = presupuesto.items.some((i) => i.isArticuloZ)
  if (tieneArticulosZ) {
    return { base: "presupuesto", reason: "articulos_z", forced: false }
  }

  const delta = totalConsumidoValorizado - totalPresupuestado

  // Sin diferencia significativa
  if (Math.abs(delta) < 1) {
    return { base: "presupuesto", reason: "sin_diferencia", forced: false }
  }

  // Consumo > Presupuesto
  if (delta > 0) {
    return { base: "consumo", reason: "consumo_mayor", forced: false }
  }

  // Consumo < Presupuesto
  return { base: "presupuesto", reason: "consumo_menor", forced: false }
}

// ═══════════════════════════════════════════════════════════════
// SALDO PENDIENTE (DF-Fact-09)
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula el saldo pendiente de cobro de una FV.
 * Delegates to getSaldoPendienteFactura from cobros.utils (V2).
 */
export function getSaldoPendiente(
  comprobante: Comprobante,
  imputaciones: ImputacionCobro[]
): number {
  return getSaldoPendienteFactura(comprobante, imputaciones)
}

// ═══════════════════════════════════════════════════════════════
// ESTADO DE FACTURACIÓN (DF-Fact-04, DF-Fact-05, DF-Fact-06)
// ═══════════════════════════════════════════════════════════════

/**
 * Determina el estado de facturación extendido de una cirugía.
 * Implementa el árbol de decisión de 9 estados.
 * V2: uses ImputacionCobro[] instead of Cobro[].
 */
export function getEstadoFacturacion(
  surgery: Surgery,
  docStatus: DocumentStatus,
  consumoState: ConsumoState | undefined,
  tienePresupuesto: boolean,
  imputaciones: ImputacionCobro[],
  fvComprobante?: Comprobante
): EstadoFacturacion {
  if (surgery.facturado) {
    if (!fvComprobante) return "facturado"

    const saldo = getSaldoPendienteFactura(fvComprobante, imputaciones)

    // Verificar vencimiento
    if (fvComprobante.expiry) {
      const expiryDate = new Date(fvComprobante.expiry + "T23:59:59")
      const today = new Date()
      if (expiryDate < today && saldo > 0) return "vencida"
    }

    if (saldo <= 0) return "factura_cobrada"
    if (saldo < fvComprobante.amount) return "factura_cobrada_parcialmente"
    return "factura_sin_cobrar"
  }

  // No facturado
  if (!surgery.autorizado) return "sin_facturar"

  if (docStatus !== "Apta para facturar") return "pendiente_sin_documentacion"

  // Autorizado + doc apta
  if (consumoState !== "Validado" && consumoState !== "Facturado") {
    return "autorizado_para_facturar"
  }

  // Consumo validado o facturado + doc apta + autorizado
  if (!tienePresupuesto && !consumoState) {
    return "autorizado_para_facturar"
  }

  return "listo_para_facturar"
}

/**
 * Versión sobrecargada que acepta un comprobante FV para calcular saldo correctamente.
 * V2: uses ImputacionCobro[] instead of Cobro[].
 * @deprecated Use getEstadoFacturacion with fvComprobante parameter instead.
 */
export function getEstadoFacturacionWithFV(
  surgery: Surgery,
  docStatus: DocumentStatus,
  consumoState: ConsumoState | undefined,
  tienePresupuesto: boolean,
  fvComprobante: Comprobante | undefined,
  imputaciones: ImputacionCobro[]
): EstadoFacturacion {
  if (!surgery.facturado) {
    if (!surgery.autorizado) return "sin_facturar"
    if (docStatus !== "Apta para facturar") return "pendiente_sin_documentacion"
    if (consumoState !== "Validado" && consumoState !== "Facturado") return "autorizado_para_facturar"
    if (!tienePresupuesto && !consumoState) return "autorizado_para_facturar"
    return "listo_para_facturar"
  }

  // Facturado: calcular saldo dinámicamente
  if (!fvComprobante) return "facturado"

  const saldo = getSaldoPendienteFactura(fvComprobante, imputaciones)

  // Verificar vencimiento
  if (fvComprobante.expiry) {
    const expiryDate = new Date(fvComprobante.expiry + "T23:59:59")
    const today = new Date()
    if (expiryDate < today && saldo > 0) return "vencida"
  }

  if (saldo <= 0) return "factura_cobrada"
  if (saldo < fvComprobante.amount) return "factura_cobrada_parcialmente"
  return "factura_sin_cobrar"
}

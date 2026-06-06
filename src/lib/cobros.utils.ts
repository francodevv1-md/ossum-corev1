import type { Comprobante, CobroV2, ImputacionCobro, EstadoCobro, EstadoCobranzaFactura } from "@/types"
import { PLAZO_PAGO_DEFAULT_DIAS } from "./cobros.constants"

// ═══════════════════════════════════════════════════════════════
// COBROS V1 — Pure Utility Functions
// ═══════════════════════════════════════════════════════════════

// ── Cobro movement state ──

/** Total imputado para un cobro específico */
export function getImporteImputadoCobro(cobroId: string, imputaciones: ImputacionCobro[]): number {
  return imputaciones
    .filter((imp) => imp.cobroId === cobroId)
    .reduce((sum, imp) => sum + imp.importeImputado, 0)
}

/** Importe no imputado de un cobro (saldo disponible para imputar) */
export function getImporteNoImputadoCobro(cobro: CobroV2, imputaciones: ImputacionCobro[]): number {
  const imputado = getImporteImputadoCobro(cobro.id, imputaciones)
  return Math.max(0, cobro.importe - imputado)
}

/** Estado del cobro (movimiento) según sus imputaciones */
export function getEstadoCobro(cobro: CobroV2, imputaciones: ImputacionCobro[]): EstadoCobro {
  const imputado = getImporteImputadoCobro(cobro.id, imputaciones)
  if (imputado === 0) return "registrado"
  if (imputado >= cobro.importe) return "imputado_completo"
  return "parcialmente_imputado"
}

// ── Factura cobranza state ──

/** Total cobrado para una factura (FV) */
export function getTotalCobradoFactura(facturaId: string, imputaciones: ImputacionCobro[]): number {
  return imputaciones
    .filter((imp) => imp.facturaId === facturaId)
    .reduce((sum, imp) => sum + imp.importeImputado, 0)
}

/** Saldo pendiente de una factura */
export function getSaldoPendienteFactura(factura: Comprobante, imputaciones: ImputacionCobro[]): number {
  const cobrado = getTotalCobradoFactura(factura.number, imputaciones)
  return Math.max(0, factura.amount - cobrado)
}

/** Porcentaje cobrado de una factura */
export function getPorcentajeCobradoFactura(factura: Comprobante, imputaciones: ImputacionCobro[]): number {
  if (factura.amount === 0) return 100
  const cobrado = getTotalCobradoFactura(factura.number, imputaciones)
  return Math.min(100, Math.round((cobrado / factura.amount) * 100))
}

/** Estado de cobranza de una factura (DCob-008 corrected) */
export function getEstadoCobranzaFactura(factura: Comprobante, imputaciones: ImputacionCobro[]): EstadoCobranzaFactura {
  const saldo = getSaldoPendienteFactura(factura, imputaciones)
  if (saldo <= 0) return "cobrada"
  if (isFacturaVencida(factura, imputaciones)) return "vencida"
  const cobrado = getTotalCobradoFactura(factura.number, imputaciones)
  if (cobrado > 0) return "cobro_parcial"
  return "sin_cobrar"
}

// ── Vencimiento ──

/** Fecha de vencimiento de una FV: usa expiry si existe, sino date + PLAZO_PAGO_DEFAULT_DIAS */
export function getVencimientoFV(comprobante: Comprobante): Date {
  if (comprobante.expiry) {
    return new Date(comprobante.expiry + "T00:00:00")
  }
  const fechaFactura = new Date(comprobante.date + "T00:00:00")
  const vencimiento = new Date(fechaFactura)
  vencimiento.setDate(vencimiento.getDate() + PLAZO_PAGO_DEFAULT_DIAS)
  return vencimiento
}

/** True si la FV está vencida y tiene saldo pendiente */
export function isFacturaVencida(comprobante: Comprobante, imputaciones: ImputacionCobro[]): boolean {
  const saldo = getSaldoPendienteFactura(comprobante, imputaciones)
  if (saldo <= 0) return false
  const vencimiento = getVencimientoFV(comprobante)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return vencimiento < hoy
}

// ── Queries ──

/** Cobros imputados a una factura específica */
export function getCobrosByFacturaId(facturaId: string, cobros: CobroV2[], imputaciones: ImputacionCobro[]): CobroV2[] {
  const cobroIds = imputaciones
    .filter((imp) => imp.facturaId === facturaId)
    .map((imp) => imp.cobroId)
  const uniqueCobroIds = [...new Set(cobroIds)]
  return cobros.filter((c) => uniqueCobroIds.includes(c.id))
}

/** Imputaciones de una factura */
export function getImputacionesByFacturaId(facturaId: string, imputaciones: ImputacionCobro[]): ImputacionCobro[] {
  return imputaciones.filter((imp) => imp.facturaId === facturaId)
}

/** Imputaciones de un cobro */
export function getImputacionesByCobroId(cobroId: string, imputaciones: ImputacionCobro[]): ImputacionCobro[] {
  return imputaciones.filter((imp) => imp.cobroId === cobroId)
}

/** Facturas abiertas (saldo > 0) de un cliente */
export function getFacturasAbiertasByCliente(clienteId: string, comprobantes: Comprobante[], imputaciones: ImputacionCobro[]): Comprobante[] {
  return comprobantes.filter(
    (c) => c.type === "FV" && c.client === clienteId && getSaldoPendienteFactura(c, imputaciones) > 0
  )
}

// ═══════════════════════════════════════════════════════════════
// RESUMEN COBRANZA POR CIRUGÍA (CHATZAI-015)
// Helper agregado para el Expediente: compone getters canónicos.
// ═══════════════════════════════════════════════════════════════

/** Detalle de un cobro imputado a una FV específica */
export interface CobroImputadoDetalle {
  cobroId: string
  fecha: string
  medioCobro: string
  referencia?: string
  importeImputado: number
  observaciones?: string
}

/** Detalle de cobranza de una FV dentro del Expediente */
export interface FacturaCobranzaDetalle {
  facturaNumber: string
  fecha: string
  totalFactura: number
  totalCobrado: number
  saldoPendiente: number
  estadoCobranza: EstadoCobranzaFactura
  vencimiento?: string
  vencida: boolean
  cobros: CobroImputadoDetalle[]
}

/** Resumen de cobranza agregado por cirugía para el Expediente */
export interface ResumenCobranzaSurgery {
  totalFacturado: number
  totalCobrado: number
  saldoPendiente: number
  facturas: FacturaCobranzaDetalle[]
}

/** MedioCobro label para UI */
const MEDIO_COBRO_LABELS: Record<string, string> = {
  transferencia: "Transferencia",
  cheque: "Cheque",
  efectivo: "Efectivo",
  deposito: "Depósito",
  otro: "Otro",
}

export function getMedioCobroLabel(medio: string): string {
  return MEDIO_COBRO_LABELS[medio] || medio
}

/**
 * Resumen de cobranza por cirugía.
 * Compone getters canónicos (getTotalCobradoFactura, getSaldoPendienteFactura,
 * getEstadoCobranzaFactura) sin duplicar lógica de cálculo.
 */
export function getResumenCobranzaBySurgeryId(
  surgeryId: string,
  comprobantes: Comprobante[],
  cobrosV2: CobroV2[],
  imputaciones: ImputacionCobro[],
): ResumenCobranzaSurgery {
  // 1. FVs de la cirugía
  const fvComprobantes = comprobantes.filter(
    (c) => c.surgeryId === surgeryId && c.type === "FV"
  )

  // 2. Si no hay FVs, devolver resumen vacío
  if (fvComprobantes.length === 0) {
    return { totalFacturado: 0, totalCobrado: 0, saldoPendiente: 0, facturas: [] }
  }

  let totalFacturado = 0
  let totalCobrado = 0
  let saldoPendiente = 0
  const facturas: FacturaCobranzaDetalle[] = []

  for (const fv of fvComprobantes) {
    const cobradoFV = getTotalCobradoFactura(fv.number, imputaciones)
    const saldoFV = getSaldoPendienteFactura(fv, imputaciones)
    const estadoFV = getEstadoCobranzaFactura(fv, imputaciones)
    const vencidaFV = isFacturaVencida(fv, imputaciones)
    const vencimientoDate = getVencimientoFV(fv)

    // Imputaciones de esta FV
    const impFV = getImputacionesByFacturaId(fv.number, imputaciones)

    // CobrosV2 imputados a esta FV
    const cobrosFV = getCobrosByFacturaId(fv.number, cobrosV2, imputaciones)

    // Mapa cobroId → CobroV2 para lookup
    const cobroMap = new Map(cobrosV2.map((c) => [c.id, c]))

    // Detalle de cobros imputados
    const cobrosDetalle: CobroImputadoDetalle[] = impFV.map((imp) => {
      const cobro = cobroMap.get(imp.cobroId)
      return {
        cobroId: imp.cobroId,
        fecha: cobro?.fecha ?? imp.fechaImputacion,
        medioCobro: cobro ? getMedioCobroLabel(cobro.medioCobro) : "—",
        referencia: cobro?.referencia,
        importeImputado: imp.importeImputado,
        observaciones: cobro?.observaciones,
      }
    })

    facturas.push({
      facturaNumber: fv.number,
      fecha: fv.date,
      totalFactura: fv.amount,
      totalCobrado: cobradoFV,
      saldoPendiente: saldoFV,
      estadoCobranza: estadoFV,
      vencimiento: vencimientoDate.toISOString().slice(0, 10),
      vencida: vencidaFV,
      cobros: cobrosDetalle,
    })

    totalFacturado += fv.amount
    totalCobrado += cobradoFV
    saldoPendiente += saldoFV
  }

  return { totalFacturado, totalCobrado, saldoPendiente, facturas }
}

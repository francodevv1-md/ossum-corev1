import type { MedioCobro, EstadoCobro, EstadoCobranzaFactura } from "@/types"

// ═══════════════════════════════════════════════════════════════
// COBROS V1 — Constants
// ═══════════════════════════════════════════════════════════════

/** Plazo de pago por defecto en días si la FV no tiene expiry */
export const PLAZO_PAGO_DEFAULT_DIAS = 30

// ── Medio de cobro ──
export const MEDIOS_COBRO_OPTIONS: { value: MedioCobro; label: string }[] = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
  { value: "deposito", label: "Depósito" },
  { value: "otro", label: "Otro" },
]

export const MEDIO_COBRO_LABELS: Record<MedioCobro, string> = {
  transferencia: "Transferencia",
  cheque: "Cheque",
  efectivo: "Efectivo",
  deposito: "Depósito",
  otro: "Otro",
}

// ── Estado del cobro (movimiento) ──
export const ESTADO_COBRO_LABELS: Record<EstadoCobro, string> = {
  registrado: "Registrado",
  parcialmente_imputado: "Parcialmente imputado",
  imputado_completo: "Imputado completo",
}

export const ESTADO_COBRO_COLORS: Record<EstadoCobro, string> = {
  registrado: "bg-amber-100 text-amber-800 border-amber-300",
  parcialmente_imputado: "bg-sky-100 text-sky-800 border-sky-300",
  imputado_completo: "bg-emerald-100 text-emerald-800 border-emerald-300",
}

export const ESTADO_COBRO_BADGE_VARIANT: Record<EstadoCobro, "warning" | "info" | "success"> = {
  registrado: "warning",
  parcialmente_imputado: "info",
  imputado_completo: "success",
}

// ── Estado de cobranza de factura ──
export const ESTADO_COBRANZA_LABELS: Record<EstadoCobranzaFactura, string> = {
  sin_cobrar: "Sin cobrar",
  cobro_parcial: "Cobro parcial",
  cobrada: "Cobrada",
  vencida: "Vencida",
}

export const ESTADO_COBRANZA_COLORS: Record<EstadoCobranzaFactura, string> = {
  sin_cobrar: "bg-slate-100 text-slate-800 border-slate-300",
  cobro_parcial: "bg-amber-100 text-amber-800 border-amber-300",
  cobrada: "bg-emerald-100 text-emerald-800 border-emerald-300",
  vencida: "bg-red-100 text-red-800 border-red-300",
}

export const ESTADO_COBRANZA_BADGE_VARIANT: Record<EstadoCobranzaFactura, "secondary" | "warning" | "success" | "destructive"> = {
  sin_cobrar: "secondary",
  cobro_parcial: "warning",
  cobrada: "success",
  vencida: "destructive",
}

import type { Surgery, ConsumoState, DocumentStatus } from "@/types"

interface RuleResult {
  allowed: boolean
  reason?: string
}

/**
 * canAutorizarFV (CHATZAI-010: type-safety mejorado)
 * Verifica si una cirugía puede ser facturada.
 *
 * Cambios CHATZAI-010:
 * - consumoState tipado como ConsumoState (no string genérico) — FT-01
 * - Verificación explícita Validado/Facturado (no solo bloqueo Pendiente) — FT-02
 * - docStatus tipado como DocumentStatus
 */
export function canAutorizarFV(
  surgery: Surgery,
  docStatus: DocumentStatus | string,
  consumoState?: ConsumoState
): RuleResult {
  if (surgery.facturado) return { allowed: false, reason: "Ya facturada" }
  if (surgery.state === "Cancelada" || surgery.state === "Suspendida")
    return { allowed: false, reason: "Cirugía cancelada/suspendida" }
  if (docStatus === "Incompleta")
    return { allowed: false, reason: "Documentación incompleta" }
  if (!surgery.autorizado)
    return { allowed: false, reason: "Cirugía no autorizada" }
  // FT-02: Verificación explícita de consumo Validado o Facturado
  if (consumoState !== "Validado" && consumoState !== "Facturado") {
    return {
      allowed: false,
      reason: "Consumo debe estar validado para facturar (estado actual: " + (consumoState || "sin consumo") + ")"
    }
  }
  return { allowed: true }
}

export function canCreateRemito(surgery: Surgery): RuleResult {
  return canRemitirNR(surgery)
}

export function canRemitirNR(surgery: Surgery): RuleResult {
  if (surgery.state === "Cancelada" || surgery.state === "Suspendida")
    return { allowed: false, reason: "Cirugía cancelada/suspendida" }
  if (!surgery.autorizado)
    return { allowed: false, reason: "Cirugía no autorizada" }
  return { allowed: true }
}

export function canCargarConsumo(surgery: Surgery): RuleResult {
  if (surgery.state === "Cancelada")
    return { allowed: false, reason: "Cirugía cancelada" }
  if (surgery.state === "Sin autorizar" || surgery.state === "Pendiente")
    return { allowed: false, reason: "Cirugía sin autorizar" }
  return { allowed: true }
}

export function canValidateConsumption(consumoState?: string): RuleResult {
  if (!consumoState) return { allowed: false, reason: "No hay consumo cargado" }
  if (consumoState === "Validado")
    return { allowed: false, reason: "Ya validado" }
  if (consumoState === "Facturado")
    return { allowed: false, reason: "Ya facturado" }
  return { allowed: true }
}

export function canLiquidarInstrumentador(surgery: Surgery): RuleResult {
  if (surgery.state === "Cancelada")
    return { allowed: false, reason: "Cirugía cancelada" }
  if (!surgery.instrumentador)
    return { allowed: false, reason: "Sin instrumentador asignado" }
  return { allowed: true }
}

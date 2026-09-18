import type { Consumo, ConsumoItem, ValidationIssue, Remito } from "@/types"
import { CONSUMO_VALIDATION_MESSAGES, LOTE_BLOQUEA_VALIDACION_V1 } from "./consumos.constants"

/**
 * Get validation issues for a consumo.
 * Returns array of issues with severity "error" (blocks validation) or "warning" (advisory).
 *
 * IMPORTANT V1 DECISION: Lot does NOT block validation (severity: "warning").
 * This is a temporary simplification until Stock/Trazability module matures.
 * See: LOTE_BLOQUEA_VALIDACION_V1 constant.
 * Documented as: "Lote no bloqueante en validación de Consumos V1 hasta madurez de Stock/Trazabilidad"
 */
export function getConsumoValidationIssues(
  consumo: Consumo,
  remitos?: Remito[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // --- Level: consumo ---
  if (!consumo.surgeryId) {
    issues.push({ itemId: consumo.id, fieldName: "surgeryId", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.SURGERY_REQUIRED })
  }

  if (consumo.items.length === 0) {
    issues.push({ itemId: consumo.id, fieldName: "items", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.NO_ITEMS })
  }

  const hasAnyConsumed = consumo.items.some((i) => i.consumed > 0)
  if (!hasAnyConsumed && consumo.items.length > 0) {
    issues.push({ itemId: consumo.id, fieldName: "consumed", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.NO_CONSUMED_ITEMS })
  }

  // Manual consumption requires justification
  if (consumo.origen === "manual" && !consumo.justificacion?.trim()) {
    issues.push({ itemId: consumo.id, fieldName: "justificacion", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.MANUAL_JUSTIFICATION_REQUIRED })
  }

  // --- Level: item ---
  const sentMap = remitos ? buildSentMap(remitos) : undefined

  for (const item of consumo.items) {
    // Name required
    if (!item.name.trim()) {
      issues.push({ itemId: item.stockItemId, fieldName: "name", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_NAME_REQUIRED })
    }

    // Code required
    if (!item.code.trim()) {
      issues.push({ itemId: item.stockItemId, fieldName: "code", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_CODE_REQUIRED })
    }

    // Consumed >= 0
    if (item.consumed < 0) {
      issues.push({ itemId: item.stockItemId, fieldName: "consumed", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_CONSUMED_NEGATIVE })
    }

    // Returned >= 0
    if (item.returned < 0) {
      issues.push({ itemId: item.stockItemId, fieldName: "returned", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_RETURNED_NEGATIVE })
    }

    // Fields required when consumed > 0
    if (item.consumed > 0) {
      // LOT: warning in V1, NOT blocking
      if (!item.lot.trim()) {
        issues.push({
          itemId: item.stockItemId,
          fieldName: "lot",
          severity: LOTE_BLOQUEA_VALIDACION_V1 ? "error" : "warning",
          message: CONSUMO_VALIDATION_MESSAGES.ITEM_LOT_MISSING,
        })
      }

      // Department: blocking
      if (!item.department.trim()) {
        issues.push({ itemId: item.stockItemId, fieldName: "department", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_DEPARTMENT_REQUIRED })
      }

      // Rubro: blocking
      if (!item.rubro.trim()) {
        issues.push({ itemId: item.stockItemId, fieldName: "rubro", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_RUBRO_REQUIRED })
      }

      // Brand: blocking
      if (!item.brand.trim()) {
        issues.push({ itemId: item.stockItemId, fieldName: "brand", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_BRAND_REQUIRED })
      }
    }

    // No activity warning
    if (item.consumed === 0 && item.returned === 0) {
      issues.push({ itemId: item.stockItemId, fieldName: "consumed", severity: "warning", message: CONSUMO_VALIDATION_MESSAGES.ITEM_NO_ACTIVITY })
    }

    // Consumed + returned > sent (only for remito-based consumption)
    if (sentMap && consumo.origen === "remito") {
      const sent = sentMap.get(item.stockItemId) ?? 0
      if (sent > 0 && item.consumed + item.returned > sent) {
        issues.push({ itemId: item.stockItemId, fieldName: "consumed", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.ITEM_EXCEEDS_SENT })
      }

      // Faltante without observation
      if (sent > 0 && sent > item.consumed + item.returned) {
        if (!item.observacionesFaltante?.trim()) {
          issues.push({ itemId: item.stockItemId, fieldName: "observacionesFaltante", severity: "error", message: CONSUMO_VALIDATION_MESSAGES.FALTANTE_SIN_OBS })
        }
      }
    }
  }

  return issues
}

/** Check if a consumo can be validated (no blocking errors) */
export function canValidateConsumo(consumo: Consumo, remitos?: Remito[]): { allowed: boolean; reason?: string; issues: ValidationIssue[] } {
  const issues = getConsumoValidationIssues(consumo, remitos)
  const errors = issues.filter((i) => i.severity === "error")

  if (errors.length > 0) {
    return {
      allowed: false,
      reason: `Datos incompletos: ${errors.length} problema(s) por resolver`,
      issues,
    }
  }

  return { allowed: true, issues }
}

/** Build a map of stockItemId → total sent quantity from remitos */
function buildSentMap(remitos: Remito[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of remitos) {
    for (const item of r.items) {
      const prev = map.get(item.stockItemId) ?? 0
      map.set(item.stockItemId, prev + item.sentQuantity)
    }
  }
  return map
}

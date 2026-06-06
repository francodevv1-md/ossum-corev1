// ===== CONSUMO CONSTANTS =====

export const CONSUMO_STATES = ["Pendiente", "Validado", "Facturado"] as const
export type ConsumoState = (typeof CONSUMO_STATES)[number]

export const CONSUMO_ORIGINS = ["remito", "manual"] as const
export type ConsumoOrigin = (typeof CONSUMO_ORIGINS)[number]

export const CONSUMO_ORIGIN_LABELS: Record<ConsumoOrigin, string> = {
  remito: "Desde Remito",
  manual: "Carga Manual",
}

export const CONSUMO_ORIGIN_COLORS: Record<ConsumoOrigin, string> = {
  remito: "bg-blue-100 text-blue-800",
  manual: "bg-amber-100 text-amber-800",
}

// Validation messages
export const CONSUMO_VALIDATION_MESSAGES = {
  ITEM_NAME_REQUIRED: "El nombre del artículo es obligatorio",
  ITEM_CODE_REQUIRED: "El código del artículo es obligatorio",
  ITEM_CONSUMED_NEGATIVE: "La cantidad consumida debe ser >= 0",
  ITEM_RETURNED_NEGATIVE: "La cantidad devuelta debe ser >= 0",
  ITEM_LOT_MISSING: "El lote no está cargado — completar cuando esté disponible",
  ITEM_DEPARTMENT_REQUIRED: "El departamento es obligatorio para ítems consumidos",
  ITEM_RUBRO_REQUIRED: "El rubro es obligatorio para ítems consumidos",
  ITEM_BRAND_REQUIRED: "La marca es obligatoria para ítems consumidos",
  ITEM_NO_ACTIVITY: "Ítem sin consumo ni devolución",
  ITEM_EXCEEDS_SENT: "Consumido + devuelto excede lo enviado",
  FALTANTE_SIN_OBS: "Debe documentar el faltante de este ítem",
  MANUAL_JUSTIFICATION_REQUIRED: "La justificación es obligatoria para consumos manuales",
  NO_CONSUMED_ITEMS: "Debe haber al menos un ítem con consumo > 0",
  NO_ITEMS: "Debe agregar al menos un artículo",
  SURGERY_REQUIRED: "La cirugía es obligatoria",
} as const

// Temporal decision: Lot does NOT block validation in V1
// until Stock/Trazability module matures
export const LOTE_BLOQUEA_VALIDACION_V1 = false

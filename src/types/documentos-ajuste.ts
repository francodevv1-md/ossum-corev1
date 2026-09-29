export type AjusteTipo = "CREDITO" | "DEBITO"
export type AjusteModalidad = "TOTAL" | "PARCIAL" | "MANUAL"
export type AjusteState = "Borrador" | "Emitida" | "Anulada"
export type AjusteMotivo =
  | "Devolución de material"
  | "Diferencia de precio"
  | "Bonificación comercial"
  | "Error administrativo"
  | "Intereses por mora"
  | "Recargo por urgencia"
  | "Otro"

export interface DocumentoAjusteItem {
  id: string
  description: string
  quantity: number
  unitPrice: string
  subtotal: string
  adjustedQuantity?: number
  adjustedAmount?: string
}

export interface DocumentoAjuste {
  id: string
  visibleNumber: number | null
  tipo: AjusteTipo
  state: AjusteState
  invoiceId: string
  invoiceNumber: string
  surgeryId: string | null
  clientName?: string
  modalidad: AjusteModalidad
  motivo: AjusteMotivo
  observaciones?: string
  total: string
  impacto: string // "+$ 50.000,00" o "-$ 50.000,00"
  issuedAt: string | null
  createdAt: string
  metadata?: Record<string, unknown>
  items: DocumentoAjusteItem[]
}

// Compatibilidad
export type NotaTipo = AjusteTipo
export type NotaModalidad = AjusteModalidad
export type NotaState = AjusteState
export type NotaMotivo = AjusteMotivo
export type NotaComercialItem = DocumentoAjusteItem
export type NotaComercial = DocumentoAjuste

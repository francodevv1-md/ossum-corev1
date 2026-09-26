export type ReceiptSource = { supplierRemittanceId?: string | null; idempotencyKey?: string | null }

export const receiptOrigin = (receipt: ReceiptSource) =>
  receipt.supplierRemittanceId ? "Desde Remito" : "Libre"

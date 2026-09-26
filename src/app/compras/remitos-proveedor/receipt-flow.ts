import type { RemitoProveedor } from "@/types"

export type SupplierReceipt = {
  id: string
  status: string
  documentReference?: string | null
  idempotencyKey?: string | null
  scanEvents?: Array<{ resolutionStatus: string }>
  lines: Array<{
    articleId?: string | null
    expectedQuantity?: string | null
    requestedQuantity: string
    receivedQuantity?: string | null
    resolutionStatus: string
  }>
}

export const supplierReceiptKey = (remitoId: string) => `supplier-remito:${remitoId}`

export function supplierReceiptErrorMessage(cause: unknown, fallback: string) {
  if (cause && typeof cause === "object" && "code" in cause && cause.code === "company_mutation_access_denied") {
    return "No tenés permisos para modificar recepciones en esta empresa."
  }
  return cause instanceof Error ? cause.message : fallback
}

export function findSupplierReceipt(receipts: SupplierReceipt[], remito: RemitoProveedor) {
  return receipts.find((receipt) => receipt.idempotencyKey === supplierReceiptKey(remito.id))
    ?? receipts.find((receipt) => !receipt.idempotencyKey && receipt.documentReference === remito.number)
}

export function receiptProgress(receipt?: SupplierReceipt) {
  if (!receipt) return { label: "Pendiente de recepción", tone: "amber", expected: 0, received: 0, shortages: 0, excesses: 0, unresolved: 0, unmatched: 0 }

  const totals = receipt.lines.reduce((result, line) => {
    const expected = Number(line.expectedQuantity ?? line.requestedQuantity)
    const received = Number(line.receivedQuantity ?? 0)
    result.expected += expected
    result.received += received
    result.shortages += Math.max(expected - received, 0)
    result.excesses += Math.max(received - expected, 0)
    if (!line.articleId) result.unmatched += 1
    return result
  }, { expected: 0, received: 0, shortages: 0, excesses: 0, unresolved: receipt.scanEvents?.filter((event) => event.resolutionStatus !== "RESOLVED").length ?? 0, unmatched: 0 })

  if (receipt.status === "CONFIRMED") return { ...totals, label: totals.shortages || totals.excesses ? "Confirmada con diferencias" : "Confirmada", tone: totals.shortages || totals.excesses ? "red" : "green" }
  if (totals.unresolved) return { ...totals, label: "Requiere atención", tone: "red" }
  if (totals.received === 0) return { ...totals, label: "Lista para recibir", tone: "amber" }
  if (totals.shortages || totals.excesses) return { ...totals, label: "En recepción", tone: "amber" }
  if (totals.received > 0 && !totals.shortages && !totals.excesses) return { ...totals, label: "Lista para confirmar", tone: "green" }
  return { ...totals, label: "En recepción", tone: "navy" }
}

export function supplierReceiptPayload(remito: RemitoProveedor) {
  return {
    documentReference: remito.number,
    idempotencyKey: supplierReceiptKey(remito.id),
    expectedLines: remito.items.map((item) => ({
      code: item.code || undefined,
      description: item.name || undefined,
      expectedQuantity: String(item.quantity),
      lotCode: item.lot || undefined,
      expirationDate: item.expiry || undefined,
    })),
  }
}

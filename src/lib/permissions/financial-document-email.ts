const FINANCIAL_DOCUMENT_EMAIL_ROLES = new Set(["admin", "coordinador", "vendedor"])

export function canSendFinancialDocumentEmail(role: string | null | undefined) {
  return Boolean(role && FINANCIAL_DOCUMENT_EMAIL_ROLES.has(role))
}

export function canMutatePresupuesto(role: string | null | undefined) {
  return Boolean(role && FINANCIAL_DOCUMENT_EMAIL_ROLES.has(role))
}

export function canEmailPresupuestoState(state: string | null | undefined) {
  return state === "Emitido" || state === "Aprobado"
}

export function canEmailInvoiceState(state: string | null | undefined, visibleNumber: number | null | undefined, issuedAt: string | null | undefined) {
  return (state === "Emitida" || state === "Parcialmente_cobrada" || state === "Cobrada") && visibleNumber != null && Boolean(issuedAt)
}

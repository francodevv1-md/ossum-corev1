export const FINANCIAL_DOCUMENT_EMAIL_ALLOWED_ROLES = ["admin", "superadmin"] as const

export function canSendFinancialDocumentEmail(role: string | null | undefined): boolean {
  return FINANCIAL_DOCUMENT_EMAIL_ALLOWED_ROLES.some((allowedRole) => allowedRole === role)
}

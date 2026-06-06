// OSSUM COR — Tenant safety helpers
// Every operational query MUST filter by companyId.
// Auth is deferred — companyId comes as an explicit parameter, not from session.

/** Branded type for companyId — prevents passing raw strings where a CompanyId is expected. */
export type CompanyId = string & { readonly __brand: unique symbol };

/** Cast a string to CompanyId. Use at API boundaries (routes, server actions). */
export function asCompanyId(value: string): CompanyId {
  return value as CompanyId;
}

/**
 * Require a CompanyId or throw.
 * Use at the start of service functions to guarantee tenant context.
 */
export function requireCompanyId(companyId: string | undefined): CompanyId {
  if (!companyId) {
    throw new Error("companyId is required for tenant-scoped operations");
  }
  return asCompanyId(companyId);
}

/** Tenant safety rules enforced at service layer. */
export const TENANT_RULES = {
  /** Every operational query must filter by companyId. */
  everyQueryFiltersByCompany: true,
  /** Contact references in Surgery must belong to the same Company via ContactCompanyLink. */
  contactMustBelongToCompany: true,
  /** Never trust frontend for tenant isolation — backend validates always. */
  noFrontendTrust: true,
  /** Auth/role resolution is deferred to a future phase. */
  authDeferredToNextPhase: true,
} as const;
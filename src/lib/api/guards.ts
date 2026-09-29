// OSSUM COR — API guards for company-scoped access.
// Guards expect a pre-resolved ApiAuthContext from getApiAuthContext().
// No direct header parsing here — auth resolution is centralized in auth-context.ts.

import type { ApiAuthContext } from "./auth-context";
import { forbidden } from "./errors";
import { SEGUIMIENTO_EVENT_MUTATION_ALLOWED_ROLES } from "../permissions/seguimiento";

export { type ApiAuthContext } from "./auth-context";

/**
 * Validate that the actor has read access to the target company.
 * Any active company membership grants read access.
 */
export function requireCompanyReadAccess(ctx: ApiAuthContext): void {
  // Access already validated in getApiAuthContext — guard is a defensive no-op
  // but provides semantic clarity in route code.
  void ctx;
}

/**
 * Validate that the actor has mutation access with an allowed role.
 */
export function requireCompanyMutationAccess(
  ctx: ApiAuthContext,
  allowedRoles: readonly string[]
): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw forbidden("Company mutation access denied", "company_mutation_access_denied");
  }
}

export const requireCompanyMutationRole = requireCompanyMutationAccess;

/**
 * Temporary implementation-verification mapping for Seguimiento event mutations.
 * Replace only this mapping when an approved responsible-ingresos capability exists.
 */
/**
 * Require company mutation access for Seguimiento event mutations.
 */
export function requireSeguimientoEventMutationAccess(ctx: ApiAuthContext): void {
  requireCompanyMutationAccess(ctx, SEGUIMIENTO_EVENT_MUTATION_ALLOWED_ROLES);
}

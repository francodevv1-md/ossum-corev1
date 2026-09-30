// OSSUM COR — API guards for company-scoped access and RBAC enforcement.
// Guards expect a pre-resolved ApiAuthContext from getApiAuthContext().
// Deny-by-default: invalid roles or ungranted capabilities throw 403 ApiError.

import type { ApiAuthContext } from "./auth-context";
import { forbidden } from "./errors";
import {
  type AppCapability,
  hasCapability,
  isRoleAdmin,
} from "../permissions/capabilities";
import { resolveCanonicalRole } from "../permissions/canonical-roles";

export { type ApiAuthContext } from "./auth-context";
export { type AppCapability } from "../permissions/capabilities";

/**
 * Validate that the actor has an active company membership.
 * Access already checked during context resolution — acts as semantic marker.
 */
export function requireCompanyMembership(ctx: ApiAuthContext): void {
  if (!ctx.companyId || !ctx.actorUserId) {
    throw forbidden("Company membership required", "company_membership_required");
  }
}

export const requireCompanyReadAccess = requireCompanyMembership;

/**
 * Validate that the actor has a specific capability within the target company.
 * Deny-by-default: throws 403 if role lacks capability.
 */
export function requireCompanyCapability(
  ctx: ApiAuthContext,
  capability: AppCapability
): void {
  if (!hasCapability(ctx.role, capability)) {
    throw forbidden(
      `Permission denied: actor lacks required capability '${capability}'`,
      "capability_denied"
    );
  }
}

/**
 * Validate that the actor has admin role within the target company.
 */
export function requireCompanyAdmin(ctx: ApiAuthContext): void {
  if (!isRoleAdmin(ctx.role)) {
    throw forbidden("Administrator access required", "admin_role_required");
  }
}

/**
 * Validate that the actor's role matches one of the allowed roles (canonical or alias).
 */
export function requireCompanyMutationAccess(
  ctx: ApiAuthContext,
  allowedRoles: readonly string[]
): void {
  const canonicalAllowed = allowedRoles
    .map((r) => resolveCanonicalRole(r))
    .filter(Boolean);

  if (!canonicalAllowed.includes(ctx.canonicalRole)) {
    throw forbidden("Company mutation access denied", "company_mutation_access_denied");
  }
}

export const requireCompanyMutationRole = requireCompanyMutationAccess;

/**
 * Require company mutation access for Seguimiento event mutations.
 */
export function requireSeguimientoEventMutationAccess(ctx: ApiAuthContext): void {
  requireCompanyCapability(ctx, "cirugias:mutate");
}

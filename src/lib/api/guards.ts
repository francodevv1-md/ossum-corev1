// OSSUM COR — API guards for company-scoped access.
// Guards expect a pre-resolved ApiAuthContext from getApiAuthContext().
// No direct header parsing here — auth resolution is centralized in auth-context.ts.

import type { ApiAuthContext } from "./auth-context";
import type { ApiIdentity } from "./identity-context";
import prisma from "../prisma";
import { conflict, forbidden } from "./errors";
import { SEGUIMIENTO_EVENT_MUTATION_ALLOWED_ROLES } from "../permissions/seguimiento";

export { type ApiAuthContext } from "./auth-context";

export type ActiveCompanyMembership = {
  companyId: string;
  role: string;
  company: { id: string; name: string };
};

export async function getActiveCompanyMemberships(
  identity: ApiIdentity
): Promise<ActiveCompanyMembership[]> {
  return prisma.userCompanyAccess.findMany({
    where: { userId: identity.actorUserId, isActive: true },
    orderBy: [{ company: { name: "asc" } }, { companyId: "asc" }],
    select: { companyId: true, role: true, company: { select: { id: true, name: true } } },
  });
}

/** Treats company input as untrusted until exact active membership is proven. */
export function requireSelectedCompanyMembership(
  memberships: readonly ActiveCompanyMembership[],
  selectedCompanyId?: string
): ActiveCompanyMembership {
  const selected = selectedCompanyId?.trim();
  if (!selected) {
    if (memberships.length === 1) return memberships[0];
    if (memberships.length === 0) {
      throw forbidden("Company access denied", "company_access_denied");
    }
    throw conflict("Select a company before scanning", "company_selection_required");
  }
  const membership = memberships.find(({ companyId }) => companyId === selected);
  if (!membership) throw forbidden("Company access denied", "company_access_denied");
  return membership;
}

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

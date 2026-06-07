// OSSUM COR — Minimal explicit API guards.
// No real Auth lookup here: actor identity is temporarily passed by header.
// TEMP DEV/internal only until Supabase Auth is integrated; do NOT use this as productive security.

import type { PrismaClient } from "@prisma/client";

import { forbidden, unauthorized } from "./errors";

export const TEMP_DEV_ACTOR_HEADER = "x-ossum-actor-user-id";

export function getActorUserIdFromRequest(request: Request): string {
  const actorUserId = request.headers.get(TEMP_DEV_ACTOR_HEADER)?.trim();

  if (!actorUserId) {
    throw unauthorized("Missing actor user header", "missing_actor_user_id");
  }

  return actorUserId;
}

export async function requireCompanyReadAccess(
  prisma: PrismaClient,
  companyId: string,
  actorUserId: string
): Promise<void> {
  const access = await prisma.userCompanyAccess.findFirst({
    where: {
      userId: actorUserId,
      companyId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!access) {
    throw forbidden("Company access denied", "company_access_denied");
  }
}

export async function requireCompanyMutationAccess(
  prisma: PrismaClient,
  companyId: string,
  actorUserId: string,
  allowedRoles: readonly string[]
): Promise<void> {
  const access = await prisma.userCompanyAccess.findFirst({
    where: {
      userId: actorUserId,
      companyId,
      isActive: true,
    },
    select: { role: true },
  });

  if (!access || !allowedRoles.includes(access.role)) {
    throw forbidden("Company mutation access denied", "company_mutation_access_denied");
  }
}

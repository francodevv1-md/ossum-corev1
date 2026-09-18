import type { PrismaClient } from "@prisma/client";

import type { ApiAuthContext } from "../api/auth-context";
import { forbidden, notFound } from "../api/errors";
import {
  listEligibleCoordinatorContacts,
  type CoordinatorSubject,
} from "./personal-coordinator-resolver.service";

export type CoordinationPreviewCapability = {
  enabled: true;
  targets: CoordinatorSubject[];
};

function deny(): never {
  throw forbidden("Vista previa no disponible", "coordination_preview_denied");
}

export async function requireCoordinationPreviewCapability(input: {
  prisma: PrismaClient;
  routeCompanyId: string;
  ctx: ApiAuthContext;
  env?: NodeJS.ProcessEnv;
}): Promise<CoordinationPreviewCapability> {
  const { prisma, routeCompanyId, ctx, env = process.env } = input;
  const configuredCompanyId = env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID?.trim();

  if (
    env.OSSUM_DEPLOYMENT_TIER !== "development" ||
    env.OSSUM_ENABLE_COORDINATOR_PREVIEW !== "true" ||
    !configuredCompanyId ||
    routeCompanyId !== configuredCompanyId ||
    ctx.companyId !== configuredCompanyId ||
    ctx.activeCompany.id !== configuredCompanyId ||
    ctx.source !== "supabase-auth" ||
    !ctx.supabaseAuthId ||
    ctx.role !== "admin"
  ) {
    deny();
  }

  const company = await prisma.company.findUnique({
    where: { id: configuredCompanyId },
    select: {
      id: true,
      name: true,
      isActive: true,
      organization: { select: { slug: true, isActive: true } },
      users: {
        where: {
          userId: ctx.actorUserId,
          companyId: configuredCompanyId,
          isActive: true,
          role: "admin",
          user: {
            isActive: true,
            supabaseAuthId: ctx.supabaseAuthId,
          },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (
    !company ||
    company.id !== configuredCompanyId ||
    !company.isActive ||
    company.name !== "Districorr DEV" ||
    !company.organization.isActive ||
    company.organization.slug !== "ossum-dev" ||
    company.users.length !== 1
  ) {
    deny();
  }

  const targets = (await listEligibleCoordinatorContacts(prisma, configuredCompanyId)).map(
    ({ contactId, label }) => ({ contactId, label })
  );
  return { enabled: true, targets };
}

export function requirePreviewTarget(
  capability: CoordinationPreviewCapability,
  contactId: string
): CoordinatorSubject {
  const target = capability.targets.find((candidate) => candidate.contactId === contactId);
  if (!target) {
    throw notFound(
      "Coordinador de vista previa no disponible",
      "coordination_preview_target_not_found"
    );
  }
  return target;
}

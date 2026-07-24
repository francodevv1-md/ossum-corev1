import { badRequest } from "@/lib/api/errors";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireSeguimientoEventMutationAccess } from "@/lib/api/guards";
import { created, errorResponse } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { createAuthorizationEvidence } from "@/lib/services/seguimiento.service";
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery";
import { validateSeguimientoAuthorizationCreateBody } from "@/lib/validators/seguimiento.validator";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string; entryId: string }>;
};

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, entryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireSeguimientoEventMutationAccess(ctx);

    const body = validateSeguimientoAuthorizationCreateBody(await parseJsonBody(request));
    const resolvedSurgery = await resolveCompanySurgery(ctx.companyId, surgeryId);
    const displayName =
      [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") ||
      ctx.user.email;

    const entry = await createAuthorizationEvidence(prisma, {
      sourceEntryId: entryId,
      surgeryId: resolvedSurgery.id,
      companyId: ctx.companyId,
      actor: { userId: ctx.actorUserId, displayName },
      input: body,
    });

    return created(entry);
  } catch (error) {
    return errorResponse(error);
  }
}

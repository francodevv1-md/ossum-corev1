import { createAuditEvent } from "@/lib/audit";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyMutationAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import { DOCUMENTATION_MUTATION_ROLES } from "@/lib/permissions/documentation";
import prisma from "@/lib/prisma";
import {
  transitionSurgeryDocumentationItem,
  type SurgeryDocumentationEffects,
} from "@/lib/services/surgery-documentation.service";
import {
  validateDocumentationId,
  validateDocumentationStatePatch,
} from "@/lib/validators/documentation.validator";

type RouteContext = { params: Promise<{ companyId: string; surgeryId: string; itemId: string }> };
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Vary: "Authorization" };
const effects: SurgeryDocumentationEffects = {
  writeAudit: (input) => createAuditEvent({
    prisma: input.tx,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    module: "documentation",
    oldValue: input.oldValue,
    newValue: input.newValue,
    metadata: input.metadata,
  }),
};

function privateResponse(response: Response): Response {
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) response.headers.set(name, value);
  return response;
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId: routeSurgeryId, itemId: routeItemId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, DOCUMENTATION_MUTATION_ROLES);
    const surgeryId = validateDocumentationId(routeSurgeryId);
    const itemId = validateDocumentationId(routeItemId);
    const body = validateDocumentationStatePatch(await parseJsonBody(request));
    return privateResponse(ok(await transitionSurgeryDocumentationItem(
      { prisma, effects },
      { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
      { surgeryId, itemId, ...body }
    )));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}

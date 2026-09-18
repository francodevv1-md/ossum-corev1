import { createAuditEvent } from "@/lib/audit";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyMutationAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import { DOCUMENTATION_MUTATION_ROLES } from "@/lib/permissions/documentation";
import prisma from "@/lib/prisma";
import {
  initializeSurgeryDocumentation,
  type SurgeryDocumentationEffects,
} from "@/lib/services/surgery-documentation.service";
import { validateDocumentationId } from "@/lib/validators/documentation.validator";

type RouteContext = { params: Promise<{ companyId: string; surgeryId: string }> };
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

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId: routeSurgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, DOCUMENTATION_MUTATION_ROLES);
    if ((await request.text()).length > 0) {
      throw badRequest("Initialize request body must be empty", "documentation_invalid_initialize_body");
    }
    const surgeryId = validateDocumentationId(routeSurgeryId);
    return privateResponse(ok(await initializeSurgeryDocumentation(
      { prisma, effects },
      { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
      surgeryId
    )));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}

import { badRequest } from "../../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { assignSurgeryCoordinator } from "../../../../../../../lib/services/surgery.service";

type RouteContext = { params: Promise<{ companyId: string; surgeryId: string }> };
const MUTATION_ROLES = ["admin", "manager", "coordinator", "owner", "super_admin"] as const;

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, MUTATION_ROLES);
    const body = await request.json() as Record<string, unknown>;
    const contactId = body.contactId === null ? null : typeof body.contactId === "string" ? body.contactId : undefined;
    const coordinatorName = body.coordinatorName === null ? null : typeof body.coordinatorName === "string" ? body.coordinatorName : undefined;
    if (body.contactId !== undefined && contactId === undefined) throw badRequest("contactId must be a string or null", "invalid_contact_id");
    if (body.coordinatorName !== undefined && coordinatorName === undefined) throw badRequest("coordinatorName must be a string or null", "invalid_coordinator_name");
    const assignment = await assignSurgeryCoordinator(prisma, { companyId: ctx.companyId, actorUserId: ctx.actorUserId, module: "surgery" }, surgeryId, { contactId, coordinatorName });
    return ok(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}

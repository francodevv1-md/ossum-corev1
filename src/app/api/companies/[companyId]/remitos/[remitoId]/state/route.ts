import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  REMITO_MUTATION_ROLES,
  updateRemitoState,
} from "../../../../../../../lib/services/remito.service";
import { remitoStateTransitionSchema } from "../../../../../../../lib/validators/remito";

type RouteContext = {
  params: Promise<{ companyId: string; remitoId: string }>;
};

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params;
    if (!remitoId) {
      throw notFound("Remito id is required", "remito_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES);

    const parsed = remitoStateTransitionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid state transition body",
        "invalid_remito_state_body"
      );
    }
    const body = parsed.data;

    const result = await updateRemitoState({
      companyId: ctx.companyId,
      remitoId,
      newState: body.newState,
      updatedById: ctx.actorUserId,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
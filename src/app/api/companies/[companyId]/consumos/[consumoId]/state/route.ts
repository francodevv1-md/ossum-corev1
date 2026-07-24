import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  CONSUMO_MUTATION_ROLES,
  updateConsumoState,
} from "../../../../../../../lib/services/consumo.service";
import { consumoStateTransitionSchema } from "../../../../../../../lib/validators/consumo";

type RouteContext = {
  params: Promise<{ companyId: string; consumoId: string }>;
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
    const { companyId, consumoId } = await params;
    if (!consumoId) {
      throw notFound("Consumo id is required", "consumo_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, CONSUMO_MUTATION_ROLES);

    const parsed = consumoStateTransitionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid state transition body",
        "invalid_consumo_state_body"
      );
    }
    const body = parsed.data;

    const result = await updateConsumoState({
      companyId: ctx.companyId,
      consumoId,
      newState: body.newState,
      updatedById: ctx.actorUserId,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
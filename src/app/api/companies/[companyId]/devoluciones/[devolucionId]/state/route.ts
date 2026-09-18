import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  DEVOLUCION_MUTATION_ROLES,
  updateDevolucionState,
} from "../../../../../../../lib/services/devolucion.service";
import { devolucionStateTransitionSchema } from "../../../../../../../lib/validators/devolucion";

type RouteContext = {
  params: Promise<{ companyId: string; devolucionId: string }>;
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
    const { companyId, devolucionId } = await params;
    if (!devolucionId) {
      throw notFound("Devolucion id is required", "devolucion_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, DEVOLUCION_MUTATION_ROLES);

    const parsed = devolucionStateTransitionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid state transition body",
        "invalid_devolucion_state_body"
      );
    }
    const body = parsed.data;

    const result = await updateDevolucionState({
      companyId: ctx.companyId,
      devolucionId,
      newState: body.newState,
      updatedById: ctx.actorUserId,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
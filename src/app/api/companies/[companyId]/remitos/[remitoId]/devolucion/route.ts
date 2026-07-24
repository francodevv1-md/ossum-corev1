import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  REMITO_MUTATION_ROLES,
  registrarDevolucion,
} from "../../../../../../../lib/services/remito.service";
import { remitoDevolucionSchema } from "../../../../../../../lib/validators/remito";

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

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params;
    if (!remitoId) {
      throw notFound("Remito id is required", "remito_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES);

    const parsed = remitoDevolucionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid devolucion body",
        "invalid_remito_devolucion_body"
      );
    }
    const body = parsed.data;

    const result = await registrarDevolucion({
      companyId: ctx.companyId,
      remitoId,
      items: body.items,
      updatedById: ctx.actorUserId,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
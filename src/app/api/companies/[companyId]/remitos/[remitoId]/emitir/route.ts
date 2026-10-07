import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { remitoEmitSchema } from "../../../../../../../lib/validators/remito";
import { CAJAS_DISPATCH_ACTION_ROLES } from "../../../../../../../lib/permissions/stock-operations-policy";
import {
  REMITO_MUTATION_ROLES,
  emitirRemito,
} from "../../../../../../../lib/services/remito.service";

type RouteContext = {
  params: Promise<{ companyId: string; remitoId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params;
    if (!remitoId) {
      throw notFound("Remito id is required", "remito_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES);
    const body = await request.text();
    let raw: unknown = {};
    if (body.trim()) {
      try { raw = JSON.parse(body); }
      catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    }
    const intent = remitoEmitSchema.parse(raw);
    if (intent.cajasDispatch) requireCompanyMutationAccess(ctx, CAJAS_DISPATCH_ACTION_ROLES);

    const result = await emitirRemito({
      companyId: ctx.companyId,
      remitoId,
      updatedById: ctx.actorUserId,
      prisma,
      ...intent,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  CONSUMO_MUTATION_ROLES,
  validateConsumption,
} from "../../../../../../../lib/services/consumo.service";

type RouteContext = {
  params: Promise<{ companyId: string; consumoId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, consumoId } = await params;
    if (!consumoId) {
      throw notFound("Consumo id is required", "consumo_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, CONSUMO_MUTATION_ROLES);

    let body: any = {};
    try {
      if (request.headers.get("content-type")?.includes("application/json")) {
        body = await request.json();
      }
    } catch {
      // Body is optional
    }

    const result = await validateConsumption({
      companyId: ctx.companyId,
      consumoId,
      updatedById: ctx.actorUserId,
      cajasAccounting: body?.cajasAccounting,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
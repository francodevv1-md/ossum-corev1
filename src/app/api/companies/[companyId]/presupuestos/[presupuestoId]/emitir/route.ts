import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  PRESUPUESTO_MUTATION_ROLES,
  emitirPresupuesto,
} from "../../../../../../../lib/services/presupuesto.service";

type RouteContext = {
  params: Promise<{ companyId: string; presupuestoId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params;
    if (!presupuestoId) {
      throw notFound("Presupuesto id is required", "presupuesto_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);

    const result = await emitirPresupuesto({
      companyId: ctx.companyId,
      presupuestoId,
      updatedById: ctx.actorUserId,
      prisma,
    });
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

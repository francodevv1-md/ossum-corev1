import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../../lib/api/guards";
import { notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import {
  PRESUPUESTO_MUTATION_ROLES,
  deletePresupuesto,
  getPresupuesto,
} from "../../../../../../lib/services/presupuesto.service";

type RouteContext = {
  params: Promise<{ companyId: string; presupuestoId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params;
    if (!presupuestoId) {
      throw notFound("Presupuesto id is required", "presupuesto_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const presupuesto = await getPresupuesto({ companyId: ctx.companyId, presupuestoId, prisma });
    return ok(presupuesto);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params;
    if (!presupuestoId) {
      throw notFound("Presupuesto id is required", "presupuesto_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);

    const result = await deletePresupuesto({ companyId: ctx.companyId, presupuestoId, prisma });
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

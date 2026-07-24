import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../../lib/api/guards";
import { notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import {
  DEVOLUCION_MUTATION_ROLES,
  deleteDevolucion,
  getDevolucion,
} from "../../../../../../lib/services/devolucion.service";

type RouteContext = {
  params: Promise<{ companyId: string; devolucionId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, devolucionId } = await params;
    if (!devolucionId) {
      throw notFound("Devolucion id is required", "devolucion_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const devolucion = await getDevolucion({
      companyId: ctx.companyId,
      devolucionId,
      prisma,
    });

    return ok(devolucion);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, devolucionId } = await params;
    if (!devolucionId) {
      throw notFound("Devolucion id is required", "devolucion_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, DEVOLUCION_MUTATION_ROLES);

    const result = await deleteDevolucion({
      companyId: ctx.companyId,
      devolucionId,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../../lib/api/guards";
import { notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import {
  CONSUMO_MUTATION_ROLES,
  deleteConsumo,
  getConsumo,
} from "../../../../../../lib/services/consumo.service";

type RouteContext = {
  params: Promise<{ companyId: string; consumoId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, consumoId } = await params;
    if (!consumoId) {
      throw notFound("Consumo id is required", "consumo_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const consumo = await getConsumo({
      companyId: ctx.companyId,
      consumoId,
      prisma,
    });

    return ok(consumo);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, consumoId } = await params;
    if (!consumoId) {
      throw notFound("Consumo id is required", "consumo_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, CONSUMO_MUTATION_ROLES);

    const result = await deleteConsumo({
      companyId: ctx.companyId,
      consumoId,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
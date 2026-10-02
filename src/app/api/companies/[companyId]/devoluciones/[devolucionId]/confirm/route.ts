import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { conflict, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  DEVOLUCION_MUTATION_ROLES,
  DevolucionError,
  confirmDevolucion,
} from "../../../../../../../lib/services/devolucion.service";

type RouteContext = {
  params: Promise<{ companyId: string; devolucionId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, devolucionId } = await params;
    if (!devolucionId) {
      throw notFound("Devolucion id is required", "devolucion_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, DEVOLUCION_MUTATION_ROLES);

    let body: any = {};
    try {
      if (request.headers.get("content-type")?.includes("application/json")) {
        body = await request.json();
      }
    } catch {
      // Body is optional
    }

    const result = await confirmDevolucion({
      companyId: ctx.companyId,
      devolucionId,
      updatedById: ctx.actorUserId,
      cajasAccounting: body?.cajasAccounting,
      prisma,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof DevolucionError && error.code === "remito_devolucion_not_allowed") {
      return errorResponse(
        conflict("Cannot confirm devolucion for the current remito state", error.code)
      );
    }
    return errorResponse(error);
  }
}

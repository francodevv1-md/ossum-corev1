import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { ApiError, forbidden, internalError } from "../../../../../../lib/api/errors";
import { requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { canAccessGlobalCoordination } from "../../../../../../lib/permissions/coordination";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getCoordinationView } from "../../../../../../lib/services/coordination-view.service";
import { validateCoordinationViewRequest } from "../../../../../../lib/validators/coordination-view.validator";

type RouteContext = { params: Promise<{ companyId: string }> };

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Authorization",
};

function privateResponse(response: Response): Response {
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    const viewRequest = validateCoordinationViewRequest(new URL(request.url).searchParams);
    if (viewRequest.mode === "production" && viewRequest.surface === "global" && !canAccessGlobalCoordination(ctx.role)) {
      throw forbidden(
        "Acceso global a Coordinación denegado",
        "coordination_global_access_denied"
      );
    }
    return privateResponse(ok(await getCoordinationView({
      prisma,
      routeCompanyId: companyId,
      ctx,
      request: viewRequest,
    })));
  } catch (error) {
    const safeError = error instanceof ApiError
      ? error
      : internalError("No se pudo cargar la vista de Coordinación", "coordination_view_failed");
    return privateResponse(errorResponse(safeError));
  }
}

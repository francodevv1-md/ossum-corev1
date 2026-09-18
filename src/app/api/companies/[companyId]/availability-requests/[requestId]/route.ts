import { getApiAuthContext } from "@/lib/api/auth-context";
import { notFound } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import { availabilitySourceEnabledForCompany } from "@/lib/permissions/availability-request.server";
import prisma from "@/lib/prisma";
import { getAvailabilityRequestDetail } from "@/lib/services/availability-request.service";
import { validateAvailabilityId } from "@/lib/validators/availability-request.validator";

type RouteContext = {
  params: Promise<{ companyId: string; requestId: string }>;
};

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
    const { companyId, requestId: routeRequestId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    if (!availabilitySourceEnabledForCompany(ctx.companyId)) {
      throw notFound(
        "Availability request not found",
        "availability_request_not_found"
      );
    }
    const requestId = validateAvailabilityId(routeRequestId);

    const availabilityRequest = await getAvailabilityRequestDetail(
      { prisma },
      { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
      requestId
    );
    return privateResponse(ok(availabilityRequest));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}

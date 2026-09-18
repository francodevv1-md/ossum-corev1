import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getSurgeryDocumentation } from "@/lib/services/surgery-documentation.service";
import { validateDocumentationId, validateDocumentationReadQuery } from "@/lib/validators/documentation.validator";

type RouteContext = { params: Promise<{ companyId: string; surgeryId: string }> };
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Vary: "Authorization" };

function privateResponse(response: Response): Response {
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId: routeSurgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    validateDocumentationReadQuery(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const surgeryId = validateDocumentationId(routeSurgeryId);
    const documentation = await getSurgeryDocumentation(
      { prisma },
      { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
      surgeryId
    );
    return privateResponse(ok({ documentation }));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}

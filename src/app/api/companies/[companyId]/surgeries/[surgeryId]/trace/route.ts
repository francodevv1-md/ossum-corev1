import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../../../lib/api/guards";
import { getBooleanParam, getDateParam } from "../../../../../../../lib/api/query";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { getSurgeryTrace } from "../../../../../../../lib/services/trace.service";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;
    const trace = await getSurgeryTrace({
      companyId: ctx.companyId,
      surgeryId,
      prisma,
      includeAudit: getBooleanParam(searchParams, "includeAudit"),
      includeItems: getBooleanParam(searchParams, "includeItems"),
      includeSources: getBooleanParam(searchParams, "includeSources"),
      from: getDateParam(searchParams, "from"),
      to: getDateParam(searchParams, "to"),
    });

    return ok(trace);
  } catch (error) {
    return errorResponse(error);
  }
}

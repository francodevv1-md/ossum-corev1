import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { getBooleanParam, getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { listContactsByCompany } from "../../../../../lib/services/contact.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;

    const contacts = await listContactsByCompany(prisma, ctx.companyId, {
      role: getStringParam(searchParams, "role"),
      contactType: getStringParam(searchParams, "contactType"),
      isActive: getBooleanParam(searchParams, "isActive"),
      search: getStringParam(searchParams, "search"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });

    return ok(contacts);
  } catch (error) {
    return errorResponse(error);
  }
}

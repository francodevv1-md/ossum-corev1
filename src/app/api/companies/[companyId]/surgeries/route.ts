import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { listSurgeriesByCompany } from "../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;

    const surgeries = await listSurgeriesByCompany(prisma, ctx.companyId, {
      status: getStringParam(searchParams, "status"),
      branchId: getStringParam(searchParams, "branchId"),
      patientId: getStringParam(searchParams, "patientId"),
      doctorId: getStringParam(searchParams, "doctorId"),
      institutionId: getStringParam(searchParams, "institutionId"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });

    return ok(surgeries);
  } catch (error) {
    return errorResponse(error);
  }
}

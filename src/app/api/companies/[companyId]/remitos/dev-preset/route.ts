import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getRemitoDevPreset } from "../../../../../../lib/services/remito-dev-preset.service";

type RouteContext = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getRemitoDevPreset({ companyId: ctx.companyId, prisma }));
  } catch (error) {
    return errorResponse(error);
  }
}

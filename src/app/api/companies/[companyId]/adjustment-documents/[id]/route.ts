import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getAdjustmentDocumentById } from "../../../../../../lib/services/adjustment-document.service";

type RouteContext = { params: Promise<{ companyId: string; id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, id } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const doc = await getAdjustmentDocumentById(prisma, ctx.companyId, id);
    return ok(doc);
  } catch (error) {
    return errorResponse(error);
  }
}

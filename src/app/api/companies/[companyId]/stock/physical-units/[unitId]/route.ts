import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { updateStockPhysicalUnit } from "@/lib/services/stock-physical-unit.service";
import { stockPhysicalUnitUpdateSchema } from "@/lib/validators/stock-physical-unit";

type Context = { params: Promise<{ companyId: string; unitId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { companyId, unitId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    return ok(await updateStockPhysicalUnit(prisma, ctx.companyId, unitId, stockPhysicalUnitUpdateSchema.parse(body), ctx.actorUserId));
  } catch (error) { return errorResponse(error); }
}

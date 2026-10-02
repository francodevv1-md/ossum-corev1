import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { created, errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { createStockPhysicalUnit, listStockPhysicalUnits } from "@/lib/services/stock-physical-unit.service";
import { stockPhysicalUnitCreateSchema } from "@/lib/validators/stock-physical-unit";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await listStockPhysicalUnits(prisma, ctx.companyId, new URL(request.url).searchParams.get("articleId") || undefined));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    return created(await createStockPhysicalUnit(prisma, ctx.companyId, stockPhysicalUnitCreateSchema.parse(body), ctx.actorUserId));
  } catch (error) { return errorResponse(error); }
}

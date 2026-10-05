import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import { getPriceList, updatePriceList } from "@/lib/services/price-list.service";
import { priceListUpdateSchema } from "@/lib/validators/price-list";

type Context = { params: Promise<{ companyId: string; priceListId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, priceListId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    const priceList = await getPriceList(prisma, ctx.companyId, priceListId);
    return ok(priceList);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { companyId, priceListId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }
    const input = priceListUpdateSchema.parse(body);
    const updated = await updatePriceList(prisma, ctx.companyId, priceListId, input, ctx.actorUserId);
    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

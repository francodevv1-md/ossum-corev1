import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import { createPriceList, listPriceLists } from "@/lib/services/price-list.service";
import { priceListCreateSchema } from "@/lib/validators/price-list";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const lists = await listPriceLists(prisma, ctx.companyId, includeInactive);
    return ok(lists);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }
    const input = priceListCreateSchema.parse(body);
    const priceList = await createPriceList(prisma, ctx.companyId, input, ctx.actorUserId);
    return created(priceList);
  } catch (error) {
    return errorResponse(error);
  }
}

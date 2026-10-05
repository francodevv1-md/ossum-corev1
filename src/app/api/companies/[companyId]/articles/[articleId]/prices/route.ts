import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import {
  addArticlePriceVersion,
  getArticlePriceHistory,
  getEffectiveArticlePrice,
} from "@/lib/services/price-list.service";
import { articlePriceVersionCreateSchema } from "@/lib/validators/price-list";

type Context = { params: Promise<{ companyId: string; articleId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, articleId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const url = new URL(request.url);
    const priceListId = url.searchParams.get("priceListId") || undefined;
    const at = url.searchParams.get("at") || undefined;
    const mode = url.searchParams.get("mode"); // "effective" | "history" (default)

    if (mode === "effective" && priceListId) {
      const effective = await getEffectiveArticlePrice(prisma, ctx.companyId, articleId, priceListId, at);
      return ok(effective);
    }

    const history = await getArticlePriceHistory(prisma, ctx.companyId, articleId, priceListId);
    return ok(history);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, articleId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const input = articlePriceVersionCreateSchema.parse(body);
    const version = await addArticlePriceVersion(
      prisma,
      ctx.companyId,
      articleId,
      input,
      ctx.actorUserId,
    );
    return created(version);
  } catch (error) {
    return errorResponse(error);
  }
}

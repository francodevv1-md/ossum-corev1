import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getArticleStockDetail } from "@/lib/services/stock-ledger.service";

type Context = { params: Promise<{ companyId: string; articleId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, articleId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const result = await getArticleStockDetail(prisma, ctx.companyId, articleId);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

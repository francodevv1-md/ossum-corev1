import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getArticle, updateArticle } from "@/lib/services/article.service";
import { articleUpdateSchema } from "@/lib/validators/article";

type Context = { params: Promise<{ companyId: string; articleId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, articleId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getArticle(prisma, ctx.companyId, articleId));
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { companyId, articleId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    return ok(await updateArticle(prisma, ctx.companyId, articleId, articleUpdateSchema.parse(body), ctx.actorUserId));
  } catch (error) { return errorResponse(error); }
}

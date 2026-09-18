import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { updateArticle } from "@/lib/services/article.service";
import { articleUpdateSchema } from "@/lib/validators/article";

type Context = { params: Promise<{ companyId: string; articleId: string }> };

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

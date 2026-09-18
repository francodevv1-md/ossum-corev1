import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { deactivateArticleIdentifier } from "@/lib/services/article.service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ companyId: string; articleId: string; identifierId: string }> }) {
  try {
    const { companyId, articleId, identifierId } = await params;
    const ctx = await getApiAuthContext(_request, companyId);
    requireArticleMutationAccess(ctx);
    return ok(await deactivateArticleIdentifier(prisma, ctx.companyId, articleId, identifierId, ctx.actorUserId));
  } catch (error) { return errorResponse(error); }
}

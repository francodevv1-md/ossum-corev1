import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { deactivateSupplierMapping } from "@/lib/services/article.service";

export async function DELETE(request: Request, { params }: { params: Promise<{ companyId: string; articleId: string; mappingId: string }> }) {
  try {
    const { companyId, articleId, mappingId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    return ok(await deactivateSupplierMapping(prisma, ctx.companyId, articleId, mappingId, ctx.actorUserId));
  } catch (error) { return errorResponse(error); }
}

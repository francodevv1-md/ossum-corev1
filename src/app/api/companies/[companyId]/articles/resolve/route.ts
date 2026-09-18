import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { resolveArticleIdentifier, resolveSupplierCode } from "@/lib/services/article.service";
import { articleLookupQuerySchema } from "@/lib/validators/article";

export async function GET(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    const query = articleLookupQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (query.supplierId && query.supplierCode) return ok(await resolveSupplierCode(prisma, ctx.companyId, query.supplierId, query.supplierCode));
    return ok(await resolveArticleIdentifier(prisma, ctx.companyId, query));
  } catch (error) { return errorResponse(error); }
}

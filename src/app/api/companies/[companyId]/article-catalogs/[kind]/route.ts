import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { badRequest, forbidden } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { createArticleCatalog, listArticleCatalog } from "@/lib/services/article-catalog.service";
import { articleCatalogCreateSchema, articleCatalogKindSchema } from "@/lib/validators/article-catalog";

type Context = { params: Promise<{ companyId: string; kind: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, kind } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await listArticleCatalog(prisma, ctx.companyId, articleCatalogKindSchema.parse(kind)));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, kind } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    if (ctx.role !== "admin") throw forbidden("Catalog quick-create requires an administrator", "catalog_admin_required");
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    return created(await createArticleCatalog(prisma, ctx.companyId, articleCatalogKindSchema.parse(kind), articleCatalogCreateSchema.parse(body)));
  } catch (error) { return errorResponse(error); }
}

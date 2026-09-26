import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { createBoxFormula, searchBoxFormulas } from "@/lib/services/cajas.service";
import { boxFormulaCreateSchema, boxFormulaLookupQuerySchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await searchBoxFormulas(prisma, ctx.companyId, boxFormulaLookupQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    return created(await createBoxFormula(prisma, ctx.companyId, boxFormulaCreateSchema.parse(body), ctx.actorUserId));
  } catch (error) { return errorResponse(error); }
}

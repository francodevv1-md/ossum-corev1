import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import { createBoxFormula, listBoxFormulas } from "@/lib/services/cajas-formula.service";
import { cajasFormulaCreateSchema } from "@/lib/validators/cajas-formula";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const formulas = await listBoxFormulas(prisma, ctx.companyId);
    return ok(formulas);
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

    const input = cajasFormulaCreateSchema.parse(body);
    const formula = await createBoxFormula(prisma, ctx.companyId, input, ctx.actorUserId);
    return created(formula);
  } catch (error) {
    return errorResponse(error);
  }
}

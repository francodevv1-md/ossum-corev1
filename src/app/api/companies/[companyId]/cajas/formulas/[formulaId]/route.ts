import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getBoxFormula } from "@/lib/services/cajas-formula.service";

type Context = { params: Promise<{ companyId: string; formulaId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, formulaId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const formula = await getBoxFormula(prisma, ctx.companyId, formulaId);
    return ok(formula);
  } catch (error) {
    return errorResponse(error);
  }
}

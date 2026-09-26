import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getBoxFormula } from "@/lib/services/cajas.service";

type Context = { params: Promise<{ companyId: string; boxId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, boxId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getBoxFormula(prisma, ctx.companyId, boxId));
  } catch (error) { return errorResponse(error); }
}

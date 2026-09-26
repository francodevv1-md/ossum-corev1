import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getOperationalIndex } from "@/lib/services/cajas-operational.service";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(_request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getOperationalIndex(prisma, ctx.companyId));
  } catch (error) {
    console.error("[cajas.operational.GET]", error);
    return errorResponse(error);
  }
}

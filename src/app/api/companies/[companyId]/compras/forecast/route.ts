import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyCapability } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getComprasForecast } from "@/lib/services/compras-forecast.service";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "purchases:read");

    const result = await getComprasForecast({
      prisma,
      companyId: ctx.companyId,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyCapability } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getOrdenPago } from "@/lib/services/orden-pago.service";

type Context = { params: Promise<{ companyId: string; ordenPagoId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, ordenPagoId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "billing:read");

    const result = await getOrdenPago({
      prisma,
      companyId: ctx.companyId,
      ordenPagoId,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

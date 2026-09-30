import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getStockAvailability } from "@/lib/services/stock-ledger.service";
import { stockAvailabilityQuerySchema } from "@/lib/validators/stock";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const query = stockAvailabilityQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    const result = await getStockAvailability(prisma, ctx.companyId, query);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

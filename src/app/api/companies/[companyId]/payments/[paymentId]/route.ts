import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getPayment } from "../../../../../../lib/services/payment.service";

type RouteContext = { params: Promise<{ companyId: string; paymentId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, paymentId } = await params;
    if (!paymentId) throw notFound("Payment id is required", "payment_not_found");
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getPayment({ companyId: ctx.companyId, paymentId, prisma }));
  } catch (error) { return errorResponse(error); }
}

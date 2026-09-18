import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { PAYMENT_MUTATION_ROLES, cancelPayment } from "../../../../../../../lib/services/payment.service";

type RouteContext = { params: Promise<{ companyId: string; paymentId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, paymentId } = await params;
    if (!paymentId) throw notFound("Payment id is required", "payment_not_found");
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PAYMENT_MUTATION_ROLES);
    return ok(await cancelPayment({ companyId: ctx.companyId, paymentId, updatedById: ctx.actorUserId, prisma }));
  } catch (error) { return errorResponse(error); }
}

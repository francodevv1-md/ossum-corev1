import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { getDateParam, getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { PAYMENT_MUTATION_ROLES, createPayment, listPayments } from "../../../../../lib/services/payment.service";
import { paymentCreateSchema } from "../../../../../lib/validators/payment";

type RouteContext = { params: Promise<{ companyId: string }> };

async function parseJsonBody(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    const searchParams = new URL(request.url).searchParams;
    const payments = await listPayments({
      companyId: ctx.companyId,
      prisma,
      surgeryId: getStringParam(searchParams, "surgeryId"),
      state: getStringParam(searchParams, "state"),
      fromDate: getDateParam(searchParams, "from"),
      toDate: getDateParam(searchParams, "to"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });
    return ok(payments);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PAYMENT_MUTATION_ROLES);
    const parsed = paymentCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid payment body", "invalid_payment_body");
    const body = parsed.data;
    const payment = await createPayment({
      companyId: ctx.companyId,
      prisma,
      surgeryId: body.surgeryId,
      method: body.method,
      currency: body.currency,
      amount: body.amount,
      receivedAt: body.receivedAt,
      imputations: body.imputations,
      createdById: ctx.actorUserId,
      metadata: body.metadata ?? null,
    });
    return created(payment);
  } catch (error) { return errorResponse(error); }
}

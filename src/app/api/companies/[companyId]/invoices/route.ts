import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { getDateParam, getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { INVOICE_MUTATION_ROLES, createInvoice, listInvoices } from "../../../../../lib/services/invoice.service";
import { invoiceCreateSchema } from "../../../../../lib/validators/invoice";

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
    const invoices = await listInvoices({
      companyId: ctx.companyId,
      prisma,
      surgeryId: getStringParam(searchParams, "surgeryId"),
      state: getStringParam(searchParams, "state"),
      base: getStringParam(searchParams, "base"),
      fromDate: getDateParam(searchParams, "from"),
      toDate: getDateParam(searchParams, "to"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });
    return ok(invoices);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, INVOICE_MUTATION_ROLES);
    const parsed = invoiceCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid invoice body", "invalid_invoice_body");
    const body = parsed.data;
    const invoice = await createInvoice({
      companyId: ctx.companyId,
      prisma,
      surgeryId: body.surgeryId,
      presupuestoId: body.presupuestoId,
      consumoId: body.consumoId,
      base: body.base,
      type: body.type,
      currency: body.currency,
      items: body.items,
      createdById: ctx.actorUserId,
      metadata: body.metadata ?? null,
    });
    return created(invoice);
  } catch (error) { return errorResponse(error); }
}

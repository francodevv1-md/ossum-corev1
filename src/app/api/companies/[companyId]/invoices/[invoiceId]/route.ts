import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { INVOICE_MUTATION_ROLES, deleteInvoice, getInvoice } from "../../../../../../lib/services/invoice.service";

type RouteContext = { params: Promise<{ companyId: string; invoiceId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, invoiceId } = await params;
    if (!invoiceId) throw notFound("Invoice id is required", "invoice_not_found");
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getInvoice({ companyId: ctx.companyId, invoiceId, prisma }));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, invoiceId } = await params;
    if (!invoiceId) throw notFound("Invoice id is required", "invoice_not_found");
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, INVOICE_MUTATION_ROLES);
    return ok(await deleteInvoice({ companyId: ctx.companyId, invoiceId, prisma }));
  } catch (error) { return errorResponse(error); }
}

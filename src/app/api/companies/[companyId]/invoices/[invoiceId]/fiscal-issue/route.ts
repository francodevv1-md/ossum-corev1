import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { issueFiscalInvoiceDev } from "../../../../../../../lib/services/fiscal-issuance.service";
import { INVOICE_MUTATION_ROLES } from "../../../../../../../lib/services/invoice.service";

type RouteContext = { params: Promise<{ companyId: string; invoiceId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, invoiceId } = await params;
    if (!invoiceId) throw notFound("Invoice id is required", "invoice_not_found");
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, INVOICE_MUTATION_ROLES);

    const actorUserId = ctx.actorUserId ?? (ctx as unknown as { userId?: string }).userId;
    const result = await issueFiscalInvoiceDev(prisma, ctx.companyId, invoiceId, actorUserId);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

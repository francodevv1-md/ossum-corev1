import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { INVOICE_MUTATION_ROLES, updateInvoiceState } from "../../../../../../../lib/services/invoice.service";
import { invoiceStateTransitionSchema } from "../../../../../../../lib/validators/invoice";

type RouteContext = { params: Promise<{ companyId: string; invoiceId: string }> };

async function parseJsonBody(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, invoiceId } = await params;
    if (!invoiceId) throw notFound("Invoice id is required", "invoice_not_found");
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, INVOICE_MUTATION_ROLES);
    const parsed = invoiceStateTransitionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid state body", "invalid_invoice_state_body");
    return ok(await updateInvoiceState({ companyId: ctx.companyId, invoiceId, newState: parsed.data.newState, updatedById: ctx.actorUserId, prisma }));
  } catch (error) { return errorResponse(error); }
}

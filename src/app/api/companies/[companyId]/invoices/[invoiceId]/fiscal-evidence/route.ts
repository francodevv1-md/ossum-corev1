import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../../../lib/api/guards";
import { notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { getFiscalEvidence } from "../../../../../../../lib/services/fiscal-evidence-read.service";

type RouteContext = { params: Promise<{ companyId: string; invoiceId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, invoiceId } = await params;
    if (!invoiceId) throw notFound("Invoice id is required", "invoice_not_found");
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getFiscalEvidence(prisma, ctx.companyId, invoiceId));
  } catch (error) {
    return errorResponse(error);
  }
}

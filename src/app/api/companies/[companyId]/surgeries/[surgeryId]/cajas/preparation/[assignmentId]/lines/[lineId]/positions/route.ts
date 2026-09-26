import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { confirmCajasPhysicalAllocation, getEligibleCajasPhysicalPositions } from "@/lib/services/cajas-physical-preparation.service";
import { cajasPhysicalAllocationSchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string; surgeryId: string; assignmentId: string; lineId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId, assignmentId, lineId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getEligibleCajasPhysicalPositions(prisma, ctx.companyId, surgeryId, assignmentId, lineId));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId, assignmentId, lineId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    const parsed = cajasPhysicalAllocationSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid physical allocation body", "invalid_cajas_physical_allocation_body");
    const result = await confirmCajasPhysicalAllocation(prisma, ctx.companyId, surgeryId, assignmentId, lineId, ctx.actorUserId, parsed.data);
    return result.replayed ? ok(result) : created(result);
  } catch (error) { return errorResponse(error); }
}

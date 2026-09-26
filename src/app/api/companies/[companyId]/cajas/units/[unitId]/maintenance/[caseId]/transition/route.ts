import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { transitionCajasMaintenanceCase } from "@/lib/services/cajas-maintenance.service";
import { cajasMaintenanceTransitionSchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string; unitId: string; caseId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, unitId, caseId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    const parsed = cajasMaintenanceTransitionSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid Cajas maintenance body", "invalid_cajas_maintenance_body");
    return ok(await transitionCajasMaintenanceCase(prisma, ctx.companyId, unitId, caseId, ctx.actorUserId, parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}

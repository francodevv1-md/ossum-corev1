import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { createCajasMaintenanceCase, getCajasMaintenance } from "@/lib/services/cajas-maintenance.service";
import { cajasMaintenanceCreateSchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string; unitId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, unitId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getCajasMaintenance(prisma, ctx.companyId, unitId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, unitId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    const parsed = cajasMaintenanceCreateSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid Cajas maintenance body", "invalid_cajas_maintenance_body");
    const result = await createCajasMaintenanceCase(prisma, ctx.companyId, unitId, ctx.actorUserId, parsed.data);
    return result.replayed ? ok(result) : created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { releaseCajasPhysicalAllocation } from "@/lib/services/cajas-physical-preparation.service";
import { cajasPhysicalReleaseSchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string; surgeryId: string; assignmentId: string; lineId: string; correlationId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId, assignmentId, lineId, correlationId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    const parsed = cajasPhysicalReleaseSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid physical allocation release body", "invalid_cajas_physical_release_body");
    const result = await releaseCajasPhysicalAllocation(prisma, ctx.companyId, surgeryId, assignmentId, lineId, correlationId, ctx.actorUserId, parsed.data);
    return result.replayed ? ok(result) : created(result);
  } catch (error) { return errorResponse(error); }
}

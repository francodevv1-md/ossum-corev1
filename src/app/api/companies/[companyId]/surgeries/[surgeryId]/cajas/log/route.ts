import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { appendCajasUnitLogEntry } from "@/lib/services/cajas-assignment-preparation.service";
import { cajasUnitLogEntrySchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string; surgeryId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    const parsed = cajasUnitLogEntrySchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid Cajas unit log body", "invalid_cajas_unit_log_body");
    const result = await appendCajasUnitLogEntry(prisma, ctx.companyId, surgeryId, ctx.actorUserId, parsed.data);
    return result.replayed ? ok(result) : created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

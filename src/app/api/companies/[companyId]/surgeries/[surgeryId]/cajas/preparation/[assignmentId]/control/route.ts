import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireCajasControlAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { acceptCajasControl } from "@/lib/services/cajas-control.service";
import { cajasControlSchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string; surgeryId: string; assignmentId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId, assignmentId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCajasControlAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    const parsed = cajasControlSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid Caja control body", "invalid_cajas_control_body");
    const result = await acceptCajasControl(prisma, ctx.companyId, surgeryId, assignmentId, ctx.actorUserId, parsed.data);
    return result.replayed ? ok(result) : created(result);
  } catch (error) { return errorResponse(error); }
}

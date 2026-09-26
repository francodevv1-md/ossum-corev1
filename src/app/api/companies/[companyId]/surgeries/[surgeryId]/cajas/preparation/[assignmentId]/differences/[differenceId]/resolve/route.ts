import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireCajasDifferenceResolutionAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { resolveCajasDifference } from "@/lib/services/cajas-control.service";
import { cajasDifferenceResolutionSchema } from "@/lib/validators/cajas";

type Context = { params: Promise<{ companyId: string; surgeryId: string; assignmentId: string; differenceId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId, assignmentId, differenceId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCajasDifferenceResolutionAccess(ctx);
    let body: unknown;
    try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); }
    const parsed = cajasDifferenceResolutionSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid Caja difference resolution body", "invalid_cajas_difference_resolution_body");
    const result = await resolveCajasDifference(prisma, ctx.companyId, surgeryId, assignmentId, differenceId, ctx.actorUserId, parsed.data);
    return result.replayed ? ok(result) : created(result);
  } catch (error) { return errorResponse(error); }
}

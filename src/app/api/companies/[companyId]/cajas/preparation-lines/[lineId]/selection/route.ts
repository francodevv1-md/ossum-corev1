import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { selectCajasComponent } from "@/lib/services/cajas-component-selection.service";
import { cajasComponentSelectionSchema } from "@/lib/validators/cajas-assignment";

type Context = { params: Promise<{ companyId: string; lineId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { companyId, lineId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    const body = await request.json().catch(() => { throw badRequest("Invalid JSON body", "invalid_json_body"); });
    const input = cajasComponentSelectionSchema.parse(body);
    return ok(await selectCajasComponent(prisma, ctx.companyId, lineId, input, ctx.actorUserId));
  } catch (error) { return errorResponse(error); }
}

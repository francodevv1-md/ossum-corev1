import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { resolveCajasDifference } from "@/lib/services/cajas-difference.service";
import { cajasResolutionSchema } from "@/lib/validators/cajas-assignment";

type Context = { params: Promise<{ companyId: string; assignmentId: string; differenceId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, differenceId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);
    const body = await request.json();
    const input = cajasResolutionSchema.parse(body);
    return ok(await resolveCajasDifference(prisma, ctx.companyId, differenceId, input, ctx.actorUserId));
  } catch (error) {
    return errorResponse(error);
  }
}

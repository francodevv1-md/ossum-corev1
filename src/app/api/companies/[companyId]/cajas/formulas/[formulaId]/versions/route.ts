import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import { publishFormulaVersion } from "@/lib/services/cajas-formula.service";
import { cajasFormulaVersionPublishSchema } from "@/lib/validators/cajas-formula";

type Context = { params: Promise<{ companyId: string; formulaId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, formulaId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const input = cajasFormulaVersionPublishSchema.parse(body);
    const updated = await publishFormulaVersion(
      prisma,
      ctx.companyId,
      formulaId,
      input,
      ctx.actorUserId,
    );
    return created(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import { createStockAdjustment } from "@/lib/services/stock-ledger.service";
import { stockAdjustmentCreateSchema } from "@/lib/validators/stock";

type Context = { params: Promise<{ companyId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const validated = stockAdjustmentCreateSchema.parse(body);
    const result = await createStockAdjustment(prisma, ctx.companyId, validated, ctx.actorUserId);
    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

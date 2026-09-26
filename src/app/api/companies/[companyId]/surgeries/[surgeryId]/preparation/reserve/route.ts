import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { reservePreparation } from "@/lib/services/preparation.service";
import { reservePreparationSchema } from "@/lib/validators/receipt-preparation";

type Context = { params: Promise<{ companyId: string; surgeryId: string }> };

export async function POST(request: Request, { params }: Context) {
  try { const { companyId, surgeryId } = await params; const ctx = await getApiAuthContext(request, companyId); requireStockOperationAccess(ctx); const body = (await request.json()) as Record<string, unknown>; return ok(await reservePreparation(prisma, ctx.companyId, surgeryId, String(body.preparationId), ctx.actorUserId, reservePreparationSchema.parse(body))); } catch (error) { return errorResponse(error); }
}

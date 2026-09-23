import prisma from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyMutationAccess } from "@/lib/api/guards";
import { confirmGoodsReceipt } from "@/lib/services/goods-receipt.service";

type Context = { params: Promise<{ companyId: string; receiptId: string }> };
const MUTATION_ROLES = ["admin", "operator"] as const;
export async function POST(request: Request, { params }: Context) {
  try { const { companyId, receiptId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyMutationAccess(ctx, MUTATION_ROLES); return ok(await confirmGoodsReceipt(prisma, ctx.companyId, receiptId, ctx.actorUserId)); } catch (error) { return errorResponse(error); }
}

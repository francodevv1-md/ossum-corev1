import prisma from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { listStockBalances } from "@/lib/services/goods-receipt.service";

type Context = { params: Promise<{ companyId: string }> };
export async function GET(request: Request, { params }: Context) {
  try { const { companyId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyReadAccess(ctx); return ok(await listStockBalances(prisma, ctx.companyId)); } catch (error) { return errorResponse(error); }
}

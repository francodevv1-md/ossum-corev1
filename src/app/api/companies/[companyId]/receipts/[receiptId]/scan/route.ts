import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { scanReceipt } from "@/lib/services/receipt.service";
import { receiptScanSchema } from "@/lib/validators/receipt-preparation";

type Context = { params: Promise<{ companyId: string; receiptId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    return ok(await scanReceipt(prisma, ctx.companyId, receiptId, ctx.actorUserId, receiptScanSchema.parse(await request.json())));
  } catch (error) { return errorResponse(error); }
}

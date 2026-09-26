import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { resolveReceiptScan } from "@/lib/services/receipt.service";
import { resolveReceiptScanSchema } from "@/lib/validators/receipt-preparation";

type Context = { params: Promise<{ companyId: string; receiptId: string; scanId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId, scanId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    return ok(await resolveReceiptScan(prisma, ctx.companyId, receiptId, scanId, ctx.actorUserId, resolveReceiptScanSchema.parse(await request.json()).articleId));
  } catch (error) { return errorResponse(error); }
}

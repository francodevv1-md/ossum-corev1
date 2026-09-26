import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { addReceiptLine, confirmReceipt, getReceiptForOperation } from "@/lib/services/receipt.service";
import { confirmReceiptSchema, receiptLineSchema } from "@/lib/validators/receipt-preparation";

type Context = { params: Promise<{ companyId: string; receiptId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    return ok(await getReceiptForOperation(prisma, ctx.companyId, receiptId));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "confirm") return ok(await confirmReceipt(prisma, ctx.companyId, receiptId, ctx.actorUserId, confirmReceiptSchema.parse(body).idempotencyKey));
    return ok(await addReceiptLine(prisma, ctx.companyId, receiptId, ctx.actorUserId, receiptLineSchema.parse(body)));
  } catch (error) { return errorResponse(error); }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireReceiptMutationAccess } from "@/lib/permissions/receipt";
import prisma from "@/lib/prisma";
import { confirmReceipt } from "@/lib/services/receipt.service";
import { receiptConfirmSchema } from "@/lib/validators/receipt";

type Context = { params: Promise<{ companyId: string; receiptId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireReceiptMutationAccess(ctx);

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // Empty or invalid body defaults to empty object
    }

    const validated = receiptConfirmSchema.parse(body);
    const result = await confirmReceipt(
      prisma,
      ctx.companyId,
      receiptId,
      validated.notes,
      ctx.actorUserId
    );
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

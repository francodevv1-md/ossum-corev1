import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireReceiptMutationAccess } from "@/lib/permissions/receipt";
import prisma from "@/lib/prisma";
import { confirmReceipt, getReceipt } from "@/lib/services/receipt.service";
import { receiptConfirmSchema } from "@/lib/validators/receipt";

type Context = { params: Promise<{ companyId: string; receiptId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    return ok(await getReceipt(prisma, ctx.companyId, receiptId));
  } catch (error) {
    return errorResponse(error);
  }
}

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
    if (validated.action === "confirm" || !validated.action) {
      const result = await confirmReceipt(
        prisma,
        ctx.companyId,
        receiptId,
        validated.notes,
        ctx.actorUserId
      );
      return ok(result);
    }

    throw badRequest("Unsupported action", "unsupported_action");
  } catch (error) {
    return errorResponse(error);
  }
}

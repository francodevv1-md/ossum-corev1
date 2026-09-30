import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireReceiptMutationAccess } from "@/lib/permissions/receipt";
import prisma from "@/lib/prisma";
import { scanReceiptUnit } from "@/lib/services/receipt.service";
import { receiptScanSchema } from "@/lib/validators/receipt";

type Context = { params: Promise<{ companyId: string; receiptId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireReceiptMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const { rawValue } = receiptScanSchema.parse(body);
    const result = await scanReceiptUnit(prisma, ctx.companyId, receiptId, rawValue, ctx.actorUserId);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

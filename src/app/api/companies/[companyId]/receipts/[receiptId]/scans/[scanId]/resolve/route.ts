import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireReceiptMutationAccess } from "@/lib/permissions/receipt";
import prisma from "@/lib/prisma";
import { resolvePendingScan } from "@/lib/services/receipt.service";
import { receiptResolveScanSchema } from "@/lib/validators/receipt";

type Context = { params: Promise<{ companyId: string; receiptId: string; scanId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, receiptId, scanId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireReceiptMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const { articleId } = receiptResolveScanSchema.parse(body);
    const result = await resolvePendingScan(
      prisma,
      ctx.companyId,
      receiptId,
      scanId,
      articleId,
      ctx.actorUserId
    );
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

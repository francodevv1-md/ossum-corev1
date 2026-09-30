import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireReceiptMutationAccess } from "@/lib/permissions/receipt";
import prisma from "@/lib/prisma";
import { createReceiptDraft, listReceipts } from "@/lib/services/receipt.service";
import { receiptCreateSchema } from "@/lib/validators/receipt";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const url = new URL(request.url);
    const take = url.searchParams.get("take") ? parseInt(url.searchParams.get("take")!, 10) : undefined;
    const skip = url.searchParams.get("skip") ? parseInt(url.searchParams.get("skip")!, 10) : undefined;

    return ok(await listReceipts(prisma, ctx.companyId, { take, skip }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireReceiptMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const validated = receiptCreateSchema.parse(body);
    const result = await createReceiptDraft(prisma, ctx.companyId, validated, ctx.actorUserId);
    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { ZodError } from "zod";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok, created } from "@/lib/api/responses";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { createReceipt } from "@/lib/services/receipt.service";
import { createReceiptSchema } from "@/lib/validators/receipt-preparation";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    return ok(await prisma.goodsReceipt.findMany({ where: { companyId: ctx.companyId, ...(status ? { status } : {}) }, include: { lines: true, scanEvents: { select: { resolutionStatus: true } } }, orderBy: { createdAt: "desc" } }));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireStockOperationAccess(ctx);
    return created(await createReceipt(prisma, ctx.companyId, ctx.actorUserId, createReceiptSchema.parse(await request.json())));
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && !(error instanceof ZodError)) {
      console.error("[receipts.POST]", error);
    }
    if (error instanceof ZodError) return errorResponse(badRequest("Invalid receipt payload", "invalid_receipt_payload"));
    return errorResponse(error);
  }
}

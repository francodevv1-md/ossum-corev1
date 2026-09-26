import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok, created } from "@/lib/api/responses";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { requireCompanyMutationAccess } from "@/lib/api/guards";
import { requireStockOperationAccess } from "@/lib/permissions/stock-operations";
import prisma from "@/lib/prisma";
import { createPreparation, getPreparation } from "@/lib/services/preparation.service";
import { createPreparationSchema } from "@/lib/validators/receipt-preparation";
import { updateSurgeryPrepStatus } from "@/lib/services/surgery.service";
import { validatePrepStatus } from "@/lib/validators/surgery.validator";

type Context = { params: Promise<{ companyId: string; surgeryId: string }> };

export async function GET(request: Request, { params }: Context) {
  try { const { companyId, surgeryId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyReadAccess(ctx); return ok(await getPreparation(prisma, ctx.companyId, surgeryId)); } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try { const { companyId, surgeryId } = await params; const ctx = await getApiAuthContext(request, companyId); requireStockOperationAccess(ctx); return created(await createPreparation(prisma, ctx.companyId, surgeryId, ctx.actorUserId, createPreparationSchema.parse(await request.json()))); } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, ["admin", "operator"]);
    const body = (await request.json()) as Record<string, unknown>;
    const keys = Object.keys(body);
    if (keys.some((key) => !["prepStatus", "source"].includes(key)) || typeof body.prepStatus !== "string" || body.source !== undefined && typeof body.source !== "string") throw badRequest("Invalid preparation status body", "invalid_preparation_status_body");
    validatePrepStatus(body.prepStatus);
    return ok(await updateSurgeryPrepStatus(prisma, { companyId: ctx.companyId, actorUserId: ctx.actorUserId, source: body.source as string | undefined, module: "surgery" }, surgeryId, body.prepStatus));
  } catch (error) { return errorResponse(error); }
}

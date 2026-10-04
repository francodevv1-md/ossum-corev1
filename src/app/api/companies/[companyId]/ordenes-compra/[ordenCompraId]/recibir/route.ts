import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireReceiptMutationAccess } from "@/lib/permissions/receipt";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { recibirOrdenCompra } from "@/lib/services/orden-compra.service";
import { ordenCompraReceiveSchema } from "@/lib/validators/orden-compra";

type C = { params: Promise<{ companyId: string; ordenCompraId: string }> };
export async function POST(request: Request, { params }: C) {
  try {
    const { companyId, ordenCompraId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireReceiptMutationAccess(ctx);
    const payload = ordenCompraReceiveSchema.parse(await request.json().catch(() => ({})));
    return ok(await recibirOrdenCompra({ companyId: ctx.companyId, ordenCompraId, prisma, updatedById: ctx.actorUserId, ...payload }));
  } catch (error) { return errorResponse(error); }
}

import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { emitAdjustmentDocument } from "../../../../../../../lib/services/adjustment-document.service";

type RouteContext = { params: Promise<{ companyId: string; id: string }> };

const ADJUSTMENT_MUTATION_ROLES = ["admin", "facturacion", "operaciones", "gerencia"] as const;

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, id } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, ADJUSTMENT_MUTATION_ROLES);

    const emittedDoc = await emitAdjustmentDocument(
      prisma,
      ctx.companyId,
      id,
      ctx.actorUserId,
    );

    return ok(emittedDoc);
  } catch (error) {
    return errorResponse(error);
  }
}

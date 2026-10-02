import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  PRESUPUESTO_MUTATION_ROLES,
  emitirPresupuesto,
} from "../../../../../../../lib/services/presupuesto.service";
import { presupuestoEmitSchema } from "../../../../../../../lib/validators/presupuesto";

type RouteContext = {
  params: Promise<{ companyId: string; presupuestoId: string }>;
};

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params;
    if (!presupuestoId) {
      throw notFound("Presupuesto id is required", "presupuesto_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);

    const rawBody = await parseJsonBody(request);
    const parsed = presupuestoEmitSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid presupuesto emit body",
        "invalid_presupuesto_emit_body"
      );
    }

    const result = await emitirPresupuesto({
      companyId: ctx.companyId,
      presupuestoId,
      expectedRevision: parsed.data.expectedRevision,
      updatedById: ctx.actorUserId,
      prisma,
    });
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

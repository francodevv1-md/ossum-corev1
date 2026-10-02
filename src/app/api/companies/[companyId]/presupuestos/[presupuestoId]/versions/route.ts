import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { created, errorResponse } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  PRESUPUESTO_MUTATION_ROLES,
  createPresupuestoVersion,
} from "../../../../../../../lib/services/presupuesto.service";
import { presupuestoCreateVersionSchema } from "../../../../../../../lib/validators/presupuesto";

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
    const parsed = presupuestoCreateVersionSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid presupuesto version body",
        "invalid_presupuesto_version_body"
      );
    }

    const result = await createPresupuestoVersion({
      companyId: ctx.companyId,
      sourcePresupuestoId: presupuestoId,
      items: parsed.data.items,
      expectedRevision: parsed.data.expectedRevision,
      metadata: parsed.data.metadata ?? null,
      updatedById: ctx.actorUserId,
      prisma,
    });
    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../../lib/api/errors";
import { created, errorResponse } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import {
  PRESUPUESTO_MUTATION_ROLES,
  createRevisionDraft,
} from "../../../../../../../lib/services/presupuesto.service";
import { presupuestoExpectedRevisionSchema } from "../../../../../../../lib/validators/presupuesto";

type RouteContext = {
  params: Promise<{ companyId: string; presupuestoId: string }>;
};

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
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

    const parsed = presupuestoExpectedRevisionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid presupuesto version body",
        "invalid_presupuesto_version_body"
      );
    }

    const result = await createRevisionDraft({
      companyId: ctx.companyId,
      presupuestoId,
      expectedRevision: parsed.data.expectedRevision,
      actorUserId: ctx.actorUserId,
      prisma,
    });
    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

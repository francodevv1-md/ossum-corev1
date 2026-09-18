import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import {
  PRESUPUESTO_MUTATION_ROLES,
  deleteDraft,
  getPresupuesto,
  replaceDraft,
} from "../../../../../../lib/services/presupuesto.service";
import {
  presupuestoExpectedRevisionSchema,
  presupuestoReplaceDraftSchema,
} from "../../../../../../lib/validators/presupuesto";

type RouteContext = {
  params: Promise<{ companyId: string; presupuestoId: string }>;
};

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params;
    if (!presupuestoId) {
      throw notFound("Presupuesto id is required", "presupuesto_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const presupuesto = await getPresupuesto({ companyId: ctx.companyId, presupuestoId, prisma });
    return ok(presupuesto);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);
    const parsed = presupuestoReplaceDraftSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message, "invalid_presupuesto_body");
    return ok(await replaceDraft({
      ...parsed.data,
      companyId: ctx.companyId,
      presupuestoId,
      actorUserId: ctx.actorUserId,
      prisma,
    }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, presupuestoId } = await params;
    if (!presupuestoId) {
      throw notFound("Presupuesto id is required", "presupuesto_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);

    const parsed = presupuestoExpectedRevisionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message, "invalid_presupuesto_body");
    const result = await deleteDraft({
      companyId: ctx.companyId,
      presupuestoId,
      expectedRevision: parsed.data.expectedRevision,
      actorUserId: ctx.actorUserId,
      prisma,
    });
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

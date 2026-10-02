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
  deletePresupuesto,
  getPresupuesto,
  updatePresupuestoDraft,
} from "../../../../../../lib/services/presupuesto.service";
import {
  presupuestoDeleteDraftSchema,
  presupuestoUpdateDraftSchema,
} from "../../../../../../lib/validators/presupuesto";

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
    if (!presupuestoId) {
      throw notFound("Presupuesto id is required", "presupuesto_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);

    const rawBody = await parseJsonBody(request);
    if (!rawBody) {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const parsed = presupuestoUpdateDraftSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid presupuesto draft update body",
        "invalid_presupuesto_draft_body"
      );
    }
    const body = parsed.data;

    const result = await updatePresupuestoDraft({
      companyId: ctx.companyId,
      presupuestoId,
      branchId: body.branchId,
      clientContactId: body.clientContactId,
      payerContactId: body.payerContactId,
      title: body.title,
      currency: body.currency,
      documentDate: body.documentDate,
      paymentTerms: body.paymentTerms,
      priceListCode: body.priceListCode,
      legend: body.legend,
      notes: body.notes,
      validUntil: body.validUntil,
      generalDiscountRate: body.generalDiscountRate,
      commercial: body.commercial,
      expectedRevision: body.expectedRevision,
      items: body.items,
      updatedById: ctx.actorUserId,
      metadata: body.metadata ?? null,
      prisma,
    });

    return ok(result);
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

    const rawBody = await parseJsonBody(request);
    const parsed = presupuestoDeleteDraftSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid presupuesto delete draft body",
        "invalid_presupuesto_delete_body"
      );
    }

    const result = await deletePresupuesto({
      companyId: ctx.companyId,
      presupuestoId,
      expectedRevision: parsed.data.expectedRevision,
      prisma,
    });
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

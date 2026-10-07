import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import {
  REMITO_MUTATION_ROLES,
  deleteRemito,
  getRemito,
  updateRemitoDraft,
} from "../../../../../../lib/services/remito.service";
import { remitoDraftUpdateSchema } from "../../../../../../lib/validators/remito";

type RouteContext = {
  params: Promise<{ companyId: string; remitoId: string }>;
};

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params;
    if (!remitoId) {
      throw notFound("Remito id is required", "remito_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const remito = await getRemito({
      companyId: ctx.companyId,
      remitoId,
      prisma,
    });

    return ok(remito);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params;
    if (!remitoId) {
      throw notFound("Remito id is required", "remito_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES);

    const result = await deleteRemito({
      companyId: ctx.companyId,
      remitoId,
      deletedById: ctx.actorUserId,
      prisma,
    });

    // Mantenemos 200 con payload explícito (no 204) para que el cliente lea confirmación.
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params;
    if (!remitoId) {
      throw notFound("Remito id is required", "remito_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES);

    const parsed = remitoDraftUpdateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid remito draft update body",
        "invalid_remito_draft_update_body"
      );
    }
    const body = parsed.data;

    const result = await updateRemitoDraft({
      companyId: ctx.companyId,
      remitoId,
      expectedUpdatedAt: body.expectedUpdatedAt,
      branchId: body.branchId,
      issuedBranchId: body.issuedBranchId,
      surgeryId: body.surgeryId,
      salidaReason: body.salidaReason,
      boxId: body.boxId,
      presupuestoId: body.presupuestoId,
      destinatarioContactId: body.destinatarioContactId,
      destinatarioSnapshot: body.destinatarioSnapshot,
      shippingAddressSnapshot: body.shippingAddressSnapshot,
      transportSnapshot: body.transportSnapshot,
      packageCount: body.packageCount,
      declaredValue: body.declaredValue,
      items: body.items,
      metadata: body.metadata,
      updatedById: ctx.actorUserId,
      prisma,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

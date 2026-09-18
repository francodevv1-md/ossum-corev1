import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { getDateParam, getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import {
  REMITO_MUTATION_ROLES,
  createRemito,
  listRemitos,
} from "../../../../../lib/services/remito.service";
import { remitoCreateSchema } from "../../../../../lib/validators/remito";

type RouteContext = {
  params: Promise<{ companyId: string }>;
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
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;
    const state = getStringParam(searchParams, "state");
    const origin = getStringParam(searchParams, "origin");
    const salidaReason = getStringParam(searchParams, "salidaReason");

    const remitos = await listRemitos({
      companyId: ctx.companyId,
      prisma,
      surgeryId: getStringParam(searchParams, "surgeryId"),
      branchId: getStringParam(searchParams, "branchId"),
      state,
      origin,
      salidaReason,
      fromDate: getDateParam(searchParams, "from"),
      toDate: getDateParam(searchParams, "to"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });

    return ok(remitos);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES);

    const parsed = remitoCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid remito body",
        "invalid_remito_body"
      );
    }
    const body = parsed.data;

    const remito = await createRemito({
      companyId: ctx.companyId,
      prisma,
      branchId: body.branchId,
      issuedBranchId: body.issuedBranchId,
      surgeryId: body.surgeryId,
      origin: body.origin,
      salidaReason: body.salidaReason,
      boxId: body.boxId ?? undefined,
      presupuestoId: body.presupuestoId ?? undefined,
      destinatarioContactId: body.destinatarioContactId ?? null,
      destinatarioSnapshot: body.destinatarioSnapshot ?? null,
      shippingAddressSnapshot: body.shippingAddressSnapshot ?? null,
      transportSnapshot: body.transportSnapshot ?? null,
      packageCount: body.packageCount ?? null,
      declaredValue: body.declaredValue ?? null,
      items: body.items,
      createdById: ctx.actorUserId,
      metadata: body.metadata ?? null,
    });

    return created(remito);
  } catch (error) {
    return errorResponse(error);
  }
}

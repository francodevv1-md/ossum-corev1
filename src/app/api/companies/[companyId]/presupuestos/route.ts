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
  PRESUPUESTO_MUTATION_ROLES,
  createPresupuesto,
  listPresupuestos,
} from "../../../../../lib/services/presupuesto.service";
import { presupuestoCreateSchema } from "../../../../../lib/validators/presupuesto";

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
    const presupuestos = await listPresupuestos({
      companyId: ctx.companyId,
      prisma,
      surgeryId: getStringParam(searchParams, "surgeryId"),
      state: getStringParam(searchParams, "state"),
      fromDate: getDateParam(searchParams, "from"),
      toDate: getDateParam(searchParams, "to"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });

    return ok(presupuestos);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);

    const parsed = presupuestoCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid presupuesto body",
        "invalid_presupuesto_body"
      );
    }
    const body = parsed.data;

    const presupuesto = await createPresupuesto({
      companyId: ctx.companyId,
      prisma,
      surgeryId: body.surgeryId,
      title: body.title,
      currency: body.currency,
      validUntil: body.validUntil,
      items: body.items,
      createdById: ctx.actorUserId,
      metadata: body.metadata ?? null,
    });

    return created(presupuesto);
  } catch (error) {
    return errorResponse(error);
  }
}

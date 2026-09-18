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
  DEVOLUCION_MUTATION_ROLES,
  createDevolucion,
  listDevoluciones,
} from "../../../../../lib/services/devolucion.service";
import { devolucionCreateSchema } from "../../../../../lib/validators/devolucion";

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

    const devoluciones = await listDevoluciones({
      companyId: ctx.companyId,
      prisma,
      surgeryId: getStringParam(searchParams, "surgeryId"),
      state: getStringParam(searchParams, "state"),
      remitoId: getStringParam(searchParams, "remitoId"),
      consumoId: getStringParam(searchParams, "consumoId"),
      fromDate: getDateParam(searchParams, "from"),
      toDate: getDateParam(searchParams, "to"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });

    return ok(devoluciones);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, DEVOLUCION_MUTATION_ROLES);

    const parsed = devolucionCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid devolucion body",
        "invalid_devolucion_body"
      );
    }
    const body = parsed.data;

    const devolucion = await createDevolucion({
      companyId: ctx.companyId,
      prisma,
      surgeryId: body.surgeryId,
      remitoId: body.remitoId,
      consumoId: body.consumoId,
      items: body.items,
      reason: body.reason,
      createdById: ctx.actorUserId,
      metadata: body.metadata ?? null,
    });

    return created(devolucion);
  } catch (error) {
    return errorResponse(error);
  }
}
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
  CONSUMO_MUTATION_ROLES,
  createConsumo,
  getAuthorizedConsumptionControl,
  listConsumos,
} from "../../../../../lib/services/consumo.service";
import { consumoCreateSchema } from "../../../../../lib/validators/consumo";

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
    const includeAuthorizationControl = searchParams.get("includeAuthorizationControl") === "true";
    const surgeryId = getStringParam(searchParams, "surgeryId");

    const consumos = await listConsumos({
      companyId: ctx.companyId,
      prisma,
      surgeryId,
      state: getStringParam(searchParams, "state"),
      remitoId: getStringParam(searchParams, "remitoId"),
      fromDate: getDateParam(searchParams, "from"),
      toDate: getDateParam(searchParams, "to"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });

    if (includeAuthorizationControl) {
      if (!surgeryId) {
        throw badRequest("surgeryId is required when includeAuthorizationControl=true", "consumo_authorization_control_surgery_required");
      }
      const authorizationControl = await getAuthorizedConsumptionControl({
        companyId: ctx.companyId,
        surgeryId,
        prisma,
      });
      return ok({ consumos, authorizationControl });
    }

    return ok(consumos);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, CONSUMO_MUTATION_ROLES);

    const parsed = consumoCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid consumo body",
        "invalid_consumo_body"
      );
    }
    const body = parsed.data;

    const consumo = await createConsumo({
      companyId: ctx.companyId,
      prisma,
      surgeryId: body.surgeryId,
      remitoId: body.remitoId,
      items: body.items,
      createdById: ctx.actorUserId,
      metadata: body.metadata ?? null,
    });

    return created(consumo);
  } catch (error) {
    return errorResponse(error);
  }
}

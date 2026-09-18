import { createAuditEvent } from "@/lib/audit";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import {
  availabilitySourceEnabledForCompany,
  hasAvailabilityCapabilityForCompany,
} from "@/lib/permissions/availability-request.server";
import prisma from "@/lib/prisma";
import {
  correctMaterialAvailability,
  getMaterialAvailability,
  type MaterialAvailabilityEffects,
} from "@/lib/services/material-availability.service";
import { createAvailabilitySeguimientoEvent } from "@/lib/services/seguimiento.service";
import {
  validateAvailabilityId,
  validateAvailabilityIdempotencyKey,
  validateCorrectMaterialAvailabilityBody,
  validateMaterialAvailabilityReadQuery,
} from "@/lib/validators/availability-request.validator";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Authorization",
};

function privateResponse(response: Response): Response {
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

const effects: MaterialAvailabilityEffects = {
  async writeAudit(input) {
    return createAuditEvent({
      prisma: input.tx,
      companyId: input.companyId,
      userId: input.actorUserId,
      entityType: "Surgery",
      entityId: input.surgeryId,
      action: input.action,
      module: "availability",
      oldValue: { date: input.oldDate },
      newValue: { date: input.newDate },
      metadata: { reason: input.reason, correlationId: input.correlationId },
    });
  },
  writeTrace: createAvailabilitySeguimientoEvent,
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId: routeSurgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    if (!availabilitySourceEnabledForCompany(ctx.companyId)) {
      throw notFound("Surgery not found", "availability_surgery_not_found");
    }
    const surgeryId = validateAvailabilityId(routeSurgeryId);
    validateMaterialAvailabilityReadQuery(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );

    return privateResponse(
      ok(
        await getMaterialAvailability(
          { prisma },
          { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
          surgeryId
        )
      )
    );
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId: routeSurgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    if (
      !(await hasAvailabilityCapabilityForCompany(
        prisma,
        ctx.companyId,
        ctx.actorUserId,
        "availability.date.correct"
      ))
    ) {
      throw forbidden(
        "Material availability correction is not authorized",
        "availability_forbidden"
      );
    }

    const surgeryId = validateAvailabilityId(routeSurgeryId);
    const idempotencyKey = validateAvailabilityIdempotencyKey(
      request.headers.get("Idempotency-Key")
    );
    const body = validateCorrectMaterialAvailabilityBody(await parseJsonBody(request));
    return ok(
      await correctMaterialAvailability(
        { prisma, effects },
        { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
        { surgeryId, ...body, idempotencyKey, origin: "expediente" }
      )
    );
  } catch (error) {
    return errorResponse(error);
  }
}

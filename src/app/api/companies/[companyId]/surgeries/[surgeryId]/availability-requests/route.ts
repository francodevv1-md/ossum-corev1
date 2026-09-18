import { createAuditEvent } from "@/lib/audit";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest, forbidden } from "@/lib/api/errors";
import { created, errorResponse } from "@/lib/api/responses";
import { hasAvailabilityCapabilityForCompany } from "@/lib/permissions/availability-request.server";
import prisma from "@/lib/prisma";
import {
  emitAvailabilityActionableNotifications,
  emitAvailabilityRequesterCompletionNotification,
} from "@/lib/services/internal-notifications.service";
import {
  createAvailabilityRequest,
  type AvailabilityRequestEffects,
} from "@/lib/services/availability-request.service";
import { createAvailabilitySeguimientoEvent } from "@/lib/services/seguimiento.service";
import {
  validateAvailabilityId,
  validateAvailabilityIdempotencyKey,
  validateCreateAvailabilityRequestBody,
} from "@/lib/validators/availability-request.validator";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

const effects: AvailabilityRequestEffects = {
  async writeAudit(input) {
    return createAuditEvent({
      prisma: input.tx,
      companyId: input.companyId,
      userId: input.actorUserId,
      entityType: "AvailabilityRequest",
      entityId: input.requestId,
      action: input.action,
      module: "availability",
      oldValue: input.oldValue,
      newValue: input.newValue,
      metadata: input.metadata,
    });
  },
  writeTrace: createAvailabilitySeguimientoEvent,
  emitActionableNotifications: emitAvailabilityActionableNotifications,
  emitRequesterCompletionNotification: emitAvailabilityRequesterCompletionNotification,
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId: routeSurgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    if (!(await hasAvailabilityCapabilityForCompany(
      prisma, ctx.companyId, ctx.actorUserId, "availability.request.create"
    ))) {
      throw forbidden(
        "Availability request creation is not authorized",
        "availability_forbidden"
      );
    }

    const surgeryId = validateAvailabilityId(routeSurgeryId);
    const idempotencyKey = validateAvailabilityIdempotencyKey(
      request.headers.get("Idempotency-Key")
    );
    validateCreateAvailabilityRequestBody(await parseJsonBody(request));

    const availabilityRequest = await createAvailabilityRequest(
      { prisma, effects },
      { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
      { surgeryId, idempotencyKey }
    );
    return created(availabilityRequest);
  } catch (error) {
    return errorResponse(error);
  }
}

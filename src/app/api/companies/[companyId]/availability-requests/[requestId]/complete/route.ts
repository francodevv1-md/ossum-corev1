import { createAuditEvent } from "@/lib/audit";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest, notFound } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import { availabilitySourceEnabledForCompany } from "@/lib/permissions/availability-request.server";
import prisma from "@/lib/prisma";
import {
  completeAvailabilityRequest,
  type AvailabilityRequestEffects,
} from "@/lib/services/availability-request.service";
import {
  emitAvailabilityActionableNotifications,
  emitAvailabilityRequesterCompletionNotification,
} from "@/lib/services/internal-notifications.service";
import { createAvailabilitySeguimientoEvent } from "@/lib/services/seguimiento.service";
import {
  validateAvailabilityId,
  validateAvailabilityIdempotencyKey,
  validateCompleteAvailabilityRequestBody,
} from "@/lib/validators/availability-request.validator";

type RouteContext = {
  params: Promise<{ companyId: string; requestId: string }>;
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
    const { companyId, requestId: routeRequestId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    if (!availabilitySourceEnabledForCompany(ctx.companyId)) {
      throw notFound(
        "Availability request not found",
        "availability_request_not_found"
      );
    }
    const requestId = validateAvailabilityId(routeRequestId);
    const idempotencyKey = validateAvailabilityIdempotencyKey(
      request.headers.get("Idempotency-Key")
    );
    const body = validateCompleteAvailabilityRequestBody(await parseJsonBody(request));

    const availabilityRequest = await completeAvailabilityRequest(
      { prisma, effects },
      { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
      { requestId, date: body.date, idempotencyKey }
    );
    return ok(availabilityRequest);
  } catch (error) {
    return errorResponse(error);
  }
}

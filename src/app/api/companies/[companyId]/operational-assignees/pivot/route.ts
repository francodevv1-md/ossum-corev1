import { createAuditEvent } from "@/lib/audit";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest, forbidden } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import { hasAvailabilityCapabilityForCompany } from "@/lib/permissions/availability-request.server";
import prisma from "@/lib/prisma";
import {
  reassignPivot,
  type CompanyOperationalAssigneeEffects,
} from "@/lib/services/company-operational-assignee.service";
import { emitAvailabilityPivotTransferNotifications } from "@/lib/services/internal-notifications.service";
import { createAvailabilitySeguimientoEvent } from "@/lib/services/seguimiento.service";
import {
  validateAvailabilityIdempotencyKey,
  validateSetAvailabilityPivotBody,
} from "@/lib/validators/availability-request.validator";

type RouteContext = { params: Promise<{ companyId: string }> };

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

const effects: CompanyOperationalAssigneeEffects = {
  emitTransferNotifications: emitAvailabilityPivotTransferNotifications,
  async writeCompanyAudit(input) {
    return createAuditEvent({
      prisma: input.tx,
      companyId: input.companyId,
      userId: input.actorUserId,
      entityType: "Company",
      entityId: input.companyId,
      action: input.action,
      module: "availability",
      oldValue: {
        pivotUserId: input.formerPivotUserId,
        version: input.oldVersion,
      },
      newValue: {
        pivotUserId: input.newPivotUserId,
        version: input.newVersion,
      },
      metadata: {
        reason: input.reason,
        affectedOpenRequestCount: input.affectedOpenRequestCount,
        correlationId: input.correlationId,
      },
    });
  },
  async writeRequestAudit(input) {
    return createAuditEvent({
      prisma: input.tx,
      companyId: input.companyId,
      userId: input.actorUserId,
      entityType: "AvailabilityRequest",
      entityId: input.requestId,
      action: input.action,
      module: "availability",
      oldValue: { pivotUserId: input.formerPivotUserId },
      newValue: { pivotUserId: input.newPivotUserId },
      metadata: { surgeryId: input.surgeryId, correlationId: input.correlationId },
    });
  },
  writeRequestTrace: createAvailabilitySeguimientoEvent,
};

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    if (!(await hasAvailabilityCapabilityForCompany(
      prisma, ctx.companyId, ctx.actorUserId, "availability.pivot.configure"
    ))) {
      throw forbidden(
        "PÍVOT configuration is not authorized",
        "availability_forbidden"
      );
    }

    const idempotencyKey = validateAvailabilityIdempotencyKey(
      request.headers.get("Idempotency-Key")
    );
    const body = validateSetAvailabilityPivotBody(await parseJsonBody(request));
    return ok(
      await reassignPivot(
        { prisma, effects },
        { companyId: ctx.companyId, actorUserId: ctx.actorUserId },
        { ...body, idempotencyKey }
      )
    );
  } catch (error) {
    return errorResponse(error);
  }
}

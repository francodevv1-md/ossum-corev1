import { badRequest } from "../../../../../lib/api/errors";
import { getActorUserIdFromRequest, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { getDateParam, getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import {
  listAuditEventsByCompany,
  listAuditEventsByEntity,
} from "../../../../../lib/services/audit-event.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const actorUserId = getActorUserIdFromRequest(request);
    const searchParams = new URL(request.url).searchParams;
    const entityType = getStringParam(searchParams, "entityType");
    const entityId = getStringParam(searchParams, "entityId");
    const take = getNonNegativeIntegerParam(searchParams, "take");

    await requireCompanyReadAccess(prisma, companyId, actorUserId);

    if ((entityType && !entityId) || (!entityType && entityId)) {
      throw badRequest("entityType and entityId must be provided together");
    }

    if (entityType && entityId) {
      const events = await listAuditEventsByEntity(prisma, companyId, entityType, entityId, {
        take,
      });

      return ok(events);
    }

    const events = await listAuditEventsByCompany(prisma, companyId, {
      module: getStringParam(searchParams, "module"),
      userId: getStringParam(searchParams, "userId"),
      from: getDateParam(searchParams, "from"),
      to: getDateParam(searchParams, "to"),
      take,
    });

    return ok(events);
  } catch (error) {
    return errorResponse(error);
  }
}

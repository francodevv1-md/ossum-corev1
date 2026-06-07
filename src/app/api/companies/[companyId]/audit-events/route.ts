import { badRequest } from "../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import {
  listAuditEventsByCompany,
  listAuditEventsByEntity,
} from "../../../../../lib/services/audit-event.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

function parseOptionalDate(value: string | null, name: string) {
  if (value === null) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`${name} must be a valid date`);
  }

  return parsed;
}

function parseOptionalNumber(value: string | null, name: string) {
  if (value === null) return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw badRequest(`${name} must be a non-negative integer`);
  }

  return parsed;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const searchParams = new URL(request.url).searchParams;
    const entityType = searchParams.get("entityType") ?? undefined;
    const entityId = searchParams.get("entityId") ?? undefined;
    const take = parseOptionalNumber(searchParams.get("take"), "take");

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
      module: searchParams.get("module") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      from: parseOptionalDate(searchParams.get("from"), "from"),
      to: parseOptionalDate(searchParams.get("to"), "to"),
      take,
    });

    return ok(events);
  } catch (error) {
    return errorResponse(error);
  }
}

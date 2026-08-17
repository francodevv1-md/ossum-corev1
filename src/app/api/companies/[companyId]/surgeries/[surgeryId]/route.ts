import { badRequest, notFound } from "../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getSurgeryById, updateSurgery } from "../../../../../../lib/services/surgery.service";
import { parseIsoTimestamp, validateUpdateSurgeryInput } from "../../../../../../lib/validators/surgery.validator";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

const SURGERY_MUTATION_ROLES = ["admin", "manager", "coordinator", "owner", "super_admin"] as const;

async function parseManagementPatch(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Invalid surgery management body", "invalid_surgery_management_body");
  }

  const record = body as Record<string, unknown>;
  const allowedFields = new Set(["surgeryDate", "priority", "materialShippingDate", "materialTransport"]);
  if (Object.keys(record).some((key) => !allowedFields.has(key))) {
    throw badRequest("Unsupported surgery management field", "unsupported_surgery_management_field");
  }
  if (
    record.surgeryDate === undefined &&
    record.priority === undefined &&
    record.materialShippingDate === undefined &&
    record.materialTransport === undefined
  ) {
    throw badRequest("At least one management field is required", "empty_surgery_management_patch");
  }

  let surgeryDate: Date | null | undefined;
  if (record.surgeryDate === null) {
    surgeryDate = null;
  } else if (record.surgeryDate !== undefined) {
    surgeryDate = parseIsoTimestamp(record.surgeryDate, "surgeryDate");
  }

  if (record.priority !== undefined && record.priority !== "normal" && record.priority !== "urgent") {
    throw badRequest("Invalid surgery priority", "invalid_surgery_priority");
  }

  let materialShippingDate: Date | null | undefined;
  if (record.materialShippingDate === null) {
    materialShippingDate = null;
  } else if (record.materialShippingDate !== undefined) {
    if (typeof record.materialShippingDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.materialShippingDate)) {
      throw badRequest("materialShippingDate must use YYYY-MM-DD", "invalid_date_field");
    }
    materialShippingDate = new Date(`${record.materialShippingDate}T00:00:00.000Z`);
    if (
      Number.isNaN(materialShippingDate.getTime()) ||
      materialShippingDate.toISOString().slice(0, 10) !== record.materialShippingDate
    ) {
      throw badRequest("materialShippingDate must be a valid calendar date", "invalid_date_field");
    }
  }

  return validateUpdateSurgeryInput({
    ...(record.surgeryDate !== undefined ? { surgeryDate } : {}),
    ...(record.priority !== undefined ? { priority: record.priority as "normal" | "urgent" } : {}),
    ...(record.materialShippingDate !== undefined ? { materialShippingDate } : {}),
    ...(record.materialTransport !== undefined ? { materialTransport: record.materialTransport as string | null } : {}),
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const surgery = await getSurgeryById(prisma, ctx.companyId, surgeryId);

    if (!surgery) {
      throw notFound("Surgery not found", "surgery_not_found");
    }

    return ok(surgery);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, SURGERY_MUTATION_ROLES);
    const data = await parseManagementPatch(request);

    return ok(await updateSurgery(
      prisma,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        source: "coordination-management",
        module: "surgery",
      },
      surgeryId,
      data
    ));
  } catch (error) {
    return errorResponse(error);
  }
}

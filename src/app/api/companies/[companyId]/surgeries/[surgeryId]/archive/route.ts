import { badRequest } from "../../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { archiveSurgery } from "../../../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

const SURGERY_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw badRequest(`${fieldName} must be a string`, "invalid_field");
  }

  return value;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, SURGERY_MUTATION_ROLES);

    const body = await parseJsonBody(request);
    const surgery = await archiveSurgery(
      prisma,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        source: "cirugias-ui:delete-surgery-dialog",
        module: "surgery",
      },
      surgeryId,
      {
        confirmationText: parseRequiredString(body.confirmationText, "confirmationText"),
        reason: parseRequiredString(body.reason, "reason"),
      }
    );

    return ok({ surgery });
  } catch (error) {
    return errorResponse(error);
  }
}

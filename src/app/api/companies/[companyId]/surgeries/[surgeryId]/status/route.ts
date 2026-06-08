import { badRequest } from "../../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import { validateSurgeryStatusPatchBody } from "../../../../../../../lib/api/validators/surgery-status-route.validator";
import prisma from "../../../../../../../lib/prisma";
import { updateSurgeryStatus } from "../../../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

const SURGERY_STATUS_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") {
      throw error;
    }

    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    const body = validateSurgeryStatusPatchBody(await parseJsonBody(request));

    requireCompanyMutationAccess(ctx, SURGERY_STATUS_MUTATION_ROLES);

    const result = await updateSurgeryStatus(
      prisma,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        source: body.source,
        module: "surgery",
      },
      surgeryId,
      body.status
    );

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

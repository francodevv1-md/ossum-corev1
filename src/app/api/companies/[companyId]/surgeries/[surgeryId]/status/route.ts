import { badRequest } from "../../../../../../../lib/api/errors";
import { getActorUserIdFromRequest, requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import { validateSurgeryStatusPatchBody } from "../../../../../../../lib/api/validators/surgery-status-route.validator";
import prisma from "../../../../../../../lib/prisma";
import { updateSurgeryStatus } from "../../../../../../../lib/services/surgery.service";

// Franco approved GPT-027F.5A-06B2-B for DEV/internal mutation route before real Auth.

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
    const actorUserId = getActorUserIdFromRequest(request);
    const body = validateSurgeryStatusPatchBody(await parseJsonBody(request));

    await requireCompanyMutationAccess(
      prisma,
      companyId,
      actorUserId,
      SURGERY_STATUS_MUTATION_ROLES
    );

    const result = await updateSurgeryStatus(
      prisma,
      {
        companyId,
        actorUserId,
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

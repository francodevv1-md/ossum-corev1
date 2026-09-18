import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { executeScheduledSurgery } from "../../../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

const SURGERY_EXECUTION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, SURGERY_EXECUTION_ROLES);

    const surgery = await executeScheduledSurgery(
      prisma,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        source: "cirugias-ui:execute",
        module: "surgery",
      },
      surgeryId
    );

    return ok(surgery);
  } catch (error) {
    return errorResponse(error);
  }
}

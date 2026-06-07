import { notFound } from "../../../../../../lib/api/errors";
import { getActorUserIdFromRequest, requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getSurgeryById } from "../../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const actorUserId = getActorUserIdFromRequest(request);

    await requireCompanyReadAccess(prisma, companyId, actorUserId);

    const surgery = await getSurgeryById(prisma, companyId, surgeryId);

    if (!surgery) {
      throw notFound("Surgery not found", "surgery_not_found");
    }

    return ok(surgery);
  } catch (error) {
    return errorResponse(error);
  }
}

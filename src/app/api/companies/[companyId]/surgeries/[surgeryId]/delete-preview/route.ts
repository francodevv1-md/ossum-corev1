import { notFound } from "../../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { getSurgeryDeletionPreview } from "../../../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const preview = await getSurgeryDeletionPreview(
      prisma,
      { companyId: ctx.companyId },
      surgeryId
    );

    if (!preview) {
      throw notFound("Surgery not found", "surgery_not_found");
    }

    return ok(preview);
  } catch (error) {
    return errorResponse(error);
  }
}

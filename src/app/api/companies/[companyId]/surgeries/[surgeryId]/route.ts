import { notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getSurgeryById } from "../../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params;
    const surgery = await getSurgeryById(prisma, companyId, surgeryId);

    if (!surgery) {
      throw notFound("Surgery not found", "surgery_not_found");
    }

    return ok(surgery);
  } catch (error) {
    return errorResponse(error);
  }
}

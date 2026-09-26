import { getApiAuthContext } from "@/lib/api/auth-context";
import { notFound } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getUnitEvidence, resolveUnitIdByCode } from "@/lib/services/cajas-operational.service";

type Context = { params: Promise<{ companyId: string; unitId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { companyId, unitId } = await params;
    const ctx = await getApiAuthContext(_request, companyId);
    requireCompanyReadAccess(ctx);

    // unitId param may be the internal code or the raw DB ID
    const resolvedId = await resolveUnitIdByCode(prisma, ctx.companyId, unitId);
    if (!resolvedId) throw notFound("Physical unit not found", "unit_not_found");

    return ok(await getUnitEvidence(prisma, ctx.companyId, resolvedId));
  } catch (error) { return errorResponse(error); }
}

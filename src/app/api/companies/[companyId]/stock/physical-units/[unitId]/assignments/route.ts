import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { listPhysicalUnitAssignments } from "@/lib/services/cajas-assignment.service";

type Context = { params: Promise<{ companyId: string; unitId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, unitId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const assignments = await listPhysicalUnitAssignments(prisma, ctx.companyId, unitId);
    return ok(assignments);
  } catch (error) {
    return errorResponse(error);
  }
}

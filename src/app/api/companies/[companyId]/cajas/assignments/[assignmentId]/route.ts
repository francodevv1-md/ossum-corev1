import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { getBoxAssignment } from "@/lib/services/cajas-assignment.service";

type Context = { params: Promise<{ companyId: string; assignmentId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, assignmentId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const assignment = await getBoxAssignment(prisma, ctx.companyId, assignmentId);
    return ok(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import {
  assignBoxToSurgery,
  listSurgeryBoxAssignments,
} from "@/lib/services/cajas-assignment.service";
import { cajasAssignmentCreateSchema } from "@/lib/validators/cajas-assignment";

type Context = { params: Promise<{ companyId: string; surgeryId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const assignments = await listSurgeryBoxAssignments(prisma, ctx.companyId, surgeryId);
    return ok(assignments);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const input = cajasAssignmentCreateSchema.parse(body);
    const assignment = await assignBoxToSurgery(
      prisma,
      ctx.companyId,
      surgeryId,
      input,
      ctx.actorUserId,
    );
    return created(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}

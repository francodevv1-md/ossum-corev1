import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import prisma from "@/lib/prisma";
import { endBoxAssignment } from "@/lib/services/cajas-assignment.service";
import { cajasAssignmentEndSchema } from "@/lib/validators/cajas-assignment";

type Context = { params: Promise<{ companyId: string; assignmentId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, assignmentId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireArticleMutationAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const input = cajasAssignmentEndSchema.parse(body);
    const updated = await endBoxAssignment(
      prisma,
      ctx.companyId,
      assignmentId,
      input,
      ctx.actorUserId,
    );
    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

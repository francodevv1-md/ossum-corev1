import { badRequest } from "../../../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../../../lib/api/auth-context";
import { requireSeguimientoEventMutationAccess } from "../../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../../lib/api/responses";
import prisma from "../../../../../../../../lib/prisma";
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery";
import { editSeguimientoEntry } from "../../../../../../../../lib/services/seguimiento.service";
import { validateSeguimientoEditBody } from "../../../../../../../../lib/validators/seguimiento.validator";

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string; entryId: string }>;
};

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
    const { companyId, surgeryId, entryId } = await params;
    const ctx = await getApiAuthContext(request, companyId);

    requireSeguimientoEventMutationAccess(ctx);

    const body = validateSeguimientoEditBody(await parseJsonBody(request), {
      companyId: ctx.companyId,
    });

    const resolvedSurgery = await resolveCompanySurgery(ctx.companyId, surgeryId);
    const displayName =
      [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") ||
      ctx.user.email;

    const entry = await editSeguimientoEntry(prisma, entryId, ctx.companyId, {
      surgeryId: resolvedSurgery.id,
      actor: { userId: ctx.actorUserId, displayName },
      edits: body,
    });

    return ok(entry);
  } catch (error) {
    console.error(
      "[SEGUIMIENTO-PATCH] Error:",
      error instanceof Error ? error.message : String(error)
    );
    return errorResponse(error);
  }
}

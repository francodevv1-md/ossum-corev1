import { badRequest } from "../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import {
  getSurgeryViewPreferences,
  saveSurgeryViewPreferences,
} from "../../../../../../lib/services/surgery-view-preferences.service";
import { validateUpsertSurgeryViewPreferencesBody } from "../../../../../../lib/validators/surgery-view-preferences.validator";

type RouteContext = {
  params: Promise<{ companyId: string }>;
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

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);

    requireCompanyReadAccess(ctx);

    const preferences = await getSurgeryViewPreferences(prisma, {
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
    });

    return ok(preferences);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    const body = validateUpsertSurgeryViewPreferencesBody(await parseJsonBody(request));

    requireCompanyReadAccess(ctx);

    const preferences = await saveSurgeryViewPreferences(
      prisma,
      {
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
      },
      body.preferences
    );

    return ok(preferences);
  } catch (error) {
    return errorResponse(error);
  }
}

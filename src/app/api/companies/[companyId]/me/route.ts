import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { notFound } from "../../../../../lib/api/errors";
import { requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const access = await prisma.userCompanyAccess.findFirst({
      where: {
        userId: ctx.actorUserId,
        companyId: ctx.companyId,
        isActive: true,
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!access?.user || !access.company) {
      throw notFound("Current user context not found", "current_user_context_not_found");
    }

    const firstName = access.user.firstName?.trim() ?? "";
    const lastName = access.user.lastName?.trim() ?? "";
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || access.user.email;

    return ok({
      user: {
        id: access.user.id,
        email: access.user.email,
        firstName: access.user.firstName,
        lastName: access.user.lastName,
        displayName,
      },
      access: {
        role: access.role,
      },
      activeCompany: {
        id: access.company.id,
        name: access.company.name,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

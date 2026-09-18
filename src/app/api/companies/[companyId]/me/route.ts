import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import { availabilitySourceEnabledForCompany } from "../../../../../lib/permissions/availability-request.server";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

function perfNow(): number {
  return performance.now();
}

function logPerf(label: string, startedAt: number, outcome: string): void {
  console.info(label, {
    durationMs: Math.round((perfNow() - startedAt) * 10) / 10,
    outcome,
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  const totalStartedAt = perfNow();
  let totalOutcome = "error";

  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const firstName = ctx.user.firstName?.trim() ?? "";
    const lastName = ctx.user.lastName?.trim() ?? "";
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || ctx.user.email;

    totalOutcome = "success";
    return ok({
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        firstName: ctx.user.firstName,
        lastName: ctx.user.lastName,
        displayName,
      },
      access: {
        role: ctx.role,
      },
      activeCompany: {
        id: ctx.activeCompany.id,
        name: ctx.activeCompany.name,
      },
      features: {
        availabilityRequests: availabilitySourceEnabledForCompany(ctx.companyId),
      },
    });
  } catch (error) {
    totalOutcome = "error";
    return errorResponse(error);
  } finally {
    logPerf("[PERF][me] total", totalStartedAt, totalOutcome);
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok, created } from "@/lib/api/responses";
import {
  listPersonalCalendarEvents,
  createPersonalCalendarEvent,
} from "@/lib/services/personal-calendar.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const includeCancelled = searchParams.get("includeCancelled") === "1" || searchParams.get("includeCancelled") === "true";

    const events = await listPersonalCalendarEvents({
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      from,
      to,
      includeCancelled,
    });

    return ok({ events });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const body = await request.json();

    const event = await createPersonalCalendarEvent({
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      data: body,
    });

    return created({ event });
  } catch (error) {
    return errorResponse(error);
  }
}

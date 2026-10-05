import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import {
  getPersonalCalendarEventById,
  updatePersonalCalendarEvent,
  cancelPersonalCalendarEvent,
} from "@/lib/services/personal-calendar.service";

type RouteContext = {
  params: Promise<{ companyId: string; eventId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, eventId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const event = await getPersonalCalendarEventById({
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      eventId,
    });

    return ok({ event });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, eventId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const body = await request.json();

    const event = await updatePersonalCalendarEvent({
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      eventId,
      data: body,
    });

    return ok({ event });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, eventId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const event = await cancelPersonalCalendarEvent({
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      eventId,
    });

    return ok({ event, message: "Evento cancelado exitosamente" });
  } catch (error) {
    return errorResponse(error);
  }
}

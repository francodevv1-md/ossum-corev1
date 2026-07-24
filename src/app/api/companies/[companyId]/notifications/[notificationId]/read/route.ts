import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { markInternalNotificationRead } from "@/lib/services/internal-notifications.service"

type RouteContext = {
  params: Promise<{ companyId: string; notificationId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, notificationId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const notification = await markInternalNotificationRead(prisma, {
      companyId: ctx.companyId,
      recipientUserId: ctx.actorUserId,
      notificationId,
    })

    return ok(notification)
  } catch (error) {
    return errorResponse(error)
  }
}

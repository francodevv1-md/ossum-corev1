import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { markAllInternalNotificationsRead } from "@/lib/services/internal-notifications.service"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const result = await markAllInternalNotificationsRead(prisma, {
      companyId: ctx.companyId,
      recipientUserId: ctx.actorUserId,
    })

    return ok({
      updatedCount: result.updatedCount,
      readAt: result.readAt.toISOString(),
    })
  } catch (error) {
    return errorResponse(error)
  }
}

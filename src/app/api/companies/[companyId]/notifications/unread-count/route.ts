import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getUnreadInternalNotificationsCount } from "@/lib/services/internal-notifications.service"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const categoryCounts = await getUnreadInternalNotificationsCount(
      prisma,
      ctx.companyId,
      ctx.actorUserId
    )

    return ok({ unreadCount: categoryCounts.all, categoryCounts })
  } catch (error) {
    console.error("[api][notifications][unread-count] failed", {
      message: error instanceof Error ? error.message : String(error),
    })

    return errorResponse(error)
  }
}

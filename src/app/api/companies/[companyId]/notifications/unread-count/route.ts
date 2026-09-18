import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getUnreadInternalNotificationsCount } from "@/lib/services/internal-notifications.service"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

const ROUTE_TAG = "[api][notifications][unread-count]"

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    console.info(`${ROUTE_TAG} hit`, { companyId, method: request.method })

    const ctx = await getApiAuthContext(request, companyId)
    console.info(`${ROUTE_TAG} auth resolved`, {
      companyId,
      actorUserId: ctx.actorUserId,
      role: ctx.role,
      source: ctx.source,
    })

    requireCompanyReadAccess(ctx)

    console.info(`${ROUTE_TAG} before service`, {
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
    })

    const categoryCounts = await getUnreadInternalNotificationsCount(
      prisma,
      ctx.companyId,
      ctx.actorUserId
    )

    console.info(`${ROUTE_TAG} after service`, {
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      unreadCount: categoryCounts.all,
      categoryCounts,
    })

    return ok({ unreadCount: categoryCounts.all, categoryCounts })
  } catch (error) {
    console.error(`${ROUTE_TAG} failed`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return errorResponse(error)
  }
}

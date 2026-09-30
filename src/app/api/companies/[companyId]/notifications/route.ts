import { getApiAuthContext } from "@/lib/api/auth-context"
import { badRequest } from "@/lib/api/errors"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { getNonNegativeIntegerParam } from "@/lib/api/query"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import {
  listInternalNotifications,
  type InternalNotificationCategory,
} from "@/lib/services/internal-notifications.service"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

const ROUTE_TAG = "[api][notifications][list]"
const VALID_CATEGORIES = new Set<InternalNotificationCategory>([
  "all",
  "mention",
  "operational",
  "cirugias",
  "logistica",
  "stock",
  "consumos",
  "comparativa",
  "cobros",
])

function getCategoryParam(searchParams: URLSearchParams): InternalNotificationCategory {
  const category = searchParams.get("category") ?? "all"
  if (!VALID_CATEGORIES.has(category as InternalNotificationCategory)) {
    throw badRequest("category must be all, mention, operational, cirugias, logistica, stock, consumos, comparativa, or cobros")
  }

  return category as InternalNotificationCategory
}

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

    const searchParams = new URL(request.url).searchParams
    const take = getNonNegativeIntegerParam(searchParams, "take") ?? 20
    const unreadOnly = searchParams.get("unreadOnly") === "1"
    const category = getCategoryParam(searchParams)

    console.info(`${ROUTE_TAG} before service`, {
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      take,
      unreadOnly,
      category,
    })

    const result = await listInternalNotifications(prisma, {
      companyId: ctx.companyId,
      recipientUserId: ctx.actorUserId,
      take,
      unreadOnly,
      category,
    })

    console.info(`${ROUTE_TAG} after service`, {
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      itemsCount: result.items.length,
      unreadCount: result.unreadCount,
    })

    return ok(result)
  } catch (error) {
    console.error(`${ROUTE_TAG} failed`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return errorResponse(error)
  }
}

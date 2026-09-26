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

const VALID_CATEGORIES = new Set<InternalNotificationCategory>(["all", "mention", "operational"])

function getCategoryParam(searchParams: URLSearchParams): InternalNotificationCategory {
  const category = searchParams.get("category") ?? "all"
  if (!VALID_CATEGORIES.has(category as InternalNotificationCategory)) {
    throw badRequest("category must be all, mention, or operational")
  }

  return category as InternalNotificationCategory
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const searchParams = new URL(request.url).searchParams
    const take = getNonNegativeIntegerParam(searchParams, "take") ?? 20
    const unreadOnly = searchParams.get("unreadOnly") === "1"
    const category = getCategoryParam(searchParams)

    const result = await listInternalNotifications(prisma, {
      companyId: ctx.companyId,
      recipientUserId: ctx.actorUserId,
      take,
      unreadOnly,
      category,
    })

    return ok(result)
  } catch (error) {
    console.error("[api][notifications][list] failed", {
      message: error instanceof Error ? error.message : String(error),
    })

    return errorResponse(error)
  }
}

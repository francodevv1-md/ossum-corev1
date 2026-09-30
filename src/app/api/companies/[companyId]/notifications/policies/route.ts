import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import {
  getCompanyNotificationPolicies,
  getUserNotificationPreferences,
  NOTIFICATION_TYPE_CATALOG,
  normalizeRole,
} from "@/lib/services/internal-notifications.service"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const normalizedRole = normalizeRole(ctx.role)
    const isAdmin = normalizedRole === "admin"

    const [rolePolicies, userPreferences] = await Promise.all([
      isAdmin ? getCompanyNotificationPolicies(prisma, ctx.companyId) : Promise.resolve([]),
      getUserNotificationPreferences(prisma, {
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        userRole: ctx.role,
      }),
    ])

    return ok({
      isAdmin,
      userRole: normalizedRole,
      rolePolicies,
      userPreferences,
      catalog: Object.values(NOTIFICATION_TYPE_CATALOG),
    })
  } catch (error) {
    return errorResponse(error)
  }
}

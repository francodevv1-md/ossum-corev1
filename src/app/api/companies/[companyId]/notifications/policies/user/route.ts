import { getApiAuthContext } from "@/lib/api/auth-context"
import { badRequest } from "@/lib/api/errors"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { updateUserNotificationPreference } from "@/lib/services/internal-notifications.service"
import { InternalNotificationType } from "@prisma/client"
import { z } from "zod"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

const updateUserPrefSchema = z.object({
  notificationType: z.nativeEnum(InternalNotificationType),
  inAppMuted: z.boolean(),
})

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const json = await request.json().catch(() => null)
    const parsed = updateUserPrefSchema.safeParse(json)
    if (!parsed.success) {
      throw badRequest("Invalid payload", "validation_failed")
    }

    const preference = await updateUserNotificationPreference(prisma, {
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      userRole: ctx.role,
      notificationType: parsed.data.notificationType,
      inAppMuted: parsed.data.inAppMuted,
    })

    return ok({ success: true, preference })
  } catch (error) {
    return errorResponse(error)
  }
}

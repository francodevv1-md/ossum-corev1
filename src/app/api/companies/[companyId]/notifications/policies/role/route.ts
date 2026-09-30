import { getApiAuthContext } from "@/lib/api/auth-context"
import { badRequest, forbidden } from "@/lib/api/errors"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import {
  normalizeRole,
  updateNotificationRolePolicy,
} from "@/lib/services/internal-notifications.service"
import { InternalNotificationType } from "@prisma/client"
import { z } from "zod"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

const updateRolePolicySchema = z.object({
  role: z.string().min(1),
  notificationType: z.nativeEnum(InternalNotificationType),
  inAppEnabled: z.boolean(),
})

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)

    const normalizedRole = normalizeRole(ctx.role)
    if (normalizedRole !== "admin") {
      throw forbidden("Only administrators can configure company role notification policies", "admin_role_required")
    }

    const json = await request.json().catch(() => null)
    const parsed = updateRolePolicySchema.safeParse(json)
    if (!parsed.success) {
      throw badRequest("Invalid payload", "validation_failed")
    }

    const policy = await updateNotificationRolePolicy(prisma, {
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      role: parsed.data.role,
      notificationType: parsed.data.notificationType,
      inAppEnabled: parsed.data.inAppEnabled,
    })

    return ok({ success: true, policy })
  } catch (error) {
    return errorResponse(error)
  }
}

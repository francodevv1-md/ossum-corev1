import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyAdmin } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { createAuditEvent } from "@/lib/audit"
import prisma from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ companyId: string; membershipId: string }>
}

const ROUTE_TAG = "[api][companies][memberships][reset-password]"

function generateDevTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
  let pass = "Ossum#"
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, membershipId } = await params
    const auth = await getApiAuthContext(request, companyId)
    requireCompanyAdmin(auth)

    const access = await prisma.userCompanyAccess.findFirst({
      where: { id: membershipId, companyId },
      include: { user: true },
    })

    if (!access) {
      return errorResponse(new Error("Membresía no encontrada"))
    }

    const tempPassword = generateDevTempPassword()

    await createAuditEvent({
      prisma,
      companyId,
      userId: auth.actorUserId,
      action: "PASSWORD_RESET_REQUESTED",
      module: "USERS_ROLES",
      entityType: "UserCompanyAccess",
      entityId: membershipId,
      metadata: {
        targetUserId: access.userId,
        targetEmail: access.user.email,
      },
    })

    return ok({
      success: true,
      message: `Enlace de restablecimiento generado para ${access.user.email}`,
      tempPassword,
      userEmail: access.user.email,
      userName: `${access.user.firstName} ${access.user.lastName}`,
    })
  } catch (error) {
    console.error(`${ROUTE_TAG} POST failed`, {
      message: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error)
  }
}

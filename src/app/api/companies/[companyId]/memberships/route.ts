import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyAdmin, requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import {
  createCompanyMembership,
  listCompanyMemberships,
} from "@/lib/services/memberships.service"
import { isRoleAdmin } from "@/lib/permissions/capabilities"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

const ROUTE_TAG = "[api][companies][memberships]"

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const auth = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(auth)

    const isActorAdmin = isRoleAdmin(auth.role)
    const result = await listCompanyMemberships(
      prisma,
      auth.companyId,
      auth.actorUserId,
      isActorAdmin
    )

    return ok({
      items: result.items,
      totalAdmins: result.totalAdmins,
      canManage: isActorAdmin,
    })
  } catch (error) {
    console.error(`${ROUTE_TAG} GET failed`, {
      message: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const auth = await getApiAuthContext(request, companyId)
    requireCompanyAdmin(auth)

    const body = await request.json()
    const { email, firstName, lastName, role, phone } = body

    if (!email || !firstName || !lastName || !role) {
      return errorResponse(new Error("Email, nombre, apellido y rol son requeridos"))
    }

    const created = await createCompanyMembership(prisma, auth.companyId, auth.actorUserId, {
      email,
      firstName,
      lastName,
      role,
      phone,
    })

    return ok(created)
  } catch (error) {
    console.error(`${ROUTE_TAG} POST failed`, {
      message: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error)
  }
}

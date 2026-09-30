import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyAdmin } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import {
  deleteCompanyMembership,
  updateCompanyMembership,
} from "@/lib/services/memberships.service"

type RouteContext = {
  params: Promise<{ companyId: string; membershipId: string }>
}

const ROUTE_TAG = "[api][companies][memberships][membershipId]"

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, membershipId } = await params
    const auth = await getApiAuthContext(request, companyId)
    requireCompanyAdmin(auth)

    const body = await request.json()
    const { role, isActive, firstName, lastName, phone } = body

    const updated = await updateCompanyMembership(
      prisma,
      auth.companyId,
      auth.actorUserId,
      membershipId,
      { role, isActive, firstName, lastName, phone }
    )

    return ok(updated)
  } catch (error) {
    console.error(`${ROUTE_TAG} PATCH failed`, {
      message: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, membershipId } = await params
    const auth = await getApiAuthContext(request, companyId)
    requireCompanyAdmin(auth)

    const result = await deleteCompanyMembership(
      prisma,
      auth.companyId,
      auth.actorUserId,
      membershipId
    )

    return ok(result)
  } catch (error) {
    console.error(`${ROUTE_TAG} DELETE failed`, {
      message: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error)
  }
}

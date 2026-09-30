import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getSurgeryComparativa } from "@/lib/services/comparativa.service"

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const comparativa = await getSurgeryComparativa({
      companyId: ctx.companyId,
      surgeryId,
      prisma,
    })

    return ok(comparativa)
  } catch (error) {
    return errorResponse(error)
  }
}

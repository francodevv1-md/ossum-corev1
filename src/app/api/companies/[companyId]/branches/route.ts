import { getApiAuthContext } from "../../../../../lib/api/auth-context"
import { requireCompanyReadAccess } from "../../../../../lib/api/guards"
import { errorResponse, ok } from "../../../../../lib/api/responses"
import prisma from "../../../../../lib/prisma"
import { listBranchesByCompany } from "../../../../../lib/services/branch.service"

type RouteContext = { params: Promise<{ companyId: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const context = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(context)
    return ok(await listBranchesByCompany(prisma, context.companyId))
  } catch (error) {
    return errorResponse(error)
  }
}

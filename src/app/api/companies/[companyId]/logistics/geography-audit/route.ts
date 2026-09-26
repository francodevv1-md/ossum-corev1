import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getLogisticsMapProjection } from "@/lib/services/logistics-geography-read.service"

type Context = { params: Promise<{ companyId: string }> }
export async function GET(request: Request, { params }: Context) {
  try { const { companyId } = await params; const auth = await getApiAuthContext(request, companyId); requireCompanyReadAccess(auth); const projection = await getLogisticsMapProjection(prisma, auth.companyId, 500); return ok({ generatedAt: projection.generatedAt, source: projection.source, excluded: projection.excluded, audit: projection.audit }) }
  catch (error) { return errorResponse(error) }
}

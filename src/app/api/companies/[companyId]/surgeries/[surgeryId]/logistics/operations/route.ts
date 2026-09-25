import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getSurgeryLogisticsOperations } from "@/lib/services/logistics-operations-read.service"

type Context = { params: Promise<{ companyId: string; surgeryId: string }> }
export async function GET(request: Request, { params }: Context) {
  try { const { companyId, surgeryId } = await params; const auth = await getApiAuthContext(request, companyId); requireCompanyReadAccess(auth); return ok(await getSurgeryLogisticsOperations(prisma, auth.companyId, surgeryId, auth)) }
  catch (error) { return errorResponse(error) }
}

import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getLogisticsMapProjection } from "@/lib/services/logistics-geography-read.service"
import { validateLogisticsMapQuery } from "@/lib/validators/logistics-geography-read"
type Context = { params: Promise<{ companyId: string }> }
export async function GET(request: Request, { params }: Context) { try { const { companyId } = await params, auth = await getApiAuthContext(request, companyId); requireCompanyReadAccess(auth); return ok(await getLogisticsMapProjection(prisma, auth.companyId, validateLogisticsMapQuery(new URL(request.url).searchParams).limit)) } catch (error) { return errorResponse(error) } }

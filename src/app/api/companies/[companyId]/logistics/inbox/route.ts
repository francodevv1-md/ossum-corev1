import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getLogisticsGlobalInbox } from "@/lib/services/logistics-global-inbox-read.service"
import { validateLogisticsGlobalInboxQuery } from "@/lib/validators/logistics-global-inbox-read"

type Context = { params: Promise<{ companyId: string }> }
export async function GET(request: Request, { params }: Context) {
  try { const { companyId } = await params; const auth = await getApiAuthContext(request, companyId); requireCompanyReadAccess(auth); return ok(await getLogisticsGlobalInbox(prisma, auth.companyId, auth, validateLogisticsGlobalInboxQuery(new URL(request.url).searchParams))) }
  catch (error) { return errorResponse(error) }
}

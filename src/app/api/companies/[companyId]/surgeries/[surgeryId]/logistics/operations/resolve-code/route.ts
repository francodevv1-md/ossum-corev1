import { getApiAuthContext } from "@/lib/api/auth-context"
import { badRequest } from "@/lib/api/errors"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { resolveSurgeryLogisticsCode } from "@/lib/services/logistics-operations-read.service"
import { validateLogisticsScanCode } from "@/lib/validators/logistics-operations-read"

type Context = { params: Promise<{ companyId: string; surgeryId: string }> }
export async function POST(request: Request, { params }: Context) {
  try { const { companyId, surgeryId } = await params; const auth = await getApiAuthContext(request, companyId); requireCompanyReadAccess(auth); let body: unknown; try { body = await request.json() } catch { throw badRequest("Invalid JSON body", "invalid_json_body") }; const { code } = validateLogisticsScanCode(body); return ok(await resolveSurgeryLogisticsCode(prisma, auth.companyId, surgeryId, auth, code)) }
  catch (error) { return errorResponse(error) }
}

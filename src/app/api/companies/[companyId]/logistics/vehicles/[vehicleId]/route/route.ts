import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { getLogisticsVehicleRoute } from "@/lib/services/logistics-vehicle-gps.server"
import { validateGpsRouteHours } from "@/lib/validators/logistics-vehicle-gps"

type Context = { params: Promise<{ companyId: string; vehicleId: string }> }
export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, vehicleId } = await params
    const auth = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(auth)
    const route = await getLogisticsVehicleRoute(prisma, auth.companyId, vehicleId, validateGpsRouteHours(new URL(request.url).searchParams.get("hours")))
    if (!route) return new Response(null, { status: 404 })
    return ok(route)
  } catch (error) { return errorResponse(error) }
}

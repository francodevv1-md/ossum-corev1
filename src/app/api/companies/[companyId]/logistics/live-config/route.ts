import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"

type Context = { params: Promise<{ companyId: string }> }

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params
    const auth = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(auth)

    const baseUrl = process.env.LOGISTICS_GPS_PROVIDER_BASE_URL?.trim().replace(/\/$/, "")
    const token = process.env.LOGISTICS_GPS_PROVIDER_TOKEN?.trim()

    if (!baseUrl || !token) {
      return ok({
        enabled: false,
        socketUrl: null,
      })
    }

    // Convert https://host/api to wss://host/api/socket?token=...
    const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/api$/, "")
    const socketUrl = `wss://${host}/api/socket?token=${encodeURIComponent(token)}`

    return ok({
      enabled: true,
      socketUrl,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

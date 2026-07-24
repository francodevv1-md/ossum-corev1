import { badRequest } from "@/lib/api/errors"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { digitalReceiptService } from "@/lib/digital-receipts"

import { toDigitalReceiptApiError } from "../_shared"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const surgeryId = new URL(request.url).searchParams.get("surgeryId")?.trim()
    if (!surgeryId) {
      throw badRequest("surgeryId is required", "missing_surgery_id")
    }

    return ok(await digitalReceiptService.getDigitalReceiptCreateDefaults(ctx.companyId, surgeryId))
  } catch (error) {
    return errorResponse(toDigitalReceiptApiError(error))
  }
}

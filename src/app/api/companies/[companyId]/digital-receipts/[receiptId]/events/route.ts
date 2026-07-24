import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { digitalReceiptService } from "@/lib/digital-receipts"

import { toDigitalReceiptApiError } from "../../_shared"

type RouteContext = {
  params: Promise<{ companyId: string; receiptId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, receiptId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const detail = await digitalReceiptService.getDigitalReceiptDetail(ctx.companyId, receiptId)

    return ok(detail.events)
  } catch (error) {
    return errorResponse(toDigitalReceiptApiError(error))
  }
}

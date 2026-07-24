import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { digitalReceiptService } from "@/lib/digital-receipts"

import {
  buildIssueInput,
  buildDigitalReceiptActor,
  DIGITAL_RECEIPT_MUTATION_ROLES,
  parseJsonBody,
  toDigitalReceiptApiError,
} from "../../_shared"

type RouteContext = {
  params: Promise<{ companyId: string; receiptId: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, receiptId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, DIGITAL_RECEIPT_MUTATION_ROLES)

    const body = await parseJsonBody(request)
    const actor = buildDigitalReceiptActor(ctx)

    return ok(await digitalReceiptService.issueDigitalReceipt(buildIssueInput(body, ctx.companyId, receiptId, actor)))
  } catch (error) {
    return errorResponse(toDigitalReceiptApiError(error))
  }
}

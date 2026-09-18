import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { digitalReceiptService } from "@/lib/digital-receipts"

import {
  buildRevokeAccessInput,
  buildDigitalReceiptActor,
  DIGITAL_RECEIPT_MUTATION_ROLES,
  parseJsonBody,
  toDigitalReceiptApiError,
} from "../../../_shared"

type RouteContext = {
  params: Promise<{ companyId: string; receiptId: string; accessId: string }>
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, receiptId, accessId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, DIGITAL_RECEIPT_MUTATION_ROLES)

    const body = await parseJsonBody(request)
    const actor = buildDigitalReceiptActor(ctx)

    return ok(
      await digitalReceiptService.revokeDigitalReceiptAccess(
        buildRevokeAccessInput(body, ctx.companyId, receiptId, accessId, actor)
      )
    )
  } catch (error) {
    return errorResponse(toDigitalReceiptApiError(error))
  }
}

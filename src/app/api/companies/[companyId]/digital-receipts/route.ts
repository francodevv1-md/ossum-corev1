import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "@/lib/api/guards"
import { created, errorResponse, ok } from "@/lib/api/responses"
import { digitalReceiptService } from "@/lib/digital-receipts"

import {
  buildCreateDraftInput,
  buildDigitalReceiptActor,
  DIGITAL_RECEIPT_MUTATION_ROLES,
  getDigitalReceiptListFilters,
  parseJsonBody,
  toDigitalReceiptApiError,
} from "./_shared"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    return ok(await digitalReceiptService.listDigitalReceipts(getDigitalReceiptListFilters(request, ctx.companyId)))
  } catch (error) {
    return errorResponse(toDigitalReceiptApiError(error))
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, DIGITAL_RECEIPT_MUTATION_ROLES)

    const body = await parseJsonBody(request)
    const actor = buildDigitalReceiptActor(ctx)

    return created(await digitalReceiptService.createDigitalReceiptDraft(buildCreateDraftInput(body, ctx.companyId, actor)))
  } catch (error) {
    return errorResponse(toDigitalReceiptApiError(error))
  }
}

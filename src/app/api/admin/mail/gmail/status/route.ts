import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { badRequest } from "@/lib/api/errors"
import { GmailConnectionManager } from "@/lib/mail-stage1/gmail/connection-manager"
import { EncryptedTokenStore } from "@/lib/mail-stage1/gmail/token-store"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companyId = url.searchParams.get("companyId")
    if (!companyId) throw badRequest("companyId query param required", "missing_company_id")

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const tokenStore = new EncryptedTokenStore()
    const connectionManager = new GmailConnectionManager(companyId, tokenStore)
    const state = await connectionManager.getConnectionState()

    return ok({
      ...state,
      provider: "gmail",
      companyId,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

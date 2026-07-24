import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { badRequest } from "@/lib/api/errors"
import { GmailConnectionManager } from "@/lib/mail-stage1/gmail/connection-manager"
import { EncryptedTokenStore } from "@/lib/mail-stage1/gmail/token-store"

export async function POST(request: Request) {
  try {
    let companyId: string
    const contentType = request.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      const body = await request.json() as { companyId?: string }
      companyId = body.companyId ?? ""
    } else {
      const url = new URL(request.url)
      companyId = url.searchParams.get("companyId") ?? ""
    }

    if (!companyId) throw badRequest("companyId required", "missing_company_id")

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, ["admin", "super_admin", "owner"])

    const tokenStore = new EncryptedTokenStore()
    const connectionManager = new GmailConnectionManager(companyId, tokenStore)
    await connectionManager.disconnect()

    return ok({ status: "disconnected", companyId })
  } catch (error) {
    return errorResponse(error)
  }
}

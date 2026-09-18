import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { browseMailboxConversations } from "@/lib/mail-stage1/service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import { validateListMailboxConversationsQuery, validateSurgeryId } from "@/lib/validators/mail-stage1.validator"

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params
    validateSurgeryId(surgeryId)
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)
    await resolveCompanySurgery(ctx.companyId, surgeryId)

    const url = new URL(request.url)
    const query = validateListMailboxConversationsQuery({
      query: url.searchParams.get("query") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    })

    return ok(
      await browseMailboxConversations(
        companyId,
        surgeryId,
        {
          actorUserId: ctx.actorUserId,
          role: ctx.role,
        },
        query.query,
        query.limit
      )
    )
  } catch (error) {
    return errorResponse(error)
  }
}

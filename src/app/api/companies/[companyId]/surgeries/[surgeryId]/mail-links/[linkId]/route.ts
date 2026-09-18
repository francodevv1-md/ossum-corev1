import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { MAIL_STAGE1_UNLINK_ROLES } from "@/lib/mail-stage1/permissions"
import { unlinkConversationFromSurgery } from "@/lib/mail-stage1/service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string; linkId: string }>
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, linkId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, MAIL_STAGE1_UNLINK_ROLES)
    await resolveCompanySurgery(ctx.companyId, surgeryId)

    return ok(
      await unlinkConversationFromSurgery(companyId, surgeryId, linkId, {
        actorUserId: ctx.actorUserId,
        role: ctx.role,
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}

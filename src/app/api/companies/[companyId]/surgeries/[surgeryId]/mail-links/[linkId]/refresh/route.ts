import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { MAIL_STAGE1_MUTATION_ROLES } from "@/lib/mail-stage1/permissions"
import { refreshLinkedConversation } from "@/lib/mail-stage1/service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import { validateSurgeryId } from "@/lib/validators/mail-stage1.validator"

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string; linkId: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, linkId } = await params
    validateSurgeryId(surgeryId)
    const ctx = await getApiAuthContext(request, companyId)

    requireCompanyMutationAccess(ctx, MAIL_STAGE1_MUTATION_ROLES)
    await resolveCompanySurgery(ctx.companyId, surgeryId)

    return ok(
      await refreshLinkedConversation(companyId, surgeryId, linkId, {
        actorUserId: ctx.actorUserId,
        role: ctx.role,
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}

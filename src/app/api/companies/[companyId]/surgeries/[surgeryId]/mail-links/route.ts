import { badRequest } from "@/lib/api/errors"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "@/lib/api/guards"
import { created, errorResponse, ok } from "@/lib/api/responses"
import { MAIL_STAGE1_MUTATION_ROLES } from "@/lib/mail-stage1/permissions"
import { attachConversationToSurgery, listLinkedConversations } from "@/lib/mail-stage1/service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import { validateAttachConversationInput, validateSurgeryId } from "@/lib/validators/mail-stage1.validator"

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body")
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params
    validateSurgeryId(surgeryId)
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)
    await resolveCompanySurgery(ctx.companyId, surgeryId)

    return ok(
      await listLinkedConversations(companyId, surgeryId, {
        actorUserId: ctx.actorUserId,
        role: ctx.role,
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params
    validateSurgeryId(surgeryId)
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, MAIL_STAGE1_MUTATION_ROLES)
    await resolveCompanySurgery(ctx.companyId, surgeryId)
    const body = validateAttachConversationInput(await parseJsonBody(request))

    return created(
      await attachConversationToSurgery(companyId, surgeryId, {
        actorUserId: ctx.actorUserId,
        role: ctx.role,
      }, body)
    )
  } catch (error) {
    return errorResponse(error)
  }
}

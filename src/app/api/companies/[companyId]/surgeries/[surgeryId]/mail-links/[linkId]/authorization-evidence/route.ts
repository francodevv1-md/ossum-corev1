import { badRequest } from "@/lib/api/errors"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { created, errorResponse } from "@/lib/api/responses"
import { MAIL_STAGE1_MUTATION_ROLES } from "@/lib/mail-stage1/permissions"
import { resolveMailAuthorizationImportProvenance } from "@/lib/mail-stage1/service"
import prisma from "@/lib/prisma"
import { createMailAuthorizationEvidence } from "@/lib/services/seguimiento.service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import { validateMailAuthorizationImportInput, validateSurgeryId } from "@/lib/validators/mail-stage1.validator"

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string; linkId: string }>
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body")
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, linkId } = await params
    validateSurgeryId(surgeryId)
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, MAIL_STAGE1_MUTATION_ROLES)

    const resolvedSurgery = await resolveCompanySurgery(ctx.companyId, surgeryId)
    const body = validateMailAuthorizationImportInput(await parseJsonBody(request))
    const provenance = await resolveMailAuthorizationImportProvenance(
      ctx.companyId,
      resolvedSurgery.id,
      linkId,
      body.attachmentIds ?? []
    )

    return created(await createMailAuthorizationEvidence(prisma, {
      surgeryId: resolvedSurgery.id,
      companyId: ctx.companyId,
      actor: {
        userId: ctx.actorUserId,
        displayName: [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.email,
      },
      content: body.content,
      summary: body.summary,
      provenance,
    }))
  } catch (error) {
    return errorResponse(error)
  }
}

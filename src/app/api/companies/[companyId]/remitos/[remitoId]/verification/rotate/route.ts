import { badRequest } from "@/lib/api/errors"
import { getActiveCompanyMemberships, requireSelectedCompanyMembership } from "@/lib/api/guards"
import { getApiIdentity } from "@/lib/api/identity-context"
import { errorResponse, ok } from "@/lib/api/responses"
import { getRemitoVerificationRuntime, requireConfiguredOrigin, rotateRemitoVerification } from "@/lib/remito-verification/service"
import { getRemitoActivationGate } from "@/lib/remito-verification/activation"

type Context = { params: Promise<{ companyId: string; remitoId: string }> }
export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, remitoId: remitoShortCode } = await params
    if (!(await getRemitoActivationGate()).flags.remitoPublicPublicationWrites) throw new Error("Remito public publication writes are not activated")
    const runtime = getRemitoVerificationRuntime()
    requireConfiguredOrigin(request, runtime.internalOrigin)
    if ((await request.text()).trim()) throw badRequest("Rotation body must be empty", "unexpected_request_body")
    const actor = await getApiIdentity(request)
    const membership = requireSelectedCompanyMembership(await getActiveCompanyMemberships(actor), companyId)
    return ok(await rotateRemitoVerification(runtime, {
      companyId, remitoShortCode, actorId: actor.actorUserId, role: membership.role,
    }))
  } catch (error) { return errorResponse(error) }
}

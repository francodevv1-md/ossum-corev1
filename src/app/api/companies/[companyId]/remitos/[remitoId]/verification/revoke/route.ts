import { badRequest } from "@/lib/api/errors"
import { errorResponse, ok } from "@/lib/api/responses"
import { getActiveCompanyMemberships, requireSelectedCompanyMembership } from "@/lib/api/guards"
import { getApiIdentity } from "@/lib/api/identity-context"
import { getRemitoVerificationRuntime, requireConfiguredOrigin, revokeRemitoVerification } from "@/lib/remito-verification/service"
import { getRemitoActivationGate } from "@/lib/remito-verification/activation"

type Context = { params: Promise<{ companyId: string; remitoId: string }> }
export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, remitoId: remitoShortCode } = await params
    if (!(await getRemitoActivationGate()).flags.remitoPublicPublicationWrites) throw new Error("Remito public publication writes are not activated")
    const runtime = getRemitoVerificationRuntime()
    requireConfiguredOrigin(request, runtime.internalOrigin)
    const body = await request.json().catch(() => { throw badRequest("Invalid JSON", "invalid_json") })
    if (!body || typeof body.reason !== "string" || Object.keys(body).length !== 1) {
      throw badRequest("A reason is required", "invalid_revocation_reason")
    }
    const actor = await getApiIdentity(request)
    const membership = requireSelectedCompanyMembership(await getActiveCompanyMemberships(actor), companyId)
    return ok(await revokeRemitoVerification(runtime, {
      companyId, remitoShortCode, actorId: actor.actorUserId, role: membership.role, reason: body.reason,
    }))
  } catch (error) { return errorResponse(error) }
}

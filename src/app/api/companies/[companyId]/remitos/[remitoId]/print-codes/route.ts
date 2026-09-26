import prisma from "@/lib/prisma"
import { getApiIdentity } from "@/lib/api/identity-context"
import { getActiveCompanyMemberships, requireSelectedCompanyMembership } from "@/lib/api/guards"
import { errorResponse } from "@/lib/api/responses"
import { getRemitoVerificationRuntime } from "@/lib/remito-verification/service"
import { getRemitoPrintCodes } from "@/lib/services/remito-print-code.service"
import { getRemitoActivationGate } from "@/lib/remito-verification/activation"

type Context = { params: Promise<{ companyId: string; remitoId: string }> }
const noStore = { "Cache-Control": "private, no-store", Pragma: "no-cache", Vary: "Authorization" }

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, remitoId: remitoShortCode } = await params
    const identity = await getApiIdentity(request)
    const membership = requireSelectedCompanyMembership(
      await getActiveCompanyMemberships(identity), companyId,
    )
    const runtime = getRemitoVerificationRuntime()
    const activation = await getRemitoActivationGate()
    if (!activation.flags.remitoPrintCodes) throw new Error("Remito print codes are not activated")
    const data = await getRemitoPrintCodes({
      prisma: prisma as never,
      keyring: runtime.keyring,
      internalOrigin: runtime.internalOrigin,
      publicOrigin: runtime.publicOrigin,
      activation,
    }, { companyId, remitoShortCode, actorId: identity.actorUserId, role: membership.role })
    return Response.json({ data }, { headers: noStore })
  } catch (error) {
    const response = errorResponse(error)
    for (const [name, value] of Object.entries(noStore)) response.headers.set(name, value)
    return response
  }
}

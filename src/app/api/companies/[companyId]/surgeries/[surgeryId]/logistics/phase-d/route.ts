import { getApiAuthContext } from "@/lib/api/auth-context"
import { badRequest } from "@/lib/api/errors"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { closeReconciliation, recordConsumption, registerReturn, registerUnidentifiedReturn, receiveReturn, reopenReconciliation, resolveUnidentifiedReturn } from "@/lib/services/phase-d-logistics.service"

type Context = { params: Promise<{ companyId: string; surgeryId: string }> }

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, surgeryId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    const body = await request.json() as Record<string, unknown>
    const command = { companyId: ctx.companyId, actorId: ctx.actorUserId, role: ctx.role, surgeryId, prisma }
    switch (body.action) {
      case "consume": return ok(await recordConsumption(command, body))
      case "return": return ok(await registerReturn(command, body))
      case "return_unidentified": return ok(await registerUnidentifiedReturn(command, body))
      case "receive_return": return ok(await receiveReturn(command, body as never))
      case "resolve_unidentified_return": return ok(await resolveUnidentifiedReturn(command, body))
      case "close_reconciliation": return ok(await closeReconciliation(command, body as never))
      case "reopen_reconciliation": return ok(await reopenReconciliation(command, body as never))
      default: throw badRequest("Unknown Phase D action", "phase_d_unknown_action")
    }
  } catch (error) { return errorResponse(error) }
}

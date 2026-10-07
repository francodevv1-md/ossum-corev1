import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyAdmin, requireCompanyReadAccess } from "@/lib/api/guards"
import { badRequest, notFound } from "@/lib/api/errors"
import { created, errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import {
  createConsumptionBillingOverride,
  getConsumptionBillingGateStatus,
} from "@/lib/services/billing-gate.service"

type RouteContext = {
  params: Promise<{ companyId: string; consumoId: string }>
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body")
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, consumoId } = await params
    if (!consumoId) {
      throw notFound("Consumo id is required", "consumo_not_found")
    }

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const status = await getConsumptionBillingGateStatus({
      companyId: ctx.companyId,
      consumoId,
      prisma,
    })

    return ok(status)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, consumoId } = await params
    if (!consumoId) {
      throw notFound("Consumo id is required", "consumo_not_found")
    }

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyAdmin(ctx)

    const body = await parseJsonBody(request)
    if (!body || typeof body !== "object" || !("reason" in body)) {
      throw badRequest("El campo 'reason' es obligatorio", "consumption_override_reason_required")
    }

    const reason = (body as { reason: unknown }).reason
    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw badRequest("El motivo de la excepción no puede estar vacío", "consumption_override_reason_required")
    }

    const result = await createConsumptionBillingOverride({
      companyId: ctx.companyId,
      consumoId,
      reason,
      actorUserId: ctx.actorUserId,
      prisma,
    })

    return created(result)
  } catch (error) {
    return errorResponse(error)
  }
}

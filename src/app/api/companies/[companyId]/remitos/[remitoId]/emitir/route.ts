import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { notFound } from "../../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { getRemitoIssuanceDependencies } from "../../../../../../../lib/remito-verification/issuance-runtime";
import { getRemitoActivationGate } from "../../../../../../../lib/remito-verification/activation";
import {
  REMITO_MUTATION_ROLES,
  emitirRemito,
} from "../../../../../../../lib/services/remito.service";
import { authorize, WCB06_CONTRACT_IDS } from "../../../../../../../lib/permissions/c14/authorize-insert-writer";
import { badRequest, forbidden } from "../../../../../../../lib/api/errors";
import { appendWcb06TransportAuthorizationDenied } from "../../../../../../../lib/services/c14/durable-attempt-audit";
import { requireCajasDispatchAccess } from "../../../../../../../lib/permissions/stock-operations";

type RouteContext = {
  params: Promise<{ companyId: string; remitoId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, remitoId } = await params;
    if (!remitoId) {
      throw notFound("Remito id is required", "remito_not_found");
    }
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, REMITO_MUTATION_ROLES);
    requireCajasDispatchAccess(ctx);
    const body: unknown = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "idempotencyKey")) {
      throw badRequest("Only an optional non-empty idempotencyKey is accepted", "invalid_remito_emit_input");
    }
    const rawIdempotencyKey = "idempotencyKey" in body ? body.idempotencyKey : undefined;
    if (rawIdempotencyKey !== undefined && (typeof rawIdempotencyKey !== "string" || !rawIdempotencyKey.trim())) {
      throw badRequest("Only an optional non-empty idempotencyKey is accepted", "invalid_remito_emit_input");
    }
    const idempotencyKey = rawIdempotencyKey === undefined ? undefined : rawIdempotencyKey.trim();
    let authorizationProof;
    try {
      authorizationProof = await authorize(prisma, { actorId: ctx.actorUserId, companyId: ctx.companyId, bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS });
    } catch {
      await appendWcb06TransportAuthorizationDenied(prisma, { actorId: ctx.actorUserId, companyId: ctx.companyId, remitoId, idempotencyKey });
      throw forbidden("Company access denied", "C14_COMPANY_DENIED");
    }
    const activation = await getRemitoActivationGate();
    const issuanceTime = new Date();
    if (!activation.flags.remitoLocatorIssuanceWrites
      || !activation.flags.remitoPublicPublicationWrites
      || !activation.isCompanyDateEligible(ctx.companyId, issuanceTime)) {
      throw new Error("Remito verification issuance is not activated");
    }

    const result = await emitirRemito({
      companyId: ctx.companyId,
      remitoId,
      updatedById: ctx.actorUserId,
      prisma,
      issuanceDependencies: { ...getRemitoIssuanceDependencies(), now: () => issuanceTime },
      idempotencyKey,
      authorizationProof,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

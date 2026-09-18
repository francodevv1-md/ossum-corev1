import { badRequest, conflict } from "../../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../../../lib/api/guards";
import { getNonNegativeIntegerParam, getStringParam } from "../../../../../../../lib/api/query";
import { created, errorResponse } from "../../../../../../../lib/api/responses";
import prisma from "../../../../../../../lib/prisma";
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery";
import {
  createSeguimientoEntry,
  listSeguimientoEntries,
} from "../../../../../../../lib/services/seguimiento.service";
import { validateSeguimientoCreateBody } from "../../../../../../../lib/validators/seguimiento.validator";

console.log("[SEGUIMIENTO-ROUTE] Module loaded");

type RouteContext = {
  params: Promise<{ companyId: string; surgeryId: string }>;
};

const SEGUIMIENTO_MUTATION_ROLES = [
  "admin",
  "coordinator",
  "operator",
] as const;

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") {
      throw error;
    }

    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  console.log("[SEGUIMIENTO-GET] Handler called, url:", request.url);
  try {
    const totalStart = performance.now();
    const { companyId, surgeryId } = await params;
    const searchParams = new URL(request.url).searchParams;
    const diagnose = searchParams.get("diag") === "1";

    const authStart = performance.now();
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    const authMs = roundMs(performance.now() - authStart);

    const resolveStart = performance.now();
    const realSurgeryId = (await resolveCompanySurgery(ctx.companyId, surgeryId)).id;
    const resolveMs = roundMs(performance.now() - resolveStart);

    const queryStart = performance.now();
    const result = await listSeguimientoEntries(prisma, realSurgeryId, ctx.companyId, {
      entryType: getStringParam(searchParams, "entryType"),
      take: getNonNegativeIntegerParam(searchParams, "take") ?? 50,
    });
    const queryMs = roundMs(performance.now() - queryStart);

    const serializeStart = performance.now();
    const body = {
      data: {
        entries: result.entries,
        meta: {
          total: result.total,
          hasMore: result.hasMore,
          take: result.take,
        },
      },
    };
    const json = JSON.stringify(body);
    const serializeMs = roundMs(performance.now() - serializeStart);
    const payloadBytes = new TextEncoder().encode(json).byteLength;
    const totalMs = roundMs(performance.now() - totalStart);

    if (diagnose) {
      console.info("[SEGUIMIENTO-DIAG] GET timings", {
        companyId: ctx.companyId,
        surgeryId,
        realSurgeryId,
        entryCount: result.entries.length,
        totalCount: result.total,
        hasMore: result.hasMore,
        authMs,
        resolveMs,
        queryMs,
        serializeMs,
        totalMs,
        payloadBytes,
      });
    }

    return new Response(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...(diagnose
          ? {
              "Server-Timing": [
                `auth;dur=${authMs}`,
                `resolve;dur=${resolveMs}`,
                `query;dur=${queryMs}`,
                `serialize;dur=${serializeMs}`,
                `total;dur=${totalMs}`,
              ].join(", "),
              "X-Seguimiento-Entry-Count": String(result.entries.length),
              "X-Seguimiento-Total-Count": String(result.total),
              "X-Seguimiento-Has-More": String(result.hasMore),
              "X-Seguimiento-Payload-Bytes": String(payloadBytes),
              "X-Seguimiento-Auth-Ms": String(authMs),
              "X-Seguimiento-Resolve-Ms": String(resolveMs),
              "X-Seguimiento-Query-Ms": String(queryMs),
              "X-Seguimiento-Serialize-Ms": String(serializeMs),
              "X-Seguimiento-Total-Ms": String(totalMs),
            }
          : {}),
      },
    });
  } catch (error) {
    console.error("[SEGUIMIENTO-GET] Error:", error instanceof Error ? error.message : String(error));
    console.error("[SEGUIMIENTO-GET] Stack:", error instanceof Error ? error.stack : "no stack");
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  console.log("[SEGUIMIENTO-POST] Handler called, url:", request.url);
  try {
    const { companyId, surgeryId } = await params;
    console.log("[SEGUIMIENTO-POST] Params:", { companyId, surgeryId });
    const ctx = await getApiAuthContext(request, companyId);
    console.log("[SEGUIMIENTO-POST] Auth OK, actor:", ctx.actorUserId, "role:", ctx.role);

    requireCompanyMutationAccess(ctx, SEGUIMIENTO_MUTATION_ROLES);

    const rawBody = await parseJsonBody(request);
    if (
      typeof rawBody === "object" &&
      rawBody !== null &&
      !Array.isArray(rawBody) &&
      (rawBody as Record<string, unknown>).entryType === "authorization_evidence"
    ) {
      throw conflict(
        "Authorization evidence must use a dedicated authorization endpoint",
        "authorization_evidence_requires_dedicated_route"
      );
    }

    const body = validateSeguimientoCreateBody(rawBody, {
      companyId: ctx.companyId,
    });
    console.log("[SEGUIMIENTO-POST] Body valid:", { entryType: body.entryType, contentLen: body.content.length });

    const realSurgeryId = (await resolveCompanySurgery(ctx.companyId, surgeryId)).id;

    const entry = await createSeguimientoEntry(prisma, {
      surgeryId: realSurgeryId,
      companyId: ctx.companyId,
      entryType: body.entryType,
      content: body.content,
      summary: body.summary,
      authorId: ctx.actorUserId,
      evidenceRef: body.evidenceRef,
      mentions: body.mentions,
    });

    console.log("[SEGUIMIENTO-POST] Entry created:", entry.id);
    return created(entry);
  } catch (error) {
    console.error("[SEGUIMIENTO-POST] Error:", error instanceof Error ? error.message : String(error));
    console.error("[SEGUIMIENTO-POST] Stack:", error instanceof Error ? error.stack : "no stack");
    return errorResponse(error);
  }
}

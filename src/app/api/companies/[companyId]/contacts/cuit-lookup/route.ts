// OSSUM COR — POST /api/companies/[companyId]/contacts/cuit-lookup
//
// Read-only company-scoped CUIT lookup. The body is { cuit: string }.
// The route is authenticated via getApiAuthContext + requireCompanyReadAccess
// (search-like operation; the result is read-only information, no write).
//
// Service in-flight de-dup happens inside lookupCuit() so two
// simultaneous requests for the same CUIT in the same process share a
// single upstream round-trip.
//
// Operational instrumentation (INSTRUMENT package 2026-10-07): the
// route passes the auth-context `actorUserId` and `companyId` plus a
// freshly generated `requestId` to `lookupCuit` so the wrapper can
// enforce governance, redact logs and emit the audit event with the
// correct context. The prisma client is resolved at request time
// (lazy require, not top-level import) so the route stays importable
// in test environments without DATABASE_URL. No new prisma call sites
// are introduced in this route.

import { randomUUID } from "node:crypto";

import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { badRequest } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import { requireCompanyReadAccess } from "../../../../../../lib/api/guards";
import { lookupCuit } from "../../../../../../lib/services/cuit-lookup.service";
import { cuitLookupRequestSchema } from "../../../../../../lib/validators/cuit-lookup";
import type { AuditPrismaClient } from "../../../../../../lib/audit";

/**
 * Resolve the prisma singleton lazily. Returns `undefined` in any
 * environment where DATABASE_URL is unset (e.g. unit tests), so the
 * audit emission falls through to a no-op rather than throwing.
 */
function resolvePrismaOrUndefined(): AuditPrismaClient | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../../../../../lib/prisma");
    return (mod.default ?? mod.prisma) as AuditPrismaClient;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(badRequest("Invalid JSON body", "invalid_json_body"));
    }

    const parsed = cuitLookupRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const isCuitIssue = firstIssue?.path[0] === "cuit";
      const message = firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Validation error";
      return errorResponse(badRequest(message, isCuitIssue ? "invalid_cuit_format" : "validation_failed"));
    }

    const result = await lookupCuit(parsed.data.cuit, {
      actorUserId: ctx.actorUserId,
      companyId: ctx.companyId,
      requestId: randomUUID(),
      prisma: resolvePrismaOrUndefined(),
    });
    const response = ok(result);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

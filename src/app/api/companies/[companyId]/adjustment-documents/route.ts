import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { getStringParam, getNonNegativeIntegerParam } from "../../../../../lib/api/query";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import {
  listAdjustmentDocuments,
  createAdjustmentDocument,
} from "../../../../../lib/services/adjustment-document.service";
import {
  createAdjustmentDocumentSchema,
  adjustmentDocumentFilterSchema,
} from "../../../../../lib/validators/adjustment-document";

type RouteContext = { params: Promise<{ companyId: string }> };

const ADJUSTMENT_MUTATION_ROLES = ["admin", "facturacion", "operaciones", "gerencia"] as const;

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;
    const queryParams: Record<string, string | number | undefined> = {
      type: getStringParam(searchParams, "type") || undefined,
      state: getStringParam(searchParams, "state") || undefined,
      originType: getStringParam(searchParams, "originType") || undefined,
      search: getStringParam(searchParams, "search") || undefined,
      issuedFrom: getStringParam(searchParams, "issuedFrom") || undefined,
      issuedTo: getStringParam(searchParams, "issuedTo") || undefined,
      internalInvoiceId: getStringParam(searchParams, "internalInvoiceId") || undefined,
      page: getNonNegativeIntegerParam(searchParams, "page") || 1,
      limit: getNonNegativeIntegerParam(searchParams, "limit") || 50,
    };

    const parsedFilters = adjustmentDocumentFilterSchema.safeParse(queryParams);
    if (!parsedFilters.success) {
      throw badRequest(parsedFilters.error.issues[0]?.message ?? "Invalid filter parameters", "invalid_filter_params");
    }

    const result = await listAdjustmentDocuments(prisma, ctx.companyId, parsedFilters.data);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, ADJUSTMENT_MUTATION_ROLES);

    const rawBody = await parseJsonBody(request);
    const parsed = createAdjustmentDocumentSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid adjustment document body", "invalid_adjustment_body");
    }

    const doc = await createAdjustmentDocument(
      prisma,
      ctx.companyId,
      parsed.data,
      ctx.actorUserId,
      ctx.role,
    );

    return created(doc);
  } catch (error) {
    return errorResponse(error);
  }
}

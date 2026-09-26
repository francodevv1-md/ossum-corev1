import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import {
  requireCompanyMutationAccess,
  requireCompanyReadAccess,
} from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import {
  PRESUPUESTO_MUTATION_ROLES,
  createFamilyDraft,
  listPresupuestos,
} from "../../../../../lib/services/presupuesto.service";
import { presupuestoCreateSchema, presupuestoListQuerySchema } from "../../../../../lib/validators/presupuesto";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

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
    const query = presupuestoListQuerySchema.safeParse({
      surgeryId: searchParams.get("surgeryId") ?? undefined,
      state: searchParams.get("state") ?? undefined,
      take: searchParams.get("take") ?? undefined,
      skip: searchParams.get("skip") ?? undefined,
    });
    if (!query.success) throw badRequest(query.error.issues[0]?.message, "invalid_presupuesto_query");
    const presupuestos = await listPresupuestos({
      companyId: ctx.companyId,
      prisma,
      ...query.data,
    });

    return ok(presupuestos);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, PRESUPUESTO_MUTATION_ROLES);

    const parsed = presupuestoCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]?.message ?? "Invalid presupuesto body",
        "invalid_presupuesto_body"
      );
    }
    const body = parsed.data;

    const presupuesto = await createFamilyDraft({
      companyId: ctx.companyId,
      prisma,
      surgeryId: body.surgeryId,
      branchId: body.branchId,
      clientContactId: body.clientContactId,
      payerContactId: body.payerContactId,
      title: body.title,
      currency: body.currency,
      documentDate: body.documentDate,
      paymentTerms: body.paymentTerms,
      priceListCode: body.priceListCode,
      legend: body.legend,
      notes: body.notes,
      validUntil: body.validUntil,
      generalDiscountRate: body.generalDiscountRate,
      commercial: body.commercial,
      items: body.items,
      actorUserId: ctx.actorUserId,
    });

    return created(presupuesto);
  } catch (error) {
    return errorResponse(error);
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyCapability } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import {
  createNecesidadCompra,
  listNecesidadesCompra,
} from "@/lib/services/necesidad-compra.service";
import {
  createNecesidadCompraSchema,
  listNecesidadesQuerySchema,
} from "@/lib/validators/necesidad-compra.validator";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "purchases:read");

    const url = new URL(request.url);
    const parsedQuery = listNecesidadesQuerySchema.parse({
      state: url.searchParams.get("state") || undefined,
      origin: url.searchParams.get("origin") || undefined,
      surgeryId: url.searchParams.get("surgeryId") || undefined,
      suggestedSupplierId: url.searchParams.get("suggestedSupplierId") || undefined,
      take: url.searchParams.get("take") || undefined,
      skip: url.searchParams.get("skip") || undefined,
    });

    const result = await listNecesidadesCompra({
      prisma,
      companyId: ctx.companyId,
      state: parsedQuery.state,
      origin: parsedQuery.origin,
      surgeryId: parsedQuery.surgeryId,
      suggestedSupplierId: parsedQuery.suggestedSupplierId,
      take: parsedQuery.take,
      skip: parsedQuery.skip,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "purchases:mutate");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const validated = createNecesidadCompraSchema.parse(body);

    const result = await createNecesidadCompra({
      prisma,
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      articleId: validated.articleId,
      isArticuloZ: validated.isArticuloZ,
      descripcionLibre: validated.descripcionLibre,
      code: validated.code,
      name: validated.name,
      quantity: validated.quantity,
      priority: validated.priority,
      origin: validated.origin,
      originReference: validated.originReference,
      suggestedSupplierId: validated.suggestedSupplierId,
      suggestedSupplierName: validated.suggestedSupplierName,
      surgeryId: validated.surgeryId,
      observaciones: validated.observaciones,
      idempotencyKey: validated.idempotencyKey,
    });

    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

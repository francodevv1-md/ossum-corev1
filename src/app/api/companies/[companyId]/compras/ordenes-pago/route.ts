import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyCapability } from "@/lib/api/guards";
import { created, errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import {
  createOrdenPago,
  listOrdenesPago,
} from "@/lib/services/orden-pago.service";
import {
  createOrdenPagoSchema,
  listOrdenesPagoQuerySchema,
} from "@/lib/validators/orden-pago.validator";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "billing:read");

    const url = new URL(request.url);
    const parsedQuery = listOrdenesPagoQuerySchema.parse({
      state: url.searchParams.get("state") || undefined,
      proveedorId: url.searchParams.get("proveedorId") || undefined,
      take: url.searchParams.get("take") || undefined,
      skip: url.searchParams.get("skip") || undefined,
    });

    const result = await listOrdenesPago({
      prisma,
      companyId: ctx.companyId,
      state: parsedQuery.state,
      proveedorId: parsedQuery.proveedorId,
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
    requireCompanyCapability(ctx, "billing:mutate");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const validated = createOrdenPagoSchema.parse(body);

    const result = await createOrdenPago({
      prisma,
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      proveedorId: validated.proveedorId,
      proveedorName: validated.proveedorName,
      total: validated.total,
      method: validated.method,
      paymentDate: validated.paymentDate,
      observaciones: validated.observaciones,
      imputaciones: validated.imputaciones,
    });

    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

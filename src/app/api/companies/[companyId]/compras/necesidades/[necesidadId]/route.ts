import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyCapability } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import {
  cancelNecesidadCompra,
  getNecesidadCompra,
  updateNecesidadCompra,
} from "@/lib/services/necesidad-compra.service";
import { updateNecesidadCompraSchema } from "@/lib/validators/necesidad-compra.validator";

type Context = { params: Promise<{ companyId: string; necesidadId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId, necesidadId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "purchases:read");

    const result = await getNecesidadCompra({
      prisma,
      companyId: ctx.companyId,
      necesidadId,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { companyId, necesidadId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "purchases:mutate");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const validated = updateNecesidadCompraSchema.parse(body);

    const result = await updateNecesidadCompra({
      prisma,
      companyId: ctx.companyId,
      necesidadId,
      userId: ctx.actorUserId,
      articleId: validated.articleId,
      isArticuloZ: validated.isArticuloZ,
      descripcionLibre: validated.descripcionLibre,
      code: validated.code,
      name: validated.name,
      quantity: validated.quantity,
      priority: validated.priority,
      suggestedSupplierId: validated.suggestedSupplierId,
      suggestedSupplierName: validated.suggestedSupplierName,
      surgeryId: validated.surgeryId,
      observaciones: validated.observaciones,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { companyId, necesidadId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "purchases:mutate");

    const url = new URL(request.url);
    const motivo = url.searchParams.get("motivo") || undefined;

    const result = await cancelNecesidadCompra({
      prisma,
      companyId: ctx.companyId,
      necesidadId,
      userId: ctx.actorUserId,
      motivo,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

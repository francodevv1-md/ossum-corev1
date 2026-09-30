import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyCapability } from "@/lib/api/guards";
import { created, errorResponse } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { convertNecesidadesToOrdenCompra } from "@/lib/services/necesidad-compra.service";
import { convertNecesidadesToOcSchema } from "@/lib/validators/necesidad-compra.validator";

type Context = { params: Promise<{ companyId: string }> };

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

    const validated = convertNecesidadesToOcSchema.parse(body);

    const result = await convertNecesidadesToOrdenCompra({
      prisma,
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      necesidadIds: validated.necesidadIds,
      proveedorId: validated.proveedorId,
      proveedorName: validated.proveedorName,
      observaciones: validated.observaciones,
    });

    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

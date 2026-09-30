import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyCapability } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { cancelOrdenPago } from "@/lib/services/orden-pago.service";
import { cancelOrdenPagoSchema } from "@/lib/validators/orden-pago.validator";

type Context = { params: Promise<{ companyId: string; ordenPagoId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { companyId, ordenPagoId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "billing:mutate");

    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const validated = cancelOrdenPagoSchema.parse(body);

    const result = await cancelOrdenPago({
      prisma,
      companyId: ctx.companyId,
      ordenPagoId,
      userId: ctx.actorUserId,
      motivo: validated.motivo || undefined,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

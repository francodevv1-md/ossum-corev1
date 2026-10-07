import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireCompanyCapability } from "@/lib/api/guards";
import { created, errorResponse } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { acceptReplenishmentSuggestion } from "@/lib/services/compras-forecast.service";
import { z } from "zod";

const acceptSuggestionSchema = z.object({
  articleId: z.string().min(1, "articleId is required"),
  quantity: z.number().positive().optional(),
  priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
  suggestedSupplierId: z.string().nullable().optional(),
  suggestedSupplierName: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
});

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

    const parsed = acceptSuggestionSchema.parse(body);

    const result = await acceptReplenishmentSuggestion({
      prisma,
      companyId: ctx.companyId,
      articleId: parsed.articleId,
      quantity: parsed.quantity,
      priority: parsed.priority,
      suggestedSupplierId: parsed.suggestedSupplierId,
      suggestedSupplierName: parsed.suggestedSupplierName,
      observaciones: parsed.observaciones,
      idempotencyKey: parsed.idempotencyKey,
      userId: ctx.actorUserId,
    });

    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import crypto from "crypto";
import { errorResponse, ok } from "@/lib/api/responses";
import { unauthorized, badRequest, internalError } from "@/lib/api/errors";
import prisma from "@/lib/prisma";
import { tusFacturasWebhookPayloadSchema } from "@/lib/validators/fiscal-tusfacturas";
import { handleTusFacturasWebhookDev } from "@/lib/services/fiscal-issuance.service";

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.TUSFACTURAS_WEBHOOK_SECRET?.trim();
    if (!expectedSecret) {
      throw internalError("El token de webhook TusFacturas no está configurado", "webhook_secret_not_configured");
    }

    const providedToken = request.headers.get("tf-webhooktoken")?.trim();
    if (!providedToken || providedToken.length !== expectedSecret.length || !crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedSecret))) {
      throw unauthorized("Firma o token de webhook inválido", "invalid_webhook_token");
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      throw badRequest("Cuerpo JSON inválido", "invalid_json");
    }

    const parsed = tusFacturasWebhookPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw badRequest("Payload de webhook no cumple con el esquema esperado", "invalid_webhook_payload");
    }

    const result = await handleTusFacturasWebhookDev(prisma, parsed.data);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

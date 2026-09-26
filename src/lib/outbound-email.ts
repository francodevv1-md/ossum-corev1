import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import { z } from "zod"

import { badRequest, internalError } from "@/lib/api/errors"

export const OUTBOUND_EMAIL_FROM = "OSSUM COR | Districorr <sistemas@districorr.com.ar>"
export const OUTBOUND_EMAIL_REPLY_TO = "sistemas@districorr.com.ar"

const outboundEmailInputSchema = z.object({
  to: z.string().trim().email("Ingresá un correo válido").max(254),
  subject: z.string().trim().min(1, "El asunto es obligatorio").max(200),
  message: z.string().trim().min(1, "El mensaje es obligatorio").max(5_000),
  copyMe: z.boolean().optional().default(false),
  idempotencyKey: z.string().trim().min(8).max(200),
}).strict()

export type OutboundEmailInput = z.infer<typeof outboundEmailInputSchema>

export type OutboundEmailAttachment = {
  filename: string
  content: Buffer
}

export function parseOutboundEmailInput(value: unknown): OutboundEmailInput {
  const parsed = outboundEmailInputSchema.safeParse(value)
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Datos de correo inválidos", "invalid_outbound_email")
  }
  return parsed.data
}

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function buildOutboundEmailIdempotencyKey(scope: string, companyId: string, entityId: string, clientKey: string) {
  const digest = createHash("sha256").update(`${scope}\0${companyId}\0${entityId}\0${clientKey}`).digest("hex")
  return `${scope.slice(0, 32)}/${digest}`
}

export async function sendResendEmail(input: {
  to: string
  cc?: string
  subject: string
  message: string
  idempotencyKey: string
  attachments: OutboundEmailAttachment[]
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw internalError("El envío de correo no está configurado", "outbound_email_not_configured")

  let response: Response
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: OUTBOUND_EMAIL_FROM,
        to: [input.to],
        ...(input.cc && input.cc.toLowerCase() !== input.to.toLowerCase() ? { cc: [input.cc] } : {}),
        reply_to: OUTBOUND_EMAIL_REPLY_TO,
        subject: input.subject,
        text: input.message,
        html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.5">${escapeEmailHtml(input.message)}</div>`,
        attachments: input.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: (attachment.content as { toString(encoding: "base64"): string }).toString("base64"),
        })),
      }),
    })
  } catch {
    throw internalError("No se pudo contactar al proveedor de correo", "outbound_email_provider_unavailable")
  }

  const body = await response.json().catch(() => null) as { id?: string; message?: string } | null
  if (!response.ok || !body?.id) {
    throw internalError(
      body?.message ? `Resend rechazó el envío: ${body.message}` : "Resend rechazó el envío",
      "outbound_email_rejected"
    )
  }

  return { provider: "resend" as const, providerMessageId: body.id, status: "accepted" as const }
}

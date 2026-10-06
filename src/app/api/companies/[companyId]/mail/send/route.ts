import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { badRequest } from "@/lib/api/errors"
import { ok, errorResponse } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import {
  sendEmailWithResend,
  generateAuthorizationEmailHtml,
  generateSurgeryFormalEmailHtml,
} from "@/lib/services/resend.service"
import { createSeguimientoEntry } from "@/lib/services/seguimiento.service"
import { MAIL_MAX_REQUEST_BYTES, validateMailBody } from "@/lib/validators/mail.validator"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

const MAIL_MUTATION_ROLES = ["admin", "manager", "coordinator", "operator", "owner", "super_admin"] as const

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, MAIL_MUTATION_ROLES)

    // Bound the stream before JSON parsing (Content-Length alone is untrusted).
    const reader = request.body?.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAIL_MAX_REQUEST_BYTES) {
          await reader.cancel()
          throw badRequest("El correo supera el máximo de 22 MB de solicitud.", "mail_request_too_large")
        }
        chunks.push(value)
      }
    }
    let input: unknown
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"))
    } catch {
      throw badRequest("JSON inválido", "invalid_json_body")
    }
    const body = validateMailBody(input)
    // This existing resolver must succeed BEFORE any provider side effect.
    const resolvedSurgery = body.surgeryId ? await resolveCompanySurgery(ctx.companyId, body.surgeryId) : undefined
    const signature = {
      name: [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.email,
      email: ctx.user.email,
      companyName: ctx.activeCompany.name,
    }

    // Determine HTML body
    let finalHtml = body.templateType === "authorization" ? "" : body.html || ""
    if (!finalHtml) {
      if (body.templateType === "authorization" && body.authorizationData) {
        finalHtml = generateAuthorizationEmailHtml({ ...body.authorizationData, signature }, body.attachments)
      } else if (body.templateType === "surgery_created" && body.formalSurgeryData) {
        finalHtml = generateSurgeryFormalEmailHtml({ ...body.formalSurgeryData, signature })
      } else if (body.formalSurgeryData) {
        finalHtml = generateSurgeryFormalEmailHtml({ ...body.formalSurgeryData, signature })
      } else {
        finalHtml = generateSurgeryFormalEmailHtml({ title: body.subject, patientName: "", bodyText: body.text || body.subject, signature })
      }
    }

    // Dispatch email
    const result = await sendEmailWithResend({
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: finalHtml,
      text: body.text,
      attachments: body.attachments,
      senderName: `${signature.name} · ${signature.companyName}`,
      replyTo: ctx.user.email,
    })

    if (!result.success || !result.id?.trim()) {
      throw badRequest(result.error || "No se pudo enviar el correo vía Resend", "mail_dispatch_failed")
    }

    // If surgeryId is provided, record in seguimiento feed
    let auditRecorded = false
    let warning: string | undefined
    if (resolvedSurgery) {
      try {
        const recipientList = [
          ...body.to,
          ...(body.cc ? body.cc.map((c) => `(cc) ${c}`) : []),
        ].join(", ")

        const authorDisplayName =
          [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.email

        // Honest audit copy: if the request was processed in DEV/simulated mode
        // (no real provider call), the audit entry must say so — never "Correo enviado".
        const contentHeader = result.devMode
          ? `🧪 Correo simulado; no fue entregado.`
          : `📧 Correo aceptado por el proveedor (no se confirma entrega).`
        const summaryText = result.devMode
          ? `Simulación de correo formal a ${body.to[0]}${body.to.length > 1 ? ` +${body.to.length - 1}` : ""}`
          : `Aceptación de correo formal a ${body.to[0]}${body.to.length > 1 ? ` +${body.to.length - 1}` : ""}`

        await createSeguimientoEntry(prisma, {
          companyId: ctx.companyId,
          surgeryId: resolvedSurgery.id,
          authorId: ctx.user.id,
          entryType: "note",
          content: `${contentHeader}\nDestinatarios: ${recipientList}\nAsunto: ${body.subject}${
            body.attachments && body.attachments.length > 0
              ? `\nAdjuntos (${body.attachments.length}): ${body.attachments.map((a) => a.filename).join(", ")}`
              : ""
          }${
            result.devMode
              ? `\nModo: simulación DEV (sin despacho real; id simulado: ${result.id ?? "n/a"}).`
              : `\nModo: proveedor real (id de aceptación: ${result.id ?? "n/a"}; la entrega depende del proveedor).`
          }`,
          summary: summaryText,
        })
        auditRecorded = true
      } catch (logError) {
        console.warn("[Mail Route] Could not record seguimiento entry:", logError)
        warning = "El correo fue procesado, pero no se pudo registrar en Novedades. No lo reenvíes para corregir el registro."
      }
    }

    return ok({
      success: true,
      id: result.id,
      devMode: !!result.devMode,
      recipients: body.to,
      subject: body.subject,
      auditRecorded,
      warning,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

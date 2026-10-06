import { z } from "zod"
import { badRequest } from "@/lib/api/errors"
import type { EmailAttachment } from "@/lib/services/resend.service"

export const MAIL_MAX_REQUEST_BYTES = 22 * 1024 * 1024
export const MAIL_MAX_FILE_BYTES = 6 * 1024 * 1024
export const MAIL_MAX_BASE64_LENGTH = 20 * 1024 * 1024
export const MAIL_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"] as const
const header = z.string().trim().min(1).max(300).regex(/^[^\r\n\x00-\x1f\x7f]+$/)
export const mailAddressSchema = z.string().trim().max(254).email().regex(/^[^\r\n]+$/)
const optionalText = z.string().max(2000).optional()
const authorizationSchema = z.object({
  patientName: z.string().max(2000), patientDni: optionalText, patientCuil: optionalText,
  claimNumber: optionalText, authorizationNumber: optionalText, administrator: optionalText,
  clientOrArt: optionalText, surgeonName: optionalText, institutionName: optionalText,
  surgeryDate: optionalText, notes: z.string().max(10000).optional(),
})
const formalSchema = z.object({
  title: z.string().max(2000), patientName: z.string().max(2000), surgeonName: optionalText,
  institutionName: optionalText, surgeryDate: optionalText, procedure: optionalText,
  bodyText: z.string().max(10000).optional(),
})
const attachmentSchema = z.object({
  filename: header, content: z.string().min(1).max(8 * 1024 * 1024 + 100),
  contentType: z.enum(MAIL_MIME_TYPES).optional(),
  contentId: z.string().max(100).regex(/^[a-zA-Z0-9_.@-]+$/).optional(),
})
const mailSchema = z.object({
  surgeryId: header.optional(), to: z.array(mailAddressSchema).min(1).max(50),
  cc: z.array(mailAddressSchema).max(50).optional(), bcc: z.array(mailAddressSchema).max(50).optional(),
  subject: header, html: z.string().max(100000).optional(), text: z.string().max(10000).optional(),
  templateType: z.enum(["authorization", "surgery_created", "custom"]).optional(),
  authorizationData: authorizationSchema.optional(), formalSurgeryData: formalSchema.optional(),
  attachments: z.array(attachmentSchema).max(8).optional(),
})

/** Shared by browser evidence loading and dispatch; excludes active formats such as SVG. */
export function normalizeMailAttachments(input: EmailAttachment[], inline = false): EmailAttachment[] {
  const parsed = z.array(attachmentSchema).max(8).safeParse(input)
  if (!parsed.success) throw badRequest("Adjuntos inválidos: usá imágenes PNG/JPEG/WebP/GIF o PDF, hasta 8 archivos de 6 MB.", "invalid_mail_attachments")
  let total = 0
  return parsed.data.map((attachment, index) => {
    const dataUrl = /^data:([^;,]+);base64,([\s\S]+)$/.exec(attachment.content)
    const content = dataUrl ? dataUrl[2] : attachment.content
    const contentType = attachment.contentType || dataUrl?.[1]
    if (!contentType || !MAIL_MIME_TYPES.includes(contentType as typeof MAIL_MIME_TYPES[number]) || (dataUrl && contentType !== dataUrl[1]) || content.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) {
      throw badRequest(`El adjunto ${attachment.filename} no contiene base64/MIME válido.`, "invalid_mail_attachment_content")
    }
    // Check file signatures without decoding the whole payload in the browser.
    const bytes = atob(content.slice(0, 32))
    const validSignature = contentType === "image/png" ? bytes.startsWith("\x89PNG\r\n\x1a\n")
      : contentType === "image/jpeg" ? bytes.startsWith("\xff\xd8\xff")
      : contentType === "image/gif" ? /^GIF8[79]a/.test(bytes)
      : contentType === "image/webp" ? bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP"
      : bytes.startsWith("%PDF-")
    if (!validSignature) throw badRequest(`El contenido de ${attachment.filename} no coincide con su tipo.`, "invalid_mail_attachment_content")
    total += content.length
    if (content.length * 3 / 4 > MAIL_MAX_FILE_BYTES || total > MAIL_MAX_BASE64_LENGTH) {
      throw badRequest("Adjuntos demasiado grandes: máximo 6 MB por archivo y 20 MB de base64 total.", "mail_attachments_too_large")
    }
    return { filename: attachment.filename, content, contentType, ...(inline && contentType.startsWith("image/") ? { contentId: `authorization-${index + 1}` } : attachment.contentId ? { contentId: attachment.contentId } : {}) }
  })
}

export function validateMailBody(input: unknown) {
  const parsed = mailSchema.safeParse(input)
  if (!parsed.success) throw badRequest(`Solicitud de correo inválida (${parsed.error.issues[0]?.path.join(".") || "body"}). Revisá destinatarios, asunto y adjuntos.`, "invalid_mail_request")
  const body = parsed.data
  if (body.templateType === "authorization" && (!body.surgeryId || !body.authorizationData)) {
    throw badRequest("La autorización requiere caso y datos del mensaje.", "invalid_mail_request")
  }
  const attachments = normalizeMailAttachments(body.attachments || [], body.templateType === "authorization")
  if (body.templateType === "authorization" && !attachments.length) {
    throw badRequest("Seleccioná la evidencia de autorización o adjuntá el archivo real.", "missing_authorization_evidence")
  }
  return { ...body, attachments }
}

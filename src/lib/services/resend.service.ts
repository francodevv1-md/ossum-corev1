/** Operational email transport and shared, escaped templates. */
export interface EmailAttachment {
  filename: string
  content: string
  contentType?: string
  contentId?: string
}

export interface EmailSignature {
  name: string
  email?: string
  companyName: string
}

export interface SendEmailPayload {
  to: string[]
  cc?: string[]
  bcc?: string[]
  senderName?: string
  replyTo?: string
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

export interface EmailSendResult {
  success: boolean
  id?: string
  devMode?: boolean
  error?: string
}

export interface SurgeryAuthorizationEmailData {
  patientName: string
  patientDni?: string
  patientCuil?: string
  claimNumber?: string
  authorizationNumber?: string
  administrator?: string
  clientOrArt?: string
  surgeonName?: string
  institutionName?: string
  surgeryDate?: string
  prestadorName?: string
  prestadorAddress?: string
  prestadorEmail?: string
  items?: Array<{ code?: string; description: string; observations?: string; date?: string; quantity?: number | string }>
  notes?: string
  signature?: EmailSignature
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)
}

export async function sendEmailWithResend(payload: SendEmailPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey?.trim() || apiKey === "mock_key") {
    return { success: true, id: `dev_resend_${Date.now()}`, devMode: true }
  }

  // The mailbox is configuration-owned, never supplied by the browser.
  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim()
  const mailbox = configuredFrom?.match(/<([^<>]+)>$/)?.[1] || configuredFrom
  if (!mailbox || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(mailbox) || /[\r\n]/.test(configuredFrom!)) {
    return { success: false, error: "Configurá RESEND_FROM_EMAIL con un remitente de dominio verificado antes de enviar." }
  }
  const senderName = payload.senderName?.replace(/[\r\n<>"\\]/g, " ").trim()
  const from = senderName ? `${senderName} <${mailbox}>` : configuredFrom
  const replyTo = payload.replyTo || process.env.RESEND_REPLY_TO_EMAIL?.trim()
  if (replyTo && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(replyTo)) {
    return { success: false, error: "La dirección de respuesta configurada no es válida." }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: payload.to, subject: payload.subject, html: payload.html,
        ...(payload.cc?.length ? { cc: payload.cc } : {}),
        ...(payload.bcc?.length ? { bcc: payload.bcc } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(payload.text ? { text: payload.text } : {}),
        ...(payload.attachments?.length ? { attachments: payload.attachments.map((att) => ({
          filename: att.filename,
          content: att.content.startsWith("data:") ? att.content.slice(att.content.indexOf(",") + 1) : att.content,
          ...(att.contentType ? { content_type: att.contentType } : {}),
          ...(att.contentId ? { content_id: att.contentId } : {}),
        })) } : {}),
      }),
    })
    if (!response.ok) {
      return { success: false, error: `Resend API Error (${response.status}): ${await response.text()}` }
    }
    const data = await response.json() as { id?: unknown }
    if (typeof data.id !== "string" || !data.id.trim()) {
      return { success: false, error: "El proveedor no devolvió un identificador de aceptación." }
    }
    return { success: true, id: data.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al enviar el correo" }
  }
}

function signatureHtml(signature?: EmailSignature) {
  return signature ? `<p style="margin:24px 0 0;line-height:1.6">${[signature.name, signature.companyName, signature.email].filter(Boolean).map((value) => escapeEmailHtml(value!)).join("<br/>")}</p>` : ""
}

function summaryHtml(rows: Array<[string, string | undefined]>) {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:24px">${rows.filter(([, value]) => value).map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#64748b">${label}</td><td style="padding:4px 0;overflow-wrap:anywhere">${escapeEmailHtml(value!)}</td></tr>`).join("")}</table>`
}

function emailDocument(content: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff;color:#1e293b;font-family:Arial,sans-serif"><div style="max-width:720px;margin:0 auto;padding:24px;overflow-wrap:anywhere">${content}</div></body></html>`
}

/** Preview uses validated local data URLs; dispatch uses the same attachment's CID. */
export function generateAuthorizationEmailHtml(data: SurgeryAuthorizationEmailData, attachments: EmailAttachment[] = [], preview = false): string {
  const images = attachments.filter((att) => att.contentType?.startsWith("image/") && att.contentId)
  return emailDocument(
    `<p style="font-size:16px;line-height:1.6;margin:0 0 24px">${escapeEmailHtml(data.notes || "Compartimos la evidencia de autorización para este caso.").replace(/\r?\n/g, "<br/>")}</p>` +
    images.map((att) => {
      const src = preview ? `data:${att.contentType};base64,${att.content}` : `cid:${att.contentId}`
      return `<img src="${escapeEmailHtml(src)}" alt="${escapeEmailHtml(att.filename)}" style="display:block;width:100%;max-width:100%;height:auto;margin:0 0 20px"/>`
    }).join("") +
    summaryHtml([["Paciente", data.patientName], ["DNI", data.patientDni], ["Cobertura", data.clientOrArt], ["Médico", data.surgeonName], ["Institución", data.institutionName], ["Fecha", data.surgeryDate], ["Siniestro", data.claimNumber], ["Referencia de autorización", data.authorizationNumber]]) +
    signatureHtml(data.signature)
  )
}

export function generateSurgeryFormalEmailHtml(options: {
  title: string
  patientName: string
  surgeonName?: string
  institutionName?: string
  surgeryDate?: string
  procedure?: string
  companyName?: string
  bodyText?: string
  signature?: EmailSignature
}): string {
  return emailDocument(`<h1 style="font-size:18px">${escapeEmailHtml(options.title)}</h1><p style="line-height:1.6">${escapeEmailHtml(options.bodyText || "Compartimos los datos operativos de la cirugía.").replace(/\r?\n/g, "<br/>")}</p>` +
    summaryHtml([["Paciente", options.patientName], ["Médico", options.surgeonName], ["Institución", options.institutionName], ["Fecha", options.surgeryDate], ["Procedimiento", options.procedure]]) +
    signatureHtml(options.signature) + (!options.signature && options.companyName ? `<p>${escapeEmailHtml(options.companyName)}</p>` : ""))
}

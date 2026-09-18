import { badRequest } from "@/lib/api/errors"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse } from "@/lib/api/responses"
import { downloadMailboxAttachment } from "@/lib/mail-stage1/service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import {
  validateAttachmentId,
  validateExternalConversationId,
  validateSurgeryId,
} from "@/lib/validators/mail-stage1.validator"

type RouteContext = {
  params: Promise<{
    companyId: string
    surgeryId: string
    externalConversationId: string
    attachmentId: string
  }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, externalConversationId, attachmentId } = await params
    validateSurgeryId(surgeryId)
    const normalizedConversationId = validateExternalConversationId(externalConversationId)
    const normalizedAttachmentId = validateAttachmentId(attachmentId)

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)
    await resolveCompanySurgery(ctx.companyId, surgeryId)

    const attachment = await downloadMailboxAttachment(
      companyId,
      normalizedConversationId,
      normalizedAttachmentId
    )

    if (!attachment.mimeType.startsWith("image/")) {
      throw badRequest("Solo se pueden previsualizar adjuntos imagen", "mail_attachment_preview_requires_image")
    }

    return new Response(new Uint8Array(attachment.buffer), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Content-Length": String(attachment.buffer.length),
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

import { ZodError } from "zod"
import { badRequest, internalError } from "@/lib/api/errors"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyMutationAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { downloadMailboxAttachment } from "@/lib/mail-stage1/service"
import { MAIL_STAGE1_MUTATION_ROLES } from "@/lib/mail-stage1/permissions"
import type { MailAttachmentTextExtractionResult } from "@/lib/mail-stage1/types"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import { extractAutorizacion } from "@/lib/services/ai/autorizacion-extractor"
import { buildAutorizacionSeguimientoText } from "@/lib/services/ai/autorizacion-note"
import { assertAiExtractableFileSpec } from "@/lib/services/ai/file-validation"
import { AutorizacionAIResponseSchema } from "@/lib/validators/autorizacion-ai"
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

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, externalConversationId, attachmentId } = await params
    validateSurgeryId(surgeryId)
    const normalizedConversationId = validateExternalConversationId(externalConversationId)
    const normalizedAttachmentId = validateAttachmentId(attachmentId)

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyMutationAccess(ctx, MAIL_STAGE1_MUTATION_ROLES)
    await resolveCompanySurgery(ctx.companyId, surgeryId)

    const attachment = await downloadMailboxAttachment(
      companyId,
      normalizedConversationId,
      normalizedAttachmentId
    )

    if (!attachment.mimeType.startsWith("image/")) {
      throw badRequest(
        "Solo se puede extraer texto desde adjuntos imagen en este flujo",
        "mail_attachment_extract_requires_image"
      )
    }

    assertAiExtractableFileSpec({
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })

    const extracted = AutorizacionAIResponseSchema.parse(
      await extractAutorizacion({
        buffer: attachment.buffer,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
      })
    )

    const response: MailAttachmentTextExtractionResult = {
      attachmentId: attachment.attachmentId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      text: buildAutorizacionSeguimientoText(extracted, { fileName: attachment.fileName }),
      provider: extracted.provider,
      confidence: extracted.confidence,
      looksLikeAuthorization: extracted.looks_like_authorization,
      warnings: extracted.warnings,
    }

    return ok(response)
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        internalError("Invalid AI provider response schema", "invalid_ai_response_schema")
      )
    }

    return errorResponse(error)
  }
}

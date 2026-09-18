import { notFound, internalError } from "@/lib/api/errors"
import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse } from "@/lib/api/responses"
import { mailEvidenceStore } from "@/lib/mail-stage1/evidence-store"
import { mailStage1Repository } from "@/lib/mail-stage1/repository"
import { getMailProvider } from "@/lib/mail-stage1/provider/provider-factory"
import { MAIL_STAGE1_MAILBOX } from "@/lib/mail-stage1/types"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"

type RouteContext = {
  params: Promise<{
    companyId: string
    surgeryId: string
    linkId: string
    attachmentId: string
  }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, linkId, attachmentId } = await params

    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)
    await resolveCompanySurgery(ctx.companyId, surgeryId)

    const document = await mailStage1Repository.getCompanyDocument(companyId)
    const link = document.links[linkId]

    if (!link || link.surgeryId !== surgeryId || link.linkStatus !== "active") {
      throw notFound("Mail link not found", "mail_link_not_found")
    }

    const snapshot = document.conversations[link.conversationKey]
    if (!snapshot) {
      throw notFound("Stored mail snapshot not found", "mail_provider_snapshot_unavailable")
    }

    const attachment = snapshot.attachments.find((a) => a.attachmentId === attachmentId)
    if (!attachment) {
      throw notFound("Attachment not found in stored snapshot", "mail_attachment_not_found")
    }

    if (attachment.persistenceState !== "stored" || !attachment.storedFileRef) {
      throw notFound("Attachment not yet persisted", "mail_attachment_not_persisted")
    }

    let buffer: Buffer
    try {
      buffer = await mailEvidenceStore.read(attachment.storedFileRef)
    } catch (fileError: unknown) {
      const errnoError = fileError as NodeJS.ErrnoException
      const isMissing = errnoError?.code === "ENOENT" || (fileError instanceof Error && fileError.name === "NoSuchKey")
      if (!isMissing) throw fileError

      // File missing on disk — try re-downloading from the mail provider
      try {
        const provider = getMailProvider()
        const downloaded = await provider.downloadAttachment({
          mailbox: MAIL_STAGE1_MAILBOX,
          externalConversationId: snapshot.externalConversationId,
          providerAttachmentRef: attachment.providerAttachmentRef,
          companyId,
        })

        const resolvedFileName = downloaded.fileName || attachment.fileName
        const resolvedMimeType = downloaded.mimeType || attachment.mimeType

        const freshRef = await mailStage1Repository.persistAttachmentBinary({
          companyId,
          surgeryId,
          conversationId: snapshot.externalConversationId,
          conversationKey: link.conversationKey,
          attachment: { ...attachment, fileName: resolvedFileName, mimeType: resolvedMimeType },
          buffer: downloaded.buffer,
        })

        // Update storedFileRef so future requests find the file
        attachment.storedFileRef = freshRef
        attachment.lastPersistenceError = undefined
        document.conversations[link.conversationKey] = snapshot
        await mailStage1Repository.saveCompanyDocument(companyId, document)

        buffer = downloaded.buffer
      } catch (downloadError: unknown) {
        throw internalError(
          `Attachment file not on disk and re-download failed: ${downloadError instanceof Error ? downloadError.message : "unknown"}`,
          "mail_attachment_persist_failed"
        )
      }
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

import { errorResponse } from "@/lib/api/responses"
import {
  buildDigitalReceiptDownloadArtifact,
  createDigitalReceiptDomainError,
  createDigitalReceiptRepositories,
  hashDigitalReceiptAccessToken,
  isDigitalReceiptDomainError,
  publicDigitalReceiptService,
} from "@/lib/digital-receipts"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ token: string }>
}

function toPublicDigitalReceiptApiError(error: unknown) {
  if (!isDigitalReceiptDomainError(error)) {
    return error
  }

  switch (error.code) {
    case "digital_receipt_access_token_invalid":
    case "digital_receipt_signer_mismatch":
    case "digital_receipt_event_invalid":
      return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    case "digital_receipt_not_found":
      return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    case "digital_receipt_access_consumed":
    case "digital_receipt_access_expired":
    case "digital_receipt_access_revoked":
    case "digital_receipt_already_signed":
      return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    default:
      return error
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const format = new URL(request.url).searchParams.get("format") === "html" ? "html" : "pdf"

    const publicReceipt = await publicDigitalReceiptService.getPublicDigitalReceiptByToken(token, {
      markOpened: false,
    })

    if (publicReceipt.activeAccessStatus === "revoked" || publicReceipt.activeAccessStatus === "expired") {
      throw createDigitalReceiptDomainError(
        publicReceipt.activeAccessStatus === "revoked"
          ? "digital_receipt_access_revoked"
          : "digital_receipt_access_expired",
        publicReceipt.activeAccessStatus === "revoked"
          ? "Digital receipt public access was revoked"
          : "Digital receipt public access expired",
        {
          accessId: publicReceipt.activeAccessId,
          receiptId: publicReceipt.id,
        }
      )
    }

    const repositories = createDigitalReceiptRepositories(prisma)
    const access = await repositories.accesses.findByTokenHash(hashDigitalReceiptAccessToken(token))

    if (!access) {
      throw new Error("Validated public digital receipt access disappeared before artifact render")
    }

    const aggregate = await repositories.receipts.getAggregateById(access.receiptId)

    if (!aggregate) {
      throw new Error("Validated public digital receipt could not be reloaded before artifact render")
    }

    const artifact = buildDigitalReceiptDownloadArtifact({
      aggregate,
      access,
      token,
      format,
    })

    return new Response(artifact.content, {
      status: 200,
      headers: {
        "Content-Type": artifact.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(artifact.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    const mapped = toPublicDigitalReceiptApiError(error)
    return mapped instanceof Response ? mapped : errorResponse(mapped)
  }
}

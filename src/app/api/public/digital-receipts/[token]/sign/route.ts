import { badRequest, conflict, notFound } from "@/lib/api/errors"
import { errorResponse, ok } from "@/lib/api/responses"
import { isDigitalReceiptDomainError, publicDigitalReceiptService } from "@/lib/digital-receipts"

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
      return badRequest(error.message, error.code)
    case "digital_receipt_not_found":
      return notFound(error.message, error.code)
    case "digital_receipt_access_consumed":
    case "digital_receipt_access_expired":
    case "digital_receipt_access_revoked":
    case "digital_receipt_already_signed":
      return conflict(error.message, error.code)
    default:
      return error
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    let body: Record<string, unknown> = {}

    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body")
    }

    return ok(
      await publicDigitalReceiptService.signPublicDigitalReceiptByToken(token, {
        signerDocument: typeof body.signerDocument === "string" ? body.signerDocument : "",
        signature: typeof body.signature === "string" ? body.signature : "",
        signerName: typeof body.signerName === "string" ? body.signerName : undefined,
        signatureDataUrl: typeof body.signatureDataUrl === "string" ? body.signatureDataUrl : undefined,
        accepted: body.accepted === true,
        metadata: {
          userAgent: request.headers.get("user-agent") ?? undefined,
          origin: request.headers.get("origin") ?? undefined,
          referer: request.headers.get("referer") ?? undefined,
        },
      })
    )
  } catch (error) {
    return errorResponse(toPublicDigitalReceiptApiError(error))
  }
}

import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse } from "@/lib/api/responses"
import { buildDigitalReceiptDownloadArtifact, digitalReceiptService } from "@/lib/digital-receipts"

import { toDigitalReceiptApiError } from "../../_shared"

type RouteContext = {
  params: Promise<{ companyId: string; receiptId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, receiptId } = await params
    const format = new URL(request.url).searchParams.get("format") === "html" ? "html" : "pdf"
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const detail = await digitalReceiptService.getDigitalReceiptDetail(ctx.companyId, receiptId)
    const activeAccess = detail.accesses.find((access) => access.accessId === detail.receipt.activeAccessId)
    const artifact = buildDigitalReceiptDownloadArtifact({ aggregate: detail, access: activeAccess, format })

    return new Response(artifact.content, {
      status: 200,
      headers: {
        "Content-Type": artifact.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(artifact.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return errorResponse(toDigitalReceiptApiError(error))
  }
}

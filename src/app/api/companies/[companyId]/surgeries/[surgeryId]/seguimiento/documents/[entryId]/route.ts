import { getApiAuthContext } from "@/lib/api/auth-context"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { readOperationalDocument } from "@/lib/services/operational-document-upload.service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"

type RouteContext = { params: Promise<{ companyId: string; surgeryId: string; entryId: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId, entryId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)
    const surgery = await resolveCompanySurgery(ctx.companyId, surgeryId)
    const document = await readOperationalDocument({
      prisma,
      companyId: ctx.companyId,
      surgeryId: surgery.id,
      entryId,
    })
    const fileName = document.fileName.replace(/["\r\n]/g, "_")

    return new Response(document.bytes as BodyInit, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

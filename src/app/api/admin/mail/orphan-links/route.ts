import { getApiAuthContext } from "@/lib/api/auth-context"
import { badRequest } from "@/lib/api/errors"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import { buildMailStage1OrphanLinkReport } from "@/lib/mail-stage1/orphan-link-report"

function parseBooleanQueryParam(value: string | null) {
  if (value === null) {
    return false
  }

  const normalized = value.trim().toLowerCase()

  if (["1", "true", "yes"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false
  }

  throw badRequest("includeUnlinked must be a boolean value", "invalid_include_unlinked")
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const companyId = url.searchParams.get("companyId")

    if (!companyId) {
      throw badRequest("companyId query param required", "missing_company_id")
    }

    const includeUnlinked = parseBooleanQueryParam(url.searchParams.get("includeUnlinked"))
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    return ok(await buildMailStage1OrphanLinkReport(companyId, { includeUnlinked }))
  } catch (error) {
    return errorResponse(error)
  }
}

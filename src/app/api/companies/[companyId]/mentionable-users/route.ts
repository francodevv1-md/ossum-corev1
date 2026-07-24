import { getApiAuthContext } from "@/lib/api/auth-context"
import { getNonNegativeIntegerParam, getStringParam } from "@/lib/api/query"
import { requireCompanyReadAccess } from "@/lib/api/guards"
import { errorResponse, ok } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { searchMentionableUsers } from "@/lib/services/mentionable-users.service"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireCompanyReadAccess(ctx)

    const searchParams = new URL(request.url).searchParams
    const query = getStringParam(searchParams, "q") ?? ""
    const take = getNonNegativeIntegerParam(searchParams, "take") ?? 8

    const users = await searchMentionableUsers(prisma, ctx.companyId, query, take)
    return ok(users)
  } catch (error) {
    return errorResponse(error)
  }
}

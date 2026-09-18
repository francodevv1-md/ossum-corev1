import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { ApiError, badRequest } from "../../../../../../../lib/api/errors";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import { GeorefLookupUnavailableError, lookupGeorefAddress } from "../../../../../../../lib/georef/georef-address.adapter";
import { contactGeorefLookupSchema } from "../../../../../../../lib/validators/contact";
type RouteContext = { params: Promise<{ companyId: string }> };
export async function POST(request: Request, { params }: RouteContext) { try { const { companyId } = await params, ctx = await getApiAuthContext(request, companyId); requireCompanyMutationAccess(ctx, ["admin", "operator"]); let body: unknown; try { body = await request.json() } catch { throw badRequest("Invalid JSON body", "invalid_json_body") }; const parsed = contactGeorefLookupSchema.safeParse(body); if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message, "invalid_georef_lookup"); return ok({ candidates: await lookupGeorefAddress(parsed.data) }) } catch (error) { if (error instanceof GeorefLookupUnavailableError) return errorResponse(new ApiError(503, error.code, "Georef lookup is temporarily unavailable.")); return errorResponse(error) } }

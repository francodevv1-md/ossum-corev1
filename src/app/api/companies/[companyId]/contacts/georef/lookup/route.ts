import { getApiAuthContext } from "../../../../../../../lib/api/auth-context";
import { ApiError, badRequest } from "../../../../../../../lib/api/errors";
import { requireCompanyMutationAccess } from "../../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../../lib/api/responses";
import { GeorefLookupUnavailableError, lookupGeorefAddress } from "../../../../../../../lib/georef/georef-address.adapter";
import { z } from "zod";

type RouteContext = { params: Promise<{ companyId: string }> };
const lookupSchema = z.object({ street: z.string().trim().min(1).max(240), number: z.string().trim().max(30).optional().nullable(), city: z.string().trim().max(120).optional().nullable(), state: z.string().trim().max(120).optional().nullable(), country: z.literal("AR").optional() }).strict();

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, ["admin", "operator"]);
    const parsed = lookupSchema.safeParse(await request.json());
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message, "invalid_georef_lookup");
    return ok({ candidates: await lookupGeorefAddress(parsed.data) });
  } catch (error) {
    if (error instanceof GeorefLookupUnavailableError) return errorResponse(new ApiError(503, error.code, "Georef lookup is temporarily unavailable."));
    return errorResponse(error);
  }
}

import { badRequest } from "@/lib/api/errors"
export function validateLogisticsMapQuery(searchParams: URLSearchParams) { const raw = searchParams.get("limit"), limit = raw == null || !raw.trim() ? 250 : Number(raw); if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw badRequest("limit must be an integer between 1 and 500", "logistics_map_query_invalid"); return { limit } }

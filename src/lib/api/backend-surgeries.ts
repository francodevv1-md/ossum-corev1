import { apiFetch } from "@/lib/api/client"
import {
  mapApiSurgeryListToSurgeries,
  type RawSurgeryApiRecord,
} from "@/lib/api/surgery-adapter"
import type { Surgery } from "@/types"

export async function fetchBackendActiveSurgeries(
  companyId: string,
  existingSurgeries: Surgery[] = []
) {
  const data = await apiFetch<RawSurgeryApiRecord[]>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries`
  )

  return mapApiSurgeryListToSurgeries(data, existingSurgeries)
}

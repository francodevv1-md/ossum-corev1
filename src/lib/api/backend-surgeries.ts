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

export async function updateBackendSurgeryManagement(
  companyId: string,
  surgeryId: string,
  input: {
    surgeryDate?: string | null
    priority?: "normal" | "urgent"
    materialShippingDate?: string | null
    materialTransport?: string | null
  }
) {
  return apiFetch<RawSurgeryApiRecord>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
}

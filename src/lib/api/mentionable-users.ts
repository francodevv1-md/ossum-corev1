import { apiFetch } from "@/lib/api/client"
import type { MentionLookupUser } from "@/lib/mentions/types"

export async function fetchMentionableUsers(companyId: string, query: string, take = 8) {
  const params = new URLSearchParams()
  params.set("q", query)
  params.set("take", String(take))

  return apiFetch<MentionLookupUser[]>(
    `/api/companies/${encodeURIComponent(companyId)}/mentionable-users?${params.toString()}`
  )
}

import { apiFetch } from "@/lib/api/client"
import {
  mapApiSurgeryListToSurgeries,
  type RawSurgeryApiRecord,
} from "@/lib/api/surgery-adapter"
import type { Surgery } from "@/types"
import type { MentionRef } from "@/lib/mentions/types"

export type FetchBackendActiveSurgeriesParams = {
  branchId?: string | null
}

export function fetchBackendSurgery(companyId: string, surgeryId: string) {
  return apiFetch<RawSurgeryApiRecord>(`/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}`, { cache: "no-store" })
}

export async function fetchBackendActiveSurgeries(
  companyId: string,
  existingSurgeries: Surgery[] = [],
  params: FetchBackendActiveSurgeriesParams = {}
) {
  const search = new URLSearchParams()
  if (params.branchId) search.set("branchId", params.branchId)
  const query = search.toString()
  const data = await apiFetch<RawSurgeryApiRecord[]>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries${query ? `?${query}` : ""}`
  )

  return mapApiSurgeryListToSurgeries(data, existingSurgeries)
}

export async function updateBackendSurgeryManagement(
  companyId: string,
  surgeryId: string,
  input: {
    coordinatorContactId?: string | null
    surgeryDate?: string | null
    surgeryTimeSpecified?: boolean | null
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
export function mapUiStateToCanonicalCxStatus(state?: string | null): string {
  if (!state) return "pending"
  const trimmed = state.trim().toLowerCase()
  switch (trimmed) {
    case "autorizada":
    case "authorized":
      return "authorized"
    case "en tránsito":
    case "en transito":
    case "in transit":
    case "in_transit":
      return "in_transit"
    case "scheduled":
    case "scheduled":
    case "programada":
      return "scheduled"
    case "realizada":
    case "performed":
      return "performed"
    case "finalizada":
    case "finalized":
      return "finalized"
    case "suspendida":
    case "suspended":
      return "suspended"
    case "cancelada":
    case "cancelled":
      return "cancelled"
    case "sin autorizar":
    case "sin fecha":
    case "unauthorized":
      return "unauthorized"
    case "pendiente":
    case "pending":
    default:
      return "pending"
  }
}

export async function updateBackendSurgeryState(
  companyId: string,
  surgeryId: string,
  state: string,
  source = "coordination"
) {
  const canonicalStatus = mapUiStateToCanonicalCxStatus(state)
  return apiFetch<RawSurgeryApiRecord>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: canonicalStatus, source }),
    }
  )
}

export async function addBackendSurgeryNote(
  companyId: string,
  surgeryId: string,
  payload: {
    content: string
    noteType?: string
    priority?: string
    isUrgent?: boolean
    mentions?: MentionRef[]
  }
) {
  return apiFetch(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/seguimiento`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: payload.content,
        entryType: "note",
        mentions: payload.mentions,
        evidenceRef: {
          noteType: (payload.noteType || "Coordinación").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
          priority: (payload.priority || "Media").toLowerCase(),
          highlighted: payload.isUrgent || false,
        },
      }),
    }
  )
}

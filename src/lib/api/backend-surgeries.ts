import { apiFetch } from "@/lib/api/client"
import {
  mapApiSurgeryListToSurgeries,
  type RawSurgeryApiRecord,
} from "@/lib/api/surgery-adapter"
import type { Surgery } from "@/types"

export type FetchBackendActiveSurgeriesParams = {
  branchId?: string | null
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
  switch (state.trim().toLowerCase()) {
    case "autorizada":
    case "authorized":
      return "authorized"
    case "en tránsito":
    case "en transito":
    case "programada":
    case "scheduled":
    case "in_transit":
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
    case "unauthorized":
      return "unauthorized"
    case "pendiente":
    case "sin fecha":
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
  }
) {
  return apiFetch(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/seguimiento`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: payload.content,
        entryType: payload.noteType || "Coordinación",
        priority: payload.priority || "Media",
        isUrgent: payload.isUrgent || false,
      }),
    }
  )
}

import { apiFetch } from "@/lib/api/client"
import type {
  ReissueDigitalReceiptAccessResult,
  SafeDigitalReceiptAggregate,
  SafeDigitalReceiptAccess,
} from "@/lib/digital-receipts"
import type {
  CreateInternalReceiptDraftPayload,
  IssueInternalReceiptPayload,
  ReceiptCreateDefaults,
  ReissueInternalReceiptPayload,
} from "@/lib/digital-receipts/ui"

type ReceiptListFilters = {
  surgeryId?: string
  query?: string
}

function buildBaseUrl(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/digital-receipts`
}

export async function listInternalDigitalReceipts(companyId: string, filters: ReceiptListFilters = {}) {
  const params = new URLSearchParams()
  if (filters.surgeryId) params.set("surgeryId", filters.surgeryId)
  if (filters.query) params.set("query", filters.query)
  const query = params.toString()

  return apiFetch<Array<SafeDigitalReceiptAggregate["receipt"]>>(`${buildBaseUrl(companyId)}${query ? `?${query}` : ""}`)
}

export async function getInternalDigitalReceiptDetail(companyId: string, receiptId: string) {
  return apiFetch<SafeDigitalReceiptAggregate>(`${buildBaseUrl(companyId)}/${encodeURIComponent(receiptId)}`)
}

export async function getInternalDigitalReceiptCreateDefaults(companyId: string, surgeryId: string) {
  const params = new URLSearchParams({ surgeryId })
  return apiFetch<ReceiptCreateDefaults>(`${buildBaseUrl(companyId)}/defaults?${params.toString()}`)
}

export async function createInternalDigitalReceiptDraft(companyId: string, payload: CreateInternalReceiptDraftPayload) {
  return apiFetch<SafeDigitalReceiptAggregate>(buildBaseUrl(companyId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export async function issueInternalDigitalReceipt(companyId: string, receiptId: string, payload: IssueInternalReceiptPayload) {
  return apiFetch<ReissueDigitalReceiptAccessResult>(
    `${buildBaseUrl(companyId)}/${encodeURIComponent(receiptId)}/issue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )
}

export async function reissueInternalDigitalReceiptAccess(
  companyId: string,
  receiptId: string,
  payload: ReissueInternalReceiptPayload
) {
  return apiFetch<ReissueDigitalReceiptAccessResult>(
    `${buildBaseUrl(companyId)}/${encodeURIComponent(receiptId)}/accesses/reissue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )
}

export async function revokeInternalDigitalReceipt(companyId: string, receiptId: string, reason?: string) {
  return apiFetch<SafeDigitalReceiptAggregate>(`${buildBaseUrl(companyId)}/${encodeURIComponent(receiptId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reason ? { reason } : {}),
  })
}

export async function revokeInternalDigitalReceiptAccess(
  companyId: string,
  receiptId: string,
  accessId: string,
  reason?: string
) {
  return apiFetch<SafeDigitalReceiptAggregate>(
    `${buildBaseUrl(companyId)}/${encodeURIComponent(receiptId)}/accesses/${encodeURIComponent(accessId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reason ? { reason } : {}),
    }
  )
}

export type { SafeDigitalReceiptAccess }

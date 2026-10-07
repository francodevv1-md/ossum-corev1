import { apiFetch } from "@/lib/api/client"
import type { ConsumptionBillingGateStatus } from "@/lib/services/billing-gate.service"

export type { ConsumptionBillingGateStatus }

export function fetchConsumptionBillingGate(companyId: string, consumoId: string) {
  return apiFetch<ConsumptionBillingGateStatus>(
    `/api/companies/${encodeURIComponent(companyId)}/consumos/${encodeURIComponent(consumoId)}/billing-override`
  )
}

export function submitConsumptionBillingOverride(companyId: string, consumoId: string, reason: string) {
  return apiFetch<{ success: boolean; override: ConsumptionBillingGateStatus["override"]; alreadyExisted: boolean }>(
    `/api/companies/${encodeURIComponent(companyId)}/consumos/${encodeURIComponent(consumoId)}/billing-override`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  )
}

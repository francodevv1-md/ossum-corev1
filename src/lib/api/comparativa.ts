import { apiFetch } from "@/lib/api/client"
import type {
  SurgeryComparativaResponse,
  LineaComparativaOperativa,
  ComparativaSummary,
  ComparativaSourcesInfo,
  EstadoLineaComparativa,
  MetodoMatch,
} from "@/lib/services/comparativa.service"

export type {
  SurgeryComparativaResponse,
  LineaComparativaOperativa,
  ComparativaSummary,
  ComparativaSourcesInfo,
  EstadoLineaComparativa,
  MetodoMatch,
}

export function fetchSurgeryComparativa(companyId: string, surgeryId: string) {
  return apiFetch<SurgeryComparativaResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/comparativa`
  )
}

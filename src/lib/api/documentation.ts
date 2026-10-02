import { apiFetch } from "@/lib/api/client"
import type { SurgeryDocumentationView } from "@/lib/services/surgery-documentation.service"
import type { DocumentationStatePatch } from "@/lib/validators/documentation.validator"

function path(companyId: string, surgeryId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/documentation`
}

export async function fetchDocumentation(companyId: string, surgeryId: string) {
  const result = await apiFetch<{ documentation: SurgeryDocumentationView }>(path(companyId, surgeryId), { cache: "no-store" })
  return result.documentation
}

export async function initializeDocumentation(companyId: string, surgeryId: string) {
  const result = await apiFetch<{ documentation: SurgeryDocumentationView; createdChecklist: boolean; insertedTypes: string[] }>(
    `${path(companyId, surgeryId)}/initialize`, { method: "POST" },
  )
  return result.documentation
}

export async function transitionDocumentation(companyId: string, surgeryId: string, itemId: string, patch: DocumentationStatePatch) {
  const result = await apiFetch<{ documentation: SurgeryDocumentationView }>(
    `${path(companyId, surgeryId)}/items/${encodeURIComponent(itemId)}/state`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) },
  )
  return result.documentation
}

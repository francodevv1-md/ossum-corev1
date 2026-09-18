import { apiFetch } from "@/lib/api/client";
import type {
  CoordinationViewResponse,
} from "@/lib/services/coordination-view.service";
import type { CoordinatorSubject } from "@/lib/services/personal-coordinator-resolver.service";

export type CoordinationViewClientRequest = (
  | { surface: "personal" | "global"; preview?: false }
  | { surface: "global"; preview: true }
  | { surface: "personal"; preview: true; target: CoordinatorSubject }
) & { take?: number; skip?: number };

export async function fetchCoordinationView(
  companyId: string,
  request: CoordinationViewClientRequest
): Promise<CoordinationViewResponse> {
  const params = new URLSearchParams({ surface: request.surface });
  if (request.preview === true) {
    params.set("preview", "true");
    if (request.surface === "personal") {
      params.set("subjectContactId", request.target.contactId);
    }
  }
  if (request.take !== undefined) params.set("take", String(request.take));
  if (request.skip !== undefined) params.set("skip", String(request.skip));

  return apiFetch<CoordinationViewResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/coordination/view?${params.toString()}`,
    { method: "GET", cache: "no-store" }
  );
}

import { apiFetch } from "@/lib/api/client";
import type { PrepStatus } from "@/lib/validators/surgery.validator";

export type UpdateSurgeryPreparationInput = {
  prepStatus: PrepStatus;
  source?: string;
};

export function updateSurgeryPreparation<T>(
  companyId: string,
  surgeryId: string,
  input: UpdateSurgeryPreparationInput
): Promise<T> {
  return apiFetch<T>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/preparation`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}

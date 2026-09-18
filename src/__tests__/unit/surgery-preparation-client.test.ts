import { describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiFetch }));

import { updateSurgeryPreparation } from "@/lib/api/surgery-preparation-client";

describe("updateSurgeryPreparation", () => {
  it("uses the supplied backend surgery ID and only the preparation endpoint/payload", async () => {
    apiFetch.mockResolvedValue({ id: "backend-surgery-1" });

    await updateSurgeryPreparation("company-1", "backend-surgery-1", {
      prepStatus: "preparing",
      source: "panel",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/companies/company-1/surgeries/backend-surgery-1/preparation",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ prepStatus: "preparing", source: "panel" }),
      })
    );
  });
});

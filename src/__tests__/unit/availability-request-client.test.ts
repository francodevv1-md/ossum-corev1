import { describe, expect, it, vi } from "vitest";

import {
  AvailabilityRequestClientError,
  completeAvailabilityRequest,
  getAvailabilityRequest,
  type AvailabilityRequestView,
} from "@/lib/api/availability-request-client";

const view: AvailabilityRequestView = {
  id: "request/1",
  companyId: "company 1",
  surgery: { id: "surgery-1", visibleNumber: "CX-1" },
  status: "OPEN",
  requestedAt: "2026-07-22T10:00:00.000Z",
  requester: { id: "user-1", displayName: "Requester" },
  creatorResolution: "identified_eligible",
  recipientReasonsForActor: ["creator"],
  canComplete: true,
  submittedDate: null,
  completedAt: null,
  completedBy: null,
};

function response(body: unknown, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("availability request client", () => {
  it("encodes candidate IDs and gets current detail without a body", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ data: view }));
    await expect(getAvailabilityRequest("company 1", "request/1", { fetch })).resolves.toEqual(view);
    expect(fetch).toHaveBeenCalledWith(
      "/api/companies/company%201/availability-requests/request%2F1",
      expect.objectContaining({ method: "GET" })
    );
    expect(fetch.mock.calls[0][1]).not.toHaveProperty("body");
  });

  it("posts only the unchanged date with the idempotency key", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ data: { ...view, submittedDate: "2026-07-24" } }));
    const result = await completeAvailabilityRequest(
      "company/1",
      "request 1",
      "2026-07-24",
      "availability-key-0001",
      { fetch }
    );
    expect(result.submittedDate).toBe("2026-07-24");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/companies/company%2F1/availability-requests/request%201/complete");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "Idempotency-Key": "availability-key-0001",
    });
    expect(JSON.parse(init.body)).toEqual({ date: "2026-07-24" });
  });

  it("propagates the AbortSignal", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockResolvedValue(response({ data: view }));
    await getAvailabilityRequest("company", "request", { fetch, signal: controller.signal });
    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it.each([
    [400, "validation"], [401, "authentication"], [403, "blocked"],
    [404, "not_found"], [409, "conflict"],
  ] as const)("maps %i responses to %s errors", async (status, kind) => {
    const fetch = vi.fn().mockResolvedValue(response({ error: { code: "stable_code", message: "raw secret" } }, status));
    const error = await getAvailabilityRequest("company", "request", { fetch }).catch((caught) => caught);
    expect(error).toMatchObject({ kind, status, code: "stable_code" });
    expect(error).toBeInstanceOf(AvailabilityRequestClientError);
    expect(error.message).not.toContain("raw secret");
  });

  it("uses a stable non-leaking fallback for malformed errors", async () => {
    const fetch = vi.fn().mockResolvedValue(response("private backend failure", 500));
    const error = await getAvailabilityRequest("company", "request", { fetch }).catch((caught) => caught);
    expect(error).toMatchObject({ kind: "unexpected", code: "availability_unexpected" });
    expect(error.message).not.toContain("private backend failure");
  });
});

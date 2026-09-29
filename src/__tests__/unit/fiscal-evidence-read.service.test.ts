import { describe, expect, it, vi } from "vitest";

import { getFiscalEvidence } from "@/lib/services/fiscal-evidence-read.service";

describe("fiscal evidence read projection", () => {
  it("returns persisted fiscal state and recursively sanitized response evidence only", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "fiscal-1", environment: "DEV_ONLY", state: "UNKNOWN", externalReference: "ossum-dev-1", snapshotHash: "a".repeat(64),
      createdAt: new Date("2026-09-24T12:00:00Z"), submittedAt: null, authorizedAt: null,
      attempts: [{
        id: "attempt-1", attemptNumber: 1, state: "UNKNOWN", externalReference: "ossum-dev-1", errorCode: "TFC-8002",
        responsePayload: { issuance: { response: { error: "N", external_reference: "ossum-dev-1", comprobante_nro: "00004-00000012", comprobante_pdf_url: "https://temporary.example/pdf", api_key: "must-not-leak", nested: { token: "must-not-leak" } } } },
        createdAt: new Date("2026-09-24T12:00:00Z"), updatedAt: new Date("2026-09-24T12:01:00Z"),
      }],
    });

    const evidence = await getFiscalEvidence({ fiscalDocument: { findFirst } } as never, "company-1", "invoice-1");

    expect(evidence).toMatchObject({ document: { id: "fiscal-1", state: "UNKNOWN", displayState: "SIMULATED", externalReference: "ossum-dev-1" } });
    expect(JSON.stringify(evidence)).not.toMatch(/api_key|token/);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", invoiceId: "invoice-1" } }));
  });
});

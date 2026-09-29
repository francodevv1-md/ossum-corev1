import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  handleTusFacturasWebhookDev: vi.fn(),
}));

vi.mock("@/lib/services/fiscal-issuance.service", () => ({
  handleTusFacturasWebhookDev: mocks.handleTusFacturasWebhookDev,
}));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }));

import { POST as postWebhook } from "@/app/api/webhooks/tusfacturas/route";

describe("tusfacturas webhook route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mocks.handleTusFacturasWebhookDev.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("fails closed without a configured webhook token", async () => {
    delete process.env.TUSFACTURAS_WEBHOOK_SECRET;

    const response = await postWebhook(new Request("http://localhost/api/webhooks/tusfacturas", {
      method: "POST",
      body: JSON.stringify({ evento: "emitido", external_reference: "REF-1" }),
    }));

    expect(response.status).toBe(500);
    expect(mocks.handleTusFacturasWebhookDev).not.toHaveBeenCalled();
  });

  it("validates secret token when configured", async () => {
    process.env.TUSFACTURAS_WEBHOOK_SECRET = "secret_123";

    const requestNoAuth = new Request("http://localhost/api/webhooks/tusfacturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento: "emitido", external_reference: "REF-1" }),
    });

    const response401 = await postWebhook(requestNoAuth);
    expect(response401.status).toBe(401);

    const requestWithAuth = new Request("http://localhost/api/webhooks/tusfacturas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TF-WebhookToken": "secret_123",
      },
      body: JSON.stringify({
        evento: "emitido",
        external_reference: "REF-1",
        comprobante_nro: "00001-00000010",
      }),
    });

    mocks.handleTusFacturasWebhookDev.mockResolvedValue({ success: true, state: "AUTHORIZED" });
    const response200 = await postWebhook(requestWithAuth);
    expect(response200.status).toBe(200);
    expect(mocks.handleTusFacturasWebhookDev).toHaveBeenCalledWith(
      { marker: "prisma" },
      expect.objectContaining({ external_reference: "REF-1" }),
    );
  });

  it("rejects query tokens and undocumented headers", async () => {
    process.env.TUSFACTURAS_WEBHOOK_SECRET = "secret_123";

    const response = await postWebhook(new Request("http://localhost/api/webhooks/tusfacturas?token=secret_123", {
      method: "POST",
      headers: { "x-tusfacturas-token": "secret_123" },
      body: JSON.stringify({ evento: "emitido", external_reference: "REF-1" }),
    }));

    expect(response.status).toBe(401);
    expect(mocks.handleTusFacturasWebhookDev).not.toHaveBeenCalled();
  });
});

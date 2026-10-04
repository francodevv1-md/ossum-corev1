import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { errorResponse } from "@/lib/api/responses";
import { OrdenCompraError } from "@/lib/services/orden-compra.service";

describe("OrdenCompraError response mapping (in-memory; no DB/API calls)", () => {
  it("preserves the declared receipt conflict status and code", async () => {
    const error = new OrdenCompraError("orden_compra_invalid_receipt", "Invalid receipt quantity");
    const response = errorResponse(error);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "orden_compra_invalid_receipt", message: "Invalid receipt quantity" } });
    expect(error).toBeInstanceOf(OrdenCompraError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ code: "orden_compra_invalid_receipt", status: 409 });
  });

  it("preserves the existing constructor signature and a custom status", async () => {
    const error = new OrdenCompraError("custom_oc_error", "Custom message", 422);
    const response = errorResponse(error);
    expect(error).toBeInstanceOf(OrdenCompraError);
    expect(error).toMatchObject({ code: "custom_oc_error", status: 422, message: "Custom message" });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: { code: "custom_oc_error", message: "Custom message" } });
  });

  it("keeps unexpected errors mapped to a generic 500", async () => {
    const response = errorResponse(new Error("Unexpected private detail"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal_error", message: "Internal server error" } });
  });
});

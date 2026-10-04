import { describe, expect, it } from "vitest";
import { ordenCompraCreateSchema, ordenCompraReceiveSchema } from "@/lib/validators/orden-compra";
describe("ordenCompraCreateSchema", () => { it("requires a positive line quantity", () => expect(ordenCompraCreateSchema.safeParse({ proveedorId: "p", proveedorName: "P", items: [{ stockItemId: "a", name: "A", code: "A", quantity: "0", unitPrice: "1" }] }).success).toBe(false)); });

describe("OC physical receiving contract (mocked; no database)", () => {
  const payload = { location: "QA destination", operationKey: "operation-1", receivedByItem: [{ itemId: "i", received: "1" }] };
  it("accepts explicit destination and operation identity", () => expect(ordenCompraReceiveSchema.safeParse(payload).success).toBe(true));
  it.each([
    { ...payload, location: " " }, { ...payload, operationKey: " " },
    { receivedByItem: payload.receivedByItem },
    { ...payload, receivedByItem: [] },
    { ...payload, receivedByItem: [{ itemId: "i", received: "0" }] },
    { ...payload, receivedByItem: [payload.receivedByItem[0], payload.receivedByItem[0]] },
    ...["NaN", "Infinity", "-1", "0.00001", ""].map(received => ({ ...payload, receivedByItem: [{ itemId: "i", received }] })),
  ])("rejects invalid intent %j", input => expect(ordenCompraReceiveSchema.safeParse(input).success).toBe(false));
});

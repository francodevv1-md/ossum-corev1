import { describe, expect, it } from "vitest";
import { ordenCompraCreateSchema } from "@/lib/validators/orden-compra";
describe("ordenCompraCreateSchema", () => { it("requires a positive line quantity", () => expect(ordenCompraCreateSchema.safeParse({ proveedorId: "p", proveedorName: "P", items: [{ stockItemId: "a", name: "A", code: "A", quantity: "0", unitPrice: "1" }] }).success).toBe(false)); });

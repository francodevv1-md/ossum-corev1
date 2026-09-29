import { describe, expect, it } from "vitest";
import { facturaCompraCreateSchema } from "@/lib/validators/factura-compra";
describe("facturaCompraCreateSchema", () => { it("requires a document number and items", () => expect(facturaCompraCreateSchema.safeParse({ proveedorId: "p", proveedorName: "P", number: "", date: "2026-09-29", items: [] }).success).toBe(false)); });

import { describe, expect, it } from "vitest";
import { createFacturaCompra } from "@/lib/services/factura-compra.service";
describe("createFacturaCompra", () => { it("rejects an empty item list before persistence", async () => await expect(createFacturaCompra({ companyId: "company", proveedorId: "supplier", proveedorName: "Supplier", number: "A-1", date: "2026-09-29", items: [], prisma: {} as never })).rejects.toMatchObject({ code: "factura_compra_empty_items" })); });

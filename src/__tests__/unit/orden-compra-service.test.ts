import { describe, expect, it } from "vitest";
import { createOrdenCompra } from "@/lib/services/orden-compra.service";
describe("createOrdenCompra", () => { it("rejects an empty item list before persistence", async () => await expect(createOrdenCompra({ companyId: "company", proveedorId: "supplier", proveedorName: "Supplier", items: [], prisma: {} as never })).rejects.toMatchObject({ code: "orden_compra_empty_items" })); });

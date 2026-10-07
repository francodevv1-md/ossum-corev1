import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  buildCajasAccountingPayload,
  buildCajasDispatchPayload,
  findActiveCajasAssignmentForSurgery,
  findCajasDispatchForRemito,
} from "@/lib/cajas-intent";
import * as cajasApi from "@/lib/api/cajas-assignments";
import { cajasAccountingSchema, cajasDispatchSchema } from "@/lib/validators/cajas-assignment";
import { validateConsumption } from "@/lib/services/consumo.service";
import { confirmDevolucion } from "@/lib/services/devolucion.service";

vi.mock("@/lib/services/internal-notifications.service", () => ({
  emitCrossDomainNotification: vi.fn().mockResolvedValue(undefined),
}));

const d = (n: number) => new Prisma.Decimal(n);

describe("Cajas UI-to-Document Intent Wiring, Associations & Guards", () => {
  describe("buildCajasDispatchPayload helper", () => {
    const baseAssignment: any = {
      id: "assignment-1",
      preparation: {
        version: 2,
        lines: [
          { id: "line-1", sku: "SKU-A", description: "Implant A", quantity: 5, unit: "u", isActive: true, articleReference: { sourceArticleId: "art-1" } },
          { id: "line-2", sku: "SKU-B", description: "Screw B", quantity: 10, unit: "u", isActive: true, articleReference: { sourceArticleId: "art-2" } },
        ],
      },
    };

    it("constructs valid Cajas dispatch payload matching cajasDispatchSchema", () => {
      const remito: any = {
        id: "remito-1",
        items: [
          { id: "remito-item-1", sku: "SKU-A", description: "Implant A", quantity: "2" },
          { id: "remito-item-2", sku: "SKU-B", description: "Screw B", quantity: 4 },
        ],
      };

      const payload = buildCajasDispatchPayload(baseAssignment, remito);
      expect(payload).not.toBeNull();
      expect(cajasDispatchSchema.parse(payload)).toEqual(payload);
      expect(payload).toEqual({
        assignmentId: "assignment-1",
        expectedVersion: 2,
        idempotencyKey: "dispatch-assignment-1-remito-1",
        lines: [
          { preparationLineId: "line-1", remitoItemId: "remito-item-1", quantity: 2 },
          { preparationLineId: "line-2", remitoItemId: "remito-item-2", quantity: 4 },
        ],
      });
    });

    it("matches line by explicit preparationLineId if provided", () => {
      const remito: any = {
        id: "remito-1",
        items: [
          { id: "remito-item-1", preparationLineId: "line-2", sku: "DIFFERENT-SKU", description: "Custom", quantity: 3 },
        ],
      };

      const payload = buildCajasDispatchPayload(baseAssignment, remito);
      expect(payload?.lines).toEqual([
        { preparationLineId: "line-2", remitoItemId: "remito-item-1", quantity: 3 },
      ]);
    });

    it("matches line by articleId / itemId when SKU is absent", () => {
      const remito: any = {
        id: "remito-1",
        items: [
          { id: "remito-item-1", itemId: "art-1", description: "Implant A", quantity: 1 },
        ],
      };

      const payload = buildCajasDispatchPayload(baseAssignment, remito);
      expect(payload?.lines).toEqual([
        { preparationLineId: "line-1", remitoItemId: "remito-item-1", quantity: 1 },
      ]);
    });

    it("disambiguates multiple preparation lines with same SKU using lotNumber and serialNumber", () => {
      const multiLotAssignment: any = {
        id: "assignment-multi",
        preparation: {
          version: 1,
          lines: [
            { id: "line-lote1", sku: "SKU-PLATE", isActive: true, lotNumberSnapshot: "LOT-100", serialNumberSnapshot: null },
            { id: "line-lote2", sku: "SKU-PLATE", isActive: true, lotNumberSnapshot: "LOT-200", serialNumberSnapshot: null },
          ],
        },
      };

      const remito: any = {
        id: "remito-lot",
        items: [
          { id: "rem-item-1", sku: "SKU-PLATE", lotNumber: "LOT-200", quantity: 1 },
        ],
      };

      const payload = buildCajasDispatchPayload(multiLotAssignment, remito);
      expect(payload?.lines).toEqual([
        { preparationLineId: "line-lote2", remitoItemId: "rem-item-1", quantity: 1 },
      ]);
    });

    it("throws error when explicit preparationLineId is nonexistent or inactive, even if SKU matches", () => {
      const assignmentWithInactive: any = {
        id: "asgn-inactive",
        preparation: {
          version: 1,
          lines: [
            { id: "line-active", sku: "SKU-A", isActive: true },
            { id: "line-disabled", sku: "SKU-A", isActive: false },
          ],
        },
      };

      // Nonexistent ID:
      const remitoNonexistent: any = {
        id: "rem-1",
        items: [{ id: "item-1", preparationLineId: "nonexistent-id", sku: "SKU-A", quantity: 1 }],
      };
      expect(() => buildCajasDispatchPayload(assignmentWithInactive, remitoNonexistent)).toThrowError(
        /Explicit preparation line "nonexistent-id" not found or inactive/
      );

      // Inactive ID:
      const remitoInactive: any = {
        id: "rem-2",
        items: [{ id: "item-2", preparationLineId: "line-disabled", sku: "SKU-A", quantity: 1 }],
      };
      expect(() => buildCajasDispatchPayload(assignmentWithInactive, remitoInactive)).toThrowError(
        /Explicit preparation line "line-disabled" not found or inactive/
      );
    });

    it("throws error when single candidate SKU match has incompatible lotNumber", () => {
      const assignment: any = {
        id: "asgn-single-lot",
        preparation: {
          version: 1,
          lines: [
            { id: "line-single", sku: "SKU-A", lotNumberSnapshot: "LOT-EXPECTED", isActive: true },
          ],
        },
      };

      const remito: any = {
        id: "rem-lot-mismatch",
        items: [{ id: "item-1", sku: "SKU-A", lotNumber: "LOT-WRONG", quantity: 1 }],
      };

      expect(() => buildCajasDispatchPayload(assignment, remito)).toThrowError(
        /Incompatible lot number "LOT-WRONG" for preparation line "line-single"/
      );
    });

    it("throws error when chosen line by explicit ID or SKU has incompatible serialNumber", () => {
      const assignment: any = {
        id: "asgn-serial",
        preparation: {
          version: 1,
          lines: [
            { id: "line-ser", sku: "SKU-A", serialNumberSnapshot: "SN-EXPECTED", isActive: true },
          ],
        },
      };

      // Incompatible serial via explicit ID
      const remitoExplicit: any = {
        id: "rem-ser-1",
        items: [{ id: "item-1", preparationLineId: "line-ser", serialNumber: "SN-WRONG", quantity: 1 }],
      };
      expect(() => buildCajasDispatchPayload(assignment, remitoExplicit)).toThrowError(
        /Incompatible serial number "SN-WRONG" for preparation line "line-ser"/
      );

      // Incompatible serial via SKU
      const remitoSku: any = {
        id: "rem-ser-2",
        items: [{ id: "item-2", sku: "SKU-A", serialNumber: "SN-WRONG", quantity: 1 }],
      };
      expect(() => buildCajasDispatchPayload(assignment, remitoSku)).toThrowError(
        /Incompatible serial number "SN-WRONG" for preparation line "line-ser"/
      );
    });

    it("preserves valid reference with matching traceability", () => {
      const assignment: any = {
        id: "asgn-trace-ok",
        preparation: {
          version: 1,
          lines: [
            { id: "line-ok", sku: "SKU-A", lotNumberSnapshot: "LOT-100", serialNumberSnapshot: "SN-200", isActive: true },
          ],
        },
      };

      const remito: any = {
        id: "rem-ok",
        items: [{ id: "item-1", sku: "SKU-A", lotNumber: "LOT-100", serialNumber: "SN-200", quantity: 5 }],
      };

      const payload = buildCajasDispatchPayload(assignment, remito);
      expect(payload?.lines).toEqual([
        { preparationLineId: "line-ok", remitoItemId: "item-1", quantity: 5 },
      ]);
    });

    it("throws error when preparation line match is absent (no silent fallback to first line)", () => {
      const remito: any = {
        id: "remito-1",
        items: [
          { id: "remito-item-unknown", sku: "SKU-UNKNOWN", description: "Not in box", quantity: 1 },
        ],
      };

      expect(() => buildCajasDispatchPayload(baseAssignment, remito)).toThrowError(
        /No matching preparation line found/
      );
    });

    it("throws error when multiple preparation lines match without disambiguation", () => {
      const ambiguousAssignment: any = {
        id: "assignment-ambiguous",
        preparation: {
          version: 1,
          lines: [
            { id: "line-a1", sku: "SKU-SAME", isActive: true },
            { id: "line-a2", sku: "SKU-SAME", isActive: true },
          ],
        },
      };

      const remito: any = {
        id: "remito-amb",
        items: [
          { id: "rem-item-1", sku: "SKU-SAME", quantity: 1 },
        ],
      };

      expect(() => buildCajasDispatchPayload(ambiguousAssignment, remito)).toThrowError(
        /Ambiguous preparation line association/
      );
    });

    it("throws error on invalid non-positive or non-finite quantity", () => {
      const remitoZero: any = {
        id: "remito-1",
        items: [
          { id: "remito-item-1", sku: "SKU-A", quantity: 0 },
        ],
      };

      expect(() => buildCajasDispatchPayload(baseAssignment, remitoZero)).toThrowError(
        /Invalid quantity/
      );
    });

    it("returns null if preparation is missing or has no lines", () => {
      const assignment: any = { id: "assignment-empty", preparation: null };
      const remito: any = { id: "remito-1", items: [{ id: "item-1", description: "Test", quantity: 1 }] };
      expect(buildCajasDispatchPayload(assignment, remito)).toBeNull();
    });

    it("returns null if remito items are empty", () => {
      const remito: any = { id: "remito-empty", items: [] };
      expect(buildCajasDispatchPayload(baseAssignment, remito)).toBeNull();
    });
  });

  describe("buildCajasAccountingPayload helper", () => {
    const baseDispatch: any = {
      id: "dispatch-1",
      remitoId: "remito-1",
      lines: [
        { id: "disp-line-1", remitoItemId: "remito-item-1", quantity: 2, unit: "u" },
        { id: "disp-line-2", remitoItemId: "remito-item-2", quantity: 4, unit: "u" },
      ],
    };

    it("constructs valid Cajas accounting payload for consumption matching cajasAccountingSchema", () => {
      const consumo: any = {
        id: "consumo-1",
        items: [
          { id: "c-item-1", remitoItemId: "remito-item-1", consumedQuantity: 2 },
          { id: "c-item-2", remitoItemId: "remito-item-2", consumedQuantity: 3 },
        ],
      };

      const payload = buildCajasAccountingPayload(baseDispatch, consumo, "consumption");
      expect(payload).not.toBeNull();
      expect(cajasAccountingSchema.parse(payload)).toEqual(payload);
      expect(payload).toEqual({
        dispatchId: "dispatch-1",
        idempotencyKey: "consumption-acc-consumo-1",
        lines: [
          { dispatchLineId: "disp-line-1", sourceItemId: "c-item-1", quantity: 2, kind: "consumed" },
          { dispatchLineId: "disp-line-2", sourceItemId: "c-item-2", quantity: 3, kind: "consumed" },
        ],
      });
    });

    it("constructs valid Cajas accounting payload for return matching cajasAccountingSchema", () => {
      const devolucion: any = {
        id: "devolucion-1",
        items: [
          { id: "dev-item-1", remitoItemId: "remito-item-1", returnedQuantity: 1 },
        ],
      };

      const payload = buildCajasAccountingPayload(baseDispatch, devolucion, "return", "unchanged");
      expect(payload).not.toBeNull();
      expect(cajasAccountingSchema.parse(payload)).toEqual(payload);
      expect(payload).toEqual({
        dispatchId: "dispatch-1",
        idempotencyKey: "return-acc-devolucion-1",
        lines: [
          { dispatchLineId: "disp-line-1", sourceItemId: "dev-item-1", quantity: 1, kind: "unchanged" },
        ],
      });
    });

    it("matches dispatch line by explicit dispatchLineId if provided", () => {
      const consumo: any = {
        id: "consumo-explicit",
        items: [
          { id: "c-item-1", dispatchLineId: "disp-line-2", consumedQuantity: 1 },
        ],
      };

      const payload = buildCajasAccountingPayload(baseDispatch, consumo, "consumption");
      expect(payload?.lines).toEqual([
        { dispatchLineId: "disp-line-2", sourceItemId: "c-item-1", quantity: 1, kind: "consumed" },
      ]);
    });

    it("throws error when document item has missing remitoItemId and no dispatchLineId", () => {
      const consumo: any = {
        id: "consumo-missing-link",
        items: [
          { id: "c-item-1", consumedQuantity: 1 },
        ],
      };

      expect(() => buildCajasAccountingPayload(baseDispatch, consumo, "consumption")).toThrowError(
        /Missing remitoItemId/
      );
    });

    it("throws error when remitoItemId is not in dispatch lines (no silent fallback to first line)", () => {
      const consumo: any = {
        id: "consumo-unmatched",
        items: [
          { id: "c-item-1", remitoItemId: "foreign-remito-item", consumedQuantity: 1 },
        ],
      };

      expect(() => buildCajasAccountingPayload(baseDispatch, consumo, "consumption")).toThrowError(
        /No matching dispatch line found/
      );
    });

    it("throws error on ambiguous dispatch line match for same remitoItemId", () => {
      const ambiguousDispatch: any = {
        id: "dispatch-amb",
        lines: [
          { id: "dl-1", remitoItemId: "same-remito-item", quantity: 1 },
          { id: "dl-2", remitoItemId: "same-remito-item", quantity: 1 },
        ],
      };

      const consumo: any = {
        id: "consumo-amb",
        items: [
          { id: "c-item-1", remitoItemId: "same-remito-item", consumedQuantity: 1 },
        ],
      };

      expect(() => buildCajasAccountingPayload(ambiguousDispatch, consumo, "consumption")).toThrowError(
        /Ambiguous dispatch line association/
      );
    });

    it("ignores quantity 0 items and returns null if no positive quantities exist", () => {
      const consumoZero: any = {
        id: "consumo-zero",
        items: [
          { id: "c-item-1", remitoItemId: "remito-item-1", consumedQuantity: 0 },
        ],
      };

      expect(buildCajasAccountingPayload(baseDispatch, consumoZero, "consumption")).toBeNull();
    });

    it("throws error on invalid negative or non-finite quantity", () => {
      const consumoNegative: any = {
        id: "consumo-neg",
        items: [
          { id: "c-item-1", remitoItemId: "remito-item-1", consumedQuantity: -5 },
        ],
      };

      expect(() => buildCajasAccountingPayload(baseDispatch, consumoNegative, "consumption")).toThrowError(
        /Invalid quantity/
      );
    });
  });

  describe("API Context Lookup Helpers", () => {
    it("findActiveCajasAssignmentForSurgery propagates network/API errors", async () => {
      vi.spyOn(cajasApi, "listSurgeryBoxAssignmentsApi").mockRejectedValueOnce(
        new Error("Network connection failed")
      );

      await expect(
        findActiveCajasAssignmentForSurgery("comp-1", "surg-1")
      ).rejects.toThrow("Network connection failed");
    });

    it("findActiveCajasAssignmentForSurgery returns null when no active assignment exists", async () => {
      vi.spyOn(cajasApi, "listSurgeryBoxAssignmentsApi").mockResolvedValueOnce([
        { id: "asgn-inactive", isActive: false } as any,
      ]);

      const result = await findActiveCajasAssignmentForSurgery("comp-1", "surg-1");
      expect(result).toBeNull();
    });

    it("findActiveCajasAssignmentForSurgery throws error when multiple active assignments exist", async () => {
      vi.spyOn(cajasApi, "listSurgeryBoxAssignmentsApi").mockResolvedValueOnce([
        { id: "asgn-1", isActive: true } as any,
        { id: "asgn-2", isActive: true } as any,
      ]);

      await expect(
        findActiveCajasAssignmentForSurgery("comp-1", "surg-1")
      ).rejects.toThrow(/Ambiguous active Cajas assignments/);
    });

    it("findCajasDispatchForRemito propagates API errors", async () => {
      vi.spyOn(cajasApi, "listSurgeryBoxAssignmentsApi").mockRejectedValueOnce(
        new Error("Database unavailable")
      );

      await expect(
        findCajasDispatchForRemito("comp-1", "surg-1", "rem-1")
      ).rejects.toThrow("Database unavailable");
    });

    it("findCajasDispatchForRemito returns null when no dispatch matches the remito", async () => {
      vi.spyOn(cajasApi, "listSurgeryBoxAssignmentsApi").mockResolvedValueOnce([
        { id: "asgn-1" } as any,
      ]);
      vi.spyOn(cajasApi, "getBoxAssignmentApi").mockResolvedValueOnce({
        id: "asgn-1",
        dispatches: [{ id: "disp-other", remitoId: "rem-other" }],
      } as any);

      const result = await findCajasDispatchForRemito("comp-1", "surg-1", "rem-1");
      expect(result).toBeNull();
    });

    it("findCajasDispatchForRemito throws error when multiple dispatches match the same remito", async () => {
      vi.spyOn(cajasApi, "listSurgeryBoxAssignmentsApi").mockResolvedValueOnce([
        { id: "asgn-1" } as any,
      ]);
      vi.spyOn(cajasApi, "getBoxAssignmentApi").mockResolvedValueOnce({
        id: "asgn-1",
        dispatches: [
          { id: "disp-1", remitoId: "rem-1" },
          { id: "disp-2", remitoId: "rem-1" },
        ],
      } as any);

      await expect(
        findCajasDispatchForRemito("comp-1", "surg-1", "rem-1")
      ).rejects.toThrow(/Ambiguous Cajas dispatch/);
    });
  });

  describe("Consumption validation guards", () => {
    it("fails with cajas_accounting_required when confirming Cajas-linked Consumo without accounting intent", async () => {
      const consumo = {
        id: "consumo-1",
        companyId: "company-1",
        remitoId: "remito-cajas",
        state: "Pendiente",
      };

      const tx: any = {
        consumo: {
          findFirst: vi.fn(async () => consumo),
          update: vi.fn(async () => ({ ...consumo, state: "Validado" })),
        },
        cajasDispatch: {
          findFirst: vi.fn(async () => ({ id: "dispatch-1" })),
        },
        auditEvent: { create: vi.fn() },
      };

      const prisma: any = {
        consumo: { findFirst: vi.fn(async () => consumo) },
        $transaction: vi.fn(async (callback: any) => callback(tx)),
      };

      await expect(
        validateConsumption({
          companyId: "company-1",
          consumoId: "consumo-1",
          updatedById: "user-1",
          prisma,
        })
      ).rejects.toMatchObject({
        code: "cajas_accounting_required",
        message: expect.stringContaining("requiere imputación de consumo"),
      });
    });

    it("succeeds when confirming non-Cajas Consumo without accounting intent", async () => {
      const consumo = {
        id: "consumo-2",
        companyId: "company-1",
        remitoId: "remito-normal",
        state: "Pendiente",
      };

      const tx: any = {
        consumo: {
          findFirst: vi.fn(async () => consumo),
          update: vi.fn(async () => ({ ...consumo, state: "Validado" })),
        },
        cajasDispatch: {
          findFirst: vi.fn(async () => null),
        },
        auditEvent: { create: vi.fn() },
      };

      const prisma: any = {
        consumo: { findFirst: vi.fn(async () => consumo) },
        $transaction: vi.fn(async (callback: any) => callback(tx)),
      };

      const result = await validateConsumption({
        companyId: "company-1",
        consumoId: "consumo-2",
        updatedById: "user-1",
        prisma,
      });

      expect(result.state).toBe("Validado");
      expect((result as any).cajasAccounting).toBeUndefined();
    });
  });

  describe("Return confirmation guards", () => {
    it("fails with cajas_accounting_required when confirming Cajas-linked Devolucion without accounting intent", async () => {
      const devolucion = {
        id: "dev-1",
        companyId: "company-1",
        remitoId: "remito-cajas",
        state: "Pendiente",
        items: [{ id: "dev-item-1", remitoItemId: "rem-item-1", returnedQuantity: d(1) }],
      };

      const tx: any = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "remito-cajas" }]),
        devolucion: {
          findFirst: vi.fn(async () => devolucion),
          updateMany: vi.fn(async () => ({ count: 1 })),
        },
        remito: {
          findFirst: vi.fn(async () => ({
            id: "remito-cajas",
            companyId: "company-1",
            state: "Entregado",
            items: [{ id: "rem-item-1", quantity: d(2), returnedQuantity: d(0) }],
          })),
          update: vi.fn(),
        },
        remitoItem: {
          update: vi.fn(),
          findMany: vi.fn(async () => [{ id: "rem-item-1", quantity: d(2), returnedQuantity: d(1) }]),
        },
        cajasDispatch: {
          findFirst: vi.fn(async () => ({ id: "dispatch-1" })),
        },
        auditEvent: { create: vi.fn() },
      };

      const prisma: any = {
        devolucion: { findFirst: vi.fn(async () => devolucion) },
        $transaction: vi.fn(async (callback: any) => callback(tx)),
      };

      await expect(
        confirmDevolucion({
          companyId: "company-1",
          devolucionId: "dev-1",
          updatedById: "user-1",
          prisma,
        })
      ).rejects.toMatchObject({
        code: "cajas_accounting_required",
        message: expect.stringContaining("requiere imputación de devolución"),
      });
    });

    it("succeeds when confirming non-Cajas Devolucion without accounting intent", async () => {
      const devolucion = {
        id: "dev-2",
        companyId: "company-1",
        remitoId: "remito-normal",
        state: "Pendiente",
        items: [{ id: "dev-item-2", remitoItemId: "rem-item-2", returnedQuantity: d(1) }],
      };

      let devState = "Pendiente";
      const tx: any = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: "remito-normal" }]),
        devolucion: {
          findFirst: vi.fn(async () => ({ ...devolucion, state: devState })),
          updateMany: vi.fn(async () => {
            devState = "Confirmada";
            return { count: 1 };
          }),
        },
        remito: {
          findFirst: vi.fn(async () => ({
            id: "remito-normal",
            companyId: "company-1",
            state: "Entregado",
            items: [{ id: "rem-item-2", quantity: d(2), returnedQuantity: d(0) }],
          })),
          update: vi.fn(),
        },
        remitoItem: {
          update: vi.fn(),
          findMany: vi.fn(async () => [{ id: "rem-item-2", quantity: d(2), returnedQuantity: d(1) }]),
        },
        cajasDispatch: {
          findFirst: vi.fn(async () => null),
        },
        auditEvent: { create: vi.fn() },
      };

      const prisma: any = {
        devolucion: { findFirst: vi.fn(async () => devolucion) },
        $transaction: vi.fn(async (callback: any) => callback(tx)),
      };

      const result = await confirmDevolucion({
        companyId: "company-1",
        devolucionId: "dev-2",
        updatedById: "user-1",
        prisma,
      });

      expect(result.state).toBe("Confirmada");
      expect((result as any).cajasAccounting).toBeUndefined();
    });
  });
});

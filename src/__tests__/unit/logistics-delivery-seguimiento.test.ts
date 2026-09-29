import { describe, expect, it, vi } from "vitest";
import { mapApiEntryToView } from "@/lib/api/seguimiento-adapter";
import { SEGUIMIENTO_ENTRY_TYPES } from "@/lib/validators/seguimiento.validator";
import { createSeguimientoEntry } from "@/lib/services/seguimiento.service";

describe("Logística y Seguimiento Quirúrgico Integrado", () => {
  it("incluye logistics_delivery y logistics_transfer en los tipos válidos de seguimiento", () => {
    expect(SEGUIMIENTO_ENTRY_TYPES).toContain("logistics_delivery");
    expect(SEGUIMIENTO_ENTRY_TYPES).toContain("logistics_transfer");
  });

  it("mapea logisticsMeta correctamente en el adaptador de vista de seguimiento", () => {
    const rawApiEntry = {
      id: "entry-1",
      surgeryId: "surg-1",
      companyId: "comp-1",
      entryType: "logistics_delivery",
      content: "Entrega confirmada en nosocomio para Remito Nº 1004. Recibió: Lic. Gómez",
      summary: "Remito 1004 entregado",
      authorId: "user-1",
      authorName: "Chofer Logística",
      evidenceRef: {
        remitoId: "remito-1004",
        remitoVisibleNumber: 1004,
        receivedBy: "Lic. Gómez",
        actualDate: "2026-09-26T18:30:00.000Z",
        notes: "Entregado en Quirófano 2",
      },
      createdAt: "2026-09-26T18:35:00.000Z",
      updatedAt: "2026-09-26T18:35:00.000Z",
    };

    const view = mapApiEntryToView(rawApiEntry);

    expect(view.entryType).toBe("logistics_delivery");
    expect(view.logisticsMeta).not.toBeNull();
    expect(view.logisticsMeta?.remitoId).toBe("remito-1004");
    expect(view.logisticsMeta?.remitoVisibleNumber).toBe("1004");
    expect(view.logisticsMeta?.receivedBy).toBe("Lic. Gómez");
    expect(view.logisticsMeta?.notes).toBe("Entregado en Quirófano 2");
  });

  it("actualiza atómicamente el remito a Entregado al registrar logistics_delivery en seguimiento", async () => {
    const mockRemito = {
      id: "rem-1",
      state: "Emitido",
      visibleNumber: 501,
      deliveredAt: null,
    };

    const updateRemitoMock = vi.fn().mockResolvedValue({
      ...mockRemito,
      state: "Entregado",
      deliveredAt: new Date(),
    });

    const createAuditEventMock = vi.fn().mockResolvedValue({ id: "audit-1" });

    const createEntryMock = vi.fn().mockResolvedValue({
      id: "entry-123",
      surgeryId: "surg-1",
      companyId: "comp-1",
      entryType: "logistics_delivery",
      content: "Entrega confirmada en nosocomio para Remito Nº 501",
      summary: "Remito 501 entregado",
      authorId: "user-1",
      evidenceRef: { remitoId: "rem-1" },
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { firstName: "Juan", lastName: "Pérez" },
    });

    const mockPrisma: any = {
      $transaction: vi.fn(async (cb) => {
        const tx: any = {
          remito: {
            findFirst: vi.fn().mockResolvedValue(mockRemito),
            update: updateRemitoMock,
          },
          auditEvent: {
            create: createAuditEventMock,
          },
          seguimientoEntry: {
            create: createEntryMock,
          },
          userCompanyAccess: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        };
        return cb(tx);
      }),
    };

    const result = await createSeguimientoEntry(mockPrisma, {
      surgeryId: "surg-1",
      companyId: "comp-1",
      entryType: "logistics_delivery",
      content: "Entrega confirmada en nosocomio para Remito Nº 501",
      authorId: "user-1",
      evidenceRef: {
        remitoId: "rem-1",
        remitoVisibleNumber: 501,
        actualDate: "2026-09-26T20:00:00.000Z",
      },
    });

    expect(result.id).toBe("entry-123");
    expect(updateRemitoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rem-1" },
        data: expect.objectContaining({
          state: "Entregado",
          updatedById: "user-1",
        }),
      })
    );
    expect(createAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Remito",
          entityId: "rem-1",
          action: "remito.state_changed",
          newValue: { state: "Entregado" },
        }),
      })
    );
  });

  it("representa el traslado directo de cajas entre cirugías preservando la trazabilidad de origen", () => {
    const transferEntry = {
      id: "transfer-1",
      surgeryId: "surg-dest",
      companyId: "comp-1",
      entryType: "logistics_transfer",
      content: "Traslado directo de Caja Instrumental Traumatología desde CX-101 hacia CX-102.",
      summary: "Traslado directo Caja Instrumental",
      authorId: "user-logistics",
      authorName: "Logística Central",
      evidenceRef: {
        boxId: "box-99",
        boxName: "Instrumental Traumatología",
        sourceSurgeryId: "surg-orig",
        sourceSurgeryNumber: 101,
        targetSurgeryId: "surg-dest",
        targetSurgeryNumber: 102,
        remitoId: "remito-new-dest",
        remitoVisibleNumber: 809,
      },
      createdAt: "2026-09-26T19:00:00.000Z",
      updatedAt: "2026-09-26T19:00:00.000Z",
    };

    const view = mapApiEntryToView(transferEntry);

    expect(view.entryType).toBe("logistics_transfer");
    expect(view.logisticsMeta?.sourceSurgeryId).toBe("surg-orig");
    expect(view.logisticsMeta?.remitoId).toBe("remito-new-dest");
    expect(view.logisticsMeta?.remitoVisibleNumber).toBe("809");
  });
});

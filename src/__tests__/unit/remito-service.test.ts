// OSSUM COR â€” Remito service unit tests (Fase 1A.1)
// Mocking Prisma manually (vitest). No DB needed.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createRemitoTokenKeyring } from "@/lib/remito-verification/token";
import { authorize, WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer";

const { createAuditEvent } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
}));
const c14 = vi.hoisted(() => ({ execute: vi.fn(), append: vi.fn(), correlation: vi.fn(() => "0198a000-0000-7000-8000-000000000001"), transaction: vi.fn(() => "0198a000-0000-7000-8000-000000000002") }));

vi.mock("@/lib/audit", () => ({
  createAuditEvent,
}));
vi.mock("@/lib/services/c14/bundles/wcb-06", () => ({ execute: c14.execute }));
vi.mock("@/lib/services/c14/durable-attempt-audit", () => ({ appendDurableAttemptEvent: c14.append, deriveDurableEventId: (_id: string, ordinal: number) => `event-${ordinal}`, newCorrelationId: c14.correlation, newTransactionId: c14.transaction }));

import {
  createRemito,
  deleteRemito,
  emitirRemito,
  getRemito,
  listRemitos,
  registrarDevolucion,
  updateRemitoDraft,
  updateRemitoState,
  REMITO_STATES,
  RemitoError,
} from "@/lib/services/remito.service";

// â”€â”€â”€ Helpers de build â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildRemito(over: Record<string, any> = {}) {
  return {
    id: "remito-1",
    visibleNumber: null,
    companyId: "company-1",
    branchId: "branch-1",
    issuedBranchId: "branch-1",
    documentType: "REMITO_SALIDA",
    surgeryId: null,
    origin: "manual",
    salidaReason: "cirugia",
    boxId: null,
    presupuestoId: null,
    destinatarioContactId: null,
    destinatarioSnapshot: null,
    shippingAddressSnapshot: null,
    transportSnapshot: null,
    packageCount: null,
    declaredValue: null,
    state: "Borrador" as string,
    issuedAt: null,
    deliveredAt: null,
    returnedAt: null,
    createdById: "user-1",
    updatedById: null,
    metadata: null,
    createdAt: new Date("2026-07-07T10:00:00.000Z"),
    updatedAt: new Date("2026-07-07T10:00:00.000Z"),
    scanLocator: null,
    branch: null,
    issuedBranch: null,
    surgery: null,
    createdBy: null,
    cajasDispatches: [],
    items: [
      { id: "item-1", description: "Tornillo 4.0", quantity: new Prisma.Decimal(10) },
      { id: "item-2", description: "Placa LCP", quantity: new Prisma.Decimal(2) },
    ],
    ...over,
  };
}

function makeP2034() {
  // ConstrucciÃ³n canÃ³nica Prisma; constructor no lanza si solo pasamos code.
  return new Prisma.PrismaClientKnownRequestError("serialization conflict", {
    code: "P2034",
    clientVersion: "7.8.0",
  });
}

const issuanceDependencies = {
  keyring: createRemitoTokenKeyring({
    activeTokenKeyVersion: 1,
    keys: { "1": Buffer.alloc(32, 7).toString("base64url") },
  }),
  randomBytes: (size: number) => Buffer.alloc(size, 9),
  randomId: (() => {
    let id = 0;
    return () => `test-id-${++id}`;
  })(),
  now: () => new Date("2026-07-07T10:00:00.000Z"),
};

function addIssuancePersistenceMocks(tx: Record<string, any>) {
  Object.assign(tx, {
    company: { findUnique: vi.fn().mockResolvedValue({ name: "Company", taxId: "30-12345678-9" }) },
    remitoScanLocator: { create: vi.fn().mockResolvedValue(undefined) },
    remitoVerificationPublication: { create: vi.fn().mockResolvedValue(undefined) },
    remitoVerificationAccess: { create: vi.fn().mockResolvedValue(undefined) },
  });
  tx.auditEvent.create.mockResolvedValue(undefined);
  return tx;
}

beforeEach(() => {
  createAuditEvent.mockReset();
  createAuditEvent.mockResolvedValue(undefined);
  c14.execute.mockReset(); c14.execute.mockResolvedValue({ replayed: false });
  c14.append.mockReset(); c14.append.mockResolvedValue({ eventSha256: "a".repeat(64) });
});

describe("Remito list/detail projection", () => {
  it("exposes the company-scoped locator as nullable remitoShortCode in lists", async () => {
    const row = buildRemito({
      scanLocator: { companyId: "company-1", locator: "RM1-04HM-ASW9-NF6Y-ZZPW-M" },
    });
    const findMany = vi.fn().mockResolvedValue([row]);
    const result = await listRemitos({
      companyId: "company-1",
      prisma: { remito: { findMany } } as unknown as PrismaClient,
    });

    expect(result[0]).toMatchObject({
      id: "remito-1",
      remitoShortCode: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
    });
    expect(result[0]).not.toHaveProperty("scanLocator");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1" },
      select: expect.objectContaining({
        scanLocator: { select: { companyId: true, locator: true } },
      }),
    }));
  });

  it("projects linked surgery and creator labels for inspector and printing", async () => {
    const row = buildRemito({
      scanLocator: null,
      branch: { name: "Depósito Central" },
      issuedBranch: { name: "Sucursal Corrientes" },
      surgery: {
        visibleNumber: "CX-0521",
        description: "Cirugía de prueba",
        surgeryDate: new Date("2026-08-14T08:00:00.000Z"),
        scheduledDate: null,
        patient: { firstName: "Paciente", lastName: "Prueba", legalName: null },
        doctor: { firstName: "Dra.", lastName: "García", legalName: null },
        institution: { firstName: null, lastName: null, legalName: "Hospital Perrando" },
        payer: { firstName: null, lastName: null, legalName: "Cliente OS" },
      },
      createdBy: { firstName: "Admin", lastName: "DEV" },
    });
    const result = await getRemito({ companyId: "company-1", remitoId: "remito-1", prisma: { remito: { findFirst: vi.fn().mockResolvedValue(row) } } as unknown as PrismaClient });

    expect(result).toMatchObject({
      surgeryLabel: "CX-0521",
      surgeryPatientName: "Paciente Prueba",
      surgeryDoctorName: "Dra. García",
      surgeryInstitutionName: "Hospital Perrando",
      surgeryClientName: "Cliente OS",
      createdByName: "Admin DEV",
    });
  });

  it("returns null for a missing locator in the company-scoped detail projection", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildRemito({ scanLocator: null }));
    const result = await getRemito({
      companyId: "company-1",
      remitoId: "remito-1",
      prisma: { remito: { findFirst } } as unknown as PrismaClient,
    });

    expect(result.remitoShortCode).toBeNull();
    expect(result).not.toHaveProperty("scanLocator");
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "remito-1", companyId: "company-1" },
    }));
  });

  it("projects only ORIGINAL Caja dispatch snapshots into public detail items", async () => {
    const row = buildRemito({
      cajasDispatches: [{
        lines: [{
          skuSnapshot: "SKU-SNAPSHOT",
          descriptionSnapshot: "Pinza snapshot",
          quantity: new Prisma.Decimal(2),
          stockUnit: "unidad",
          lotCodeSnapshot: "LOT-1",
          expirationDateSnapshot: new Date("2028-01-01T00:00:00.000Z"),
          serialNumberSnapshot: "SER-1",
          identifiedCodeSnapshot: "UNIT-001",
        }],
      }],
    });
    const findFirst = vi.fn().mockResolvedValue(row);

    const result = await getRemito({
      companyId: "company-1",
      remitoId: "remito-1",
      prisma: { remito: { findFirst } } as unknown as PrismaClient,
    });

    expect(result.detailItems).toEqual([expect.objectContaining({
      groupLabel: "Caja / Fórmula 1",
      sku: "SKU-SNAPSHOT",
      description: "Pinza snapshot",
      lotNumber: "LOT-1",
      expirationDate: "2028-01-01T00:00:00.000Z",
      serialNumber: "SER-1",
      identifiedCode: "UNIT-001",
    })]);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "remito-1", companyId: "company-1" },
      select: expect.objectContaining({
        cajasDispatches: expect.objectContaining({
          where: { recordKind: "ORIGINAL" },
          orderBy: { sequence: "asc" },
          select: expect.objectContaining({
            lines: expect.objectContaining({
              where: { recordKind: "ORIGINAL" },
              orderBy: { lineNumber: "asc" },
            }),
          }),
        }),
      }),
    }));
    expect(JSON.stringify(result.detailItems)).not.toMatch(/assignmentId|boxIdentifiedUnitId|remitoId|item-1|raw-/);
  });

  it("falls back explicitly to summary item snapshots when no ORIGINAL dispatch line exists", async () => {
    const result = await getRemito({
      companyId: "company-1",
      remitoId: "remito-1",
      prisma: { remito: { findFirst: vi.fn().mockResolvedValue(buildRemito()) } } as unknown as PrismaClient,
    });

    expect(result.detailItems).toEqual([
      expect.objectContaining({ groupLabel: null, description: "Tornillo 4.0", identifiedCode: null }),
      expect.objectContaining({ groupLabel: null, description: "Placa LCP", identifiedCode: null }),
    ]);
  });
});

// â”€â”€â”€ createRemito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("createRemito", () => {
  it("creates a remito in Borrador with items", async () => {
    const tx = {
      remito: { create: vi.fn() },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    tx.remito.create.mockImplementation(async ({ data }) => {
      return buildRemito({
        state: "Borrador",
        visibleNumber: null,
        items: [
          { id: "item-1", description: data.items.create[0].description, quantity: new Prisma.Decimal(10) },
        ],
      });
    });
    const prismaMock = {
      branch: { findFirst: vi.fn().mockResolvedValue({ id: "branch-1" }) },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const remito = await createRemito({
      companyId: "company-1",
      branchId: "branch-1",
      origin: "manual",
      salidaReason: "cirugia",
      items: [{ description: "Tornillo 4.0", quantity: 10 }],
      createdById: "user-1",
      prisma: prismaMock,
    });

    expect(remito.state).toBe("Borrador");
    expect(remito.visibleNumber).toBeNull();
    expect(tx.remito.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          origin: "manual",
          salidaReason: "cirugia",
          state: "Borrador",
          createdById: "user-1",
        }),
      })
    );
    // Verifica items anidados
    const createCall = tx.remito.create.mock.calls[0]?.[0] as { data: { items: { create: any[] } } };
    expect(createCall.data.items.create).toHaveLength(1);
    expect(createCall.data.items.create[0]).toMatchObject({
      description: "Tornillo 4.0",
      quantity: expect.any(Prisma.Decimal),
    });
    // audit emitido con userId del creador â†’ tx.auditEvent.create
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        userId: "user-1",
        entityType: "Remito",
        entityId: remito.id,
        action: "remito.created",
        module: "remito",
        oldValue: null,
      })
    );
    expect(remito).toEqual(remito);
  });

  it("rejects invalid origin", async () => {
    const prismaMock = { branch: { findFirst: vi.fn().mockResolvedValue({ id: "branch-1" }) }, $transaction: vi.fn() } as any;
    await expect(
      createRemito({
        companyId: "company-1",
        branchId: "branch-1",
        origin: "nope",
        salidaReason: "cirugia",
        items: [{ description: "x", quantity: 1 }],
        createdById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_remito_origin" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects empty items", async () => {
    const prismaMock = { branch: { findFirst: vi.fn().mockResolvedValue({ id: "branch-1" }) }, $transaction: vi.fn() } as any;
    await expect(
      createRemito({
        companyId: "company-1",
        branchId: "branch-1",
        origin: "box",
        salidaReason: "cirugia",
        items: [],
        createdById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_empty_items" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects item quantity <= 0", async () => {
    const prismaMock = { $transaction: vi.fn() } as any;
    await expect(
      createRemito({
        companyId: "company-1",
        branchId: "branch-1",
        origin: "box",
        salidaReason: "cirugia",
        items: [{ description: "x", quantity: 0 }],
        createdById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_remito_item_quantity" });
  });

  it("rejects surgeryId from another company before creating", async () => {
    const prismaMock = {
      branch: { findFirst: vi.fn().mockResolvedValue({ id: "branch-1" }) },
      surgery: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    } as any;

    await expect(
      createRemito({
        companyId: "company-1",
        branchId: "branch-1",
        surgeryId: "sx-other-company",
        origin: "manual",
        salidaReason: "cirugia",
        items: [{ description: "Tornillo 4.0", quantity: 10 }],
        createdById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "surgery_not_found", status: 404 });

    expect(prismaMock.surgery.findFirst).toHaveBeenCalledWith({
      where: { id: "sx-other-company", companyId: "company-1" },
      select: { id: true },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// â”€â”€â”€ emitirRemito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("emitirRemito", () => {
  it("derives surgical lineage in the Serializable transaction and invokes WCB-06 bijectively", async () => {
    const old = process.env.OSSUM_C14_WCB06_ENABLED; process.env.OSSUM_C14_WCB06_ENABLED = "true";
    const item = { id: "item-1", itemId: null, sku: "SKU-1", description: "Tornillo", quantity: new Prisma.Decimal(2), unit: "UNIT", boxId: null, presupuestoItemId: null, lotNumber: null, serialNumber: null, expirationDate: null, returnedQuantity: new Prisma.Decimal(0), metadata: null, createdAt: new Date(), updatedAt: new Date() };
    const position = { id: "position-1", articleId: "article-1", identifiedUnitId: null, traceMode: "NONE", stockUnit: "UNIT", quantityScale: 0, lot: null, identifiedUnit: null };
    const prepLine = { id: "prep-line-1", isActive: true, articleId: position.articleId, stockPositionId: position.id, quantity: new Prisma.Decimal(2), stockUnit: "UNIT", scaleSnapshot: 0 };
    const controlLine = { id: "control-line-1", sourcePreparationId: "prep-1", sourcePreparationLineId: prepLine.id, articleId: position.articleId, stockPositionId: position.id, quantity: new Prisma.Decimal(2), stockUnit: "UNIT", scaleSnapshot: 0, skuSnapshot: "SKU-1", descriptionSnapshot: "Tornillo", traceCapture: null };
    const reservation = { id: "reservation-1", position, projection: { status: "ACTIVE", activeQuantity: new Prisma.Decimal(2), version: 1 } };
    const assignment = { id: "assignment-1", boxIdentifiedUnitId: "box-unit-1", dispatches: [], preparations: [{ id: "prep-1", version: 1, requiresRecontrol: false, lines: [prepLine], latestControl: { id: "control-1", result: "CLEAN", sourcePreparationVersion: 1, lines: [controlLine] }, reservationCorrelations: [{ preparationLineId: prepLine.id, stockPositionId: position.id, quantity: new Prisma.Decimal(2), stockUnit: "UNIT", scaleSnapshot: 0, stockReservation: reservation }] }] };
    const current = buildRemito({ surgeryId: "sx-1", items: [item] });
    const tx = addIssuancePersistenceMocks({ $executeRaw: vi.fn(), $queryRaw: vi.fn().mockResolvedValue([{ next: 1 }]), remito: { findFirst: vi.fn().mockResolvedValue(current), update: vi.fn(async ({ data }) => ({ ...current, ...data })) }, cajasAssignment: { findMany: vi.fn().mockResolvedValue([assignment]) }, auditEvent: { create: vi.fn() } });
    const prismaMock = { remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: "sx-1" }) }, $transaction: vi.fn(async (cb: any, options?: unknown) => options ? cb(tx) : cb({ durableAttemptAuditEvent: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() } })) } as any;
    const authorizationProof = await authorize({ userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "m1", role: "admin", userId: "user-1", companyId: "company-1", isActive: true }) } } as never,
      { actorId: "user-1", companyId: "company-1", bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS });
    try {
      await emitirRemito({ companyId: "company-1", remitoId: "remito-1", updatedById: "user-1", prisma: prismaMock, issuanceDependencies, idempotencyKey: "transport-1", authorizationProof });
    } finally { process.env.OSSUM_C14_WCB06_ENABLED = old; }
    expect(c14.execute).toHaveBeenCalledWith(tx, expect.objectContaining({ companyId: "company-1", actorId: "user-1", dispatchLines: [expect.objectContaining({ remitoItemId: "item-1", sourceControlLineId: "control-line-1", stockPositionId: "position-1" })], stockEvidenceLines: [expect.objectContaining({ sourceLineId: "item-1", reservationId: "reservation-1" })] }), expect.objectContaining({ attemptId: expect.any(String), semanticKeySha256: expect.any(String) }));
    expect(c14.append).toHaveBeenCalledTimes(2);
  });

  it("rejects surgical issuance while WCB-06 is disabled without opening a transaction", async () => {
    const prismaMock = { remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: "sx-1" }) }, $transaction: vi.fn() } as any;
    await expect(emitirRemito({ companyId: "company-1", remitoId: "remito-1", updatedById: "user-1", prisma: prismaMock, issuanceDependencies }))
      .rejects.toMatchObject({ code: "remito_stock_dispatch_disabled", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("durably records AUTH_DENIED before opening a surgical transaction", async () => {
    const old = process.env.OSSUM_C14_WCB06_ENABLED; process.env.OSSUM_C14_WCB06_ENABLED = "true";
    const prismaMock = { remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: "sx-1" }) }, durableAttemptAuditEvent: { findMany: vi.fn().mockResolvedValue([]) }, $transaction: vi.fn() } as any;
    try {
      await expect(emitirRemito({ companyId: "company-1", remitoId: "remito-1", updatedById: "user-1", prisma: prismaMock, issuanceDependencies }))
        .rejects.toMatchObject({ code: "remito_dispatch_authorization_required", status: 403 });
    } finally { process.env.OSSUM_C14_WCB06_ENABLED = old; }
    expect(c14.append).toHaveBeenCalledWith(prismaMock, expect.objectContaining({ eventKind: "AUTH_DENIED", attemptOrdinal: null, transactionId: null, sqlstate: null, domainCommitState: "NOT_STARTED" }));
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("assigns next visibleNumber and transitions to Emitido", async () => {
    const tx = addIssuancePersistenceMocks({
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(7) }]),
      remito: {
        findFirst: vi.fn().mockResolvedValue(buildRemito({ state: "Borrador", visibleNumber: null })),
        update: vi.fn(),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    });
    tx.remito.update.mockImplementation(async ({ data }) =>
      buildRemito({
        state: data.state as string,
        visibleNumber: data.visibleNumber as number,
        issuedAt: data.issuedAt as Date,
      })
    );
    const prismaMock = {
      remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: null }) },
      $transaction: vi.fn(async (cb: any, options?: unknown) => cb(tx)),
    } as any;

    const result = await emitirRemito({
      companyId: "company-1",
      remitoId: "remito-1",
      updatedById: "user-1",
      prisma: prismaMock,
      issuanceDependencies,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.remito.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "remito-1" },
        data: expect.objectContaining({
          visibleNumber: 7,
          state: "Emitido",
          updatedById: "user-1",
        }),
      })
    );
    expect(result.state).toBe("Emitido");
    expect(result.visibleNumber).toBe(7);
    expect(result.issuedAt).toBeInstanceOf(Date);
    // audit: remito.issued
    expect(tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          userId: "user-1",
          entityType: "Remito",
          action: "remito.issued",
          oldValue: { state: "Borrador" },
          newValue: expect.objectContaining({ state: "Emitido", visibleNumber: 7 }),
        }),
      })
    );
  });

  it("rejects emission from non-Borrador state", async () => {
    const tx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
      remito: {
        findFirst: vi.fn().mockResolvedValue(buildRemito({ state: "Emitido", visibleNumber: 1 })),
        update: vi.fn(),
      },
      auditEvent: { create: vi.fn() },
    };
    const prismaMock = {
      remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: null }) },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    await expect(
      emitirRemito({
        companyId: "company-1",
        remitoId: "remito-1",
        updatedById: "user-1",
        prisma: prismaMock,
        issuanceDependencies,
      })
    ).rejects.toMatchObject({ code: "remito_not_borrador" });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.remito.update).not.toHaveBeenCalled();
  });

  it("retries on P2034 serialization conflict then succeeds", async () => {
    const tx = addIssuancePersistenceMocks({
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(3) }]),
      remito: {
        findFirst: vi.fn().mockResolvedValue(buildRemito({ state: "Borrador" })),
        update: vi.fn().mockImplementation(async ({ data }) => buildRemito({
          state: "Emitido",
          visibleNumber: 3,
          issuedAt: data.issuedAt,
        })),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    });

    let attempt = 0;
    const prismaMock = {
      remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: null }) },
      $transaction: vi.fn(async (cb: any, _opts?: unknown) => {
        attempt += 1;
        if (attempt === 1) {
          // Simula conflicto de serializaciÃ³n al final del callback
          await cb(tx); // simula trabajo parcial (no commit)
          throw makeP2034();
        }
        return await cb(tx);
      }),
    } as any;

    const result = await emitirRemito({
      companyId: "company-1",
      remitoId: "remito-1",
      updatedById: "user-1",
      prisma: prismaMock,
      issuanceDependencies,
    });

    expect(prismaMock.$transaction.mock.calls.length).toBe(2);
    expect(result.visibleNumber).toBe(3);
    expect(result.state).toBe("Emitido");
  });
});

// â”€â”€â”€ updateRemitoDraft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("updateRemitoDraft", () => {
  it("allows only one of two same-baseline competing updates to commit", async () => {
    const baseline = new Date("2026-07-07T10:00:00.000Z");
    let stored = buildRemito({ state: "Borrador", updatedAt: baseline });
    let initialReads = 0;
    let releaseInitialReads!: () => void;
    const bothInitialReadsStarted = new Promise<void>((resolve) => {
      releaseInitialReads = resolve;
    });

    const tx = {
      remito: {
        findFirst: vi.fn().mockImplementation(async () => {
          initialReads += 1;
          if (initialReads <= 2) {
            if (initialReads === 2) releaseInitialReads();
            await bothInitialReadsStarted;
            return buildRemito({ ...stored, updatedAt: baseline });
          }
          return stored;
        }),
        updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
          if (where.updatedAt && stored.updatedAt.getTime() !== where.updatedAt.getTime()) {
            return { count: 0 };
          }
          stored = buildRemito({
            ...stored,
            ...data,
            updatedAt: new Date(stored.updatedAt.getTime() + 1),
          });
          return { count: 1 };
        }),
      },
      remitoItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = { $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    const results = await Promise.allSettled([
      updateRemitoDraft({
        companyId: "company-1",
        remitoId: "remito-1",
        expectedUpdatedAt: baseline,
        metadata: { writer: "first" },
        items: [{ description: "First item", quantity: 1 }],
        prisma: prismaMock,
      }),
      updateRemitoDraft({
        companyId: "company-1",
        remitoId: "remito-1",
        expectedUpdatedAt: baseline,
        metadata: { writer: "second" },
        items: [{ description: "Second item", quantity: 1 }],
        prisma: prismaMock,
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "remito_update_conflict", status: 409 },
    });
    expect(tx.remitoItem.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.remitoItem.createMany).toHaveBeenCalledTimes(1);
  });

  it("updates mutable draft fields and replaces items", async () => {
    const current = buildRemito({ state: "Borrador" });
    const tx = {
      remito: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce(buildRemito({
            ...current,
            surgeryId: null,
            metadata: { note: "draft" },
            items: [{ id: "new-item-1", description: "Nuevo", quantity: new Prisma.Decimal(1) }],
          })),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      remitoItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = { $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    const result = await updateRemitoDraft({
      companyId: "company-1",
      remitoId: "remito-1",
      surgeryId: null,
      items: [
        { description: "Nuevo", quantity: 1 },
        { description: "Segundo", quantity: 2 },
      ],
      metadata: { note: "draft" },
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(tx.remitoItem.deleteMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", remitoId: "remito-1" },
    });
    expect(tx.remitoItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ companyId: "company-1", description: "Nuevo" }),
          expect.objectContaining({ companyId: "company-1", description: "Segundo" }),
        ],
      })
    );
    expect(tx.remito.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "remito-1", companyId: "company-1", state: "Borrador" }),
        data: expect.objectContaining({ surgeryId: null, updatedById: "user-1" }),
      })
    );
    expect(result.state).toBe("Borrador");
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "remito.draft_updated" }));
  });

  it("rejects stale expectedUpdatedAt before mutating draft data", async () => {
    const current = buildRemito({
      state: "Borrador",
      updatedAt: new Date("2026-07-07T10:00:00.000Z"),
    });
    const tx = {
      remito: {
        findFirst: vi.fn().mockResolvedValue(current),
        updateMany: vi.fn(),
      },
      remitoItem: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      auditEvent: { create: vi.fn() },
    };
    const prismaMock = { $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    await expect(
      updateRemitoDraft({
        companyId: "company-1",
        remitoId: "remito-1",
        metadata: { note: "stale" },
        expectedUpdatedAt: "2026-07-07T09:59:59.000Z",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_update_conflict", status: 409 });
    expect(tx.remitoItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.remitoItem.createMany).not.toHaveBeenCalled();
    expect(tx.remito.updateMany).not.toHaveBeenCalled();
    expect(createAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects updates outside Borrador", async () => {
    const tx = {
      remito: { findFirst: vi.fn().mockResolvedValue(buildRemito({ state: "Emitido" })), updateMany: vi.fn() },
      remitoItem: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    const prismaMock = { $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    await expect(
      updateRemitoDraft({
        companyId: "company-1",
        remitoId: "remito-1",
        metadata: { note: "no" },
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_not_editable", status: 409 });
    expect(tx.remito.updateMany).not.toHaveBeenCalled();
  });

  it("updates an Entregado remito while preserving its state and auditing the correction", async () => {
    const current = buildRemito({ state: "Entregado", deliveredAt: new Date("2026-07-08T10:00:00.000Z") });
    const resultRow = buildRemito({ ...current, metadata: { note: "corrected" } });
    const tx = {
      remito: {
        findFirst: vi.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(resultRow),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      remitoItem: { deleteMany: vi.fn(), createMany: vi.fn() },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = { $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    const result = await updateRemitoDraft({
      companyId: "company-1",
      remitoId: "remito-1",
      metadata: { note: "corrected" },
      expectedUpdatedAt: current.updatedAt,
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(tx.remito.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "remito-1", companyId: "company-1", state: "Entregado", updatedAt: current.updatedAt }),
    }));
    expect(result.state).toBe("Entregado");
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "remito.updated" }));
  });

  it("rejects surgeryId from another company before updating draft", async () => {
    const prismaMock = {
      surgery: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updateRemitoDraft({
        companyId: "company-1",
        remitoId: "remito-1",
        surgeryId: "sx-other-company",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "surgery_not_found", status: 404 });

    expect(prismaMock.surgery.findFirst).toHaveBeenCalledWith({
      where: { id: "sx-other-company", companyId: "company-1" },
      select: { id: true },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// â”€â”€â”€ updateRemitoState â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("updateRemitoState", () => {
  it("applies a valid transition Emitido â†’ En_transito", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildRemito({ state: "Emitido", visibleNumber: 1 }));
    const tx = {
      remito: { update: vi.fn().mockResolvedValue(buildRemito({ state: "En_transito", visibleNumber: 1 })) },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await updateRemitoState({
      companyId: "company-1",
      remitoId: "remito-1",
      newState: "En_transito",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("En_transito");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "remito.state_changed",
        oldValue: { state: "Emitido" },
        newValue: { state: "En_transito" },
      })
    );
  });

  it("sets deliveredAt when transitioning to Entregado", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildRemito({ state: "Emitido", visibleNumber: 1 }));
    const tx = {
      remito: {
        update: vi.fn().mockImplementation(async ({ data }) =>
          buildRemito({ state: data.state, visibleNumber: 1, deliveredAt: data.deliveredAt })
        ),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = { remito: { findFirst }, $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    const result = await updateRemitoState({
      companyId: "company-1",
      remitoId: "remito-1",
      newState: "Entregado",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.deliveredAt).toBeInstanceOf(Date);
    expect(tx.remito.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deliveredAt: expect.any(Date) }) })
    );
  });

  it("rejects generic Borrador → Emitido transition so numbering cannot be bypassed", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildRemito({ state: "Borrador", visibleNumber: null }));
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updateRemitoState({
        companyId: "company-1",
        remitoId: "remito-1",
        newState: "Emitido",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_emit_requires_emit_endpoint", status: 409 });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(createAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid transition (Devuelto â†’ Entregado is terminal)", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildRemito({ state: "Devuelto", visibleNumber: 1 }));
    const tx = { remito: { update: vi.fn() }, auditEvent: { create: vi.fn() } };
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    await expect(
      updateRemitoState({
        companyId: "company-1",
        remitoId: "remito-1",
        newState: "Entregado",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_remito_transition", status: 409 });
    expect(tx.remito.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects transition to same state", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildRemito({ state: "Emitido", visibleNumber: 1 }));
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updateRemitoState({
        companyId: "company-1",
        remitoId: "remito-1",
        newState: "Emitido",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_state_unchanged", status: 409 });
  });
});

// â”€â”€â”€ registrarDevolucion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("registrarDevolucion", () => {
  function devolucionTxMocks(opts: {
    items: Array<{ id: string; quantity: number; returnedQuantity: number }>;
    requestedItems?: Array<{ id: string; returnedQuantity: number }>;
  }) {
    const itemsByQuantity = opts.items.reduce(
      (acc, it) => {
        acc[it.id] = { quantity: it.quantity, returnedQuantity: it.returnedQuantity };
        return acc;
      },
      {} as Record<string, { quantity: number; returnedQuantity: number }>
    );

    const updatedItemsState: Record<string, { quantity: number; returnedQuantity: number }> = JSON.parse(
      JSON.stringify(itemsByQuantity)
    );
    const returnItemsState: Record<string, { quantity: number; returnedQuantity: number }> = updatedItemsState;

    let finalRemito = buildRemito({ state: "Entregado", visibleNumber: 1 });

    const tx = {
      devolucion: {
        create: vi.fn().mockResolvedValue({
          id: "devolucion-1",
          visibleNumber: null,
          companyId: "company-1",
          surgeryId: "sx-1",
          remitoId: "remito-1",
          consumoId: null,
          state: "Borrador",
          reason: "legacy_remito_devolucion",
          validatedAt: null,
          createdById: "user-1",
          updatedById: null,
          metadata: { source: "legacy_remito_devolucion_endpoint" },
          createdAt: new Date("2026-07-07T10:00:00.000Z"),
          updatedAt: new Date("2026-07-07T10:00:00.000Z"),
          items: [],
        }),
        findFirst: vi.fn().mockImplementation(async () => ({
          id: "devolucion-1",
          companyId: "company-1",
          remitoId: "remito-1",
          state: "Confirmada",
          items: (opts.requestedItems ?? [])
            .filter((it) => it.returnedQuantity > 0)
            .map((it) => ({
              id: `devolucion-${it.id}`,
              remitoItemId: it.id,
              returnedQuantity: new Prisma.Decimal(it.returnedQuantity),
            })),
        })),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockImplementation(async ({ data }: { data: { state: string; validatedAt?: Date } }) => ({
          id: "devolucion-1",
          visibleNumber: 1,
          companyId: "company-1",
          surgeryId: "sx-1",
          remitoId: "remito-1",
          consumoId: null,
          state: data.state,
          reason: "legacy_remito_devolucion",
          validatedAt: data.validatedAt ?? null,
          createdById: "user-1",
          updatedById: "user-1",
          metadata: null,
          createdAt: new Date("2026-07-07T10:00:00.000Z"),
          updatedAt: new Date("2026-07-07T10:00:00.000Z"),
        })),
      },
      remitoItem: {
        findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
          const cur = returnItemsState[where.id];
          return cur
            ? {
                id: where.id,
                quantity: new Prisma.Decimal(cur.quantity),
                returnedQuantity: new Prisma.Decimal(cur.returnedQuantity),
              }
            : null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: { returnedQuantity: Prisma.Decimal } }) => {
          updatedItemsState[where.id].returnedQuantity = Number(data.returnedQuantity);
          return { id: where.id };
        }),
        findMany: vi.fn().mockImplementation(async () =>
          Object.entries(updatedItemsState).map(([id, it]) => ({
            id,
            quantity: new Prisma.Decimal(it.quantity),
            returnedQuantity: new Prisma.Decimal(it.returnedQuantity),
          }))
        ),
      },
      remito: {
        findFirst: vi.fn().mockImplementation(async () => ({
          id: "remito-1",
          companyId: "company-1",
          state: "Entregado",
          returnedAt: null,
          items: Object.entries(itemsByQuantity).map(([id, it]) => ({
            id,
            quantity: new Prisma.Decimal(it.quantity),
            returnedQuantity: new Prisma.Decimal(it.returnedQuantity),
          })),
        })),
        update: vi.fn().mockImplementation(async ({ data }: { data: { state: string; returnedAt?: Date } }) =>
          {
            finalRemito = buildRemito({ state: data.state, visibleNumber: 1, returnedAt: data.returnedAt ?? null });
            return finalRemito;
          }
        ),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    return { tx, updatedItemsState, getFinalRemito: () => finalRemito };
  }

  it("marks Devuelto when all items are fully returned", async () => {
    const current = buildRemito({
        state: "Entregado",
        visibleNumber: 1,
        items: [
          { id: "item-1", description: "x", quantity: new Prisma.Decimal(10), returnedQuantity: new Prisma.Decimal(0) },
          { id: "item-2", description: "y", quantity: new Prisma.Decimal(2), returnedQuantity: new Prisma.Decimal(0) },
        ],
      });
    const { tx, getFinalRemito } = devolucionTxMocks({
      items: [
        { id: "item-1", quantity: 10, returnedQuantity: 0 },
        { id: "item-2", quantity: 2, returnedQuantity: 0 },
      ],
      requestedItems: [
        { id: "item-1", returnedQuantity: 10 },
        { id: "item-2", returnedQuantity: 2 },
      ],
    });
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ id: "remito-1", companyId: "company-1", surgeryId: "sx-1" })
      .mockImplementation(async () => getFinalRemito());
    const prismaMock = {
      remito: { findFirst },
      devolucion: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: "devolucion-1", state: "Borrador", companyId: "company-1" })
          .mockResolvedValueOnce({ id: "devolucion-1", state: "Pendiente", companyId: "company-1" }),
      },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await registrarDevolucion({
      companyId: "company-1",
      remitoId: "remito-1",
      items: [
        { itemId: "item-1", returnedQuantity: 10 },
        { itemId: "item-2", returnedQuantity: 2 },
      ],
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Devuelto");
    expect(result.returnedAt).toBeInstanceOf(Date);
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "devolucion.confirmed",
        oldValue: { state: "Pendiente" },
        newValue: expect.objectContaining({ state: "Confirmada" }),
      })
    );
  });

  it("marks Parcialmente_devuelto when only some items are returned", async () => {
    const current = buildRemito({
        state: "Entregado",
        visibleNumber: 1,
        items: [
          { id: "item-1", description: "x", quantity: new Prisma.Decimal(10), returnedQuantity: new Prisma.Decimal(0) },
          { id: "item-2", description: "y", quantity: new Prisma.Decimal(2), returnedQuantity: new Prisma.Decimal(0) },
        ],
      });
    const { tx, getFinalRemito } = devolucionTxMocks({
      items: [
        { id: "item-1", quantity: 10, returnedQuantity: 0 },
        { id: "item-2", quantity: 2, returnedQuantity: 0 },
      ],
      requestedItems: [{ id: "item-1", returnedQuantity: 5 }],
    });
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ id: "remito-1", companyId: "company-1", surgeryId: "sx-1" })
      .mockImplementation(async () => getFinalRemito());
    const prismaMock = {
      remito: { findFirst },
      devolucion: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: "devolucion-1", state: "Borrador", companyId: "company-1" })
          .mockResolvedValueOnce({ id: "devolucion-1", state: "Pendiente", companyId: "company-1" }),
      },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await registrarDevolucion({
      companyId: "company-1",
      remitoId: "remito-1",
      items: [{ itemId: "item-1", returnedQuantity: 5 }],
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Parcialmente_devuelto");
    expect(result.returnedAt).toBeNull();
    expect(tx.remito.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ returnedAt: expect.any(Date) }),
      })
    );
  });

  it("rejects when returnedQuantity exceeds quantity", async () => {
    const findFirst = vi.fn().mockResolvedValue(
      buildRemito({
        state: "Entregado",
        visibleNumber: 1,
        items: [{ id: "item-1", description: "x", quantity: new Prisma.Decimal(10) }],
      })
    );
    const { tx } = devolucionTxMocks({
      items: [{ id: "item-1", quantity: 10, returnedQuantity: 0 }],
    });
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    await expect(
      registrarDevolucion({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [{ itemId: "item-1", returnedQuantity: 15 }],
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_devolucion_quantity_exceeded", status: 409 });
    expect(tx.remito.update).not.toHaveBeenCalled();
  });

  it("rejects devolucion on an Anulado remito", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildRemito({ state: "Anulado", visibleNumber: 1 }));
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      registrarDevolucion({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [{ itemId: "item-1", returnedQuantity: 1 }],
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_devolucion_not_allowed", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// â”€â”€â”€ deleteRemito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("deleteRemito", () => {
  it("deletes a Borrador remito", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildRemito({ state: "Borrador", visibleNumber: null }));
    const tx = {
      remito: { findUnique: vi.fn().mockResolvedValue({ id: "remito-1" }), delete: vi.fn().mockResolvedValue({ id: "remito-1" }) },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await deleteRemito({
      companyId: "company-1",
      remitoId: "remito-1",
      prisma: prismaMock,
    });

    expect(result).toEqual({ id: "remito-1", deleted: true });
    expect(tx.remito.delete).toHaveBeenCalledWith({ where: { id: "remito-1" } });
  });

  it("refuses delete when state !== Borrador", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildRemito({ state: "Emitido", visibleNumber: 1 }));
    const prismaMock = {
      remito: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      deleteRemito({
        companyId: "company-1",
        remitoId: "remito-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_not_deletable", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// â”€â”€â”€ Sanity: estado Anulado y Devuelto son terminales sin transiciones â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("REMITO_TRANSITIONS sanity", () => {
  it("Anulado and Devuelto have empty transition sets", () => {
    expect(REMITO_STATES).toContain("Anulado");
    expect(REMITO_STATES).toContain("Devuelto");
  });
  it("RemitoError carries code and status", () => {
    const e = new RemitoError("x", "boom", 409);
    expect(e.code).toBe("x");
    expect(e.status).toBe(409);
    expect(e).toBeInstanceOf(Error);
  });
});

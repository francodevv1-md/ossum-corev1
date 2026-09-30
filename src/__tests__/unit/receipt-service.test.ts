import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createReceiptDraft,
  getReceipt,
  scanReceiptUnit,
  resolvePendingScan,
  confirmReceipt,
} from "@/lib/services/receipt.service";

const COMPANY_ID = "company-1";
const ORG_ID = "org-1";
const ACTOR_USER_ID = "user-1";

function createMockDb(overrides: Record<string, unknown> = {}) {
  const company = { id: COMPANY_ID, organizationId: ORG_ID };

  const articles = [
    {
      id: "art-1",
      organizationId: ORG_ID,
      sku: "SKU-PLACA-4H",
      description: "Placa titanio 4 orificios",
      isActive: true,
      stockEligibilities: [{ companyId: COMPANY_ID }],
    },
    {
      id: "art-2",
      organizationId: ORG_ID,
      sku: "SKU-TORNILLO-35",
      description: "Tornillo cortical 3.5mm",
      isActive: true,
      stockEligibilities: [{ companyId: COMPANY_ID }],
    },
  ];

  const identifiers = [
    {
      id: "ident-1",
      organizationId: ORG_ID,
      articleId: "art-1",
      normalizedValue: "07798123456789",
      isActive: true,
      article: articles[0],
    },
  ];

  const mockDb: any = {
    company: {
      findUnique: vi.fn().mockResolvedValue(company),
    },
    contactCompanyLink: {
      findFirst: vi.fn().mockResolvedValue({ id: "link-1", contactId: "supp-1", companyId: COMPANY_ID }),
    },
    article: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        if (where?.id) {
          return Promise.resolve(articles.find((a) => a.id === where.id) ?? null);
        }
        if (where?.sku) {
          const skuMatch = typeof where.sku === "string" ? where.sku : where.sku?.equals;
          return Promise.resolve(articles.find((a) => a.sku.toLowerCase() === skuMatch?.toLowerCase()) ?? null);
        }
        if (where?.OR) {
          for (const condition of where.OR) {
            if (condition.sku) {
              const match = articles.find((a) => a.sku.toLowerCase() === condition.sku.equals?.toLowerCase());
              if (match) return Promise.resolve(match);
            }
          }
        }
        return Promise.resolve(null);
      }),
      findMany: vi.fn().mockImplementation(({ where }) => {
        if (where?.sku) {
          const skuMatch = typeof where.sku === "string" ? where.sku : where.sku?.equals;
          return Promise.resolve(articles.filter((a) => a.sku.toLowerCase() === skuMatch?.toLowerCase()));
        }
        return Promise.resolve([]);
      }),
    },
    articleIdentifier: {
      findMany: vi.fn().mockImplementation(({ where }) => {
        const matches = identifiers.filter((i) => i.normalizedValue === where?.normalizedValue && i.isActive);
        return Promise.resolve(matches);
      }),
    },
    articleSupplierMapping: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    receipt: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    receiptLine: {
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    receiptScan: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      upsert: vi.fn().mockResolvedValue({ id: "sm-1" }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };

  mockDb.$transaction = vi.fn().mockImplementation((callback: any) => callback(mockDb));

  return Object.assign(mockDb, overrides);
}

describe("Receipt Service", () => {
  describe("createReceiptDraft", () => {
    it("creates a PREPARED receipt draft with expected lines and pre-resolved SKU", async () => {
      const db = createMockDb();

      const createdReceipt = {
        id: "rec-1",
        companyId: COMPANY_ID,
        documentReference: "REM-100",
        supplierId: "supp-1",
        idempotencyKey: null,
        status: "PREPARED",
        notes: null,
        confirmedAt: null,
        confirmedById: null,
        createdAt: new Date("2026-09-30T10:00:00Z"),
        updatedAt: new Date("2026-09-30T10:00:00Z"),
        lines: [
          {
            id: "line-1",
            lineNumber: 1,
            articleId: "art-1",
            expectedCode: "SKU-PLACA-4H",
            expectedDescription: "Placa titanio 4 orificios",
            expectedQuantity: new Prisma.Decimal(5),
            receivedQuantity: new Prisma.Decimal(0),
            lotCode: "LOT-99",
            serialNumber: null,
            expirationDate: new Date("2027-12-31"),
            resolutionStatus: "RESOLVED",
            scans: [],
          },
        ],
      };

      db.receipt.create.mockResolvedValue(createdReceipt);

      const result = await createReceiptDraft(
        db,
        COMPANY_ID,
        {
          documentReference: "REM-100",
          supplierId: "supp-1",
          expectedLines: [
            {
              code: "SKU-PLACA-4H",
              description: "Placa titanio",
              expectedQuantity: "5",
              lotCode: "LOT-99",
              expirationDate: "2027-12-31",
            },
          ],
        },
        ACTOR_USER_ID
      );

      expect(db.receipt.create).toHaveBeenCalled();
      expect(db.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: COMPANY_ID,
            action: "created",
            entityType: "Receipt",
          }),
        })
      );
      expect(result.id).toBe("rec-1");
      expect(result.status).toBe("PREPARED");
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].expectedQuantity).toBe("5");
      expect(result.lines[0].articleId).toBe("art-1");
    });

    it("returns existing receipt when idempotencyKey is reused", async () => {
      const db = createMockDb();
      const existing = {
        id: "rec-existing",
        companyId: COMPANY_ID,
        documentReference: "REM-DUP",
        supplierId: null,
        idempotencyKey: "idem-key-1",
        status: "PREPARED",
        notes: null,
        confirmedAt: null,
        confirmedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lines: [],
      };
      db.receipt.findFirst.mockResolvedValue(existing);

      const result = await createReceiptDraft(
        db,
        COMPANY_ID,
        {
          idempotencyKey: "idem-key-1",
          expectedLines: [],
        },
        ACTOR_USER_ID
      );

      expect(result.id).toBe("rec-existing");
      expect(db.receipt.create).not.toHaveBeenCalled();
    });
  });

  describe("scanReceiptUnit", () => {
    it("resolves exact GTIN scan, increments received quantity, and transitions receipt to IN_CONTROL", async () => {
      const db = createMockDb();

      const existingReceipt = {
        id: "rec-1",
        companyId: COMPANY_ID,
        status: "PREPARED",
        supplierId: null,
        lines: [
          {
            id: "line-1",
            lineNumber: 1,
            articleId: "art-1",
            expectedCode: "SKU-PLACA-4H",
            expectedDescription: "Placa titanio 4 orificios",
            expectedQuantity: new Prisma.Decimal(2),
            receivedQuantity: new Prisma.Decimal(0),
            lotCode: null,
            serialNumber: null,
            expirationDate: null,
            resolutionStatus: "RESOLVED",
            scans: [],
          },
        ],
      };

      db.receipt.findFirst.mockResolvedValue(existingReceipt);

      const createdScan = {
        id: "scan-1",
        rawValue: "(01)07798123456789(10)LOT-X",
        resolutionStatus: "RESOLVED",
        articleId: "art-1",
        lotCode: "LOT-X",
        serialNumber: null,
        expirationDate: null,
        quantity: new Prisma.Decimal(1),
      };
      db.receiptScan.create.mockResolvedValue(createdScan);

      const updatedLine = {
        ...existingReceipt.lines[0],
        receivedQuantity: new Prisma.Decimal(1),
        lotCode: "LOT-X",
        scans: [createdScan],
      };
      db.receiptLine.findUniqueOrThrow.mockResolvedValue(updatedLine);

      const result = await scanReceiptUnit(
        db,
        COMPANY_ID,
        "rec-1",
        "(01)07798123456789(10)LOT-X",
        ACTOR_USER_ID
      );

      expect(result.status).toBe("RESOLVED");
      expect(result.event.articleId).toBe("art-1");
      expect(result.candidates[0].sku).toBe("SKU-PLACA-4H");
      expect(result.line?.receivedQuantity).toBe("1");
      expect(db.receipt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rec-1" },
          data: { status: "IN_CONTROL" },
        })
      );
    });

    it("marks unrecognized barcode as PENDING without auto-creating article", async () => {
      const db = createMockDb();

      const existingReceipt = {
        id: "rec-1",
        companyId: COMPANY_ID,
        status: "PREPARED",
        supplierId: null,
        lines: [],
      };
      db.receipt.findFirst.mockResolvedValue(existingReceipt);

      const createdScan = {
        id: "scan-pending-1",
        rawValue: "UNKNOWN-CODE-999",
        resolutionStatus: "PENDING",
        articleId: null,
        lotCode: null,
        serialNumber: null,
        expirationDate: null,
        quantity: new Prisma.Decimal(1),
      };
      db.receiptScan.create.mockResolvedValue(createdScan);

      const result = await scanReceiptUnit(
        db,
        COMPANY_ID,
        "rec-1",
        "UNKNOWN-CODE-999",
        ACTOR_USER_ID
      );

      expect(result.status).toBe("PENDING");
      expect(result.event.resolutionStatus).toBe("PENDING");
      expect(result.event.articleId).toBeNull();
      expect(result.line).toBeUndefined();
      expect(db.receiptLine.create).not.toHaveBeenCalled();
    });

    it("rejects scan on confirmed receipt (inmutability)", async () => {
      const db = createMockDb();
      db.receipt.findFirst.mockResolvedValue({
        id: "rec-confirmed",
        companyId: COMPANY_ID,
        status: "CONFIRMED",
        lines: [],
      });

      await expect(
        scanReceiptUnit(db, COMPANY_ID, "rec-confirmed", "SKU-PLACA-4H", ACTOR_USER_ID)
      ).rejects.toMatchObject({
        code: "receipt_already_closed",
        status: 400,
      });
    });
  });

  describe("resolvePendingScan", () => {
    it("resolves a pending scan by linking it to an existing article and receipt line", async () => {
      const db = createMockDb();

      const receipt = {
        id: "rec-1",
        companyId: COMPANY_ID,
        status: "IN_CONTROL",
        lines: [
          {
            id: "line-1",
            lineNumber: 1,
            articleId: "art-1",
            expectedCode: "SKU-PLACA-4H",
            expectedDescription: "Placa titanio 4 orificios",
            expectedQuantity: new Prisma.Decimal(2),
            receivedQuantity: new Prisma.Decimal(1),
            lotCode: "LOT-A",
            serialNumber: null,
            expirationDate: null,
            resolutionStatus: "RESOLVED",
            scans: [],
          },
        ],
      };
      db.receipt.findFirst.mockResolvedValue(receipt);

      const pendingScan = {
        id: "scan-p1",
        receiptId: "rec-1",
        companyId: COMPANY_ID,
        resolutionStatus: "PENDING",
        lotCode: "LOT-B",
        serialNumber: "SN-001",
        expirationDate: null,
        quantity: new Prisma.Decimal(1),
      };
      db.receiptScan.findFirst.mockResolvedValue(pendingScan);

      const updatedScan = {
        ...pendingScan,
        resolutionStatus: "RESOLVED",
        articleId: "art-1",
        receiptLineId: "line-1",
      };
      db.receiptScan.update.mockResolvedValue(updatedScan);

      const updatedLine = {
        ...receipt.lines[0],
        receivedQuantity: new Prisma.Decimal(2),
        scans: [updatedScan],
      };
      db.receiptLine.findUniqueOrThrow.mockResolvedValue(updatedLine);

      const result = await resolvePendingScan(
        db,
        COMPANY_ID,
        "rec-1",
        "scan-p1",
        "art-1",
        ACTOR_USER_ID
      );

      expect(result.event.resolutionStatus).toBe("RESOLVED");
      expect(result.event.articleId).toBe("art-1");
      expect(result.line.receivedQuantity).toBe("2");
      expect(db.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "resolved",
            entityType: "ReceiptScan",
          }),
        })
      );
    });
  });

  describe("confirmReceipt", () => {
    it("confirms receipt, transitions status to CONFIRMED, and creates StockMovements idempotently", async () => {
      const db = createMockDb();

      const receipt = {
        id: "rec-1",
        companyId: COMPANY_ID,
        documentReference: "REM-CONFIRM-1",
        status: "IN_CONTROL",
        notes: null,
        lines: [
          {
            id: "line-1",
            lineNumber: 1,
            articleId: "art-1",
            expectedQuantity: new Prisma.Decimal(2),
            receivedQuantity: new Prisma.Decimal(1),
            lotCode: "LOT-1",
            serialNumber: null,
            expirationDate: new Date("2027-10-10"),
            resolutionStatus: "RESOLVED",
            scans: [
              {
                id: "scan-1",
                rawValue: "(01)07798123456789",
                resolutionStatus: "RESOLVED",
                articleId: "art-1",
                lotCode: "LOT-1",
                serialNumber: null,
                expirationDate: new Date("2027-10-10"),
                quantity: new Prisma.Decimal(1),
              },
            ],
          },
        ],
        scans: [
          {
            id: "scan-1",
            resolutionStatus: "RESOLVED",
            articleId: "art-1",
          },
        ],
      };

      db.receipt.findFirst.mockResolvedValue(receipt);

      const confirmedReceipt = {
        ...receipt,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: ACTOR_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      db.receipt.update.mockResolvedValue(confirmedReceipt);

      const result = await confirmReceipt(
        db,
        COMPANY_ID,
        "rec-1",
        "Confirmación OK",
        ACTOR_USER_ID
      );

      expect(result.status).toBe("CONFIRMED");
      expect(db.stockMovement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId_idempotencyKey: {
              companyId: COMPANY_ID,
              idempotencyKey: "receipt:rec-1:scan:scan-1",
            },
          },
          create: expect.objectContaining({
            companyId: COMPANY_ID,
            articleId: "art-1",
            movementType: "RECEIPT_IN",
            quantity: expect.any(Object),
            idempotencyKey: "receipt:rec-1:scan:scan-1",
          }),
        })
      );
      expect(db.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "confirmed",
            entityType: "Receipt",
          }),
        })
      );
    });

    it("rejects confirmation if there are unresolved PENDING scans", async () => {
      const db = createMockDb();

      db.receipt.findFirst.mockResolvedValue({
        id: "rec-pending",
        companyId: COMPANY_ID,
        status: "IN_CONTROL",
        lines: [
          {
            id: "line-1",
            receivedQuantity: new Prisma.Decimal(1),
            articleId: "art-1",
            scans: [],
          },
        ],
        scans: [
          {
            id: "scan-pending",
            resolutionStatus: "PENDING",
            articleId: null,
          },
        ],
      });

      await expect(
        confirmReceipt(db, COMPANY_ID, "rec-pending", undefined, ACTOR_USER_ID)
      ).rejects.toMatchObject({
        code: "receipt_has_pending_scans",
        status: 400,
      });
      expect(db.stockMovement.upsert).not.toHaveBeenCalled();
    });

    it("rejects empty receipt confirmation (0 received items)", async () => {
      const db = createMockDb();

      db.receipt.findFirst.mockResolvedValue({
        id: "rec-empty",
        companyId: COMPANY_ID,
        status: "PREPARED",
        lines: [
          {
            id: "line-1",
            receivedQuantity: new Prisma.Decimal(0),
            articleId: "art-1",
            scans: [],
          },
        ],
        scans: [],
      });

      await expect(
        confirmReceipt(db, COMPANY_ID, "rec-empty", undefined, ACTOR_USER_ID)
      ).rejects.toMatchObject({
        code: "receipt_empty",
        status: 400,
      });
    });

    it("is idempotent: re-confirming already confirmed receipt does not duplicate movements", async () => {
      const db = createMockDb();

      const alreadyConfirmed = {
        id: "rec-already",
        companyId: COMPANY_ID,
        status: "CONFIRMED",
        documentReference: "REM-1",
        supplierId: null,
        idempotencyKey: null,
        notes: null,
        confirmedAt: new Date("2026-09-30T10:00:00Z"),
        confirmedById: ACTOR_USER_ID,
        createdAt: new Date("2026-09-30T09:00:00Z"),
        updatedAt: new Date("2026-09-30T10:00:00Z"),
        lines: [],
        scans: [],
      };
      db.receipt.findFirst.mockResolvedValue(alreadyConfirmed);

      const result = await confirmReceipt(db, COMPANY_ID, "rec-already", undefined, ACTOR_USER_ID);

      expect(result.status).toBe("CONFIRMED");
      expect(db.stockMovement.upsert).not.toHaveBeenCalled();
      expect(db.receipt.update).not.toHaveBeenCalled();
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cajasFormulaCreateSchema,
  cajasFormulaVersionPublishSchema,
} from "@/lib/validators/cajas-formula";
import {
  createBoxFormula,
  publishFormulaVersion,
  listBoxFormulas,
  getBoxFormula,
  ensureArticleReference,
} from "@/lib/services/cajas-formula.service";
import { createAuditEvent } from "@/lib/audit";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/audit", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-123" }),
}));

describe("CAJAS-SLICE-1-COMPATIBLE-DESIGN-AND-IMPLEMENT-DEV-001 — Cajas Modelo / Composición Estándar Versionada", () => {
  const ORG_ID = "org-1";
  const COMPANY_A = "comp-a";
  const COMPANY_B = "comp-b";
  const USER_ID = "usr-1";

  const BOX_ARTICLE_ID = "art-box-1";
  const COMP_1_ID = "art-comp-1";
  const COMP_2_ID = "art-comp-2";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Validators", () => {
    it("validates cajasFormulaCreateSchema with valid components", () => {
      const parsed = cajasFormulaCreateSchema.parse({
        articleId: "box-01",
        lines: [
          { articleId: "screw-01", expectedQuantity: 10, unit: "u" },
          { articleId: "plate-01", expectedQuantity: 2, unit: "u" },
        ],
        cause: "Plantilla estándar",
      });

      expect(parsed.articleId).toBe("box-01");
      expect(parsed.lines).toHaveLength(2);
      expect(parsed.lines[0].expectedQuantity).toBe(10);
      expect(parsed.cause).toBe("Plantilla estándar");
    });

    it("rejects empty lines in cajasFormulaCreateSchema", () => {
      expect(() =>
        cajasFormulaCreateSchema.parse({
          articleId: "box-01",
          lines: [],
        }),
      ).toThrow("La composición debe tener al menos un artículo componente");
    });

    it("rejects negative or zero expectedQuantity", () => {
      expect(() =>
        cajasFormulaCreateSchema.parse({
          articleId: "box-01",
          lines: [{ articleId: "comp-01", expectedQuantity: 0 }],
        }),
      ).toThrow("La cantidad esperada debe ser mayor a 0");

      expect(() =>
        cajasFormulaCreateSchema.parse({
          articleId: "box-01",
          lines: [{ articleId: "comp-01", expectedQuantity: -5 }],
        }),
      ).toThrow("La cantidad esperada debe ser mayor a 0");
    });

    it("validates cajasFormulaVersionPublishSchema", () => {
      const parsed = cajasFormulaVersionPublishSchema.parse({
        lines: [{ articleId: "comp-01", expectedQuantity: 5 }],
        cause: "Ajuste de tornillos",
      });
      expect(parsed.lines[0].expectedQuantity).toBe(5);
      expect(parsed.cause).toBe("Ajuste de tornillos");
    });
  });

  describe("2. Domain Service — ensureArticleReference & Isolation", () => {
    it("ensures article reference is created with snapshots if not exists", async () => {
      const mockDb = {
        article: {
          findFirst: vi.fn().mockResolvedValue({
            id: BOX_ARTICLE_ID,
            sku: "CJ-FEMUR",
            description: "Caja Instrumental Fémur",
            unit: "u",
            family: "Cajas",
            brand: "OSSUM",
            articleType: "caja",
          }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "car-box-1",
            companyId: COMPANY_A,
            sourceArticleId: BOX_ARTICLE_ID,
            skuSnapshot: "CJ-FEMUR",
            descriptionSnapshot: "Caja Instrumental Fémur",
            unit: "u",
          }),
        },
      } as any;

      const { ref, article } = await ensureArticleReference(
        mockDb,
        COMPANY_A,
        ORG_ID,
        BOX_ARTICLE_ID,
        USER_ID,
      );

      expect(ref.id).toBe("car-box-1");
      expect(ref.skuSnapshot).toBe("CJ-FEMUR");
      expect(article.description).toBe("Caja Instrumental Fémur");
      expect(mockDb.cajasArticleReference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: COMPANY_A,
          sourceArticleId: BOX_ARTICLE_ID,
          skuSnapshot: "CJ-FEMUR",
          verifiedById: USER_ID,
        }),
      });
    });

    it("rejects article if not eligible for company", async () => {
      const mockDb = {
        article: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      await expect(
        ensureArticleReference(mockDb, COMPANY_A, ORG_ID, "ineligible-art", USER_ID),
      ).rejects.toThrow("no encontrado o no habilitado para esta empresa");
    });
  });

  describe("3. Formula Creation (Version 1) & Audit", () => {
    it("wraps formula creation in a transaction when Prisma provides one", async () => {
      const tx = {
        $transaction: vi.fn(() => { throw new Error("Unexpected nested transaction"); }),
        company: { findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }) },
        article: { findFirst: vi.fn().mockImplementation(async ({ where }) => ({ id: where.id, sku: where.id, description: where.id, unit: "u" })) },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(async ({ data }) => ({ id: `car-${data.sourceArticleId}`, ...data })),
        },
        cajasBoxFormula: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "cbf-1", companyId: COMPANY_A, nextVersion: 2 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "cbf-1", companyId: COMPANY_A, boxArticleReference: { sourceArticleId: BOX_ARTICLE_ID, skuSnapshot: "BOX-1", descriptionSnapshot: "Caja 1", unit: "u" }, nextVersion: 2,
            currentSelector: { currentFormulaVersion: { id: "cfv-1", versionNumber: 1, acceptedAt: new Date(), acceptedById: USER_ID, acceptedBy: null, cause: null, lines: [] } }, versions: [], createdAt: new Date(), updatedAt: new Date(),
          }),
        },
        cajasCommandAcceptance: { create: vi.fn().mockResolvedValue({ id: "cca-1" }) },
        cajasFormulaVersion: { create: vi.fn().mockResolvedValue({ id: "cfv-1", versionNumber: 1 }) },
        cajasFormulaLine: { create: vi.fn().mockResolvedValue({ id: "cfl-1" }) },
        cajasFormulaCurrent: { create: vi.fn().mockResolvedValue({ id: "cfc-1" }) },
        auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-123" }) },
      } as any;
      const mockDb = { ...tx, $connect: vi.fn(), $transaction: vi.fn((callback) => callback(tx)) } as any;

      await createBoxFormula(mockDb, COMPANY_A, {
        articleId: BOX_ARTICLE_ID,
        lines: [{ articleId: COMP_1_ID, expectedQuantity: 1 }],
      }, USER_ID);

      expect(mockDb.$transaction).toHaveBeenCalledOnce();
      expect(tx.cajasBoxFormula.create).toHaveBeenCalledOnce();
    });

    it("creates Box Formula with version 1, lines, command acceptance and audit event", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === BOX_ARTICLE_ID) {
              return { id: BOX_ARTICLE_ID, sku: "BOX-1", description: "Caja 1", unit: "u" };
            }
            if (where.id === COMP_1_ID) {
              return { id: COMP_1_ID, sku: "COMP-1", description: "Tornillo", unit: "u" };
            }
            return null;
          }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: "car-" + data.sourceArticleId,
            ...data,
          })),
        },
        cajasBoxFormula: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "cbf-1", companyId: COMPANY_A, nextVersion: 2 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "cbf-1",
            companyId: COMPANY_A,
            boxArticleReference: { sourceArticleId: BOX_ARTICLE_ID, skuSnapshot: "BOX-1", descriptionSnapshot: "Caja 1", unit: "u" },
            nextVersion: 2,
            currentSelector: {
              currentFormulaVersion: {
                id: "cfv-1",
                versionNumber: 1,
                acceptedAt: new Date(),
                acceptedById: USER_ID,
                acceptedBy: { firstName: "Franco", lastName: "Dev", email: "franco@ossum.com" },
                cause: "Inicial",
                lines: [
                  {
                    id: "cfl-1",
                    lineNumber: 1,
                    articleReference: { sourceArticleId: COMP_1_ID, skuSnapshot: "COMP-1", descriptionSnapshot: "Tornillo" },
                    skuSnapshot: "COMP-1",
                    descriptionSnapshot: "Tornillo",
                    expectedQuantity: new Prisma.Decimal(10),
                    unit: "u",
                  },
                ],
              },
            },
            versions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        cajasCommandAcceptance: {
          create: vi.fn().mockResolvedValue({ id: "cca-1" }),
        },
        cajasFormulaVersion: {
          create: vi.fn().mockResolvedValue({ id: "cfv-1", versionNumber: 1 }),
        },
        cajasFormulaLine: {
          create: vi.fn().mockResolvedValue({ id: "cfl-1" }),
        },
        cajasFormulaCurrent: {
          create: vi.fn().mockResolvedValue({ id: "cfc-1" }),
        },
      } as any;

      const res = await createBoxFormula(
        mockDb,
        COMPANY_A,
        {
          articleId: BOX_ARTICLE_ID,
          lines: [{ articleId: COMP_1_ID, expectedQuantity: 10, unit: "u" }],
          cause: "Inicial",
        },
        USER_ID,
      );

      expect(res.boxSku).toBe("BOX-1");
      expect(res.currentVersion?.versionNumber).toBe(1);
      expect(res.currentVersion?.lines).toHaveLength(1);
      expect(res.currentVersion?.lines[0].expectedQuantity).toBe(10);
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_A,
          userId: USER_ID,
          entityType: "CajasBoxFormula",
          action: "created",
        }),
      );
      expect(mockDb.cajasCommandAcceptance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: COMPANY_A,
          checkpoint: "formulaVersion",
          acceptedById: USER_ID,
        }),
      });
    });

    it("rejects duplicate box formula for the same article in the same company", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: BOX_ARTICLE_ID, sku: "BOX-1", description: "Caja 1", unit: "u" }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue({ id: "car-box-1" }),
        },
        cajasBoxFormula: {
          findUnique: vi.fn().mockResolvedValue({ id: "existing-formula" }),
        },
      } as any;

      await expect(
        createBoxFormula(
          mockDb,
          COMPANY_A,
          {
            articleId: BOX_ARTICLE_ID,
            lines: [{ articleId: COMP_1_ID, expectedQuantity: 1 }],
          },
          USER_ID,
        ),
      ).rejects.toThrow("Ya existe una fórmula de composición para este artículo caja");
    });

    it("rejects duplicate component articles in the same formula payload", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: BOX_ARTICLE_ID, sku: "BOX-1", description: "Caja 1", unit: "u" }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue({ id: "car-box-1" }),
        },
        cajasBoxFormula: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as any;

      await expect(
        createBoxFormula(
          mockDb,
          COMPANY_A,
          {
            articleId: BOX_ARTICLE_ID,
            lines: [
              { articleId: COMP_1_ID, expectedQuantity: 1 },
              { articleId: COMP_1_ID, expectedQuantity: 2 },
            ],
          },
          USER_ID,
        ),
      ).rejects.toThrow("Artículo componente duplicado");
    });
  });

  describe("4. Immutable Version Publishing & History", () => {
    it("publishes version 2 without overwriting version 1", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        cajasBoxFormula: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.companyId === COMPANY_A && where.id === "cbf-1") {
              return {
                id: "cbf-1",
                companyId: COMPANY_A,
                nextVersion: 2,
                currentSelector: { id: "cfc-1", currentFormulaVersionId: "cfv-1" },
                boxArticleReference: { sourceArticleId: BOX_ARTICLE_ID, skuSnapshot: "BOX-1", descriptionSnapshot: "Caja 1", unit: "u" },
                versions: [
                  {
                    id: "cfv-2",
                    versionNumber: 2,
                    previousVersionId: "cfv-1",
                    acceptedAt: new Date("2026-10-02"),
                    acceptedById: USER_ID,
                    acceptedBy: { firstName: "Franco", lastName: "Dev" },
                    cause: "Agregado tornillo 2",
                    _count: { lines: 2 },
                    lines: [
                      { id: "l-1", lineNumber: 1, articleReference: { sourceArticleId: COMP_1_ID }, expectedQuantity: 10, unit: "u" },
                      { id: "l-2", lineNumber: 2, articleReference: { sourceArticleId: COMP_2_ID }, expectedQuantity: 5, unit: "u" },
                    ],
                  },
                  {
                    id: "cfv-1",
                    versionNumber: 1,
                    previousVersionId: null,
                    acceptedAt: new Date("2026-10-01"),
                    acceptedById: USER_ID,
                    acceptedBy: { firstName: "Franco", lastName: "Dev" },
                    cause: "Inicial",
                    _count: { lines: 1 },
                    lines: [
                      { id: "l-old", lineNumber: 1, articleReference: { sourceArticleId: COMP_1_ID }, expectedQuantity: 10, unit: "u" },
                    ],
                  },
                ],
                createdAt: new Date("2026-10-01"),
                updatedAt: new Date("2026-10-02"),
              };
            }
            return null;
          }),
          update: vi.fn().mockResolvedValue({ id: "cbf-1", nextVersion: 3 }),
        },
        article: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === COMP_1_ID) return { id: COMP_1_ID, sku: "COMP-1", description: "Tornillo 1", unit: "u" };
            if (where.id === COMP_2_ID) return { id: COMP_2_ID, sku: "COMP-2", description: "Tornillo 2", unit: "u" };
            return null;
          }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue({ id: "car-comp" }),
        },
        cajasFormulaVersion: {
          create: vi.fn().mockResolvedValue({ id: "cfv-2", versionNumber: 2 }),
        },
        cajasFormulaLine: {
          create: vi.fn().mockResolvedValue({ id: "cfl-new" }),
        },
        cajasFormulaCurrent: {
          update: vi.fn().mockResolvedValue({ id: "cfc-1" }),
        },
        cajasCommandAcceptance: {
          create: vi.fn().mockResolvedValue({ id: "cca-2" }),
        },
      } as any;

      const res = await publishFormulaVersion(
        mockDb,
        COMPANY_A,
        "cbf-1",
        {
          lines: [
            { articleId: COMP_1_ID, expectedQuantity: 10, unit: "u" },
            { articleId: COMP_2_ID, expectedQuantity: 5, unit: "u" },
          ],
          cause: "Agregado tornillo 2",
        },
        USER_ID,
      );

      expect(mockDb.cajasFormulaVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: COMPANY_A,
          formulaId: "cbf-1",
          versionNumber: 2,
          previousVersionId: "cfv-1",
          cause: "Agregado tornillo 2",
        }),
      });

      expect(mockDb.cajasFormulaCurrent.update).toHaveBeenCalledWith({
        where: { id: "cfc-1" },
        data: {
          currentFormulaVersionId: "cfv-2",
          version: { increment: 1 },
        },
      });

      expect(mockDb.cajasBoxFormula.update).toHaveBeenCalledWith({
        where: { id: "cbf-1" },
        data: { nextVersion: 3 },
      });

      expect(res.versions).toHaveLength(2);
      expect(res.versions[0].versionNumber).toBe(2);
      expect(res.versions[1].versionNumber).toBe(1);
    });

    it("isolates box formula queries by companyId", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        cajasBoxFormula: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.companyId === COMPANY_A && where.id === "cbf-1") {
              return { id: "cbf-1", companyId: COMPANY_A };
            }
            return null;
          }),
        },
      } as any;

      // Accessing with Company B throws not found
      await expect(getBoxFormula(mockDb, COMPANY_B, "cbf-1")).rejects.toThrow("Fórmula de caja no encontrada");
    });
  });
});

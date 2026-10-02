import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cajasAssignmentCreateSchema,
  cajasAssignmentEndSchema,
} from "@/lib/validators/cajas-assignment";
import {
  assignBoxToSurgery,
  listSurgeryBoxAssignments,
  getBoxAssignment,
  endBoxAssignment,
} from "@/lib/services/cajas-assignment.service";
import { createAuditEvent } from "@/lib/audit";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/audit", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-333" }),
}));

describe("CAJAS-SLICE-3 — Asignación y Preparación Inicial", () => {
  const ORG_ID = "org-1";
  const COMPANY_A = "comp-a";
  const COMPANY_B = "comp-b";
  const USER_ID = "usr-1";

  const SURGERY_1_ID = "surg-1";
  const SURGERY_2_ID = "surg-2";
  const BOX_ARTICLE_ID = "art-box-1";
  const COMP_1_ID = "art-comp-1";
  const PHYSICAL_UNIT_1_ID = "spu-box-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Validators", () => {
    it("validates cajasAssignmentCreateSchema", () => {
      const parsed = cajasAssignmentCreateSchema.parse({
        physicalUnitId: "spu-123",
        notes: "Asignación para reemplazo total de cadera",
      });
      expect(parsed.physicalUnitId).toBe("spu-123");
      expect(parsed.notes).toBe("Asignación para reemplazo total de cadera");
    });

    it("rejects empty physicalUnitId in cajasAssignmentCreateSchema", () => {
      expect(() =>
        cajasAssignmentCreateSchema.parse({
          physicalUnitId: "",
        }),
      ).toThrow("El ID de la caja física identificada es obligatorio");
    });

    it("validates cajasAssignmentEndSchema", () => {
      const parsed = cajasAssignmentEndSchema.parse({
        cause: "Cirugía finalizada y caja retornada",
      });
      expect(parsed.cause).toBe("Cirugía finalizada y caja retornada");
    });
  });

  describe("2. Assignment & Preparation Opening Service", () => {
    it("successfully assigns an active identified box to surgery and opens preparation with current formula version", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({
            id: SURGERY_1_ID,
            visibleNumber: "CX-0001",
            patientName: "Juan Pérez",
            institutionName: "Hospital Italiano",
          }),
        },
        stockPhysicalUnit: {
          findFirst: vi.fn().mockResolvedValue({
            id: PHYSICAL_UNIT_1_ID,
            companyId: COMPANY_A,
            articleId: BOX_ARTICLE_ID,
            unitCode: "CJ-001",
            serialNumber: "SN-999",
            location: "Depósito Central",
            status: "ACTIVE",
            article: {
              id: BOX_ARTICLE_ID,
              sku: "CJ-CADERA",
              description: "Caja Instrumental Cadera",
              unit: "u",
              articleType: "caja",
            },
          }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({
            id: BOX_ARTICLE_ID,
            sku: "CJ-CADERA",
            description: "Caja Instrumental Cadera",
            unit: "u",
            articleType: "caja",
          }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue({
            id: "car-box-1",
            companyId: COMPANY_A,
            sourceArticleId: BOX_ARTICLE_ID,
            skuSnapshot: "CJ-CADERA",
            descriptionSnapshot: "Caja Instrumental Cadera",
            unit: "u",
          }),
        },
        cajasStockScopeReference: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cssr-unit-1",
            companyId: COMPANY_A,
            sourceStockScopeId: PHYSICAL_UNIT_1_ID,
            kind: "identifiedUnit",
            identifiedCodeSnapshot: "CJ-001",
            serialNumberSnapshot: "SN-999",
          }),
        },
        cajasAssignment: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === "ca-new" || where.boxStockScopeReferenceId === "cssr-unit-1") {
              return {
                id: "ca-new",
                companyId: COMPANY_A,
                surgeryId: SURGERY_1_ID,
                activeSlot: 1,
                assignedAt: new Date("2026-10-01T10:00:00Z"),
                assignedById: USER_ID,
                surgery: { visibleNumber: "CX-0001", patientName: "Juan Pérez", institutionName: "Hospital Italiano" },
                boxStockScopeReference: {
                  sourceStockScopeId: PHYSICAL_UNIT_1_ID,
                  identifiedCodeSnapshot: "CJ-001",
                  serialNumberSnapshot: "SN-999",
                  articleReference: {
                    sourceArticleId: BOX_ARTICLE_ID,
                    skuSnapshot: "CJ-CADERA",
                    descriptionSnapshot: "Caja Instrumental Cadera",
                  },
                },
                assignedBy: { id: USER_ID, firstName: "Franco", lastName: "Dev" },
                endedBy: null,
                preparation: {
                  id: "cp-1",
                  version: 1,
                  formulaVersionId: "cfv-1",
                  requiresRecontrol: false,
                  formulaVersion: {
                    id: "cfv-1",
                    versionNumber: 1,
                    cause: "Inicial",
                    acceptedAt: new Date("2026-09-01"),
                  },
                  lines: [
                    {
                      id: "cpl-1",
                      lineKey: "line-1",
                      role: "expected",
                      articleReference: { sourceArticleId: COMP_1_ID, skuSnapshot: "TORN-1", descriptionSnapshot: "Tornillo 1" },
                      quantity: new Prisma.Decimal(6),
                      unit: "u",
                      isActive: true,
                    },
                  ],
                },
                createdAt: new Date("2026-10-01T10:00:00Z"),
              };
            }
            return null;
          }),
          create: vi.fn().mockResolvedValue({
            id: "ca-new",
            companyId: COMPANY_A,
            surgeryId: SURGERY_1_ID,
            activeSlot: 1,
          }),
        },
        cajasBoxFormula: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cbf-1",
            companyId: COMPANY_A,
            currentSelector: {
              currentFormulaVersion: {
                id: "cfv-1",
                versionNumber: 1,
                lines: [
                  {
                    id: "cfl-1",
                    lineNumber: 1,
                    articleReferenceId: "car-comp-1",
                    expectedQuantity: new Prisma.Decimal(6),
                    unit: "u",
                    skuSnapshot: "TORN-1",
                    descriptionSnapshot: "Tornillo 1",
                  },
                ],
              },
            },
          }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: "ca-new" }]),
        cajasCommandAcceptance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "cca-1" }),
        },
        cajasPreparation: {
          create: vi.fn().mockResolvedValue({ id: "cp-1" }),
        },
        cajasPreparationLine: {
          create: vi.fn().mockResolvedValue({ id: "cpl-1" }),
        },
      } as any;

      // Mock first call for existingActiveAssignment to return null
      mockDb.cajasAssignment.findFirst.mockResolvedValueOnce(null);

      const res = await assignBoxToSurgery(
        mockDb,
        COMPANY_A,
        SURGERY_1_ID,
        { physicalUnitId: PHYSICAL_UNIT_1_ID, notes: "Cirugía programada" },
        USER_ID,
      );

      expect(res.unitCode).toBe("CJ-001");
      expect(res.isActive).toBe(true);
      expect(res.preparation?.formulaVersionNumber).toBe(1);
      expect(res.preparation?.lines).toHaveLength(1);
      expect(res.preparation?.lines[0].quantity).toBe(6);

      // Verify audit & command acceptance
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_A,
          entityType: "CajasAssignment",
          action: "created",
        }),
      );
      expect(mockDb.cajasCommandAcceptance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: COMPANY_A,
          checkpoint: "assignment",
          acceptedById: USER_ID,
        }),
      });

      // Verify preparation created with formulaVersionId = "cfv-1"
      expect(mockDb.cajasPreparation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: COMPANY_A,
          formulaVersionId: "cfv-1",
          version: 1,
        }),
      });
    });

    it("rejects assigning a RETIRED physical box unit", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({ id: SURGERY_1_ID }),
        },
        stockPhysicalUnit: {
          findFirst: vi.fn().mockResolvedValue({
            id: PHYSICAL_UNIT_1_ID,
            companyId: COMPANY_A,
            status: "RETIRED",
          }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: "1" }]),
        cajasCommandAcceptance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "cca-1" }),
        },
      } as any;

      await expect(
        assignBoxToSurgery(
          mockDb,
          COMPANY_A,
          SURGERY_1_ID,
          { physicalUnitId: PHYSICAL_UNIT_1_ID },
          USER_ID,
        ),
      ).rejects.toThrow("No se puede asignar una caja identificada retirada");
    });

    it("rejects double active assignment for the same physical unit", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({ id: SURGERY_2_ID }),
        },
        stockPhysicalUnit: {
          findFirst: vi.fn().mockResolvedValue({
            id: PHYSICAL_UNIT_1_ID,
            companyId: COMPANY_A,
            articleId: BOX_ARTICLE_ID,
            unitCode: "CJ-001",
            status: "ACTIVE",
            article: { sku: "CJ-CADERA" },
          }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: BOX_ARTICLE_ID, sku: "CJ-CADERA" }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue({ id: "car-box-1" }),
        },
        cajasStockScopeReference: {
          findUnique: vi.fn().mockResolvedValue({ id: "cssr-unit-1" }),
        },
        cajasAssignment: {
          findFirst: vi.fn().mockResolvedValue({
            id: "ca-active",
            companyId: COMPANY_A,
            boxStockScopeReferenceId: "cssr-unit-1",
            activeSlot: 1,
            surgery: { id: SURGERY_1_ID, visibleNumber: "CX-0001" },
          }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: "1" }]),
        cajasCommandAcceptance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "cca-1" }),
        },
      } as any;

      await expect(
        assignBoxToSurgery(
          mockDb,
          COMPANY_A,
          SURGERY_2_ID,
          { physicalUnitId: PHYSICAL_UNIT_1_ID },
          USER_ID,
        ),
      ).rejects.toThrow("ya está asignada a otra cirugía activa");
    });

    it("rejects assignment if box article has no active formula", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        surgery: {
          findFirst: vi.fn().mockResolvedValue({ id: SURGERY_1_ID }),
        },
        stockPhysicalUnit: {
          findFirst: vi.fn().mockResolvedValue({
            id: PHYSICAL_UNIT_1_ID,
            companyId: COMPANY_A,
            articleId: BOX_ARTICLE_ID,
            unitCode: "CJ-001",
            status: "ACTIVE",
            article: { sku: "CJ-CADERA" },
          }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: BOX_ARTICLE_ID, sku: "CJ-CADERA" }),
        },
        cajasArticleReference: {
          findUnique: vi.fn().mockResolvedValue({ id: "car-box-1" }),
        },
        cajasStockScopeReference: {
          findUnique: vi.fn().mockResolvedValue({ id: "cssr-unit-1" }),
        },
        cajasAssignment: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: "1" }]),
        cajasBoxFormula: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        cajasCommandAcceptance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "cca-1" }),
        },
      } as any;

      await expect(
        assignBoxToSurgery(
          mockDb,
          COMPANY_A,
          SURGERY_1_ID,
          { physicalUnitId: PHYSICAL_UNIT_1_ID },
          USER_ID,
        ),
      ).rejects.toThrow("no posee una fórmula de composición activa");
    });
  });

  describe("3. Immutability of Captured Formula Version", () => {
    it("ensures preparation preserves captured formula version when a new formula version is published later", async () => {
      // In Slice 3, CajasPreparation has its own relation to `formulaVersionId` (foreign key to CajasFormulaVersion).
      // When version 2 is created in CajasFormulaVersion, existing CajasPreparation records remain pointing to version 1.
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        cajasAssignment: {
          findFirst: vi.fn().mockResolvedValue({
            id: "ca-old",
            companyId: COMPANY_A,
            surgeryId: SURGERY_1_ID,
            activeSlot: 1,
            surgery: { visibleNumber: "CX-0001" },
            boxStockScopeReference: {
              sourceStockScopeId: PHYSICAL_UNIT_1_ID,
              identifiedCodeSnapshot: "CJ-001",
              articleReference: { skuSnapshot: "CJ-CADERA" },
            },
            preparation: {
              id: "cp-1",
              version: 1,
              formulaVersionId: "cfv-1",
              formulaVersion: { versionNumber: 1, cause: "Inicial v1", acceptedAt: new Date("2026-09-01") },
              lines: [
                {
                  id: "cpl-1",
                  lineKey: "line-1",
                  role: "expected",
                  articleReference: { sourceArticleId: COMP_1_ID, skuSnapshot: "TORN-1" },
                  quantity: new Prisma.Decimal(6),
                  unit: "u",
                  isActive: true,
                },
              ],
            },
            assignedAt: new Date("2026-10-01"),
            assignedBy: { firstName: "Franco", lastName: "Dev" },
          }),
        },
      } as any;

      const assignmentDetail = await getBoxAssignment(mockDb, COMPANY_A, "ca-old");
      expect(assignmentDetail.preparation?.formulaVersionNumber).toBe(1);
      expect(assignmentDetail.preparation?.formulaVersionId).toBe("cfv-1");
      expect(assignmentDetail.preparation?.lines).toHaveLength(1);
      expect(assignmentDetail.preparation?.lines[0].quantity).toBe(6);
    });
  });

  describe("4. End / Release Assignment", () => {
    it("releases active assignment and records end audit event", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: "ca-1" }]),
        cajasAssignment: {
          findFirst: vi.fn().mockResolvedValue({
            id: "ca-1",
            companyId: COMPANY_A,
            activeSlot: 1,
            surgeryId: SURGERY_1_ID,
            surgery: { visibleNumber: "CX-0001" },
            boxStockScopeReference: { sourceStockScopeId: PHYSICAL_UNIT_1_ID, identifiedCodeSnapshot: "CJ-001", articleReference: {} },
            preparation: {
              version: 1,
              requiresRecontrol: false,
              latestControl: { result: "clean", sourcePreparationVersion: 1 },
              formulaVersion: { versionNumber: 1, acceptedAt: new Date() },
              lines: [],
            },
            assignedAt: new Date(),
          }),
          update: vi.fn().mockResolvedValue({
            id: "ca-1",
            activeSlot: null,
            endedAt: new Date(),
            endCause: "Cirugía finalizada",
          }),
        },
        cajasCommandAcceptance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "cca-end" }),
        },
        cajasDifference: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        cajasDispatchLineAccounting: {
          count: vi.fn().mockResolvedValue(0),
        },
        stockReservation: {
          count: vi.fn().mockResolvedValue(0),
        },
      } as any;

      const ended = await endBoxAssignment(
        mockDb,
        COMPANY_A,
        "ca-1",
        { cause: "Cirugía finalizada" },
        USER_ID,
      );

      expect(mockDb.cajasAssignment.update).toHaveBeenCalledWith({
        where: { id: "ca-1" },
        data: expect.objectContaining({
          activeSlot: null,
          endedById: USER_ID,
          endCause: "Cirugía finalizada",
        }),
      });
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_A,
          entityType: "CajasAssignment",
          action: "updated",
        }),
      );
    });
  });

  describe("5. Multi-Company Isolation", () => {
    it("rejects querying assignments of a different company", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        cajasAssignment: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.companyId === COMPANY_A && where.id === "ca-1") {
              return { id: "ca-1", companyId: COMPANY_A };
            }
            return null;
          }),
        },
      } as any;

      await expect(getBoxAssignment(mockDb, COMPANY_B, "ca-1")).rejects.toThrow(
        "Asignación de caja no encontrada",
      );
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  priceListCreateSchema,
  priceListUpdateSchema,
  articlePriceVersionCreateSchema,
  priceLookupQuerySchema,
} from "@/lib/validators/price-list";
import {
  createPriceList,
  listPriceLists,
  getPriceList,
  updatePriceList,
  addArticlePriceVersion,
  getArticlePriceHistory,
  getEffectiveArticlePrice,
} from "@/lib/services/price-list.service";
import { createAuditEvent } from "@/lib/audit";

vi.mock("@/lib/audit", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-1" }),
}));

describe("ARTICLE-PRICE-LISTS-HISTORY-PER-COMPANY-DEV-001 — Price Lists & Version History", () => {
  const ORG_ID = "org-1";
  const COMPANY_A = "comp-a";
  const COMPANY_B = "comp-b";
  const USER_ID = "usr-1";
  const ARTICLE_ID = "art-1";
  const PRICE_LIST_ID = "pl-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAuditEvent).mockReset().mockResolvedValue({ id: "audit-1" } as any);
  });

  function rootDb(tx: any) {
    const root: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    for (const [model, methods] of Object.entries(tx)) {
      root[model] = Object.fromEntries(
        Object.entries(methods as Record<string, (...args: any[]) => any>)
          .map(([method, fn]) => [method, vi.fn((...args: any[]) => fn(...args))]),
      );
    }
    return root;
  }

  describe.each(["create", "update", "version"] as const)("Atomic %s mutation", (operation) => {
    function fixture() {
      const record = {
        id: "record-1", companyId: COMPANY_A, organizationId: ORG_ID,
        articleId: ARTICLE_ID, priceListId: PRICE_LIST_ID,
        code: "DIST", name: "Distribuidor", description: null, isActive: true,
        price: 1000, currency: "ARS", effectiveAt: new Date("2026-10-01"),
        createdAt: new Date("2026-10-01"), notes: null, createdById: USER_ID,
        priceList: { code: "DIST", name: "Distribuidor" }, createdBy: null,
      };
      const committed: unknown[] = [];
      const pending: unknown[] = [];
      const write = vi.fn(async () => { pending.push(record); return record; });
      const tx = {
        company: { findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }) },
        article: { findFirst: vi.fn().mockResolvedValue({ id: ARTICLE_ID }) },
        priceList: {
          findFirst: vi.fn().mockResolvedValue(operation === "create" ? null : record),
          create: write, update: write,
        },
        articleCompanyPriceVersion: { create: write },
      };
      const root = rootDb(tx);
      const rootWrite = vi.fn(async () => { committed.push(record); return record; });
      root.priceList.create = rootWrite;
      root.priceList.update = rootWrite;
      root.articleCompanyPriceVersion.create = rootWrite;
      root.$transaction.mockImplementation(async (callback: any) => {
        try {
          const result = await callback(tx);
          committed.push(...pending);
          return result;
        } finally {
          pending.length = 0;
        }
      });
      const run = (db: any) => operation === "create"
        ? createPriceList(db, COMPANY_A, { code: "DIST", name: "Distribuidor", currency: "ARS" }, USER_ID)
        : operation === "update"
          ? updatePriceList(db, COMPANY_A, PRICE_LIST_ID, { name: "Distribuidor" }, USER_ID)
          : addArticlePriceVersion(db, COMPANY_A, ARTICLE_ID, { priceListId: PRICE_LIST_ID, price: 1000, currency: "ARS" }, USER_ID);
      return { root, tx, write, rootWrite, committed, pending, run };
    }

    it("commits the write and audit using the same transaction client", async () => {
      const f = fixture();
      await f.run(f.root);
      expect(f.root.$transaction).toHaveBeenCalledTimes(1);
      expect(f.write).toHaveBeenCalledTimes(1);
      expect(f.rootWrite).not.toHaveBeenCalled();
      expect(vi.mocked(createAuditEvent).mock.calls[0][0].prisma).toBe(f.tx);
      expect(f.committed).toHaveLength(1);
    });

    it("rejects the transaction without committed state when audit fails", async () => {
      const f = fixture();
      vi.mocked(createAuditEvent).mockRejectedValueOnce(new Error("Audit failed"));
      await expect(f.run(f.root)).rejects.toThrow("Audit failed");
      expect(f.committed).toEqual([]);
      expect(f.root.$transaction).toHaveBeenCalledTimes(1);
      expect(f.write).toHaveBeenCalledTimes(1);
      expect(vi.mocked(createAuditEvent).mock.calls[0][0].prisma).toBe(f.tx);
      await expect(f.root.$transaction.mock.results[0].value).rejects.toThrow("Audit failed");
      expect(f.pending).toEqual([]);
    });

    it("reuses a supplied transaction without nesting", async () => {
      const f = fixture();
      await f.run(f.tx);
      expect(f.root.$transaction).not.toHaveBeenCalled();
      expect(f.write).toHaveBeenCalledTimes(1);
      expect(vi.mocked(createAuditEvent).mock.calls[0][0].prisma).toBe(f.tx);
    });
  });

  describe("1. Validators", () => {
    it("validates priceListCreateSchema correctly", () => {
      const parsed = priceListCreateSchema.parse({
        code: "list-mayorista",
        name: "Lista Mayorista",
        description: "Precios para distribuidores",
      });
      expect(parsed.code).toBe("LIST-MAYORISTA");
      expect(parsed.name).toBe("Lista Mayorista");
      expect(parsed.currency).toBe("ARS");
    });

    it("rejects empty code or name in priceListCreateSchema", () => {
      expect(() =>
        priceListCreateSchema.parse({
          code: "",
          name: "Lista",
        }),
      ).toThrow();

      expect(() =>
        priceListCreateSchema.parse({
          code: "L1",
          name: "",
        }),
      ).toThrow();
    });

    it("validates priceListUpdateSchema correctly", () => {
      const parsed = priceListUpdateSchema.parse({
        name: "Nombre Nuevo",
        isActive: false,
      });
      expect(parsed.name).toBe("Nombre Nuevo");
      expect(parsed.isActive).toBe(false);
    });

    it("validates articlePriceVersionCreateSchema correctly", () => {
      const parsed = articlePriceVersionCreateSchema.parse({
        priceListId: "pl-123",
        price: 15400.5,
        effectiveAt: "2026-10-01T00:00:00.000Z",
        notes: "Actualización mensual",
      });
      expect(parsed.price).toBe(15400.5);
      expect(parsed.currency).toBe("ARS");
    });

    it("rejects negative price in articlePriceVersionCreateSchema", () => {
      expect(() =>
        articlePriceVersionCreateSchema.parse({
          priceListId: "pl-123",
          price: -50,
        }),
      ).toThrow("El precio no puede ser negativo");
    });

    it("validates priceLookupQuerySchema", () => {
      const parsed = priceLookupQuerySchema.parse({
        priceListId: "pl-1",
        at: "2026-10-15",
      });
      expect(parsed.priceListId).toBe("pl-1");
      expect(parsed.at).toBe("2026-10-15");
    });
  });

  describe("2. Price List Service — Multi-Company Isolation & Uniqueness", () => {
    it("creates a price list and records audit event", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        priceList: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: PRICE_LIST_ID,
            companyId: COMPANY_A,
            code: "DIST",
            name: "Distribuidor",
            description: null,
            currency: "ARS",
            isActive: true,
          }),
        },
      } as any;

      const res = await createPriceList(
        rootDb(mockDb),
        COMPANY_A,
        { code: "DIST", name: "Distribuidor", currency: "ARS" },
        USER_ID,
      );

      expect(res.code).toBe("DIST");
      expect(mockDb.priceList.create).toHaveBeenCalledWith({
        data: {
          companyId: COMPANY_A,
          code: "DIST",
          name: "Distribuidor",
          description: null,
          currency: "ARS",
          isActive: true,
        },
      });
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          prisma: mockDb,
          companyId: COMPANY_A,
          userId: USER_ID,
          entityType: "PriceList",
          action: "created",
        }),
      );
    });

    it("rejects duplicate price list code within the same company", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        priceList: {
          findFirst: vi.fn().mockResolvedValue({ id: "existing-pl" }),
        },
      } as any;

      await expect(
        createPriceList(
          rootDb(mockDb),
          COMPANY_A,
          { code: "DIST", name: "Distribuidor", currency: "ARS" },
          USER_ID,
        ),
      ).rejects.toThrow("Ya existe una lista de precios con este código en la empresa");
    });

    it("isolates price list queries per company", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        priceList: {
          findMany: vi.fn().mockResolvedValue([
            { id: "pl-a", companyId: COMPANY_A, code: "L-A", name: "Lista A", isActive: true },
          ]),
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            if (where.companyId === COMPANY_A && where.id === "pl-a") {
              return { id: "pl-a", companyId: COMPANY_A, code: "L-A", name: "Lista A", isActive: true };
            }
            return null;
          }),
        },
      } as any;

      const listA = await listPriceLists(mockDb, COMPANY_A);
      expect(listA).toHaveLength(1);
      expect(mockDb.priceList.findMany).toHaveBeenCalledWith({
        where: { companyId: COMPANY_A, isActive: true },
        orderBy: { name: "asc" },
      });

      // Querying with company B should not find Company A's list
      await expect(getPriceList(mockDb, COMPANY_B, "pl-a")).rejects.toThrow("Lista de precios no encontrada");
    });

    it("updates price list and records audit event", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        priceList: {
          findFirst: vi.fn().mockResolvedValue({
            id: PRICE_LIST_ID,
            companyId: COMPANY_A,
            name: "Old Name",
            description: null,
            isActive: true,
          }),
          update: vi.fn().mockResolvedValue({
            id: PRICE_LIST_ID,
            companyId: COMPANY_A,
            name: "New Name",
            description: "New Desc",
            isActive: false,
          }),
        },
      } as any;

      const updated = await updatePriceList(
        rootDb(mockDb),
        COMPANY_A,
        PRICE_LIST_ID,
        { name: "New Name", description: "New Desc", isActive: false },
        USER_ID,
      );

      expect(updated.name).toBe("New Name");
      expect(updated.isActive).toBe(false);
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_A,
          entityType: "PriceList",
          action: "updated",
          prisma: mockDb,
        }),
      );
    });
  });

  describe("3. Price Version History — Immutability & Effective Price Selection", () => {
    it("adds a new immutable price version with effectiveAt", async () => {
      const effectiveDate = new Date("2026-10-01T10:00:00.000Z");
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: ARTICLE_ID }),
        },
        priceList: {
          findFirst: vi.fn().mockResolvedValue({ id: PRICE_LIST_ID, code: "L1", name: "Lista 1" }),
        },
        articleCompanyPriceVersion: {
          create: vi.fn().mockResolvedValue({
            id: "ver-1",
            companyId: COMPANY_A,
            organizationId: ORG_ID,
            articleId: ARTICLE_ID,
            priceListId: PRICE_LIST_ID,
            price: 5000,
            currency: "ARS",
            effectiveAt: effectiveDate,
            notes: "Versión inicial",
            createdById: USER_ID,
            createdAt: new Date("2026-10-01T10:00:00.000Z"),
            priceList: { id: PRICE_LIST_ID, code: "L1", name: "Lista 1" },
            createdBy: { id: USER_ID, firstName: "Franco", lastName: "Dev", email: "franco@ossum.com" },
          }),
        },
      } as any;

      const res = await addArticlePriceVersion(
        rootDb(mockDb),
        COMPANY_A,
        ARTICLE_ID,
        {
          priceListId: PRICE_LIST_ID,
          price: 5000,
          effectiveAt: effectiveDate.toISOString(),
          notes: "Versión inicial",
          currency: "ARS",
        },
        USER_ID,
      );

      expect(res.price).toBe(5000);
      expect(res.priceListCode).toBe("L1");
      expect(res.createdByName).toBe("Franco Dev");
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_A,
          entityType: "ArticleCompanyPriceVersion",
          action: "created",
          prisma: mockDb,
        }),
      );
    });

    it("rejects adding price version if article is not eligible for the company", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      await expect(
        addArticlePriceVersion(
          rootDb(mockDb),
          COMPANY_A,
          ARTICLE_ID,
          { priceListId: PRICE_LIST_ID, price: 1000, currency: "ARS" },
          USER_ID,
        ),
      ).rejects.toThrow("Artículo no encontrado para esta empresa");
    });

    it("rejects adding price version if price list belongs to a different company or is inactive", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: ARTICLE_ID }),
        },
        priceList: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as any;

      await expect(
        addArticlePriceVersion(
          rootDb(mockDb),
          COMPANY_A,
          ARTICLE_ID,
          { priceListId: PRICE_LIST_ID, price: 1000, currency: "ARS" },
          USER_ID,
        ),
      ).rejects.toThrow("Lista de precios no encontrada o inactiva en esta empresa");
    });

    it("fetches immutable price history ordered by effectiveAt desc", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: ARTICLE_ID }),
        },
        articleCompanyPriceVersion: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "v2",
              companyId: COMPANY_A,
              organizationId: ORG_ID,
              articleId: ARTICLE_ID,
              priceListId: PRICE_LIST_ID,
              price: 6000,
              currency: "ARS",
              effectiveAt: new Date("2026-10-15"),
              notes: "Aumento",
              createdById: USER_ID,
              createdAt: new Date("2026-10-15"),
              priceList: { id: PRICE_LIST_ID, code: "L1", name: "Lista 1", isActive: true },
              createdBy: { id: USER_ID, firstName: "Franco", lastName: "Dev", email: "f@o.com" },
            },
            {
              id: "v1",
              companyId: COMPANY_A,
              organizationId: ORG_ID,
              articleId: ARTICLE_ID,
              priceListId: PRICE_LIST_ID,
              price: 5000,
              currency: "ARS",
              effectiveAt: new Date("2026-10-01"),
              notes: "Inicial",
              createdById: USER_ID,
              createdAt: new Date("2026-10-01"),
              priceList: { id: PRICE_LIST_ID, code: "L1", name: "Lista 1", isActive: true },
              createdBy: null,
            },
          ]),
        },
      } as any;

      const history = await getArticlePriceHistory(mockDb, COMPANY_A, ARTICLE_ID);
      expect(history).toHaveLength(2);
      expect(history[0].price).toBe(6000);
      expect(history[1].price).toBe(5000);
      expect(mockDb.articleCompanyPriceVersion.findMany).toHaveBeenCalledWith({
        where: { companyId: COMPANY_A, articleId: ARTICLE_ID },
        orderBy: { effectiveAt: "desc" },
        include: expect.any(Object),
      });
    });

    it("calculates effective price correctly based on queried date", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({ id: ARTICLE_ID }),
        },
        articleCompanyPriceVersion: {
          findFirst: vi.fn().mockImplementation(async ({ where }) => {
            const queryDate = where.effectiveAt.lte;
            if (queryDate >= new Date("2026-10-15")) {
              return {
                id: "v2",
                companyId: COMPANY_A,
                articleId: ARTICLE_ID,
                priceListId: PRICE_LIST_ID,
                price: 6000,
                currency: "ARS",
                effectiveAt: new Date("2026-10-15"),
                notes: "Precio a partir del 15",
                priceList: { id: PRICE_LIST_ID, code: "L1", name: "Lista 1" },
              };
            }
            if (queryDate >= new Date("2026-10-01")) {
              return {
                id: "v1",
                companyId: COMPANY_A,
                articleId: ARTICLE_ID,
                priceListId: PRICE_LIST_ID,
                price: 5000,
                currency: "ARS",
                effectiveAt: new Date("2026-10-01"),
                notes: "Precio a partir del 1",
                priceList: { id: PRICE_LIST_ID, code: "L1", name: "Lista 1" },
              };
            }
            return null;
          }),
        },
      } as any;

      // Querying before any effective date
      const beforeOct1 = await getEffectiveArticlePrice(
        mockDb,
        COMPANY_A,
        ARTICLE_ID,
        PRICE_LIST_ID,
        "2026-09-20",
      );
      expect(beforeOct1).toBeNull();

      // Querying on Oct 5 -> should get v1 (5000)
      const oct5 = await getEffectiveArticlePrice(
        mockDb,
        COMPANY_A,
        ARTICLE_ID,
        PRICE_LIST_ID,
        "2026-10-05",
      );
      expect(oct5?.price).toBe(5000);

      // Querying on Oct 20 -> should get v2 (6000)
      const oct20 = await getEffectiveArticlePrice(
        mockDb,
        COMPANY_A,
        ARTICLE_ID,
        PRICE_LIST_ID,
        "2026-10-20",
      );
      expect(oct20?.price).toBe(6000);
    });
  });
});

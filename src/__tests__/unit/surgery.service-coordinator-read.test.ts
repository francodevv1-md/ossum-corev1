import { describe, expect, it, vi } from "vitest";

import { getSurgeryById, listSurgeriesByCompany } from "@/lib/services/surgery.service";

const readRow = {
  id: "surgery-1",
  companyId: "company-1",
  contactAssignments: [{
    id: "assignment-1",
    contactId: "contact-1",
    role: "coordinator",
    isPrimary: false,
    createdAt: new Date("2026-07-16T10:00:00.000Z"),
    contact: {
      id: "contact-1",
      firstName: "Nelson",
      lastName: "DEV",
      legalName: null,
      email: null,
      isCompany: false,
      isActive: true,
      companyLinks: [{ companyId: "company-1", role: "coordinator", isActive: true }],
    },
  }],
};

describe("surgery service coordinator read projection", () => {
  it("keeps list and detail company-scoped and returns one DTO per surgery", async () => {
    const findMany = vi.fn().mockResolvedValue([readRow]);
    const findFirst = vi.fn().mockResolvedValue(readRow);
    const prisma = { surgery: { findMany, findFirst } } as never;

    const listed = await listSurgeriesByCompany(prisma, "company-1");
    const detail = await getSurgeryById(prisma, "company-1", "surgery-1");

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: "surgery-1",
      coordinatorAssignments: [{
        assignmentId: "assignment-1",
        contactId: "contact-1",
        createdAt: "2026-07-16T10:00:00.000Z",
      }],
      coordinatorAssignment: { status: "resolved", resolved: { contactId: "contact-1" } },
    });
    expect(detail).toMatchObject({
      id: "surgery-1",
      coordinatorAssignments: [{ assignmentId: "assignment-1", createdAt: "2026-07-16T10:00:00.000Z" }],
      coordinatorAssignment: { status: "resolved", resolved: { contactId: "contact-1" } },
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: "company-1", archivedAt: null }),
      select: expect.objectContaining({
        materialShippingDate: true,
        materialTransport: true,
        contactAssignments: expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{
              role: "coordinator",
              contact: {
                isActive: true,
                isCompany: false,
                companyLinks: { some: { companyId: "company-1", isActive: true, role: "coordinator" } },
              },
            }]),
          }),
          select: expect.objectContaining({ id: true, contactId: true, createdAt: true }),
        }),
      }),
    }));
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ id: "surgery-1" }, { visibleNumber: "surgery-1" }], companyId: "company-1", archivedAt: null },
    }));
  });

  it("preserves the persisted assignment id and instant without consulting another timestamp", async () => {
    const findMany = vi.fn().mockResolvedValue([{
      ...readRow,
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      probableDate: new Date("2020-01-02T00:00:00.000Z"),
      contactAssignments: [{
        ...readRow.contactAssignments[0],
        id: "exact-assignment",
        isPrimary: false,
        createdAt: new Date("2026-07-16T07:00:00.000-03:00"),
      }],
    }]);
    const prisma = { surgery: { findMany } } as never;

    const [result] = await listSurgeriesByCompany(prisma, "company-1");

    expect(result.coordinatorAssignments).toEqual([expect.objectContaining({
      assignmentId: "exact-assignment",
      contactId: "contact-1",
      isPrimary: false,
      createdAt: "2026-07-16T10:00:00.000Z",
    })]);
    expect(result.coordinatorAssignments[0].createdAt).not.toBe("2020-01-01T00:00:00.000Z");
    expect(result.coordinatorAssignments[0].createdAt).not.toBe("2020-01-02T00:00:00.000Z");
  });

  it("performs reads only", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const write = vi.fn();
    const prisma = {
      surgery: { findMany, create: write, update: write, updateMany: write, delete: write },
      $transaction: write,
    } as never;

    await listSurgeriesByCompany(prisma, "company-1");

    expect(findMany).toHaveBeenCalledOnce();
    expect(write).not.toHaveBeenCalled();
  });

  it("filters by coordinator in Prisma before any requested limit and has no implicit 50-row cap", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { surgery: { findMany } } as never;

    await listSurgeriesByCompany(prisma, "company-1", { coordinatorContactId: "contact-1", take: 25 });
    const limitedQuery = findMany.mock.calls[0][0];
    expect(limitedQuery.take).toBe(25);
    expect(limitedQuery.where.contactAssignments).toMatchObject({
      some: { role: "coordinator", contactId: "contact-1" },
      none: { role: "coordinator", contactId: { not: "contact-1" } },
    });

    await listSurgeriesByCompany(prisma, "company-1");
    expect(findMany.mock.calls[1][0]).not.toHaveProperty("take");
  });

  it("short-circuits pathological offsets beyond the scoped company result count", async () => {
    const count = vi.fn().mockResolvedValue(12);
    const findMany = vi.fn();
    const prisma = { surgery: { count, findMany } } as never;

    await expect(listSurgeriesByCompany(prisma, "company-1", { take: 50, skip: 2_147_483_647 })).resolves.toEqual([]);

    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({ companyId: "company-1", archivedAt: null }) });
    expect(findMany).not.toHaveBeenCalled();
  });
});

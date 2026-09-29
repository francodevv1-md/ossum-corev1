import { describe, expect, it, vi } from "vitest";

import { createContactAddress, linkContactToCompany, listContactsByCompany, resolveCompanyContactReference } from "@/lib/services/contact.service";

describe("contact service company query", () => {
  it("pushes search and active scope into Prisma before capped pagination", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { contactCompanyLink: { findMany } } as never;

    await listContactsByCompany(prisma, "company-1", { search: "Ana", take: 500 });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: "company-1", isActive: true, AND: expect.any(Array) }),
      take: 500,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }));
  });

  it("keeps contact type scoped when search also matches a company code", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { contactCompanyLink: { findMany } } as never;

    await listContactsByCompany(prisma, "company-1", { contactType: "doctor", search: "C-0042" });

    expect(findMany.mock.calls[0][0].where).toMatchObject({
      contact: { contactType: "doctor" },
      AND: [{ OR: [{ code: { contains: "C-0042" } }, { contact: { OR: expect.any(Array) } }] }],
    });
  });

  it("omits the active filter only when includeInactive is requested", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { contactCompanyLink: { findMany } } as never;
    await listContactsByCompany(prisma, "company-1", { includeInactive: true });
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty("isActive");
  });

  it("caps internal callers at 500 records", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { contactCompanyLink: { findMany } } as never;
    await listContactsByCompany(prisma, "company-1", { take: 1000 });
    expect(findMany.mock.calls[0][0].take).toBe(500);
  });

  it("demotes the previous main address before creating another", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: "address-2" });
    const tx = { contactAddress: { updateMany, create } };
    const prisma = {
      contactCompanyLink: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as never;

    await createContactAddress(prisma, "company-1", "contact-1", { street: "Nueva 2", isMain: true });

    expect(updateMany).toHaveBeenCalledWith({ where: { contactId: "contact-1", isMain: true }, data: { isMain: false } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ contactId: "contact-1", isMain: true }) }));
  });

  it("paginates contact resolution beyond the first 500 company contacts", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({ id: `contact-${index}`, firstName: `Person ${index}`, addresses: [], groupMemberships: [] }));
    const findMany = vi.fn()
      .mockResolvedValueOnce(firstPage.map((contact) => ({ contact, code: `C-${String(Number(contact.id.slice(8)) + 1).padStart(4, "0")}`, roles: [], isActive: true })))
      .mockResolvedValueOnce([{ contact: { id: "contact-match", firstName: "Ana", documentType: "DNI", documentNumber: "123", addresses: [], groupMemberships: [] }, code: "C-0501", roles: [], isActive: true }]);
    const prisma = { contactCompanyLink: { findMany } } as never;

    await expect(resolveCompanyContactReference(prisma, {
      companyId: "company-1",
      role: "patient",
      fieldLabel: "Patient",
      snapshot: { id: "", tipoPersona: "fisica", nombre: "Ana", dni: "123", groups: [] },
    })).resolves.toBe("contact-match");
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 500, skip: 500 }));
  });

  it("links a contact to a company with one atomic upsert", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "link-1" });
    const prisma = { contactCompanyLink: { upsert } } as never;

    await linkContactToCompany(prisma, "company-1", "contact-1", "doctor");

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { contactId_companyId: { contactId: "contact-1", companyId: "company-1" } },
      update: { role: "doctor", roles: ["cliente"], isActive: true },
    }));
  });

  it("allocates sequential C-XXXX code when creating contact without explicit code", async () => {
    const { createContact } = await import("@/lib/services/contact.service");
    const tx = {
      contactCompanyLink: {
        findMany: vi.fn().mockResolvedValue([{ code: "C-0010" }, { code: "C-0005" }]),
        create: vi.fn().mockResolvedValue({ id: "link-1" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "link-1",
          code: "C-0011",
          roles: ["cliente"],
          role: "pacientes",
          isActive: true,
          contact: { id: "contact-new", firstName: "Juan", lastName: "Perez", addresses: [], groupMemberships: [] },
        }),
      },
      contact: {
        create: vi.fn().mockResolvedValue({ id: "contact-new", firstName: "Juan", lastName: "Perez" }),
      },
      contactGroup: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      contactGroupMembership: {
        deleteMany: vi.fn(),
      },
      contactAddress: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (cb) => cb(tx)),
    } as never;

    const result = await createContact(prisma, "company-1", {
      firstName: "Juan",
      lastName: "Perez",
    });

    expect(tx.contactCompanyLink.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        code: "C-0011",
      }),
    }));
    expect(result.code).toBe("C-0011");
  });
});

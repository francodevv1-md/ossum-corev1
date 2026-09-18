import { describe, expect, it, vi } from "vitest";

import { createContactAddress, linkContactToCompany, listContactsByCompany, resolveCompanyContactReference, updateContact } from "@/lib/services/contact.service";

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

    expect(updateMany).toHaveBeenCalledWith({ where: { companyId: "company-1", contactId: "contact-1", isMain: true }, data: { isMain: false } });
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

  it("allows an operator to retain unchanged verified institution geography", async () => {
    const retrievedAt = new Date("2026-09-14T10:00:00.000Z");
    const currentAddress = { id: "address-1", companyId: "company-1", contactId: "contact-1", isMain: true, street: "Old", number: null, city: null, state: null, zipCode: null, country: "AR", validationStatus: "VERIFIED", georefId: "geo-1", entityType: "ADDRESS", provinceGeorefId: null, provinceName: null, latitude: { toString: () => "-34.6" }, longitude: { toString: () => "-58.4" }, coordinateType: "ADDRESS", crs: "EPSG_4326", source: "Georef Argentina", sourceVersion: "v1", sourceRetrievedAt: retrievedAt, validationNotes: null };
    const detail = { id: "link-1", code: "C-0001", roles: ["cliente"], isActive: true, contact: { addresses: [currentAddress], groupMemberships: [{ group: { slug: "instituciones" } }] } };
    const addressUpdate = vi.fn().mockResolvedValue(currentAddress);
    const tx = { contact: { update: vi.fn() }, contactCompanyLink: { findUnique: vi.fn().mockResolvedValueOnce({ id: "link-1" }).mockResolvedValue(detail), update: vi.fn() }, contactGroup: { findMany: vi.fn() }, contactGroupMembership: { deleteMany: vi.fn(), createMany: vi.fn() }, contactAddress: { findFirst: vi.fn().mockResolvedValue(currentAddress), update: addressUpdate } };
    const prisma = { $transaction: vi.fn(async (callback) => callback(tx)) } as never;

    await expect(updateContact(prisma, "company-1", "contact-1", { mainAddress: { geo: { georefId: "geo-1", entityType: "ADDRESS", latitude: -34.6, longitude: -58.4, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", sourceVersion: "v1", sourceRetrievedAt: "2026-09-14T10:00:00.000Z", validationStatus: "verified" } } }, { userId: "user-1", role: "operator" })).resolves.toBeTruthy();
    expect(addressUpdate).toHaveBeenCalled();
    expect(addressUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ street: "Old" }) }));
  });

  it("requires an administrator to clear verified institution geography through an address change", async () => {
    const currentAddress = { id: "address-1", companyId: "company-1", contactId: "contact-1", isMain: true, street: "Old", city: null, state: null, zipCode: null, country: "AR", validationStatus: "VERIFIED", georefId: "geo-1", entityType: "ADDRESS", provinceGeorefId: null, provinceName: null, latitude: { toString: () => "-34.6" }, longitude: { toString: () => "-58.4" }, coordinateType: "ADDRESS", crs: "EPSG_4326", source: "Georef Argentina", sourceVersion: "v1", sourceRetrievedAt: new Date("2026-09-14T10:00:00.000Z"), validationNotes: null };
    const detail = { id: "link-1", code: "C-0001", roles: ["cliente"], isActive: true, contact: { addresses: [currentAddress], groupMemberships: [{ group: { slug: "instituciones" } }] } };
    const auditEvent = { create: vi.fn().mockResolvedValue({ id: "audit-1" }) };
    const tx = { contact: { update: vi.fn() }, contactCompanyLink: { findUnique: vi.fn().mockResolvedValueOnce({ id: "link-1" }).mockResolvedValue(detail), update: vi.fn() }, contactGroup: { findMany: vi.fn().mockResolvedValue([{ id: "group-1", slug: "medicos" }]) }, contactGroupMembership: { deleteMany: vi.fn(), createMany: vi.fn() }, contactAddress: { findFirst: vi.fn().mockResolvedValue(currentAddress), update: vi.fn().mockResolvedValue(currentAddress) }, auditEvent };
    const prisma = { $transaction: vi.fn(async (callback) => callback(tx)) } as never;

    await expect(updateContact(prisma, "company-1", "contact-1", { mainAddress: { street: "Updated" } }, { userId: "user-1", role: "operator" })).rejects.toMatchObject({ code: "contact_geo_validated_data_protected" });
    expect(tx.contactAddress.update).not.toHaveBeenCalled();
    await expect(updateContact(prisma, "company-1", "contact-1", { mainAddress: null }, { userId: "user-1", role: "operator" })).rejects.toMatchObject({ code: "contact_geo_validated_data_protected" });
    await expect(updateContact(prisma, "company-1", "contact-1", { mainAddress: { street: "Updated", geo: null } }, { userId: "admin-1", role: "admin" })).resolves.toBeTruthy();
    expect(auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "geography_status_changed", newValue: { geo: null } }) }));
    await expect(updateContact(prisma, "company-1", "contact-1", { groupSlugs: ["medicos"] }, { userId: "user-1", role: "operator" })).rejects.toMatchObject({ code: "contact_geo_validated_data_protected" });
  });

  it("does not let an administrator retain verified coordinates for a changed address", async () => {
    const currentAddress = { id: "address-1", companyId: "company-1", contactId: "contact-1", isMain: true, street: "Old", number: null, city: null, state: null, zipCode: null, country: "AR", validationStatus: "VERIFIED", georefId: "geo-1", entityType: "ADDRESS", provinceGeorefId: null, provinceName: null, latitude: { toString: () => "-34.6" }, longitude: { toString: () => "-58.4" }, coordinateType: "ADDRESS", crs: "EPSG_4326", source: "Georef Argentina", sourceVersion: "v1", sourceRetrievedAt: new Date("2026-09-14T10:00:00.000Z"), validationNotes: null };
    const detail = { id: "link-1", code: "C-0001", roles: ["cliente"], isActive: true, contact: { addresses: [currentAddress], groupMemberships: [{ group: { slug: "instituciones" } }] } };
    const tx = { contact: { update: vi.fn() }, contactCompanyLink: { findUnique: vi.fn().mockResolvedValueOnce({ id: "link-1" }).mockResolvedValue(detail), update: vi.fn() }, contactGroup: { findMany: vi.fn() }, contactGroupMembership: { deleteMany: vi.fn(), createMany: vi.fn() }, contactAddress: { findFirst: vi.fn().mockResolvedValue(currentAddress), update: vi.fn() } };
    const prisma = { $transaction: vi.fn(async (callback) => callback(tx)) } as never;

    await expect(updateContact(prisma, "company-1", "contact-1", { mainAddress: { street: "Updated", geo: { georefId: "geo-1", entityType: "ADDRESS", latitude: -34.6, longitude: -58.4, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", sourceVersion: "v1", sourceRetrievedAt: "2026-09-14T10:00:00.000Z", validationStatus: "verified" } } }, { userId: "admin-1", role: "admin" })).rejects.toMatchObject({ code: "contact_geo_validated_data_protected" });
    expect(tx.contactAddress.update).not.toHaveBeenCalled();
  });
});

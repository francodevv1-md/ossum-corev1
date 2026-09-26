import { describe, expect, it, vi } from "vitest";

import { mapApiContactToContacto, mapContactoToApiPayload } from "@/lib/api/contact-adapter";
import { assertContactGeoPolicy, contactCreateSchema } from "@/lib/validators/contact";
import { updateContact } from "@/lib/services/contact.service";

const candidate = { georefId: "a-1", entityType: "ADDRESS" as const, latitude: -34.6, longitude: -58.4, coordinateType: "ADDRESS" as const, crs: "EPSG:4326" as const, source: "Georef Argentina" as const, validationStatus: "candidate" as const };

describe("contact geography contract", () => {
  it("requires coordinate pairs and complete provenance", () => {
    expect(contactCreateSchema.safeParse({ firstName: "Hospital", groupSlugs: ["instituciones"], mainAddress: { geo: { ...candidate, longitude: null } } }).success).toBe(false);
    expect(contactCreateSchema.safeParse({ firstName: "Hospital", groupSlugs: ["instituciones"], mainAddress: { geo: candidate } }).success).toBe(true);
  });

  it("rejects non-institution and operator validation requests", () => {
    expect(() => assertContactGeoPolicy(candidate, ["medicos"], "operator")).toThrow(expect.objectContaining({ code: "contact_geo_institution_required" }));
    expect(() => assertContactGeoPolicy({ ...candidate, validationStatus: "verified" }, ["instituciones"], "operator")).toThrow(expect.objectContaining({ code: "contact_geo_admin_validation_required" }));
    expect(() => assertContactGeoPolicy({ ...candidate, validationStatus: "verified" }, ["instituciones"], "admin")).not.toThrow();
    expect(() => assertContactGeoPolicy({ ...candidate, coordinateType: "MANUAL", source: "Manual", validationStatus: "candidate" }, ["instituciones"], "operator")).not.toThrow();
  });

  it("keeps geography an additive main-address API contract", () => {
    expect(mapContactoToApiPayload({ tipoPersona: "juridica", nombre: "Hospital" }, candidate)).toMatchObject({ mainAddress: { geo: candidate } });
  });

  it("hydrates persisted geography into the editable contact contract", () => {
    const mapped = mapApiContactToContacto({
      id: "contact-1", code: "C-0001", isCompany: true, legalName: "Hospital", linkIsActive: true,
      groupSlugs: ["instituciones"], createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
      mainAddress: { ...candidate, crs: "EPSG_4326", validationStatus: "CANDIDATE", sourceRetrievedAt: "2026-09-10T00:00:00.000Z" },
    });

    expect(mapped.mainAddressGeo).toMatchObject({ ...candidate, sourceRetrievedAt: "2026-09-10T00:00:00.000Z" });
  });

  it("preserves validated geography until explicit admin resolution and audits one changed geo write", async () => {
    const address = { id: "address-1", contactId: "contact-1", isMain: true, street: "A", number: null, city: null, state: null, zipCode: null, country: "AR", createdAt: new Date(), validationStatus: "VERIFIED", crs: "EPSG_4326", source: "Georef Argentina", coordinateType: "ADDRESS", latitude: -34.6, longitude: -58.4, georefId: "old" };
    const tx = {
      contactCompanyLink: { findUnique: vi.fn().mockResolvedValue({ id: "link-1", isActive: true, role: "cliente", contact: { id: "contact-1", addresses: [address], groupMemberships: [{ group: { slug: "instituciones" } }] } }), update: vi.fn() },
      contact: { update: vi.fn() }, contactAddress: { findFirst: vi.fn().mockResolvedValue(address), update: vi.fn().mockImplementation(({ data }: { data: object }) => ({ ...address, ...data })), create: vi.fn() },
      auditEvent: { create: vi.fn() },
    };
    const prisma = { $transaction: (callback: (value: never) => Promise<unknown>) => callback(tx as never) } as never;
    await expect(updateContact(prisma, "company-1", "contact-1", { mainAddress: { geo: candidate } }, { userId: "actor-1", role: "operator" })).rejects.toMatchObject({ code: "contact_geo_validated_data_protected" });
    expect(tx.contactAddress.update).not.toHaveBeenCalled();

    address.validationStatus = "CANDIDATE";
    await updateContact(prisma, "company-1", "contact-1", { mainAddress: { geo: candidate } }, { userId: "actor-1", role: "operator" });
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-1", userId: "actor-1", entityType: "ContactAddress", action: "geography_candidate_saved", oldValue: expect.any(Object), newValue: expect.any(Object), metadata: expect.objectContaining({ source: "Georef Argentina", validationStatus: "candidate" }) }) });
  });

  it("allows an admin to validate a persisted candidate and audits the transition", async () => {
    const address = { id: "address-1", contactId: "contact-1", isMain: true, street: "A", number: null, city: null, state: null, zipCode: null, country: "AR", createdAt: new Date(), validationStatus: "CANDIDATE", crs: "EPSG_4326", source: "Georef Argentina", coordinateType: "ADDRESS", latitude: -34.6, longitude: -58.4, georefId: "a-1" };
    const tx = {
      contactCompanyLink: { findUnique: vi.fn().mockResolvedValueOnce({ id: "link-1", isActive: true, role: "cliente" }).mockResolvedValue({ id: "link-1", isActive: true, role: "cliente", contact: { id: "contact-1", addresses: [address], groupMemberships: [{ group: { slug: "instituciones" } }] } }), update: vi.fn() },
      contact: { update: vi.fn() }, contactAddress: { findFirst: vi.fn().mockResolvedValue(address), update: vi.fn().mockImplementation(({ data }: { data: object }) => ({ ...address, ...data })), create: vi.fn() },
      auditEvent: { create: vi.fn() },
    };
    const prisma = { $transaction: (callback: (value: never) => Promise<unknown>) => callback(tx as never) } as never;

    await updateContact(prisma, "company-1", "contact-1", { mainAddress: { geo: { ...candidate, validationStatus: "verified" } } }, { userId: "admin-1", role: "admin" });

    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-1", userId: "admin-1", action: "geography_status_changed", oldValue: expect.objectContaining({ geo: expect.objectContaining({ validationStatus: "candidate" }) }), newValue: expect.objectContaining({ geo: expect.objectContaining({ validationStatus: "verified" }) }) }) });
  });

  it("denies a foreign-tenant geographic mutation before writes or audit", async () => {
    const tx = { contactCompanyLink: { findUnique: vi.fn().mockResolvedValue(null) }, contact: { update: vi.fn() }, auditEvent: { create: vi.fn() } };
    const prisma = { $transaction: (callback: (value: never) => Promise<unknown>) => callback(tx as never) } as never;

    await expect(updateContact(prisma, "company-b", "contact-1", { mainAddress: { geo: candidate } }, { userId: "actor-1", role: "operator" })).rejects.toThrow("does not belong to company company-b");
    expect(tx.contact.update).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
});

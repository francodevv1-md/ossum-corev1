import { describe, expect, it, vi } from "vitest";

import {
  listEligibleCoordinatorContacts,
  resolvePersonalCoordinator,
  type EligibleCoordinatorContact,
} from "@/lib/services/personal-coordinator-resolver.service";

function contact(
  contactId: string,
  values: Partial<EligibleCoordinatorContact> = {}
): EligibleCoordinatorContact {
  return {
    contactId,
    label: values.label ?? "Ana Pérez",
    email: values.email ?? "ana@example.com",
    firstName: values.firstName ?? "Ana",
    lastName: values.lastName ?? "Pérez",
    legalName: values.legalName ?? null,
  };
}

describe("personal coordinator resolver", () => {
  it("normaliza email/nombre y deduplica la unión por contactId", () => {
    expect(resolvePersonalCoordinator(
      { email: " ANA@EXAMPLE.COM ", firstName: "Ána", lastName: "  Pérez " },
      [contact("contact-1")]
    )).toEqual({
      status: "resolved",
      subject: { contactId: "contact-1", label: "Ana Pérez" },
    });
  });

  it("falla cerrado ante identidad incompleta, cero o múltiples matches", () => {
    expect(resolvePersonalCoordinator(
      { email: null, firstName: null, lastName: null },
      []
    )).toEqual({ status: "unresolved", subject: null, reason: "identity_incomplete" });
    expect(resolvePersonalCoordinator(
      { email: "none@example.com", firstName: "Nadie", lastName: "" },
      [contact("contact-1")]
    )).toEqual({ status: "unresolved", subject: null, reason: "no_match" });
    expect(resolvePersonalCoordinator(
      { email: "ana@example.com", firstName: "Bea", lastName: "Gómez" },
      [contact("contact-1"), contact("contact-2", {
        label: "Bea Gómez",
        email: "bea@example.com",
        firstName: "Bea",
        lastName: "Gómez",
      })]
    )).toEqual({ status: "ambiguous", subject: null, reason: "multiple_matches" });
  });

  it("consulta solo coordinadores activos de la empresa exacta y no escribe", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "contact-1", email: "a@x.test", firstName: "A", lastName: "Uno", legalName: null },
    ]);
    const write = vi.fn();
    const prisma = { contact: { findMany, create: write, update: write } } as never;

    await expect(listEligibleCoordinatorContacts(prisma, "company-1")).resolves.toMatchObject([
      { contactId: "contact-1", label: "A Uno" },
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        isCompany: false,
        companyLinks: { some: {
          companyId: "company-1",
          isActive: true,
          role: "coordinator",
          company: { isActive: true },
        } },
      }),
    }));
    expect(write).not.toHaveBeenCalled();
  });
});

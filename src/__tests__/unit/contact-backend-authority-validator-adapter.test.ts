import { describe, expect, it } from "vitest";

import { mapApiContactToContacto, mapContactoToApiPayload } from "@/lib/api/contact-adapter";
import { contactCreateSchema, contactListQuerySchema, contactUpdateSchema } from "@/lib/validators/contact";

describe("contact backend authority contract", () => {
  it("keeps booleans strict and caps list pagination", () => {
    expect(contactCreateSchema.safeParse({ firstName: "Ana", isCompany: "false" }).success).toBe(false);
    expect(contactUpdateSchema.safeParse({ isActive: "false" }).success).toBe(false);
    expect(contactListQuerySchema.safeParse({ includeInactive: "yes" }).success).toBe(false);
    expect(contactListQuerySchema.safeParse({ take: "501" }).success).toBe(false);
    expect(contactCreateSchema.safeParse({ firstName: "Ana", code: "BAD-1" }).success).toBe(false);
    expect(contactUpdateSchema.safeParse({ groupSlugs: ["legacy-abcd1234"] }).success).toBe(true);
    expect(contactUpdateSchema.safeParse({ groupSlugs: ["medicos", "medicos"] }).success).toBe(false);
    expect(contactListQuerySchema.parse({ take: "500", includeInactive: "true" })).toMatchObject({ take: 500, includeInactive: true });
  });

  it("round-trips every persisted Contacto form field", () => {
    const payload = mapContactoToApiPayload({
      codigoContacto: "C-0042", tipoPersona: "juridica", nombre: "Hospital Norte SA", nombreFantasia: "Hospital Norte",
      razonSocial: "Hospital Norte SA", cuit: "30-12345678-9", estado: "activo", observaciones: "Preferente",
      roles: ["cliente", "proveedor"], groups: ["instituciones"], telefonos: ["1144445555"], email: "contacto@hospital.test",
      domicilio: "Av. Norte 42", provincia: "Buenos Aires", localidad: "San Isidro", codigoPostal: "1642",
      datosClientePagador: { esPagador: true, condicionIva: "Responsable Inscripto", condicionPago: "30 días", listaPreciosDefault: "MAYORISTA", descuentoHabitual: 7.5 },
      datosMedico: { matricula: "MN-123", especialidad: "Traumatología" },
      datosInstitucion: { observacionEntrega: "Ingresar por guardia" },
    });

    const mapped = mapApiContactToContacto({
      id: "contact-1", code: payload.codigo, isCompany: payload.isCompany, legalName: payload.legalName,
      tradeName: payload.tradeName, notes: payload.notes, documentType: payload.documentType, documentNumber: payload.documentNumber,
      email: payload.email, phone: payload.phone, roles: payload.roles, groupSlugs: payload.groupSlugs,
      mainAddress: payload.mainAddress, isPayer: payload.isPayer, vatCondition: payload.vatCondition,
      paymentTerms: payload.paymentTerms, defaultPriceList: payload.defaultPriceList, usualDiscount: payload.usualDiscount,
      doctorLicense: payload.doctorLicense, specialty: payload.specialty, deliveryNotes: payload.deliveryNotes,
      linkIsActive: true, createdAt: "2026-09-03T00:00:00.000Z", updatedAt: "2026-09-03T00:00:00.000Z",
    });

    expect(mapped).toMatchObject({
      codigoContacto: "C-0042", nombre: "Hospital Norte SA", nombreFantasia: "Hospital Norte", observaciones: "Preferente",
      roles: ["cliente", "proveedor"], groups: ["instituciones"], domicilio: "Av. Norte 42", provincia: "Buenos Aires",
      localidad: "San Isidro", codigoPostal: "1642", datosClientePagador: { descuentoHabitual: 7.5 },
      datosMedico: { matricula: "MN-123" }, datosInstitucion: { observacionEntrega: "Ingresar por guardia" },
    });
  });

  it("persists the edited juridical denomination as the legal name", () => {
    expect(mapContactoToApiPayload({
      tipoPersona: "juridica",
      nombre: "Nueva denominación",
      razonSocial: "Denominación anterior",
    })).toMatchObject({ legalName: "Nueva denominación" });
  });

  it("maps physical contacts with a single name", () => {
    expect(mapApiContactToContacto({
      id: "contact-one-name",
      firstName: "Prince",
      isCompany: false,
      linkIsActive: true,
      roles: ["cliente"],
      groupSlugs: [],
    }).nombre).toBe("Prince");
  });

  it("updates canonical roles without overwriting legacy role values", () => {
    const payload = mapContactoToApiPayload({ roles: [] });
    expect(payload).toMatchObject({ roles: [] });
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("contactType");
    expect(mapApiContactToContacto({
      id: "contact-no-role",
      firstName: "Ana",
      isCompany: false,
      linkIsActive: true,
      linkRole: "doctor",
      roles: [],
      groupSlugs: [],
    }).roles).toEqual([]);
  });

});

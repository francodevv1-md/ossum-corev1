import { describe, expect, it } from "vitest";

import {
  contactLookupResultSchema,
  cuitLookupRequestSchema,
  cuitLookupVatConditionSchema,
} from "@/lib/validators/cuit-lookup";
import { validateCuitFormat } from "@/lib/utils/cuit-validation";

describe("cuitLookupRequestSchema", () => {
  it("accepts an 11-digit string", () => {
    expect(cuitLookupRequestSchema.safeParse({ cuit: "30712293840" }).success).toBe(true);
  });

  it.each([
    { cuit: "3071229384" }, // 10 digits
    { cuit: "307122938402" }, // 12 digits
    { cuit: "20-12345678-6" }, // formatted
    { cuit: "" }, // empty
    { cuit: "abcdefghijk" }, // non-numeric
  ])("rejects %j", (payload) => {
    expect(cuitLookupRequestSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(cuitLookupRequestSchema.safeParse({ cuit: "30712293840", foo: "bar" }).success).toBe(false);
  });
});

describe("cuitLookupVatConditionSchema", () => {
  it.each([
    "Responsable Inscripto",
    "Monotributo",
    "Exento",
    "Consumidor Final",
  ])("accepts %s", (value) => {
    expect(cuitLookupVatConditionSchema.safeParse(value).success).toBe(true);
  });

  it("rejects unknown condition", () => {
    expect(cuitLookupVatConditionSchema.safeParse("Otra").success).toBe(false);
  });
});

describe("contactLookupResultSchema", () => {
  it("accepts the canonical mapped subset", () => {
    const result = contactLookupResultSchema.safeParse({
      source: "stub",
      found: true,
      legalName: "ACME SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: { street: "Av 1", city: "CABA", state: "BA", zipCode: "1000", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown top-level keys", () => {
    const result = contactLookupResultSchema.safeParse({
      source: "stub", found: true, persistMe: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a found:false response without mainAddress", () => {
    const result = contactLookupResultSchema.safeParse({ source: "stub", found: false });
    expect(result.success).toBe(true);
  });
});

describe("validateCuitFormat (módulo 11)", () => {
  it("accepts canonical valid CUITs", () => {
    expect(validateCuitFormat("30712293840")).toBe(true);
    expect(validateCuitFormat("20000000000")).toBe(true);
    expect(validateCuitFormat("20000000254")).toBe(true);
  });

  it("accepts formatted CUITs", () => {
    expect(validateCuitFormat("30-71229384-0")).toBe(true);
  });

  it("rejects too short or too long", () => {
    expect(validateCuitFormat("3071229384")).toBe(false);
    expect(validateCuitFormat("307122938402")).toBe(false);
  });

  it("rejects bad check digit", () => {
    expect(validateCuitFormat("30712293849")).toBe(false);
  });

  it("rejects empty/null", () => {
    expect(validateCuitFormat("")).toBe(false);
    expect(validateCuitFormat(null)).toBe(false);
    expect(validateCuitFormat(undefined)).toBe(false);
  });
});
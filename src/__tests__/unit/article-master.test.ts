import { describe, expect, it } from "vitest";
import { articleCreateSchema, identifierScopeKey, normalizeArticleIdentifier, resolutionStatus, ARTICLE_TRACEABILITY_REQUIREMENTS } from "@/lib/validators/article";

describe("Article Master", () => {
  it("normalizes contextual identifiers without changing their stored display value", () => {
    expect(normalizeArticleIdentifier("  01 23-abc ")).toBe("0123ABC");
  });

  it("accepts catalog identity and trace policy without physical stock data", () => {
    const value = articleCreateSchema.parse({ description: "Implante", categoryId: "category-1", clinicalFamilyId: "family-1", brandId: "brand-1", manufacturerId: "manufacturer-1", productLineId: "line-1", traceabilityRequirement: "LOT", expirationRequired: true });
    expect(value.description).toBe("Implante");
    expect(value.traceabilityRequirement).toBe("LOT");
    expect(value.expirationRequired).toBe(true);
    expect(value.identifiers).toEqual([]);
    expect(value).toMatchObject({ categoryId: "category-1", clinicalFamilyId: "family-1", brandId: "brand-1", manufacturerId: "manufacturer-1", productLineId: "line-1" });
    expect(value).not.toHaveProperty("lot");
    expect(value).not.toHaveProperty("serial");
  });

  it("keeps contextual resolution explicit and surfaces ambiguity", () => {
    expect(identifierScopeKey({ manufacturerContext: "Acme" })).toBe("MANUFACTURER:ACME");
    expect(identifierScopeKey({ supplierId: "sup-1" })).toBe("SUPPLIER:sup-1");
    expect(identifierScopeKey({})).toBe("GLOBAL");
    expect(resolutionStatus(0)).toBe("not_found");
    expect(resolutionStatus(1)).toBe("resolved");
    expect(resolutionStatus(2)).toBe("ambiguous");
  });

  it("supports every independent traceability minimum and supplier mapping input", () => {
    expect(ARTICLE_TRACEABILITY_REQUIREMENTS).toEqual(["NONE", "LOT", "SERIAL", "LOT_OR_SERIAL", "LOT_AND_SERIAL"]);
    const value = articleCreateSchema.parse({ description: "Implante", traceabilityRequirement: "LOT_AND_SERIAL", expirationRequired: true, supplierMappings: [{ supplierId: "sup-1", supplierCode: "ABC-1" }] });
    expect(value.traceabilityRequirement).toBe("LOT_AND_SERIAL");
    expect(value.supplierMappings[0].supplierCode).toBe("ABC-1");
  });

  it("keeps GS1 AI 22 distinct from a manufacturer reference", () => {
    const value = articleCreateSchema.parse({ description: "Clavija", identifiers: [{ type: "GS1_AI_22", value: "33271BP", sourcePayload: "21GZ7932\u001d102614959\u001d17310722\u001d2233271BP", manufacturerContext: "BIOPROTECE" }] });
    expect(value.identifiers[0]).toMatchObject({ type: "GS1_AI_22", value: "33271BP", manufacturerContext: "BIOPROTECE" });
  });
});

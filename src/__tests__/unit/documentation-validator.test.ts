import { describe, expect, it } from "vitest";

import {
  DOCUMENTATION_TEMPLATE,
  deriveDocumentationAggregate,
  isDocumentationTransitionAllowed,
  validateDocumentationStatePatch,
} from "@/lib/validators/documentation.validator";
import {
  DOCUMENTATION_MUTATION_ROLES,
  canMutateDocumentation,
} from "@/lib/permissions/documentation";

describe("documentation contract", () => {
  it("freezes documentation-v0.1 catalog and order", () => {
    expect(DOCUMENTATION_TEMPLATE).toEqual([
      { type: "medical_order", label: "Orden médica", required: true, sortOrder: 10 },
      { type: "authorization", label: "Autorización", required: true, sortOrder: 20 },
      { type: "signed_delivery_note", label: "Remito firmado", required: true, sortOrder: 30 },
      { type: "signed_consumption", label: "Consumo firmado", required: true, sortOrder: 40 },
      { type: "implant_documentation", label: "Documentación de implante", required: false, sortOrder: 50 },
      { type: "technical_sheet", label: "Ficha técnica", required: false, sortOrder: 60 },
      { type: "box_photos", label: "Fotos de cajas/material", required: false, sortOrder: 70 },
      { type: "surgical_report", label: "Informe quirúrgico", required: false, sortOrder: 80 },
      { type: "billing_support", label: "Respaldo de facturación", required: false, sortOrder: 90 },
    ]);
  });

  it("accepts only the strict patch DTO and canonical UTC instants", () => {
    expect(validateDocumentationStatePatch({
      state: "observed",
      expectedUpdatedAt: "2026-07-28T10:20:30.000Z",
      observation: "  Missing signature  ",
    })).toEqual({
      state: "observed",
      expectedUpdatedAt: "2026-07-28T10:20:30.000Z",
      observation: "Missing signature",
    });

    for (const body of [
      { state: "received", expectedUpdatedAt: "2026-07-28T10:20:30.000Z", extra: true },
      { state: "received", expectedUpdatedAt: "2026-07-28T10:20:30+00:00" },
      { state: "received", expectedUpdatedAt: "2026-02-30T10:20:30.000Z" },
      { state: "observed", expectedUpdatedAt: "2026-07-28T10:20:30.000Z", observation: "  " },
      { state: "approved", expectedUpdatedAt: "2026-07-28T10:20:30.000Z", observation: "no" },
    ]) {
      expect(() => validateDocumentationStatePatch(body)).toThrow();
    }
  });

  it("implements exactly the approved transition graph", () => {
    const allowed = [
      "pending:received",
      "received:approved", "received:observed", "received:pending",
      "observed:received", "observed:pending",
      "approved:observed", "approved:pending",
    ];
    for (const from of ["pending", "received", "observed", "approved"] as const) {
      for (const to of ["pending", "received", "observed", "approved"] as const) {
        expect(isDocumentationTransitionAllowed(from, to)).toBe(allowed.includes(`${from}:${to}`));
      }
    }
  });

  it("derives required-only status and treats 0/0 as not_required", () => {
    expect(deriveDocumentationAggregate([])).toEqual({ status: "not_required", approved: 0, total: 0 });
    expect(deriveDocumentationAggregate([
      { required: true, state: "approved" },
      { required: true, state: "approved" },
      { required: false, state: "observed" },
    ])).toEqual({ status: "ready", approved: 2, total: 2 });
    expect(deriveDocumentationAggregate([
      { required: true, state: "observed" },
      { required: true, state: "approved" },
    ])).toEqual({ status: "observed", approved: 1, total: 2 });
    expect(deriveDocumentationAggregate([
      { required: true, state: "received" },
    ])).toEqual({ status: "incomplete", approved: 0, total: 1 });
  });

  it("allows mutation for exactly the three compatibility roles", () => {
    expect(DOCUMENTATION_MUTATION_ROLES).toEqual(["admin", "coordinador", "coordinator"]);
    for (const role of DOCUMENTATION_MUTATION_ROLES) expect(canMutateDocumentation(role)).toBe(true);
    for (const role of ["operator", "viewer", "admin ", ""]) expect(canMutateDocumentation(role)).toBe(false);
  });
});

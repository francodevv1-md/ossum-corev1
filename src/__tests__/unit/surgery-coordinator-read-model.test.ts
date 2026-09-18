import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  resolveCoordinatorAssignment,
  serializeEligibleCoordinatorAssignments,
  type SelectedCoordinatorAssignment,
} from "@/lib/services/surgery-coordinator-read-model";

function assignment(
  id: string,
  contactId: string,
  overrides: Partial<SelectedCoordinatorAssignment> = {}
): SelectedCoordinatorAssignment {
  return {
    id,
    contactId,
    role: "coordinator",
    isPrimary: false,
    createdAt: new Date("2026-07-16T10:00:00.000Z"),
    contact: {
      id: contactId,
      firstName: "Nombre",
      lastName: contactId,
      legalName: null,
      email: null,
      isCompany: false,
      isActive: true,
      companyLinks: [{ companyId: "company-1", role: "coordinator", isActive: true }],
    },
    ...overrides,
  };
}

describe("surgery coordinator read model", () => {
  it("resolves relational-only, flat-only, and equal dual candidates", () => {
    const relational = serializeEligibleCoordinatorAssignments("company-1", [assignment("a-1", "K1")]);

    expect(resolveCoordinatorAssignment(relational)).toEqual({
      status: "resolved",
      resolved: { contactId: "K1", label: "Nombre K1" },
    });
    expect(resolveCoordinatorAssignment([], "K2", "Legacy K2")).toEqual({
      status: "resolved",
      resolved: { contactId: "K2", label: "Legacy K2" },
    });
    expect(resolveCoordinatorAssignment(relational, "K1", "Otro nombre").status).toBe("resolved");
  });

  it("deduplicates duplicate relational IDs but not distinct IDs or labels", () => {
    const duplicateId = serializeEligibleCoordinatorAssignments("company-1", [
      assignment("a-1", "K1"),
      assignment("a-2", "K1", { contact: { ...assignment("x", "K1").contact, legalName: "Duplicado" } }),
    ]);
    const duplicateLabels = serializeEligibleCoordinatorAssignments("company-1", [
      assignment("a-3", "K2", { contact: { ...assignment("x", "K2").contact, legalName: "Mismo nombre" } }),
      assignment("a-4", "K3", { contact: { ...assignment("x", "K3").contact, legalName: "Mismo nombre" } }),
    ]);

    expect(resolveCoordinatorAssignment(duplicateId).status).toBe("resolved");
    expect(resolveCoordinatorAssignment(duplicateLabels).status).toBe("ambiguous");
  });

  it("keeps isPrimary diagnostic-only for relational and legacy conflicts", () => {
    const relational = serializeEligibleCoordinatorAssignments("company-1", [
      assignment("later", "K2", { createdAt: new Date("2026-07-16T11:00:00.000Z") }),
      assignment("primary", "K1", { isPrimary: true }),
    ]);

    expect(relational.map((item) => item.assignmentId)).toEqual(["primary", "later"]);
    expect(resolveCoordinatorAssignment(relational).status).toBe("ambiguous");
    expect(resolveCoordinatorAssignment([relational[0]], "K2", "Legacy").status).toBe("ambiguous");
  });

  it("preserves assignment identity/time independently of primary, order, recency, and duplicate labels", () => {
    const serialized = serializeEligibleCoordinatorAssignments("company-1", [
      assignment("older-non-primary", "K1", {
        createdAt: new Date("2026-07-16T09:00:00.000Z"),
        contact: { ...assignment("x", "K1").contact, legalName: "Nombre repetido" },
      }),
      assignment("newer-primary", "K2", {
        isPrimary: true,
        createdAt: new Date("2026-07-16T11:00:00.000Z"),
        contact: { ...assignment("x", "K2").contact, legalName: "Nombre repetido" },
      }),
    ]);

    expect(serialized).toEqual([
      expect.objectContaining({ assignmentId: "newer-primary", contactId: "K2", createdAt: "2026-07-16T11:00:00.000Z" }),
      expect.objectContaining({ assignmentId: "older-non-primary", contactId: "K1", createdAt: "2026-07-16T09:00:00.000Z" }),
    ]);
    expect(resolveCoordinatorAssignment(serialized)).toEqual({ status: "ambiguous", resolved: null });
  });

  it("serializes only the persisted assignment timestamp and exposes no fallback timestamp field", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/services/surgery-coordinator-read-model.ts"), "utf8");
    expect(source).toContain("assignmentId: assignment.id")
    expect(source).toContain("createdAt: assignment.createdAt.toISOString()")
    for (const forbidden of ["probableDate", "authorizationDate", "history", "Date.now", "new Date()"] as const) {
      expect(source).not.toContain(forbidden)
    }
  });

  it("returns none for absent candidates", () => {
    expect(resolveCoordinatorAssignment([], "  ")).toEqual({ status: "none", resolved: null });
  });

  it("excludes wrong-company, inactive, company, and non-coordinator rows", () => {
    const selected = serializeEligibleCoordinatorAssignments("company-1", [
      assignment("eligible", "K1"),
      assignment("wrong-company", "K2", { contact: { ...assignment("x", "K2").contact, companyLinks: [{ companyId: "company-2", role: "coordinator", isActive: true }] } }),
      assignment("inactive-contact", "K3", { contact: { ...assignment("x", "K3").contact, isActive: false } }),
      assignment("company-contact", "K4", { contact: { ...assignment("x", "K4").contact, isCompany: true } }),
      assignment("wrong-role", "K5", { role: "assistant" }),
      assignment("inactive-link", "K6", { contact: { ...assignment("x", "K6").contact, companyLinks: [{ companyId: "company-1", role: "coordinator", isActive: false }] } }),
      assignment("wrong-link-role", "K7", { contact: { ...assignment("x", "K7").contact, companyLinks: [{ companyId: "company-1", role: "doctor", isActive: true }] } }),
    ]);

    expect(selected.map((item) => item.contactId)).toEqual(["K1"]);
  });
});

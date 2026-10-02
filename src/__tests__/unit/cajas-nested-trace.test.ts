import { expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { confirmCajasControl } from "@/lib/services/cajas-control.service";

it("control nested DTO inherits tenant from parent and preserves allocation trace unchanged", async () => {
  const trace = { location: "nondefault-shelf", selectionCommandId: "selection", unitIdentity: "physical-unit" };
  const line = { id: "line", expectedFormulaLineId: "formula-line", articleReferenceId: "article-ref", stockScopeReferenceId: "scope", stockScopeReference: { kind: "fungiblePosition" }, articleReference: { skuSnapshot: "SKU", descriptionSnapshot: "Component" }, quantity: new Prisma.Decimal(1), dispatchedQuantity: new Prisma.Decimal(0), unit: "u", isActive: true, traceabilitySnapshot: trace };
  const prep = { id: "prep", version: 2, formulaVersionId: "formula", formulaVersion: { lines: [{ id: "formula-line", articleReferenceId: "article-ref", expectedQuantity: new Prisma.Decimal(1), unit: "u" }] }, lines: [line] };
  const create = vi.fn(async ({ data }) => data);
  const db: any = { $queryRaw: vi.fn().mockResolvedValue([{ id: "assignment" }]), cajasAssignment: { findFirst: vi.fn().mockResolvedValue({ activeSlot: 1, preparation: prep }) }, cajasDifference: { findMany: vi.fn().mockResolvedValue([]) }, cajasCommandAcceptance: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "command" }) }, cajasControl: { findFirst: vi.fn().mockResolvedValue(null), create }, cajasPreparation: { update: vi.fn() } };
  db.auditEvent = { create: vi.fn().mockResolvedValue({ id: "audit" }) };
  await confirmCajasControl(db, "company", "assignment", undefined, "actor", { kind: "control", cause: "Focused evidence", expectedVersion: 2, idempotencyKey: "nested-trace" });
  const data = create.mock.calls[0][0].data;
  expect(data.companyId).toBe("company");
  expect(data.lines.create[0]).not.toHaveProperty("companyId");
  expect(data.lines.create[0]).not.toHaveProperty("controlId");
  expect(data.lines.create[0].traceabilitySnapshot).toEqual(trace);
  expect(line.traceabilitySnapshot).toEqual(trace);
});
